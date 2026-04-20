// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ProtocolConfig.sol";

/// @title LiquidityPool
/// @notice ERC-4626 vault for LP deposits. Funds borrower drawdowns and distributes yield.
contract LiquidityPool is ERC4626, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant FACILITY_ROLE = keccak256("FACILITY_ROLE");

    ProtocolConfig public immutable config;

    /// @notice Total principal currently lent out
    uint256 public totalBorrowed;

    /// @notice Total interest earned (lifetime)
    uint256 public totalInterestEarned;

    /// @notice Total losses from defaults (lifetime)
    uint256 public totalLosses;

    event Drawdown(address indexed borrower, uint256 amount);
    event RepaymentReceived(uint256 principal, uint256 interest, uint256 protocolFee);
    event LossRecorded(uint256 amount);

    constructor(IERC20 _usdc, address _config) ERC4626(_usdc) ERC20("HKPayFi LP Token", "hkLP") {
        require(_config != address(0), "Invalid config");
        config = ProtocolConfig(_config);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Total assets = cash in pool + outstanding loans - losses
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + totalBorrowed;
    }

    /// @notice Available liquidity for new drawdowns
    function availableLiquidity() public view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    /// @notice Fund a borrower drawdown (called by CreditFacility)
    function fundDrawdown(address _borrower, uint256 _amount) external onlyRole(FACILITY_ROLE) nonReentrant {
        require(!config.paused(), "Protocol paused");
        require(_amount <= availableLiquidity(), "Insufficient liquidity");

        totalBorrowed += _amount;
        IERC20(asset()).safeTransfer(_borrower, _amount);

        emit Drawdown(_borrower, _amount);
    }

    /// @notice Receive repayment from CreditFacility
    /// @param _principal Principal portion being repaid
    /// @param _interest Interest portion being repaid
    function receiveRepayment(uint256 _principal, uint256 _interest) external onlyRole(FACILITY_ROLE) nonReentrant {
        require(_principal <= totalBorrowed, "Principal exceeds borrowed");

        totalBorrowed -= _principal;

        // Calculate protocol fee from interest
        uint256 protocolFee = (_interest * config.protocolFeeRate()) / 10000;
        uint256 lpInterest = _interest - protocolFee;

        totalInterestEarned += lpInterest;

        // Transfer protocol fee to treasury
        if (protocolFee > 0) {
            IERC20(asset()).safeTransfer(config.treasury(), protocolFee);
        }

        emit RepaymentReceived(_principal, lpInterest, protocolFee);
    }

    /// @notice Record a loss from a defaulted credit line
    function recordLoss(uint256 _amount) external onlyRole(FACILITY_ROLE) nonReentrant {
        require(_amount <= totalBorrowed, "Loss exceeds borrowed");
        totalBorrowed -= _amount;
        totalLosses += _amount;
        emit LossRecorded(_amount);
    }

    /// @notice Override deposit to check pause
    function deposit(uint256 assets, address receiver) public override nonReentrant returns (uint256) {
        require(!config.paused(), "Protocol paused");
        return super.deposit(assets, receiver);
    }

    /// @notice Override withdraw to check pause and liquidity
    function withdraw(uint256 assets, address receiver, address owner) public override nonReentrant returns (uint256) {
        require(!config.paused(), "Protocol paused");
        require(assets <= availableLiquidity(), "Insufficient liquidity");
        return super.withdraw(assets, receiver, owner);
    }

    /// @notice Override mint to check pause
    function mint(uint256 shares, address receiver) public override nonReentrant returns (uint256) {
        require(!config.paused(), "Protocol paused");
        return super.mint(shares, receiver);
    }

    /// @notice Override redeem to check pause and liquidity
    function redeem(uint256 shares, address receiver, address owner) public override nonReentrant returns (uint256) {
        require(!config.paused(), "Protocol paused");
        uint256 assets = previewRedeem(shares);
        require(assets <= availableLiquidity(), "Insufficient liquidity");
        return super.redeem(shares, receiver, owner);
    }

    // Required override for AccessControl + ERC20
    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
