// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../src/ProtocolConfig.sol";
import "../src/ReceivableNFT.sol";
import "../src/MockUSDC.sol";
import "../src/LiquidityPool.sol";
import "../src/EvaluationAgent.sol";
import "../src/CreditFacility.sol";
import "../src/HKPayToken.sol";

interface IMintableERC20 {
    function mint(address to, uint256 amount) external;
}

contract SeedHKPayFi is Script {
    using SafeERC20 for IERC20;

    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;

    struct SeedConfig {
        uint256 adminPrivateKey;
        uint256 evaluatorPrivateKey;
        uint256 lpPrivateKey;
        uint256 borrowerPrivateKey;
        address admin;
        address evaluator;
        address lp;
        address borrower;
        address payer;
        address protocolConfig;
        address receivableNFT;
        address evaluationAgent;
        address liquidityPool;
        address creditFacility;
        address hkPayToken;
        address usdc;
        bool mintTestUsdc;
        bool mintTestHkp;
        bool seedRepaidLine;
        uint256 lpUsdcAmount;
        uint256 borrowerUsdcAmount;
        uint256 borrowerHkpAmount;
        uint256 lpDepositAmount;
        uint256 borrowerMaxCreditLimit;
        uint256 borrowerInterestRate;
        uint256 borrowerAdvanceRate;
        uint256 activeReceivableFaceAmount;
        uint256 activeDrawdownAmount;
        uint256 activeReceivableDuration;
        uint256 approvedReceivableFaceAmount;
        uint256 approvedReceivableDuration;
        uint256 repaidReceivableFaceAmount;
        uint256 repaidDrawdownAmount;
        uint256 repaidReceivableDuration;
    }

    struct SeedResult {
        address admin;
        address evaluator;
        address lp;
        address borrower;
        address payer;
        uint256 activeReceivableTokenId;
        uint256 approvedReceivableTokenId;
        uint256 repaidReceivableTokenId;
        uint256 activeCreditLineId;
        uint256 approvedCreditLineId;
        uint256 repaidCreditLineId;
    }

    function run() external returns (SeedResult memory result) {
        SeedConfig memory cfg = _loadConfig();
        _validateRoles(cfg);

        _mintTokens(cfg);
        _seedBorrowerApproval(cfg);
        _seedLiquidity(cfg);
        result = _seedReceivablesAndCreditLines(cfg);
        _writeSeedArtifact(cfg, result);
        _logSummary(cfg, result);
    }

    function _mintTokens(SeedConfig memory cfg) internal {
        if (!cfg.mintTestUsdc && !cfg.mintTestHkp) {
            return;
        }

        vm.startBroadcast(cfg.adminPrivateKey);

        if (cfg.mintTestUsdc) {
            IMintableERC20(cfg.usdc).mint(cfg.lp, cfg.lpUsdcAmount);
            IMintableERC20(cfg.usdc).mint(cfg.borrower, cfg.borrowerUsdcAmount);
        }

        if (cfg.mintTestHkp && cfg.borrowerHkpAmount > 0) {
            HKPayToken(cfg.hkPayToken).mint(cfg.borrower, cfg.borrowerHkpAmount);
        }

        vm.stopBroadcast();
    }

    function _seedBorrowerApproval(SeedConfig memory cfg) internal {
        vm.startBroadcast(cfg.evaluatorPrivateKey);
        EvaluationAgent(cfg.evaluationAgent)
            .approveBorrower(
                cfg.borrower, cfg.borrowerMaxCreditLimit, cfg.borrowerInterestRate, cfg.borrowerAdvanceRate
            );
        vm.stopBroadcast();
    }

    function _seedLiquidity(SeedConfig memory cfg) internal {
        if (cfg.lpDepositAmount == 0) {
            return;
        }

        vm.startBroadcast(cfg.lpPrivateKey);
        IERC20(cfg.usdc).forceApprove(cfg.liquidityPool, cfg.lpDepositAmount);
        LiquidityPool(cfg.liquidityPool).deposit(cfg.lpDepositAmount, cfg.lp);
        vm.stopBroadcast();
    }

    function _seedReceivablesAndCreditLines(SeedConfig memory cfg) internal returns (SeedResult memory result) {
        result.admin = cfg.admin;
        result.evaluator = cfg.evaluator;
        result.lp = cfg.lp;
        result.borrower = cfg.borrower;
        result.payer = cfg.payer;

        vm.startBroadcast(cfg.borrowerPrivateKey);
        IERC20(cfg.usdc).forceApprove(cfg.creditFacility, type(uint256).max);

        result.activeReceivableTokenId = ReceivableNFT(cfg.receivableNFT)
            .mint(
                cfg.payer,
                cfg.activeReceivableFaceAmount,
                block.timestamp + cfg.activeReceivableDuration,
                "SEED-ACTIVE-001"
            );
        result.approvedReceivableTokenId = ReceivableNFT(cfg.receivableNFT)
            .mint(
                cfg.payer,
                cfg.approvedReceivableFaceAmount,
                block.timestamp + cfg.approvedReceivableDuration,
                "SEED-APPROVED-001"
            );

        if (cfg.seedRepaidLine) {
            result.repaidReceivableTokenId = ReceivableNFT(cfg.receivableNFT)
                .mint(
                    cfg.payer,
                    cfg.repaidReceivableFaceAmount,
                    block.timestamp + cfg.repaidReceivableDuration,
                    "SEED-REPAID-001"
                );
        }

        vm.stopBroadcast();

        vm.startBroadcast(cfg.evaluatorPrivateKey);
        EvaluationAgent(cfg.evaluationAgent).approveReceivable(result.activeReceivableTokenId);
        EvaluationAgent(cfg.evaluationAgent).approveReceivable(result.approvedReceivableTokenId);
        if (cfg.seedRepaidLine) {
            EvaluationAgent(cfg.evaluationAgent).approveReceivable(result.repaidReceivableTokenId);
        }
        vm.stopBroadcast();

        vm.startBroadcast(cfg.borrowerPrivateKey);

        result.activeCreditLineId = CreditFacility(cfg.creditFacility).applyForCredit(result.activeReceivableTokenId);
        result.approvedCreditLineId =
            CreditFacility(cfg.creditFacility).applyForCredit(result.approvedReceivableTokenId);

        if (cfg.seedRepaidLine) {
            result.repaidCreditLineId =
                CreditFacility(cfg.creditFacility).applyForCredit(result.repaidReceivableTokenId);
        }

        CreditFacility(cfg.creditFacility).drawdown(result.activeCreditLineId, cfg.activeDrawdownAmount);

        if (cfg.seedRepaidLine) {
            CreditFacility(cfg.creditFacility).drawdown(result.repaidCreditLineId, cfg.repaidDrawdownAmount);
            uint256 repaymentAmount = cfg.repaidDrawdownAmount
                + CreditFacility(cfg.creditFacility).calculateInterest(result.repaidCreditLineId);
            CreditFacility(cfg.creditFacility).repay(result.repaidCreditLineId, repaymentAmount);
        }

        vm.stopBroadcast();
    }

    function _validateRoles(SeedConfig memory cfg) internal view {
        require(
            ProtocolConfig(cfg.protocolConfig).hasRole(DEFAULT_ADMIN_ROLE, cfg.admin),
            "Seed admin lacks DEFAULT_ADMIN_ROLE"
        );
        require(
            EvaluationAgent(cfg.evaluationAgent)
                .hasRole(EvaluationAgent(cfg.evaluationAgent).EVALUATOR_ROLE(), cfg.evaluator),
            "Seed evaluator lacks EVALUATOR_ROLE"
        );
    }

    function _writeSeedArtifact(SeedConfig memory cfg, SeedResult memory result) internal {
        string memory artifactKey = "seed";

        vm.serializeString(artifactKey, "network", _networkName(block.chainid));
        vm.serializeUint(artifactKey, "chainId", block.chainid);
        vm.serializeUint(artifactKey, "timestamp", block.timestamp);
        vm.serializeAddress(artifactKey, "admin", result.admin);
        vm.serializeAddress(artifactKey, "evaluator", result.evaluator);
        vm.serializeAddress(artifactKey, "lp", result.lp);
        vm.serializeAddress(artifactKey, "borrower", result.borrower);
        vm.serializeAddress(artifactKey, "payer", result.payer);
        vm.serializeAddress(artifactKey, "protocolConfig", cfg.protocolConfig);
        vm.serializeAddress(artifactKey, "receivableNFT", cfg.receivableNFT);
        vm.serializeAddress(artifactKey, "evaluationAgent", cfg.evaluationAgent);
        vm.serializeAddress(artifactKey, "liquidityPool", cfg.liquidityPool);
        vm.serializeAddress(artifactKey, "creditFacility", cfg.creditFacility);
        vm.serializeAddress(artifactKey, "hkPayToken", cfg.hkPayToken);
        vm.serializeAddress(artifactKey, "usdc", cfg.usdc);
        vm.serializeUint(artifactKey, "activeReceivableTokenId", result.activeReceivableTokenId);
        vm.serializeUint(artifactKey, "approvedReceivableTokenId", result.approvedReceivableTokenId);
        vm.serializeUint(artifactKey, "repaidReceivableTokenId", result.repaidReceivableTokenId);
        vm.serializeUint(artifactKey, "activeCreditLineId", result.activeCreditLineId);
        vm.serializeUint(artifactKey, "approvedCreditLineId", result.approvedCreditLineId);
        string memory json = vm.serializeUint(artifactKey, "repaidCreditLineId", result.repaidCreditLineId);

        string memory path = string.concat(vm.projectRoot(), "/deployments/", _networkName(block.chainid), "-seed.json");
        vm.writeJson(json, path);
    }

    function _logSummary(SeedConfig memory cfg, SeedResult memory result) internal view {
        console2.log("Seed complete");
        console2.log("Network:", _networkName(block.chainid));
        console2.log("Admin:", cfg.admin);
        console2.log("Evaluator:", cfg.evaluator);
        console2.log("LP:", cfg.lp);
        console2.log("Borrower:", cfg.borrower);
        console2.log("Payer:", cfg.payer);
        console2.log("Active receivable tokenId:", result.activeReceivableTokenId);
        console2.log("Approved receivable tokenId:", result.approvedReceivableTokenId);
        console2.log("Repaid receivable tokenId:", result.repaidReceivableTokenId);
        console2.log("Active credit line:", result.activeCreditLineId);
        console2.log("Approved credit line:", result.approvedCreditLineId);
        console2.log("Repaid credit line:", result.repaidCreditLineId);
    }

    function _loadConfig() internal view returns (SeedConfig memory cfg) {
        cfg.adminPrivateKey = vm.envUint("ADMIN_PRIVATE_KEY");
        cfg.evaluatorPrivateKey = vm.envOr("SEED_EVALUATOR_PRIVATE_KEY", cfg.adminPrivateKey);
        cfg.lpPrivateKey = vm.envOr("SEED_LP_PRIVATE_KEY", cfg.adminPrivateKey);
        cfg.borrowerPrivateKey = vm.envOr("SEED_BORROWER_PRIVATE_KEY", cfg.adminPrivateKey);

        cfg.admin = vm.addr(cfg.adminPrivateKey);
        cfg.evaluator = vm.addr(cfg.evaluatorPrivateKey);
        cfg.lp = vm.addr(cfg.lpPrivateKey);
        cfg.borrower = vm.addr(cfg.borrowerPrivateKey);
        cfg.payer = vm.envOr("SEED_PAYER", address(0xBEEF));

        cfg.protocolConfig = vm.envAddress("SEED_PROTOCOL_CONFIG");
        cfg.receivableNFT = vm.envAddress("SEED_RECEIVABLE_NFT");
        cfg.evaluationAgent = vm.envAddress("SEED_EVALUATION_AGENT");
        cfg.liquidityPool = vm.envAddress("SEED_LIQUIDITY_POOL");
        cfg.creditFacility = vm.envAddress("SEED_CREDIT_FACILITY");
        cfg.hkPayToken = vm.envAddress("SEED_HKP_TOKEN");
        cfg.usdc = vm.envAddress("SEED_USDC");

        cfg.mintTestUsdc = vm.envOr("SEED_MINT_TEST_USDC", true);
        cfg.mintTestHkp = vm.envOr("SEED_MINT_TEST_HKP", true);
        cfg.seedRepaidLine = vm.envOr("SEED_REPAID_LINE", true);

        cfg.lpUsdcAmount = vm.envOr("SEED_LP_USDC_AMOUNT", uint256(250_000e6));
        cfg.borrowerUsdcAmount = vm.envOr("SEED_BORROWER_USDC_AMOUNT", uint256(100_000e6));
        cfg.borrowerHkpAmount = vm.envOr("SEED_BORROWER_HKP_AMOUNT", uint256(2_000 ether));
        cfg.lpDepositAmount = vm.envOr("SEED_LP_DEPOSIT_AMOUNT", uint256(200_000e6));

        cfg.borrowerMaxCreditLimit = vm.envOr("SEED_BORROWER_MAX_CREDIT_LIMIT", uint256(200_000e6));
        cfg.borrowerInterestRate = vm.envOr("SEED_BORROWER_INTEREST_RATE", uint256(1500));
        cfg.borrowerAdvanceRate = vm.envOr("SEED_BORROWER_ADVANCE_RATE", uint256(6000));

        cfg.activeReceivableFaceAmount = vm.envOr("SEED_ACTIVE_RECEIVABLE_FACE_AMOUNT", uint256(100_000e6));
        cfg.activeDrawdownAmount = vm.envOr("SEED_ACTIVE_DRAWDOWN_AMOUNT", uint256(60_000e6));
        cfg.activeReceivableDuration = vm.envOr("SEED_ACTIVE_RECEIVABLE_DURATION", uint256(60 days));

        cfg.approvedReceivableFaceAmount = vm.envOr("SEED_APPROVED_RECEIVABLE_FACE_AMOUNT", uint256(80_000e6));
        cfg.approvedReceivableDuration = vm.envOr("SEED_APPROVED_RECEIVABLE_DURATION", uint256(75 days));

        cfg.repaidReceivableFaceAmount = vm.envOr("SEED_REPAID_RECEIVABLE_FACE_AMOUNT", uint256(40_000e6));
        cfg.repaidDrawdownAmount = vm.envOr("SEED_REPAID_DRAWDOWN_AMOUNT", uint256(20_000e6));
        cfg.repaidReceivableDuration = vm.envOr("SEED_REPAID_RECEIVABLE_DURATION", uint256(30 days));
    }

    function _networkName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 1) return "mainnet";
        if (chainId == 11155111) return "sepolia";
        if (chainId == 31337) return "anvil";
        return "chain";
    }
}
