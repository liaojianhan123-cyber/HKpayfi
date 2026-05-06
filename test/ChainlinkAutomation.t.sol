// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/ProtocolConfig.sol";
import "../src/ReceivableNFT.sol";
import "../src/MockUSDC.sol";
import "../src/LiquidityPool.sol";
import "../src/EvaluationAgent.sol";
import "../src/CreditFacility.sol";

/// @title Chainlink Automation Test
/// @notice Verifies Chainlink Automation integration on CreditFacility:
///         - checkUpkeep returns false when no defaults are due
///         - checkUpkeep correctly identifies overdue credit lines past grace
///         - performUpkeep triggers default(s) and matches manual triggerDefault outcome
///         - Batch is capped at MAX_AUTOMATION_BATCH (5)
///         - performUpkeep is defensive: silently skips IDs whose state changed
contract ChainlinkAutomationTest is Test {
    ProtocolConfig config;
    ReceivableNFT receivableNFT;
    MockUSDC usdc;
    LiquidityPool pool;
    EvaluationAgent evaluationAgent;
    CreditFacility creditFacility;

    address admin = makeAddr("admin");
    address treasury = makeAddr("treasury");
    address lp1 = makeAddr("lp1");
    address evaluator = makeAddr("evaluator");
    address keeper = makeAddr("keeper"); // Chainlink registry / anyone
    address buyer = makeAddr("buyer");

    uint256 constant ONE_USDC = 1e6;
    uint256 constant INVOICE_AMOUNT = 100_000 * 1e6;
    uint256 constant ADVANCE_RATE = 6000;
    uint256 constant INTEREST_RATE = 1500;
    uint256 constant DURATION = 60 days;
    uint256 constant GRACE = 5 days;

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

        config.updateDefaultGracePeriod(GRACE);

        usdc.mint(lp1, 5_000_000 * ONE_USDC);
        vm.stopPrank();

        vm.prank(lp1);
        usdc.approve(address(pool), type(uint256).max);
        vm.prank(lp1);
        pool.deposit(2_000_000 * ONE_USDC, lp1);
    }

    // ==========================================
    // checkUpkeep: nothing to do
    // ==========================================

    function test_CheckUpkeep_NoCreditLines_ReturnsFalse() public view {
        (bool needed, bytes memory data) = creditFacility.checkUpkeep("");
        assertFalse(needed);
        assertEq(data.length, 0);
    }

    function test_CheckUpkeep_ActiveButNotOverdue_ReturnsFalse() public {
        address seller = _makeSeller("s1");
        (uint256 clId,) = _openCredit(seller);
        vm.prank(seller);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        // Just past dueDate but still in grace period
        vm.warp(block.timestamp + DURATION + GRACE - 1);

        (bool needed, bytes memory data) = creditFacility.checkUpkeep("");
        assertFalse(needed, "still in grace period");
        assertEq(data.length, 0);
    }

    function test_CheckUpkeep_RepaidLine_NotIncluded() public {
        address seller = _makeSeller("s1");
        (uint256 clId,) = _openCredit(seller);
        vm.prank(seller);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        vm.warp(block.timestamp + DURATION + GRACE + 1);

        // Borrower repays before keeper triggers default
        vm.prank(seller);
        creditFacility.repay(clId, 200_000 * ONE_USDC); // overpay → caps to amountOwed

        (bool needed,) = creditFacility.checkUpkeep("");
        assertFalse(needed, "repaid lines not eligible");
    }

    // ==========================================
    // checkUpkeep: detects overdue lines
    // ==========================================

    function test_CheckUpkeep_OneOverdue_ReturnsId() public {
        address seller = _makeSeller("s1");
        (uint256 clId,) = _openCredit(seller);
        vm.prank(seller);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        vm.warp(block.timestamp + DURATION + GRACE + 1);

        (bool needed, bytes memory data) = creditFacility.checkUpkeep("");
        assertTrue(needed);
        uint256[] memory ids = abi.decode(data, (uint256[]));
        assertEq(ids.length, 1);
        assertEq(ids[0], clId);
    }

    function test_CheckUpkeep_MultipleOverdue_ReturnsAllUpToBatchCap() public {
        // Open 3 credit lines, all become overdue
        uint256[] memory clIds = new uint256[](3);
        address[] memory sellers = new address[](3);
        for (uint256 i = 0; i < 3; i++) {
            sellers[i] = _makeSeller(string.concat("s", vm.toString(i)));
            (clIds[i],) = _openCredit(sellers[i]);
            vm.prank(sellers[i]);
            creditFacility.drawdown(clIds[i], 60_000 * ONE_USDC);
        }

        vm.warp(block.timestamp + DURATION + GRACE + 1);

        (bool needed, bytes memory data) = creditFacility.checkUpkeep("");
        assertTrue(needed);
        uint256[] memory ids = abi.decode(data, (uint256[]));
        assertEq(ids.length, 3);
        assertEq(ids[0], clIds[0]);
        assertEq(ids[1], clIds[1]);
        assertEq(ids[2], clIds[2]);
    }

    function test_CheckUpkeep_BatchCapped() public {
        // Open MAX_AUTOMATION_BATCH + 2 = 7 credit lines, expect first 5 returned
        uint256 cap = creditFacility.MAX_AUTOMATION_BATCH();
        uint256 total = cap + 2;

        uint256[] memory clIds = new uint256[](total);
        for (uint256 i = 0; i < total; i++) {
            address seller = _makeSeller(string.concat("seller", vm.toString(i)));
            (clIds[i],) = _openCredit(seller);
            vm.prank(seller);
            creditFacility.drawdown(clIds[i], 60_000 * ONE_USDC);
        }

        vm.warp(block.timestamp + DURATION + GRACE + 1);

        (bool needed, bytes memory data) = creditFacility.checkUpkeep("");
        assertTrue(needed);
        uint256[] memory ids = abi.decode(data, (uint256[]));
        assertEq(ids.length, cap, "batch capped at MAX_AUTOMATION_BATCH");
        // Should be the FIRST cap entries (sequential scan)
        for (uint256 i = 0; i < cap; i++) {
            assertEq(ids[i], clIds[i]);
        }
    }

    function test_CheckUpkeep_MixedActiveAndOverdue_OnlyReturnsOverdue() public {
        // Open 3 lines. Make only the middle one overdue.
        address sellerA = _makeSeller("sA");
        address sellerB = _makeSeller("sB");
        address sellerC = _makeSeller("sC");

        // Long lines (90d) won't be overdue when we warp; short line (30d) will be.
        // Cap is 180 days, so 90d stays well inside.
        (uint256 clA,) = _openCreditWithDuration(sellerA, 90 days);
        vm.prank(sellerA);
        creditFacility.drawdown(clA, 60_000 * ONE_USDC);

        (uint256 clB,) = _openCreditWithDuration(sellerB, 30 days);
        vm.prank(sellerB);
        creditFacility.drawdown(clB, 60_000 * ONE_USDC);

        (uint256 clC,) = _openCreditWithDuration(sellerC, 90 days);
        vm.prank(sellerC);
        creditFacility.drawdown(clC, 60_000 * ONE_USDC);

        // Warp past clB's due+grace but not past clA/clC's
        vm.warp(block.timestamp + 30 days + GRACE + 1);

        (bool needed, bytes memory data) = creditFacility.checkUpkeep("");
        assertTrue(needed);
        uint256[] memory ids = abi.decode(data, (uint256[]));
        assertEq(ids.length, 1);
        assertEq(ids[0], clB);
    }

    // ==========================================
    // performUpkeep: actually triggers default
    // ==========================================

    function test_PerformUpkeep_TriggersDefault() public {
        address seller = _makeSeller("s1");
        (uint256 clId,) = _openCredit(seller);
        vm.prank(seller);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        vm.warp(block.timestamp + DURATION + GRACE + 1);

        (, bytes memory data) = creditFacility.checkUpkeep("");

        // Anyone can call performUpkeep — simulate Chainlink keeper
        vm.prank(keeper);
        creditFacility.performUpkeep(data);

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertEq(uint8(cl.state), uint8(CreditFacility.CreditState.Defaulted), "marked defaulted");
    }

    function test_PerformUpkeep_BatchDefaultsAllInList() public {
        uint256 cap = creditFacility.MAX_AUTOMATION_BATCH();
        uint256[] memory clIds = new uint256[](cap);
        for (uint256 i = 0; i < cap; i++) {
            address seller = _makeSeller(string.concat("s", vm.toString(i)));
            (clIds[i],) = _openCredit(seller);
            vm.prank(seller);
            creditFacility.drawdown(clIds[i], 60_000 * ONE_USDC);
        }

        vm.warp(block.timestamp + DURATION + GRACE + 1);

        (, bytes memory data) = creditFacility.checkUpkeep("");

        vm.prank(keeper);
        creditFacility.performUpkeep(data);

        for (uint256 i = 0; i < cap; i++) {
            CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clIds[i]);
            assertEq(uint8(cl.state), uint8(CreditFacility.CreditState.Defaulted));
        }
    }

    function test_PerformUpkeep_RejectsOversizedBatch() public {
        uint256 cap = creditFacility.MAX_AUTOMATION_BATCH();
        uint256[] memory ids = new uint256[](cap + 1);
        bytes memory data = abi.encode(ids);

        vm.prank(keeper);
        vm.expectRevert(bytes("Batch too large"));
        creditFacility.performUpkeep(data);
    }

    function test_PerformUpkeep_SilentlySkipsRepaidId() public {
        // Open two lines. One gets repaid between checkUpkeep and performUpkeep.
        address sA = _makeSeller("sA");
        address sB = _makeSeller("sB");

        (uint256 clA,) = _openCredit(sA);
        vm.prank(sA);
        creditFacility.drawdown(clA, 60_000 * ONE_USDC);

        (uint256 clB,) = _openCredit(sB);
        vm.prank(sB);
        creditFacility.drawdown(clB, 60_000 * ONE_USDC);

        vm.warp(block.timestamp + DURATION + GRACE + 1);

        (, bytes memory data) = creditFacility.checkUpkeep("");

        // Borrower A repays last-minute — clA's state changes to Repaid
        vm.prank(sA);
        creditFacility.repay(clA, 200_000 * ONE_USDC);

        // performUpkeep with stale data should NOT revert — just skip clA, default clB
        vm.prank(keeper);
        creditFacility.performUpkeep(data);

        CreditFacility.CreditLine memory aLine = creditFacility.getCreditLine(clA);
        CreditFacility.CreditLine memory bLine = creditFacility.getCreditLine(clB);
        assertEq(uint8(aLine.state), uint8(CreditFacility.CreditState.Repaid), "repaid line untouched");
        assertEq(uint8(bLine.state), uint8(CreditFacility.CreditState.Defaulted), "still-overdue line defaulted");
    }

    function test_PerformUpkeep_SilentlySkipsLineStillInGrace() public {
        // Hand-craft data with an ID still in grace — performUpkeep should not revert
        address seller = _makeSeller("s1");
        (uint256 clId,) = _openCredit(seller);
        vm.prank(seller);
        creditFacility.drawdown(clId, 60_000 * ONE_USDC);

        // NOT past grace period
        vm.warp(block.timestamp + DURATION); // exactly at dueDate

        uint256[] memory ids = new uint256[](1);
        ids[0] = clId;
        bytes memory data = abi.encode(ids);

        vm.prank(keeper);
        creditFacility.performUpkeep(data); // should not revert

        CreditFacility.CreditLine memory cl = creditFacility.getCreditLine(clId);
        assertEq(uint8(cl.state), uint8(CreditFacility.CreditState.Active), "stayed active");
    }

    // ==========================================
    // Equivalence: automation outcome == manual outcome
    // ==========================================

    function test_PerformUpkeep_OutcomeMatchesManualTrigger() public {
        // Two identical scenarios: one defaulted via triggerDefault, the other via performUpkeep.
        // Resulting pool state, totalLosses, NFT state should match.

        address sA = _makeSeller("sManual");
        address sB = _makeSeller("sAuto");

        (uint256 clA,) = _openCredit(sA);
        vm.prank(sA);
        creditFacility.drawdown(clA, 60_000 * ONE_USDC);

        (uint256 clB,) = _openCredit(sB);
        vm.prank(sB);
        creditFacility.drawdown(clB, 60_000 * ONE_USDC);

        vm.warp(block.timestamp + DURATION + GRACE + 1);

        // Manual on A
        creditFacility.triggerDefault(clA);

        // Automation on B
        uint256[] memory ids = new uint256[](1);
        ids[0] = clB;
        vm.prank(keeper);
        creditFacility.performUpkeep(abi.encode(ids));

        CreditFacility.CreditLine memory aLine = creditFacility.getCreditLine(clA);
        CreditFacility.CreditLine memory bLine = creditFacility.getCreditLine(clB);

        assertEq(uint8(aLine.state), uint8(bLine.state));
        assertEq(aLine.drawn, bLine.drawn);
        assertEq(aLine.stakeAmount, bLine.stakeAmount);
    }

    // ==========================================
    // Helpers
    // ==========================================

    function _makeSeller(string memory _label) internal returns (address seller) {
        seller = makeAddr(_label);
        vm.prank(admin);
        usdc.mint(seller, 200_000 * ONE_USDC);
        vm.prank(seller);
        usdc.approve(address(creditFacility), type(uint256).max);
        vm.prank(evaluator);
        evaluationAgent.approveBorrower(seller, 200_000 * ONE_USDC, INTEREST_RATE, ADVANCE_RATE);
    }

    function _openCredit(address _seller) internal returns (uint256 creditLineId, uint256 tokenId) {
        return _openCreditWithDuration(_seller, DURATION);
    }

    function _openCreditWithDuration(address _seller, uint256 _duration)
        internal
        returns (uint256 creditLineId, uint256 tokenId)
    {
        vm.prank(_seller);
        tokenId = receivableNFT.mint(buyer, INVOICE_AMOUNT, block.timestamp + _duration, "INV");

        vm.prank(evaluator);
        evaluationAgent.approveReceivable(tokenId);

        vm.prank(_seller);
        creditLineId = creditFacility.applyForCredit(tokenId);
    }
}
