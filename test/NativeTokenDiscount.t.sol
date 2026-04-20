// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/ProtocolConfig.sol";
import "../src/ReceivableNFT.sol";
import "../src/MockUSDC.sol";
import "../src/LiquidityPool.sol";
import "../src/EvaluationAgent.sol";
import "../src/CreditFacility.sol";
import "../src/HKPayToken.sol";

/// @title Native Token (HKP) Discount Test
/// @notice Verifies seller perks for holding HKP:
///         - APR discount (snapshotted at drawdown, floored at minInterestRate)
///         - Extended default grace period (tiered by credit score)
///         - Non-holders must pay full APR and get only the base grace period
contract NativeTokenDiscountTest is Test {
    ProtocolConfig config;
    ReceivableNFT receivableNFT;
    MockUSDC usdc;
    HKPayToken hkp;
    LiquidityPool pool;
    EvaluationAgent evaluationAgent;
    CreditFacility creditFacility;

    address admin = makeAddr("admin");
    address treasury = makeAddr("treasury");
    address lp1 = makeAddr("lp1");
    address sellerA = makeAddr("sellerA"); // non-holder
    address sellerB = makeAddr("sellerB"); // token holder, normal credit
    address sellerC = makeAddr("sellerC"); // token holder, good credit
    address buyer = makeAddr("buyer");
    address evaluator = makeAddr("evaluator");
    address anyone = makeAddr("anyone");

    uint256 constant ONE_USDC = 1e6;
    uint256 constant ONE_HKP = 1e18;
    uint256 constant INVOICE_AMOUNT = 100_000 * 1e6;
    uint256 constant ADVANCE_RATE = 6000; // 60%
    uint256 constant INTEREST_RATE = 1500; // 15% APR base
    uint256 constant MIN_HOLDING = 1_000 * 1e18; // 1,000 HKP threshold (default)

    function setUp() public {
        vm.startPrank(admin);

        config = new ProtocolConfig(admin, treasury);
        usdc = new MockUSDC();
        hkp = new HKPayToken(admin);
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

        // Wire up native token to CreditFacility
        creditFacility.setNativeToken(address(hkp));

        // Re-tune perks to match user spec:
        //   base grace = 5 days (set on config), holder bonus = 0,
        //   good credit threshold = 70, good-credit extra = +2 days → 7 days total
        //   APR discount = 300 bps (-3%)
        config.updateDefaultGracePeriod(5 days);
        creditFacility.updateTokenHolderPerks(
            MIN_HOLDING,
            300, // -3% APR
            0, // no flat holder bonus
            70, // good-credit threshold
            2 days // good-credit extra grace
        );

        // Fund sellers
        usdc.mint(sellerA, 200_000 * ONE_USDC);
        usdc.mint(sellerB, 200_000 * ONE_USDC);
        usdc.mint(sellerC, 200_000 * ONE_USDC);
        usdc.mint(lp1, 500_000 * ONE_USDC);

        // Mint HKP to sellerB and sellerC (both above threshold)
        hkp.mint(sellerB, 2_000 * ONE_HKP);
        hkp.mint(sellerC, 2_000 * ONE_HKP);
        // sellerA stays at 0 HKP

        vm.stopPrank();

        vm.prank(lp1);
        usdc.approve(address(pool), type(uint256).max);
        vm.prank(sellerA);
        usdc.approve(address(creditFacility), type(uint256).max);
        vm.prank(sellerB);
        usdc.approve(address(creditFacility), type(uint256).max);
        vm.prank(sellerC);
        usdc.approve(address(creditFacility), type(uint256).max);

        // LP deposits
        vm.prank(lp1);
        pool.deposit(300_000 * ONE_USDC, lp1);

        // Approve all three sellers. Bump sellerC's credit score above threshold.
        vm.startPrank(evaluator);
        evaluationAgent.approveBorrower(sellerA, 200_000 * ONE_USDC, INTEREST_RATE, ADVANCE_RATE);
        evaluationAgent.approveBorrower(sellerB, 200_000 * ONE_USDC, INTEREST_RATE, ADVANCE_RATE);
        evaluationAgent.approveBorrower(sellerC, 200_000 * ONE_USDC, INTEREST_RATE, ADVANCE_RATE);
        vm.stopPrank();

        // Bump sellerC's credit score to 70 (2x +10 on-time repayments from 50 base)
        vm.startPrank(address(creditFacility));
        evaluationAgent.recordRepayment(sellerC, true); // 50 → 60
        evaluationAgent.recordRepayment(sellerC, true); // 60 → 70
        vm.stopPrank();
    }

    // ==========================================
    // APR discount
    // ==========================================

    function test_NonHolder_PaysFullApr() public {
        (uint256 clId,) = _openCredit(sellerA);

        vm.prank(sellerA);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertEq(cl.interestRate, INTEREST_RATE, "non-holder should pay full APR");
        assertFalse(cl.hasTokenDiscount);
    }

    function test_Holder_GetsAprDiscount() public {
        (uint256 clId,) = _openCredit(sellerB);

        vm.prank(sellerB);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertEq(cl.interestRate, INTEREST_RATE - 300, "holder APR = base - 300 bps");
        assertTrue(cl.hasTokenDiscount);
    }

    function test_Holder_BelowThreshold_NoDiscount() public {
        // Give a fresh seller only 500 HKP (below 1000 threshold)
        address sellerD = makeAddr("sellerD");
        vm.prank(admin);
        hkp.mint(sellerD, 500 * ONE_HKP);
        vm.prank(admin);
        usdc.mint(sellerD, 200_000 * ONE_USDC);
        vm.prank(sellerD);
        usdc.approve(address(creditFacility), type(uint256).max);
        vm.prank(evaluator);
        evaluationAgent.approveBorrower(sellerD, 200_000 * ONE_USDC, INTEREST_RATE, ADVANCE_RATE);

        (uint256 clId,) = _openCredit(sellerD);
        vm.prank(sellerD);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertEq(cl.interestRate, INTEREST_RATE, "below threshold should receive no discount");
        assertFalse(cl.hasTokenDiscount);
    }

    function test_AprDiscount_FlooredAtMinRate() public {
        // config.minInterestRate default = 500. Set base rate to 600 and discount 300 → floor at 500.
        vm.prank(evaluator);
        evaluationAgent.approveBorrower(sellerB, 200_000 * ONE_USDC, 600, ADVANCE_RATE);

        (uint256 clId,) = _openCredit(sellerB);
        vm.prank(sellerB);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertEq(cl.interestRate, 500, "discount floored at minInterestRate");
    }

    function test_DisabledNativeToken_NoDiscount() public {
        vm.prank(admin);
        creditFacility.setNativeToken(address(0));

        (uint256 clId,) = _openCredit(sellerB);
        vm.prank(sellerB);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertFalse(cl.hasTokenDiscount, "no discount when token disabled");
        assertEq(cl.interestRate, INTEREST_RATE);
    }

    // ==========================================
    // Snapshot semantics
    // ==========================================

    function test_TokensBoughtAfterDrawdown_NoRetroDiscount() public {
        // sellerA has 0 HKP at drawdown
        (uint256 clId,) = _openCredit(sellerA);
        vm.prank(sellerA);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        // Buys tokens AFTER drawdown — too late
        vm.prank(admin);
        hkp.mint(sellerA, 10_000 * ONE_HKP);

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertFalse(cl.hasTokenDiscount, "snapshot at drawdown, not live");
        assertEq(cl.interestRate, INTEREST_RATE);
    }

    function test_TokensSoldAfterDrawdown_DiscountRetained() public {
        (uint256 clId,) = _openCredit(sellerB);
        vm.prank(sellerB);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        // Seller dumps their HKP
        uint256 bal = hkp.balanceOf(sellerB);
        vm.prank(sellerB);
        hkp.transfer(address(0xdead), bal);

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertTrue(cl.hasTokenDiscount, "discount stays locked after drawdown");
        assertEq(cl.interestRate, INTEREST_RATE - 300);
    }

    // ==========================================
    // Grace period tiers
    // ==========================================

    function test_NonHolder_5DayGrace() public {
        (uint256 clId,) = _openCredit(sellerA);
        vm.prank(sellerA);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        assertEq(creditFacility.effectiveGracePeriod(clId), 5 days);

        // At dueDate + 5 days exactly → still cannot default
        vm.warp(block.timestamp + 60 days + 5 days);
        assertFalse(creditFacility.canDefault(clId));

        // One second past 5 days → defaultable
        vm.warp(block.timestamp + 1);
        assertTrue(creditFacility.canDefault(clId));

        vm.prank(anyone);
        creditFacility.triggerDefault(clId);
    }

    function test_Holder_NormalCredit_5DayGrace() public {
        // sellerB is a holder but at score=50 (below goodCredit threshold 70)
        (uint256 clId,) = _openCredit(sellerB);
        vm.prank(sellerB);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        assertEq(creditFacility.effectiveGracePeriod(clId), 5 days, "holder + normal credit = base grace");
    }

    function test_Holder_GoodCredit_7DayGrace() public {
        // sellerC is a holder at score=70
        (uint256 clId,) = _openCredit(sellerC);
        vm.prank(sellerC);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        assertEq(creditFacility.effectiveGracePeriod(clId), 7 days, "holder + good credit = 7 days");

        // At dueDate + 5 days → non-holder would be defaultable, but sellerC is protected
        vm.warp(block.timestamp + 60 days + 5 days + 1);
        assertFalse(creditFacility.canDefault(clId));

        vm.prank(anyone);
        vm.expectRevert(bytes("Grace period not elapsed"));
        creditFacility.triggerDefault(clId);

        // Move to 7 days + 1
        vm.warp(block.timestamp + 2 days);
        assertTrue(creditFacility.canDefault(clId));
    }

    function test_Holder_ScoreDropsAfterDrawdown_LosesGoodCreditGrace() public {
        // sellerC starts with score 70 (good) at drawdown
        (uint256 clId,) = _openCredit(sellerC);
        vm.prank(sellerC);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        // Now simulate a late repayment on an unrelated line, dropping score by 20 → 50
        vm.prank(address(creditFacility));
        evaluationAgent.recordRepayment(sellerC, false);

        // Good-credit bonus is evaluated at trigger time using current score, so grace
        // falls back to the holder base (5 days).
        assertEq(creditFacility.effectiveGracePeriod(clId), 5 days);
    }

    // ==========================================
    // Interest math sanity — discounted APR actually reduces accrued interest
    // ==========================================

    function test_Holder_AccruesLessInterestThanNonHolder() public {
        // Both draw 60k, both wait 30 days → compare accrued interest
        (uint256 clA,) = _openCredit(sellerA);
        (uint256 clB,) = _openCredit(sellerB);

        vm.prank(sellerA);
        creditFacility.drawdown(clA, 60_000 * ONE_USDC);
        vm.prank(sellerB);
        creditFacility.drawdown(clB, 60_000 * ONE_USDC);

        vm.warp(block.timestamp + 30 days);

        uint256 interestA = creditFacility.calculateInterest(clA);
        uint256 interestB = creditFacility.calculateInterest(clB);

        // Expected:
        //   A: 60k * 15% * 30/365
        //   B: 60k * 12% * 30/365
        uint256 expectedA = (60_000 * ONE_USDC * 1500 * 30 days) / (365 days * 10000);
        uint256 expectedB = (60_000 * ONE_USDC * 1200 * 30 days) / (365 days * 10000);
        assertApproxEqAbs(interestA, expectedA, 10);
        assertApproxEqAbs(interestB, expectedB, 10);
        assertLt(interestB, interestA, "holder must accrue strictly less");
    }

    // ==========================================
    // View helpers
    // ==========================================

    function test_PreviewEffectiveRate() public view {
        assertEq(creditFacility.previewEffectiveRate(sellerA, INTEREST_RATE), INTEREST_RATE);
        assertEq(creditFacility.previewEffectiveRate(sellerB, INTEREST_RATE), INTEREST_RATE - 300);
    }

    function test_QualifiesForTokenPerks() public view {
        assertFalse(creditFacility.qualifiesForTokenPerks(sellerA));
        assertTrue(creditFacility.qualifiesForTokenPerks(sellerB));
        assertTrue(creditFacility.qualifiesForTokenPerks(sellerC));
    }

    // ==========================================
    // Admin guards
    // ==========================================

    function test_UpdatePerks_RejectsOverflowingParams() public {
        vm.startPrank(admin);
        vm.expectRevert(bytes("Discount too high"));
        creditFacility.updateTokenHolderPerks(MIN_HOLDING, 10001, 0, 70, 2 days);

        vm.expectRevert(bytes("Threshold > 100"));
        creditFacility.updateTokenHolderPerks(MIN_HOLDING, 300, 0, 101, 2 days);

        vm.expectRevert(bytes("Grace bonus too long"));
        creditFacility.updateTokenHolderPerks(MIN_HOLDING, 300, 31 days, 70, 2 days);

        vm.expectRevert(bytes("Extra grace too long"));
        creditFacility.updateTokenHolderPerks(MIN_HOLDING, 300, 0, 70, 31 days);
        vm.stopPrank();
    }

    function test_UpdatePerks_OnlyAdmin() public {
        vm.prank(anyone);
        vm.expectRevert();
        creditFacility.updateTokenHolderPerks(MIN_HOLDING, 300, 0, 70, 2 days);
    }

    function test_SetNativeToken_OnlyAdmin() public {
        vm.prank(anyone);
        vm.expectRevert();
        creditFacility.setNativeToken(address(0));
    }

    // ==========================================
    // Helpers
    // ==========================================

    function _openCredit(address _seller) internal returns (uint256 creditLineId, uint256 tokenId) {
        vm.prank(_seller);
        tokenId = receivableNFT.mint(buyer, INVOICE_AMOUNT, block.timestamp + 60 days, "INV-001");

        vm.prank(evaluator);
        evaluationAgent.approveReceivable(tokenId);

        vm.prank(_seller);
        creditLineId = creditFacility.applyForCredit(tokenId);
    }
}
