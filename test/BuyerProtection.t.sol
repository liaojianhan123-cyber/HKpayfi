// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/ProtocolConfig.sol";
import "../src/ReceivableNFT.sol";
import "../src/MockUSDC.sol";
import "../src/LiquidityPool.sol";
import "../src/EvaluationAgent.sol";
import "../src/CreditFacility.sol";

/// @title Seller Stake Test
/// @notice Verifies seller skin-in-the-game mechanism:
///         - Seller must stake USDC before first drawdown
///         - Stake is returned on successful repayment
///         - Stake is slashed to LP pool on default
///         - Remaining loss after slash is socialized across LPs
contract SellerStakeTest is Test {
    ProtocolConfig config;
    ReceivableNFT receivableNFT;
    MockUSDC usdc;
    LiquidityPool pool;
    EvaluationAgent evaluationAgent;
    CreditFacility creditFacility;

    address admin = makeAddr("admin");
    address treasury = makeAddr("treasury");
    address lp1 = makeAddr("lp1");
    address seller = makeAddr("seller"); // borrower = seller
    address buyer = makeAddr("buyer"); // just the invoice payer, not in protocol
    address evaluator = makeAddr("evaluator");
    address anyone = makeAddr("anyone");

    uint256 constant ONE_USDC = 1e6;
    uint256 constant INVOICE_AMOUNT = 100_000 * 1e6; // 100k USDC
    uint256 constant ADVANCE_RATE = 6000; // 60% → draws 60k
    uint256 constant INTEREST_RATE = 1500; // 15% APR
    uint256 constant STAKE_RATE = 2000; // 20% of face → 20k stake

    function setUp() public {
        vm.startPrank(admin);

        config = new ProtocolConfig(admin, treasury);
        usdc = new MockUSDC();
        receivableNFT = new ReceivableNFT(address(config));
        evaluationAgent = new EvaluationAgent(address(config), address(receivableNFT));
        pool = new LiquidityPool(usdc, address(config));

        creditFacility = new CreditFacility(
            address(config), address(receivableNFT), address(pool), address(evaluationAgent), address(usdc)
        );

        pool.grantRole(pool.FACILITY_ROLE(), address(creditFacility));
        receivableNFT.grantRole(receivableNFT.FACILITY_ROLE(), address(creditFacility));
        receivableNFT.grantRole(receivableNFT.EVALUATOR_ROLE(), address(evaluationAgent));
        evaluationAgent.grantRole(evaluationAgent.DEFAULT_ADMIN_ROLE(), address(creditFacility));
        evaluationAgent.grantRole(evaluationAgent.EVALUATOR_ROLE(), evaluator);

        // Fund seller generously — they need stake + repayment funds
        usdc.mint(seller, 200_000 * ONE_USDC);
        usdc.mint(lp1, 500_000 * ONE_USDC);

        vm.stopPrank();

        vm.prank(lp1);
        usdc.approve(address(pool), type(uint256).max);

        vm.prank(seller);
        usdc.approve(address(creditFacility), type(uint256).max);
    }

    // ==========================================
    // Cash Flow: What the Numbers Look Like
    // ==========================================

    function test_CashFlow_SellerGets40kNetToday() public {
        // Invoice: 100k | advance rate: 60% → draws 60k | stake: 20% → stakes 20k
        // Seller net cash today = 60k - 20k = 40k
        _setupLP();
        (uint256 clId,) = _createCreditLine();

        uint256 sellerBalBefore = usdc.balanceOf(seller);

        vm.prank(seller);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        uint256 sellerBalAfter = usdc.balanceOf(seller);

        // Seller paid 20k stake, received 60k → net +40k
        assertEq(sellerBalAfter - sellerBalBefore, 40_000 * ONE_USDC);

        // Stake is locked in CreditFacility
        assertEq(usdc.balanceOf(address(creditFacility)), 20_000 * ONE_USDC);
    }

    // ==========================================
    // Repayment: Stake Returned in Full
    // ==========================================

    function test_Repayment_StakeReturnedToSeller() public {
        _setupLP();
        (uint256 clId,) = _createCreditLine();

        vm.prank(seller);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        // Buyer pays seller off-chain (simulated: seller just has USDC from somewhere)
        // Seller repays protocol
        uint256 interest = creditFacility.calculateInterest(clId);
        uint256 sellerBalBefore = usdc.balanceOf(seller);

        vm.prank(seller);
        creditFacility.repay(clId, 60_000 * ONE_USDC + interest);

        uint256 sellerBalAfter = usdc.balanceOf(seller);

        // Seller got back 20k stake, paid 60k principal + interest
        // Net change = +20k - 60k - interest
        assertEq(sellerBalAfter, sellerBalBefore - 60_000 * ONE_USDC - interest + 20_000 * ONE_USDC);

        // Stake fully returned, nothing left in CreditFacility
        assertEq(usdc.balanceOf(address(creditFacility)), 0);

        // Credit line closed
        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertTrue(cl.state == CreditFacility.CreditState.Repaid);
    }

    // ==========================================
    // Default: Stake Slashed First, Then LP
    // ==========================================

    function test_Default_StakeSlashedBeforeLP() public {
        _setupLP();
        (uint256 clId,) = _createCreditLine();

        vm.prank(seller);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        uint256 poolBalBefore = usdc.balanceOf(address(pool));

        // Skip past grace period
        vm.warp(block.timestamp + 60 days + config.defaultGracePeriod() + 1);

        vm.prank(anyone);
        creditFacility.triggerDefault(clId);

        // Stake (20k) went to pool as first-loss
        uint256 poolBalAfter = usdc.balanceOf(address(pool));
        assertEq(poolBalAfter - poolBalBefore, 20_000 * ONE_USDC);

        // Full drawn (60k) recorded as gross loss. Stake (20k) injected as cash recovery.
        // Net LP impact = 60k - 20k = 40k (visible via totalAssets drop)
        assertEq(pool.totalLosses(), 60_000 * ONE_USDC);

        // Seller blacklisted
        EvaluationAgent.BorrowerProfile memory profile = evaluationAgent.getProfile(seller);
        assertFalse(profile.isApproved);
        assertEq(profile.creditScore, 0);

        // Nothing left in CreditFacility
        assertEq(usdc.balanceOf(address(creditFacility)), 0);
    }

    function test_Default_StakeCoversFullLoss() public {
        // If stake ≥ drawn amount, LP takes zero loss
        // Set stake rate to 100% (same as drawn)
        vm.prank(admin);
        creditFacility.updateSellerStakeRate(6000); // 60% stake = same as 60% advance

        _setupLP();
        (uint256 clId,) = _createCreditLine();

        vm.prank(seller);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        // Stake = 60k, drawn = 60k → full cover
        assertEq(usdc.balanceOf(address(creditFacility)), 60_000 * ONE_USDC);

        vm.warp(block.timestamp + 60 days + config.defaultGracePeriod() + 1);
        vm.prank(anyone);
        creditFacility.triggerDefault(clId);

        // Gross loss = 60k, but stake (60k) fully covers it → net LP loss = 0
        // totalLosses records gross, but totalAssets is unchanged (stake cash offsets)
        assertEq(pool.totalLosses(), 60_000 * ONE_USDC);
        // Verify net: pool received 60k stake cash, lost 60k from totalBorrowed → neutral
        assertEq(pool.totalBorrowed(), 0);
    }

    // ==========================================
    // Penalty Interest After Due Date
    // ==========================================

    function test_PenaltyInterest_AfterDueDate() public {
        _setupLP();
        (uint256 clId,) = _createCreditLine();

        vm.prank(seller);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        // 10 days overdue
        vm.warp(block.timestamp + 60 days + 10 days);

        uint256 interest = creditFacility.calculateInterest(clId);

        // Normal interest: 60k × 15% × 60/365
        uint256 normalInterest = (60_000 * ONE_USDC * 1500 * 60 days) / (365 days * 10000);
        // Penalty interest: 60k × 15% × 1.5 × 10/365
        uint256 penaltyInterest = (60_000 * ONE_USDC * 1500 * 15000 * 10 days) / (365 days * 10000 * 10000);

        assertApproxEqAbs(interest, normalInterest + penaltyInterest, 100);
        assertGt(interest, normalInterest); // Must be more than normal
    }

    // ==========================================
    // Permissionless Default Trigger
    // ==========================================

    function test_AnyoneCanTriggerDefault() public {
        _setupLP();
        (uint256 clId,) = _createCreditLine();

        vm.prank(seller);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        vm.warp(block.timestamp + 60 days + config.defaultGracePeriod() + 1);

        // Random address triggers default
        vm.prank(anyone);
        creditFacility.triggerDefault(clId);

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertTrue(cl.state == CreditFacility.CreditState.Defaulted);
    }

    // ==========================================
    // Helpers
    // ==========================================

    function _setupLP() internal {
        vm.prank(lp1);
        pool.deposit(300_000 * ONE_USDC, lp1);

        vm.prank(evaluator);
        evaluationAgent.approveBorrower(seller, 200_000 * ONE_USDC, INTEREST_RATE, ADVANCE_RATE);
    }

    function _createCreditLine() internal returns (uint256 creditLineId, uint256 tokenId) {
        vm.prank(seller);
        tokenId = receivableNFT.mint(buyer, INVOICE_AMOUNT, block.timestamp + 60 days, "INV-001");

        vm.prank(evaluator);
        evaluationAgent.approveReceivable(tokenId);

        vm.prank(seller);
        creditLineId = creditFacility.applyForCredit(tokenId);
    }
}
