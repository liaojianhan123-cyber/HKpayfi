// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ProtocolConfig.sol";
import "./ReceivableNFT.sol";
import "./LiquidityPool.sol";
import "./EvaluationAgent.sol";

/// @notice Chainlink Automation interface — kept inline so we don't pull
///         the entire Chainlink contracts package as a dependency.
interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);

    function performUpkeep(bytes calldata performData) external;
}

/// @title CreditFacility
/// @notice Core lending engine — manages credit lines backed by receivable NFTs.
///
/// @dev Risk model:
///   The protocol lends to the SELLER (borrower) against their trade receivable.
///   The protocol does not track or care whether the buyer pays the seller — that
///   is the seller's problem. The protocol only cares whether the SELLER repays.
///
///   To align incentives, the seller must deposit a USDC stake (skin-in-the-game)
///   before their first drawdown. This stake is:
///     - Returned in full on successful repayment
///     - Slashed and sent to the LP pool on default
///
///   Loss absorption order on default:
///     1. Seller stake (first loss)
///     2. LP pool (residual loss, socialized across all LPs)

contract CreditFacility is AccessControl, ReentrancyGuard, AutomationCompatibleInterface {
    using SafeERC20 for IERC20;

    /// @notice Penalty interest multiplier for overdue period (1.5x = 15000 out of 10000)
    uint256 private constant PENALTY_RATE_MULTIPLIER = 15000;

    /// @notice Maximum number of credit lines processed per Chainlink Automation upkeep.
    ///         Caps gas usage of performUpkeep — Chainlink will run multiple upkeeps
    ///         back-to-back if more than this number are defaultable simultaneously.
    uint256 public constant MAX_AUTOMATION_BATCH = 5;

    enum CreditState {
        Pending,
        Approved,
        Active,
        Repaid,
        Defaulted
    }

    struct CreditLine {
        address borrower;
        uint256 receivableTokenId;
        uint256 creditLimit; // Max borrowable (USDC 6 decimals)
        uint256 drawn; // Currently drawn amount
        uint256 interestRate; // APR in basis points (already discounted if token holder)
        uint256 drawdownTime; // When funds were first drawn
        uint256 dueDate; // When repayment is due
        uint256 totalRepaid; // Total repaid so far
        uint256 stakeAmount; // Seller stake locked for this credit line
        bool hasTokenDiscount; // Snapshot: did borrower hold native token at drawdown
        CreditState state;
    }

    ProtocolConfig public immutable config;
    ReceivableNFT public immutable receivableNFT;
    LiquidityPool public immutable pool;
    EvaluationAgent public immutable evaluationAgent;
    IERC20 public immutable usdc;

    /// @notice Seller stake rate in basis points (e.g., 2000 = 20% of face amount)
    uint256 public sellerStakeRate;

    // --------------------------------------------------------------------
    // Native token (HKP) holder perks
    // --------------------------------------------------------------------

    /// @notice Native utility token. If set, holders above threshold get APR
    ///         discount and extended default grace period.
    IERC20 public nativeToken;

    /// @notice Minimum native token balance required to qualify for perks.
    uint256 public minTokenHoldingForPerks;

    /// @notice APR discount in basis points applied to token holders (e.g., 300 = -3% APR).
    ///         Floored at config.minInterestRate().
    uint256 public tokenHolderAprDiscountBps;

    /// @notice Extra grace period (seconds) granted to token holders on top of base.
    uint256 public tokenHolderGraceBonus;

    /// @notice Credit score threshold above which token holders get extra grace.
    uint256 public goodCreditScoreThreshold;

    /// @notice Additional grace period (seconds) for token holders with good credit score.
    uint256 public goodCreditExtraGrace;

    event NativeTokenUpdated(address indexed oldToken, address indexed newToken);
    event TokenHolderPerksUpdated(
        uint256 minHolding,
        uint256 aprDiscountBps,
        uint256 graceBonus,
        uint256 goodCreditThreshold,
        uint256 goodCreditExtraGrace
    );
    event TokenDiscountApplied(
        uint256 indexed creditLineId, address indexed borrower, uint256 baseRate, uint256 effectiveRate
    );

    uint256 private _nextCreditLineId;
    mapping(uint256 => CreditLine) public creditLines;
    mapping(uint256 => uint256) public receivableToCreditLine; // NFT tokenId => creditLineId + 1

    event CreditLineCreated(
        uint256 indexed creditLineId, address indexed borrower, uint256 receivableTokenId, uint256 creditLimit
    );
    event CreditLineApproved(uint256 indexed creditLineId);
    event StakeDeposited(uint256 indexed creditLineId, address indexed borrower, uint256 amount);
    event StakeReturned(uint256 indexed creditLineId, address indexed borrower, uint256 amount);
    event StakeSlashed(uint256 indexed creditLineId, address indexed borrower, uint256 amount);
    event DrawdownExecuted(uint256 indexed creditLineId, uint256 amount);
    event RepaymentMade(uint256 indexed creditLineId, uint256 principal, uint256 interest);
    event CreditLineRepaid(uint256 indexed creditLineId);
    event CreditLineDefaulted(uint256 indexed creditLineId, uint256 lossAmount);
    event SellerStakeRateUpdated(uint256 oldRate, uint256 newRate);

    constructor(address _config, address _receivableNFT, address _pool, address _evaluationAgent, address _usdc) {
        require(_config != address(0), "Invalid config");
        require(_receivableNFT != address(0), "Invalid NFT");
        require(_pool != address(0), "Invalid pool");
        require(_evaluationAgent != address(0), "Invalid EA");
        require(_usdc != address(0), "Invalid USDC");

        config = ProtocolConfig(_config);
        receivableNFT = ReceivableNFT(_receivableNFT);
        pool = LiquidityPool(_pool);
        evaluationAgent = EvaluationAgent(_evaluationAgent);
        usdc = IERC20(_usdc);
        sellerStakeRate = 2000; // Default 20% of face amount

        // Default token holder perks (admin can tune or disable via setters)
        // nativeToken remains address(0) by default → discount disabled until set
        minTokenHoldingForPerks = 1_000 * 1e18; // 1,000 HKP (assumes 18 decimals)
        tokenHolderAprDiscountBps = 300; // -3% APR for holders
        tokenHolderGraceBonus = 0; // holders get same base as non-holders
        goodCreditScoreThreshold = 70; // score >= 70 counts as "good credit"
        goodCreditExtraGrace = 2 days; // +2 days on top of holder base

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Apply for a credit line backed by an approved receivable NFT
    function applyForCredit(uint256 _receivableTokenId) external nonReentrant returns (uint256 creditLineId) {
        require(!config.paused(), "Protocol paused");

        ReceivableNFT.ReceivableInfo memory r = receivableNFT.getReceivable(_receivableTokenId);
        require(r.borrower == msg.sender, "Not receivable owner");
        require(r.state == ReceivableNFT.ReceivableState.Approved, "Receivable not approved");
        require(receivableToCreditLine[_receivableTokenId] == 0, "Receivable already used");

        EvaluationAgent.BorrowerProfile memory profile = evaluationAgent.getProfile(msg.sender);
        require(profile.isApproved, "Borrower not approved");

        uint256 creditLimit = (r.faceAmount * profile.advanceRate) / 10000;
        require(creditLimit <= profile.maxCreditLimit, "Exceeds max credit limit");

        uint256 duration = r.dueDate - block.timestamp;
        require(duration <= config.maxCreditDuration(), "Duration exceeds maximum");

        // Calculate required stake upfront so seller knows before drawdown
        uint256 stakeRequired = (r.faceAmount * sellerStakeRate) / 10000;

        creditLineId = _nextCreditLineId++;

        creditLines[creditLineId] = CreditLine({
            borrower: msg.sender,
            receivableTokenId: _receivableTokenId,
            creditLimit: creditLimit,
            drawn: 0,
            interestRate: profile.interestRate,
            drawdownTime: 0,
            dueDate: r.dueDate,
            totalRepaid: 0,
            stakeAmount: stakeRequired,
            hasTokenDiscount: false, // resolved at drawdown
            state: CreditState.Approved
        });

        receivableToCreditLine[_receivableTokenId] = creditLineId + 1;

        emit CreditLineCreated(creditLineId, msg.sender, _receivableTokenId, creditLimit);
        emit CreditLineApproved(creditLineId);
    }

    /// @notice Draw funds from an approved credit line.
    /// @dev On first drawdown, seller must have approved this contract to spend
    ///      stakeAmount + _amount of USDC. The stake is held here until repaid or slashed.
    function drawdown(uint256 _creditLineId, uint256 _amount) external nonReentrant {
        require(!config.paused(), "Protocol paused");

        CreditLine storage cl = creditLines[_creditLineId];
        bool isFirstDrawdown = cl.state == CreditState.Approved;
        require(cl.borrower == msg.sender, "Not credit line owner");
        require(isFirstDrawdown || cl.state == CreditState.Active, "Invalid state");
        require(cl.drawn + _amount <= cl.creditLimit, "Exceeds credit limit");
        require(_amount > 0, "Zero amount");

        // First drawdown: collect seller stake, snapshot token discount, set timestamps
        if (isFirstDrawdown) {
            cl.drawdownTime = block.timestamp;
            cl.state = CreditState.Active;

            // Snapshot native token holdings → locks in APR discount for this credit line.
            // Evaluating at drawdown (not at interest calc) prevents just-in-time manipulation.
            if (_qualifiesForTokenPerks(msg.sender)) {
                cl.hasTokenDiscount = true;
                uint256 baseRate = cl.interestRate;
                uint256 effectiveRate = _applyAprDiscount(baseRate);
                cl.interestRate = effectiveRate;
                emit TokenDiscountApplied(_creditLineId, msg.sender, baseRate, effectiveRate);
            }

            // Pull stake from seller — held in this contract until repaid or slashed
        }

        cl.drawn += _amount;

        if (isFirstDrawdown) {
            receivableNFT.markFinanced(cl.receivableTokenId);
            if (cl.stakeAmount > 0) {
                usdc.safeTransferFrom(msg.sender, address(this), cl.stakeAmount);
                emit StakeDeposited(_creditLineId, msg.sender, cl.stakeAmount);
            }
        }

        pool.fundDrawdown(msg.sender, _amount);

        emit DrawdownExecuted(_creditLineId, _amount);
    }

    /// @notice Repay a credit line (partial or full).
    ///         On full repayment, seller's stake is returned automatically.
    function repay(uint256 _creditLineId, uint256 _amount) external nonReentrant {
        CreditLine storage cl = creditLines[_creditLineId];
        require(cl.state == CreditState.Active, "Not active");
        require(_amount > 0, "Zero amount");

        uint256 interest = calculateInterest(_creditLineId);
        uint256 amountOwed = cl.drawn + interest;

        if (_amount > amountOwed) {
            _amount = amountOwed;
        }

        uint256 interestPayment;
        uint256 principalPayment;

        if (_amount <= interest) {
            interestPayment = _amount;
            principalPayment = 0;
        } else {
            interestPayment = interest;
            principalPayment = _amount - interest;
        }

        bool isFullyRepaid = principalPayment >= cl.drawn;
        cl.drawn -= principalPayment;
        cl.totalRepaid += _amount;
        if (isFullyRepaid) {
            cl.state = CreditState.Repaid;
        }

        bool onTime = block.timestamp <= cl.dueDate;

        usdc.safeTransferFrom(msg.sender, address(pool), _amount);
        pool.receiveRepayment(principalPayment, interestPayment);
        evaluationAgent.recordRepaidAmount(cl.borrower, _amount);

        if (isFullyRepaid) {
            receivableNFT.markPaid(cl.receivableTokenId);
            evaluationAgent.recordRepayment(cl.borrower, onTime);

            // Return seller's stake in full — they repaid, they get it back
            if (cl.stakeAmount > 0) {
                usdc.safeTransfer(cl.borrower, cl.stakeAmount);
                emit StakeReturned(_creditLineId, cl.borrower, cl.stakeAmount);
            }

            emit CreditLineRepaid(_creditLineId);
        }

        emit RepaymentMade(_creditLineId, principalPayment, interestPayment);
    }

    /// @notice Trigger default on an overdue credit line (permissionless after grace period).
    ///         Seller stake is slashed first. Remaining loss is socialized across LPs.
    /// @dev Grace period is dynamic: token holders get more, and token holders with good
    ///      credit get even more. Non-holders use the protocol's base grace period.
    function triggerDefault(uint256 _creditLineId) external nonReentrant {
        _triggerDefault(_creditLineId);
    }

    /// @dev Internal default-trigger logic — shared by manual `triggerDefault` and
    ///      Chainlink Automation `performUpkeep`. Reverts if not eligible.
    function _triggerDefault(uint256 _creditLineId) internal {
        CreditLine storage cl = creditLines[_creditLineId];
        require(cl.state == CreditState.Active, "Not active");
        require(block.timestamp > cl.dueDate + _effectiveGracePeriod(cl), "Grace period not elapsed");

        uint256 lossAmount = cl.drawn;
        cl.state = CreditState.Defaulted;

        receivableNFT.markDefaulted(cl.receivableTokenId);

        // Step 1: Slash seller stake → inject cash into pool (partial recovery)
        uint256 slashed = cl.stakeAmount;
        if (slashed > 0) {
            usdc.safeTransfer(address(pool), slashed);
            emit StakeSlashed(_creditLineId, cl.borrower, slashed);
        }

        // Step 2: Record full drawn amount as loss → clears totalBorrowed to zero.
        // Net LP impact = lossAmount - slashed (stake cash offsets loss in totalAssets).
        pool.recordLoss(lossAmount);

        // Blacklist borrower permanently
        evaluationAgent.recordDefault(cl.borrower);
        evaluationAgent.recordRepayment(cl.borrower, false);

        emit CreditLineDefaulted(_creditLineId, lossAmount);
    }

    // --------------------------------------------------------------------
    // Chainlink Automation
    // --------------------------------------------------------------------
    //
    // Off-chain Chainlink nodes call `checkUpkeep` periodically (free / no gas).
    // If it returns `(true, performData)`, they submit `performUpkeep` on-chain.
    // This makes default detection fully automatic — no manual triggering needed.
    //
    // Both functions are gas-bounded: scan and execution are capped at
    // `MAX_AUTOMATION_BATCH` per call. If more credit lines need defaulting, the
    // Chainlink registry simply calls performUpkeep again on the next block.

    /// @notice Off-chain scan for defaultable credit lines.
    /// @dev Called view-only by Chainlink off-chain workers. Returns IDs of
    ///      credit lines whose grace period has elapsed (up to MAX_AUTOMATION_BATCH).
    /// @param /* checkData */ Unused. Reserved for future filtering (e.g., scan offset).
    /// @return upkeepNeeded True if at least one defaultable credit line was found.
    /// @return performData ABI-encoded `uint256[]` of credit line IDs to default.
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 total = _nextCreditLineId;
        uint256[] memory candidates = new uint256[](MAX_AUTOMATION_BATCH);
        uint256 found;

        for (uint256 i = 0; i < total && found < MAX_AUTOMATION_BATCH; i++) {
            CreditLine storage cl = creditLines[i];
            if (cl.state != CreditState.Active) continue;
            if (block.timestamp <= cl.dueDate + _effectiveGracePeriod(cl)) continue;
            candidates[found++] = i;
        }

        if (found == 0) return (false, "");

        // Trim array down to actual size
        uint256[] memory ids = new uint256[](found);
        for (uint256 j = 0; j < found; j++) {
            ids[j] = candidates[j];
        }
        return (true, abi.encode(ids));
    }

    /// @notice On-chain default trigger — called by Chainlink keeper (or anyone).
    /// @dev Permissionless: anyone can call this. Re-validates each ID is still
    ///      defaultable (state could have changed between checkUpkeep and performUpkeep
    ///      e.g., borrower repaid in the same block). Non-defaultable IDs are silently
    ///      skipped so one stale ID doesn't revert the whole batch.
    /// @param performData ABI-encoded `uint256[]` of credit line IDs to default.
    function performUpkeep(bytes calldata performData) external override nonReentrant {
        uint256[] memory ids = abi.decode(performData, (uint256[]));
        require(ids.length <= MAX_AUTOMATION_BATCH, "Batch too large");

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            CreditLine storage cl = creditLines[id];
            // Defensive re-check — skip silently if state changed
            if (cl.state != CreditState.Active) continue;
            if (block.timestamp <= cl.dueDate + _effectiveGracePeriod(cl)) continue;
            _triggerDefault(id);
        }
    }

    /// @notice Calculate accrued interest.
    ///         Normal APR applies up to dueDate. 1.5x penalty APR applies after dueDate.
    function calculateInterest(uint256 _creditLineId) public view returns (uint256) {
        CreditLine storage cl = creditLines[_creditLineId];
        if (cl.drawn == 0 || cl.drawdownTime == 0) return 0;

        uint256 normalEnd = block.timestamp < cl.dueDate ? block.timestamp : cl.dueDate;
        uint256 normalElapsed = normalEnd - cl.drawdownTime;
        uint256 normalInterest = (cl.drawn * cl.interestRate * normalElapsed) / (365 days * 10000);

        uint256 penaltyInterest = 0;
        if (block.timestamp > cl.dueDate) {
            uint256 overdueElapsed = block.timestamp - cl.dueDate;
            penaltyInterest =
                (cl.drawn * cl.interestRate * PENALTY_RATE_MULTIPLIER * overdueElapsed) / (365 days * 10000 * 10000);
        }

        return normalInterest + penaltyInterest;
    }

    /// @notice Update seller stake rate (admin only)
    function updateSellerStakeRate(uint256 _rate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_rate <= 10000, "Stake rate too high"); // Max 100%
        uint256 old = sellerStakeRate;
        sellerStakeRate = _rate;
        emit SellerStakeRateUpdated(old, _rate);
    }

    /// @notice Get required stake amount for a given face amount
    function getRequiredStake(uint256 _faceAmount) external view returns (uint256) {
        return (_faceAmount * sellerStakeRate) / 10000;
    }

    function totalOwed(uint256 _creditLineId) external view returns (uint256) {
        CreditLine storage cl = creditLines[_creditLineId];
        if (cl.state != CreditState.Active) return 0;
        return cl.drawn + calculateInterest(_creditLineId);
    }

    function getCreditLine(uint256 _creditLineId) external view returns (CreditLine memory) {
        return creditLines[_creditLineId];
    }

    function isOverdue(uint256 _creditLineId) external view returns (bool) {
        CreditLine storage cl = creditLines[_creditLineId];
        return cl.state == CreditState.Active && block.timestamp > cl.dueDate;
    }

    function canDefault(uint256 _creditLineId) external view returns (bool) {
        CreditLine storage cl = creditLines[_creditLineId];
        return cl.state == CreditState.Active && block.timestamp > cl.dueDate + _effectiveGracePeriod(cl);
    }

    /// @notice View the effective grace period for a credit line (seconds past dueDate
    ///         before default can be triggered).
    function effectiveGracePeriod(uint256 _creditLineId) external view returns (uint256) {
        return _effectiveGracePeriod(creditLines[_creditLineId]);
    }

    /// @notice True if the given address currently qualifies for HKP holder perks.
    function qualifiesForTokenPerks(address _borrower) external view returns (bool) {
        return _qualifiesForTokenPerks(_borrower);
    }

    /// @notice Preview the APR a borrower would receive if they drew down now.
    /// @dev Useful for UI — returns `baseRate` for non-holders, discounted rate for holders.
    function previewEffectiveRate(address _borrower, uint256 _baseRate) external view returns (uint256) {
        if (!_qualifiesForTokenPerks(_borrower)) return _baseRate;
        return _applyAprDiscount(_baseRate);
    }

    // --------------------------------------------------------------------
    // Admin: native token perks configuration
    // --------------------------------------------------------------------

    /// @notice Set (or clear) the native token used for holder perks.
    ///         Pass address(0) to disable the discount entirely.
    function setNativeToken(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address old = address(nativeToken);
        nativeToken = IERC20(_token);
        emit NativeTokenUpdated(old, _token);
    }

    /// @notice Update all token-holder perk parameters at once.
    /// @param _minHolding Minimum token balance to qualify (token's own decimals)
    /// @param _aprDiscountBps APR discount in basis points (floored at config.minInterestRate)
    /// @param _graceBonus Extra grace period (seconds) for holders
    /// @param _goodCreditThreshold Credit score threshold (0-100) for good-credit bonus
    /// @param _goodCreditExtraGrace Extra grace period (seconds) for good-credit holders
    function updateTokenHolderPerks(
        uint256 _minHolding,
        uint256 _aprDiscountBps,
        uint256 _graceBonus,
        uint256 _goodCreditThreshold,
        uint256 _goodCreditExtraGrace
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_aprDiscountBps <= 10000, "Discount too high");
        require(_goodCreditThreshold <= 100, "Threshold > 100");
        require(_graceBonus <= 30 days, "Grace bonus too long");
        require(_goodCreditExtraGrace <= 30 days, "Extra grace too long");

        minTokenHoldingForPerks = _minHolding;
        tokenHolderAprDiscountBps = _aprDiscountBps;
        tokenHolderGraceBonus = _graceBonus;
        goodCreditScoreThreshold = _goodCreditThreshold;
        goodCreditExtraGrace = _goodCreditExtraGrace;

        emit TokenHolderPerksUpdated(
            _minHolding, _aprDiscountBps, _graceBonus, _goodCreditThreshold, _goodCreditExtraGrace
        );
    }

    // --------------------------------------------------------------------
    // Internal helpers
    // --------------------------------------------------------------------

    function _qualifiesForTokenPerks(address _borrower) internal view returns (bool) {
        if (address(nativeToken) == address(0)) return false;
        if (minTokenHoldingForPerks == 0) return false; // admin not configured
        return nativeToken.balanceOf(_borrower) >= minTokenHoldingForPerks;
    }

    /// @dev Applies APR discount but floors at the protocol's configured minimum rate.
    function _applyAprDiscount(uint256 _baseRate) internal view returns (uint256) {
        uint256 minRate = config.minInterestRate();
        if (_baseRate <= minRate) return _baseRate;
        uint256 discount = tokenHolderAprDiscountBps;
        if (discount >= _baseRate) return minRate;
        uint256 reduced = _baseRate - discount;
        return reduced < minRate ? minRate : reduced;
    }

    /// @dev Effective grace period combines base (protocol default) with holder perks.
    ///      Good-credit bonus requires BOTH token holding (snapshotted) AND current score.
    function _effectiveGracePeriod(CreditLine storage _cl) internal view returns (uint256) {
        uint256 grace = config.defaultGracePeriod();
        if (!_cl.hasTokenDiscount) return grace;

        grace += tokenHolderGraceBonus;

        // Good-credit bonus uses the borrower's CURRENT credit score (not snapshot).
        // Rationale: if the seller burns their reputation between drawdown and default,
        // they shouldn't keep the extended grace — and vice versa.
        EvaluationAgent.BorrowerProfile memory profile = evaluationAgent.getProfile(_cl.borrower);
        if (profile.creditScore >= goodCreditScoreThreshold) {
            grace += goodCreditExtraGrace;
        }
        return grace;
    }

    function totalCreditLines() external view returns (uint256) {
        return _nextCreditLineId;
    }
}
