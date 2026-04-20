// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/ProtocolConfig.sol";
import "../src/ReceivableNFT.sol";
import "../src/MockUSDC.sol";
import "../src/LiquidityPool.sol";
import "../src/EvaluationAgent.sol";
import "../src/CreditFacility.sol";

/// @title HKPayFi Full Integration Test Suite
contract HKPayFiTest is Test {
    ProtocolConfig config;
    ReceivableNFT receivableNFT;
    MockUSDC usdc;
    LiquidityPool pool;
    EvaluationAgent evaluationAgent;
    CreditFacility creditFacility;

    address admin = makeAddr("admin");
    address treasury = makeAddr("treasury");
    address lp1 = makeAddr("lp1");
    address lp2 = makeAddr("lp2");
    address borrower1 = makeAddr("borrower1");
    address borrower2 = makeAddr("borrower2");
    address payer = makeAddr("payer");
    address guardian = makeAddr("guardian");
    address evaluator = makeAddr("evaluator");

    uint256 constant USDC_DECIMALS = 6;
    uint256 constant ONE_USDC = 10 ** USDC_DECIMALS;

    function setUp() public {
        vm.startPrank(admin);

        // 1. Deploy config
        config = new ProtocolConfig(admin, treasury);
        config.grantRole(config.GUARDIAN_ROLE(), guardian);

        // 2. Deploy mock USDC
        usdc = new MockUSDC();

        // 3. Deploy ReceivableNFT
        receivableNFT = new ReceivableNFT(address(config));

        // 4. Deploy EvaluationAgent
        evaluationAgent = new EvaluationAgent(address(config), address(receivableNFT));
        evaluationAgent.grantRole(evaluationAgent.EVALUATOR_ROLE(), evaluator);

        // 5. Deploy LiquidityPool
        pool = new LiquidityPool(usdc, address(config));

        // 6. Deploy CreditFacility
        creditFacility = new CreditFacility(
            address(config), address(receivableNFT), address(pool), address(evaluationAgent), address(usdc)
        );

        // 7. Grant roles
        pool.grantRole(pool.FACILITY_ROLE(), address(creditFacility));
        receivableNFT.grantRole(receivableNFT.FACILITY_ROLE(), address(creditFacility));
        receivableNFT.grantRole(receivableNFT.EVALUATOR_ROLE(), address(evaluationAgent));
        evaluationAgent.grantRole(evaluationAgent.DEFAULT_ADMIN_ROLE(), address(creditFacility));

        // 8. Mint USDC to LPs and borrowers
        usdc.mint(lp1, 500_000 * ONE_USDC);
        usdc.mint(lp2, 500_000 * ONE_USDC);
        usdc.mint(borrower1, 100_000 * ONE_USDC); // for repayments
        usdc.mint(borrower2, 100_000 * ONE_USDC);

        vm.stopPrank();

        // Approve pool for LPs
        vm.prank(lp1);
        usdc.approve(address(pool), type(uint256).max);
        vm.prank(lp2);
        usdc.approve(address(pool), type(uint256).max);
        // Approve CreditFacility for borrowers (for repayments via transferFrom)
        vm.prank(borrower1);
        usdc.approve(address(creditFacility), type(uint256).max);
        vm.prank(borrower2);
        usdc.approve(address(creditFacility), type(uint256).max);
    }

    // ==========================================
    // ProtocolConfig Tests
    // ==========================================

    function test_ConfigInitialization() public view {
        assertEq(config.maxAdvanceRate(), 9000);
        assertEq(config.minInterestRate(), 500);
        assertEq(config.protocolFeeRate(), 1000);
        assertEq(config.treasury(), treasury);
        assertEq(config.defaultGracePeriod(), 7 days);
    }

    function test_ConfigPauseUnpause() public {
        vm.prank(guardian);
        config.pause();
        assertTrue(config.paused());

        vm.prank(admin);
        config.unpause();
        assertFalse(config.paused());
    }

    function test_ConfigUpdateParameters() public {
        vm.prank(admin);
        config.updateParameters(9500, 300, 90 days, 2000);
        assertEq(config.maxAdvanceRate(), 9500);
        assertEq(config.minInterestRate(), 300);
        assertEq(config.maxCreditDuration(), 90 days);
        assertEq(config.protocolFeeRate(), 2000);
    }

    function test_RevertConfigUpdateByNonAdmin() public {
        vm.prank(borrower1);
        vm.expectRevert();
        config.updateParameters(9500, 300, 90 days, 2000);
    }

    // ==========================================
    // ReceivableNFT Tests
    // ==========================================

    function test_MintReceivable() public {
        vm.prank(borrower1);
        uint256 tokenId = receivableNFT.mint(payer, 100_000 * ONE_USDC, block.timestamp + 60 days, "INV-001");

        assertEq(tokenId, 0);
        assertEq(receivableNFT.ownerOf(0), borrower1);

        ReceivableNFT.ReceivableInfo memory r = receivableNFT.getReceivable(0);
        assertEq(r.borrower, borrower1);
        assertEq(r.payer, payer);
        assertEq(r.faceAmount, 100_000 * ONE_USDC);
        assertTrue(r.state == ReceivableNFT.ReceivableState.Created);
    }

    function test_RevertMintWithPastDueDate() public {
        vm.prank(borrower1);
        vm.expectRevert("Due date must be in future");
        receivableNFT.mint(payer, 100_000 * ONE_USDC, block.timestamp - 1, "INV-002");
    }

    function test_RevertMintWhenPaused() public {
        vm.prank(guardian);
        config.pause();

        vm.prank(borrower1);
        vm.expectRevert("Protocol paused");
        receivableNFT.mint(payer, 100_000 * ONE_USDC, block.timestamp + 60 days, "INV-003");
    }

    function test_ApproveReceivable() public {
        vm.prank(borrower1);
        receivableNFT.mint(payer, 100_000 * ONE_USDC, block.timestamp + 60 days, "INV-001");

        vm.prank(evaluator);
        evaluationAgent.approveReceivable(0);

        ReceivableNFT.ReceivableInfo memory r = receivableNFT.getReceivable(0);
        assertTrue(r.state == ReceivableNFT.ReceivableState.Approved);
    }

    // ==========================================
    // LiquidityPool Tests
    // ==========================================

    function test_LPDeposit() public {
        vm.prank(lp1);
        uint256 shares = pool.deposit(100_000 * ONE_USDC, lp1);

        assertGt(shares, 0);
        assertEq(pool.totalAssets(), 100_000 * ONE_USDC);
        assertEq(pool.availableLiquidity(), 100_000 * ONE_USDC);
    }

    function test_LPWithdraw() public {
        vm.prank(lp1);
        pool.deposit(100_000 * ONE_USDC, lp1);

        vm.prank(lp1);
        pool.withdraw(50_000 * ONE_USDC, lp1, lp1);

        assertEq(pool.totalAssets(), 50_000 * ONE_USDC);
        assertEq(usdc.balanceOf(lp1), 450_000 * ONE_USDC);
    }

    function test_RevertDepositWhenPaused() public {
        vm.prank(guardian);
        config.pause();

        vm.prank(lp1);
        vm.expectRevert("Protocol paused");
        pool.deposit(100_000 * ONE_USDC, lp1);
    }

    function test_MultipleLPDeposits() public {
        vm.prank(lp1);
        pool.deposit(200_000 * ONE_USDC, lp1);

        vm.prank(lp2);
        pool.deposit(300_000 * ONE_USDC, lp2);

        assertEq(pool.totalAssets(), 500_000 * ONE_USDC);
    }

    // ==========================================
    // EvaluationAgent Tests
    // ==========================================

    function test_ApproveBorrower() public {
        vm.prank(evaluator);
        evaluationAgent.approveBorrower(borrower1, 200_000 * ONE_USDC, 1500, 9000);

        EvaluationAgent.BorrowerProfile memory profile = evaluationAgent.getProfile(borrower1);
        assertTrue(profile.isApproved);
        assertEq(profile.maxCreditLimit, 200_000 * ONE_USDC);
        assertEq(profile.interestRate, 1500);
        assertEq(profile.advanceRate, 9000);
        assertEq(profile.creditScore, 50);
    }

    function test_RevokeBorrower() public {
        vm.prank(evaluator);
        evaluationAgent.approveBorrower(borrower1, 200_000 * ONE_USDC, 1500, 9000);

        vm.prank(evaluator);
        evaluationAgent.revokeBorrower(borrower1);

        EvaluationAgent.BorrowerProfile memory profile = evaluationAgent.getProfile(borrower1);
        assertFalse(profile.isApproved);
    }

    function test_RevertReapproveBlacklistedBorrower() public {
        _setupBorrower();
        _setupPool();

        vm.prank(borrower1);
        uint256 clId = creditFacility.applyForCredit(0);

        vm.prank(borrower1);
        creditFacility.drawdown(clId, 50_000 * ONE_USDC);

        vm.warp(block.timestamp + 60 days + 7 days + 1);
        creditFacility.triggerDefault(clId);

        vm.prank(evaluator);
        vm.expectRevert("Borrower blacklisted");
        evaluationAgent.approveBorrower(borrower1, 200_000 * ONE_USDC, 1500, 9000);
    }

    function test_CalculateAdvance() public {
        vm.prank(evaluator);
        evaluationAgent.approveBorrower(borrower1, 200_000 * ONE_USDC, 1500, 9000);

        uint256 advance = evaluationAgent.calculateAdvance(borrower1, 100_000 * ONE_USDC);
        assertEq(advance, 90_000 * ONE_USDC); // 90% of face value
    }

    // ==========================================
    // CreditFacility Tests
    // ==========================================

    function test_ApplyForCredit() public {
        _setupBorrower();

        vm.prank(borrower1);
        uint256 clId = creditFacility.applyForCredit(0);

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertEq(cl.borrower, borrower1);
        assertEq(cl.creditLimit, 90_000 * ONE_USDC); // 90% of 100k
        assertTrue(cl.state == CreditFacility.CreditState.Approved);
    }

    function test_Drawdown() public {
        _setupBorrower();
        _setupPool();

        vm.prank(borrower1);
        uint256 clId = creditFacility.applyForCredit(0);

        uint256 balBefore = usdc.balanceOf(borrower1);

        vm.prank(borrower1);
        creditFacility.drawdown(clId, 50_000 * ONE_USDC);

        // Drawdown +50k, but first drawdown also pulls stake (20% of 100k face = 20k)
        // Net balance change = +50k - 20k = +30k
        assertEq(usdc.balanceOf(borrower1), balBefore + 50_000 * ONE_USDC - 20_000 * ONE_USDC);

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertEq(cl.drawn, 50_000 * ONE_USDC);
        assertTrue(cl.state == CreditFacility.CreditState.Active);
        assertEq(pool.totalBorrowed(), 50_000 * ONE_USDC);
    }

    function test_RevertDrawdownExceedLimit() public {
        _setupBorrower();
        _setupPool();

        vm.prank(borrower1);
        uint256 clId = creditFacility.applyForCredit(0);

        vm.prank(borrower1);
        vm.expectRevert("Exceeds credit limit");
        creditFacility.drawdown(clId, 100_000 * ONE_USDC); // limit is 90k
    }

    function test_FullRepayment() public {
        _setupBorrower();
        _setupPool();

        vm.prank(borrower1);
        uint256 clId = creditFacility.applyForCredit(0);

        vm.prank(borrower1);
        creditFacility.drawdown(clId, 90_000 * ONE_USDC);

        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);

        // Calculate total owed
        uint256 interest = creditFacility.calculateInterest(clId);
        uint256 totalPayment = 90_000 * ONE_USDC + interest;

        // Mint extra USDC for interest payment
        vm.prank(admin);
        usdc.mint(borrower1, interest);

        // Approve CreditFacility to transfer repayment
        vm.prank(borrower1);
        usdc.approve(address(pool), type(uint256).max);

        vm.prank(borrower1);
        creditFacility.repay(clId, totalPayment);

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertTrue(cl.state == CreditFacility.CreditState.Repaid);
        assertEq(cl.drawn, 0);
        assertEq(pool.totalBorrowed(), 0);

        // Check credit score improved: 50 + 10 = 60
        EvaluationAgent.BorrowerProfile memory profile = evaluationAgent.getProfile(borrower1);
        assertEq(profile.creditScore, 60);
        assertEq(profile.onTimeRepayments, 1);
    }

    function test_InterestCalculation() public {
        _setupBorrower();
        _setupPool();

        vm.prank(borrower1);
        uint256 clId = creditFacility.applyForCredit(0);

        vm.prank(borrower1);
        creditFacility.drawdown(clId, 90_000 * ONE_USDC);

        // Fast forward 30 days (within 60-day due date, no penalty interest)
        vm.warp(block.timestamp + 30 days);

        uint256 interest = creditFacility.calculateInterest(clId);
        // Expected: 90,000 * 15% * 30/365 = 1,109.58... USDC
        uint256 expected = (90_000 * ONE_USDC * 1500 * 30 days) / (365 days * 10000);
        assertEq(interest, expected);
    }

    function test_TriggerDefault() public {
        _setupBorrower();
        _setupPool();

        vm.prank(borrower1);
        uint256 clId = creditFacility.applyForCredit(0);

        vm.prank(borrower1);
        creditFacility.drawdown(clId, 50_000 * ONE_USDC);

        // Fast forward past due date + grace period
        vm.warp(block.timestamp + 60 days + 7 days + 1);

        uint256 poolAssetsBefore = pool.totalAssets();

        creditFacility.triggerDefault(clId);

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertTrue(cl.state == CreditFacility.CreditState.Defaulted);

        // Full drawn (50k) recorded as gross loss. Stake (20k) injected as cash recovery.
        // Net LP impact = 50k - 20k = 30k (visible via totalAssets drop, not totalLosses)
        assertEq(pool.totalLosses(), 50_000 * ONE_USDC);
        assertEq(pool.totalBorrowed(), 0);

        // Borrower blacklisted: score = 0, isApproved = false
        EvaluationAgent.BorrowerProfile memory profile = evaluationAgent.getProfile(borrower1);
        assertEq(profile.creditScore, 0);
        assertFalse(profile.isApproved);
        assertEq(profile.defaults, 1);
    }

    function test_RevertDefaultBeforeGracePeriod() public {
        _setupBorrower();
        _setupPool();

        vm.prank(borrower1);
        uint256 clId = creditFacility.applyForCredit(0);

        vm.prank(borrower1);
        creditFacility.drawdown(clId, 50_000 * ONE_USDC);

        // Fast forward past due date but within grace period
        vm.warp(block.timestamp + 60 days + 3 days);

        vm.expectRevert("Grace period not elapsed");
        creditFacility.triggerDefault(clId);
    }

    function test_ProtocolFeeDistribution() public {
        _setupBorrower();
        _setupPool();

        vm.prank(borrower1);
        uint256 clId = creditFacility.applyForCredit(0);

        vm.prank(borrower1);
        creditFacility.drawdown(clId, 90_000 * ONE_USDC);

        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);

        uint256 interest = creditFacility.calculateInterest(clId);
        uint256 totalPayment = 90_000 * ONE_USDC + interest;

        vm.prank(admin);
        usdc.mint(borrower1, interest);

        uint256 treasuryBefore = usdc.balanceOf(treasury);

        vm.prank(borrower1);
        creditFacility.repay(clId, totalPayment);

        uint256 protocolFee = (interest * 1000) / 10000; // 10% of interest
        assertEq(usdc.balanceOf(treasury) - treasuryBefore, protocolFee);
    }

    function test_LPYieldAfterRepayment() public {
        // LP1 deposits 200k, LP2 deposits 300k (total 500k)
        vm.prank(lp1);
        pool.deposit(200_000 * ONE_USDC, lp1);
        vm.prank(lp2);
        pool.deposit(300_000 * ONE_USDC, lp2);

        _setupBorrower();

        vm.prank(borrower1);
        uint256 clId = creditFacility.applyForCredit(0);

        vm.prank(borrower1);
        creditFacility.drawdown(clId, 90_000 * ONE_USDC);

        // 30 days later
        vm.warp(block.timestamp + 30 days);

        uint256 interest = creditFacility.calculateInterest(clId);
        uint256 totalPayment = 90_000 * ONE_USDC + interest;

        vm.prank(admin);
        usdc.mint(borrower1, interest);

        vm.prank(borrower1);
        creditFacility.repay(clId, totalPayment);

        // Pool total assets should be > 500k due to interest (minus protocol fee)
        uint256 protocolFee = (interest * 1000) / 10000;
        uint256 expectedAssets = 500_000 * ONE_USDC + interest - protocolFee;
        assertEq(pool.totalAssets(), expectedAssets);
    }

    // ==========================================
    // Full End-to-End Flow
    // ==========================================

    function test_FullE2EFlow() public {
        // 1. LPs deposit
        vm.prank(lp1);
        pool.deposit(200_000 * ONE_USDC, lp1);

        // 2. Evaluator approves borrower
        vm.prank(evaluator);
        evaluationAgent.approveBorrower(borrower1, 200_000 * ONE_USDC, 1500, 9000);

        // 3. Borrower mints receivable NFT
        vm.prank(borrower1);
        uint256 tokenId = receivableNFT.mint(payer, 100_000 * ONE_USDC, block.timestamp + 60 days, "INV-HK-001");

        // 4. Evaluator approves receivable
        vm.prank(evaluator);
        evaluationAgent.approveReceivable(tokenId);

        // 5. Borrower applies for credit
        vm.prank(borrower1);
        uint256 clId = creditFacility.applyForCredit(tokenId);

        // 6. Borrower draws down
        vm.prank(borrower1);
        creditFacility.drawdown(clId, 90_000 * ONE_USDC);

        // Verify state
        assertTrue(creditFacility.isOverdue(clId) == false);
        assertEq(pool.totalBorrowed(), 90_000 * ONE_USDC);
        assertEq(pool.availableLiquidity(), 110_000 * ONE_USDC);

        // 7. Time passes (45 days)
        vm.warp(block.timestamp + 45 days);

        // 8. Borrower repays
        uint256 interest = creditFacility.calculateInterest(clId);
        uint256 total = 90_000 * ONE_USDC + interest;
        vm.prank(admin);
        usdc.mint(borrower1, interest);

        vm.prank(borrower1);
        creditFacility.repay(clId, total);

        // 9. Verify final state
        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertTrue(cl.state == CreditFacility.CreditState.Repaid);

        ReceivableNFT.ReceivableInfo memory r = receivableNFT.getReceivable(tokenId);
        assertTrue(r.state == ReceivableNFT.ReceivableState.Paid);

        EvaluationAgent.BorrowerProfile memory profile = evaluationAgent.getProfile(borrower1);
        assertEq(profile.onTimeRepayments, 1);
        assertGt(profile.creditScore, 50); // improved: 50 + 10 = 60

        // 10. LP can withdraw more than deposited (earned yield)
        uint256 lpShares = pool.balanceOf(lp1);
        uint256 lpAssetsRedeemable = pool.previewRedeem(lpShares);
        assertGt(lpAssetsRedeemable, 200_000 * ONE_USDC);
    }

    // ==========================================
    // Fuzz Tests
    // ==========================================

    function testFuzz_DepositWithdraw(uint256 amount) public {
        amount = bound(amount, 1 * ONE_USDC, 500_000 * ONE_USDC);

        vm.prank(lp1);
        uint256 shares = pool.deposit(amount, lp1);

        vm.prank(lp1);
        uint256 withdrawn = pool.redeem(shares, lp1, lp1);

        // Allow 1 wei rounding
        assertApproxEqAbs(withdrawn, amount, 1);
    }

    function testFuzz_InterestAccrual(uint256 days_) public {
        // Bound within due date (60 days) to avoid penalty interest
        days_ = bound(days_, 1, 59);

        _setupBorrower();
        _setupPool();

        vm.prank(borrower1);
        uint256 clId = creditFacility.applyForCredit(0);

        vm.prank(borrower1);
        creditFacility.drawdown(clId, 90_000 * ONE_USDC);

        vm.warp(block.timestamp + days_ * 1 days);

        uint256 interest = creditFacility.calculateInterest(clId);
        uint256 expectedInterest = (90_000 * ONE_USDC * 1500 * days_ * 1 days) / (365 days * 10000);
        assertEq(interest, expectedInterest);
    }

    // ==========================================
    // Helpers
    // ==========================================

    function _setupBorrower() internal {
        vm.prank(evaluator);
        evaluationAgent.approveBorrower(borrower1, 200_000 * ONE_USDC, 1500, 9000);

        vm.prank(borrower1);
        receivableNFT.mint(payer, 100_000 * ONE_USDC, block.timestamp + 60 days, "INV-001");

        vm.prank(evaluator);
        evaluationAgent.approveReceivable(0);
    }

    function _setupPool() internal {
        vm.prank(lp1);
        pool.deposit(200_000 * ONE_USDC, lp1);
    }
}
