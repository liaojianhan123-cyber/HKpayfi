// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../src/ProtocolConfig.sol";
import "../src/ReceivableNFT.sol";
import "../src/MockUSDC.sol";
import "../src/LiquidityPool.sol";
import "../src/EvaluationAgent.sol";
import "../src/CreditFacility.sol";
import "../src/HKPayToken.sol";

contract DeployHKPayFi is Script {
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;

    uint256 internal constant DEFAULT_MAX_ADVANCE_RATE = 9000;
    uint256 internal constant DEFAULT_MIN_INTEREST_RATE = 500;
    uint256 internal constant DEFAULT_MAX_CREDIT_DURATION = 180 days;
    uint256 internal constant DEFAULT_PROTOCOL_FEE_RATE = 1000;
    uint256 internal constant DEFAULT_GRACE_PERIOD = 7 days;

    uint256 internal constant DEFAULT_SELLER_STAKE_RATE = 2000;
    uint256 internal constant DEFAULT_MIN_TOKEN_HOLDING = 1_000 ether;
    uint256 internal constant DEFAULT_TOKEN_APR_DISCOUNT_BPS = 300;
    uint256 internal constant DEFAULT_TOKEN_GRACE_BONUS = 0;
    uint256 internal constant DEFAULT_GOOD_CREDIT_THRESHOLD = 70;
    uint256 internal constant DEFAULT_GOOD_CREDIT_EXTRA_GRACE = 2 days;

    struct DeployConfig {
        uint256 privateKey;
        address deployer;
        address protocolAdmin;
        address treasury;
        address guardian;
        address evaluator;
        address usdcAddress;
        bool deployMockUsdc;
        bool revokeDeployerAdmin;
        uint256 maxAdvanceRate;
        uint256 minInterestRate;
        uint256 maxCreditDuration;
        uint256 protocolFeeRate;
        uint256 defaultGracePeriod;
        uint256 sellerStakeRate;
        uint256 minTokenHoldingForPerks;
        uint256 tokenHolderAprDiscountBps;
        uint256 tokenHolderGraceBonus;
        uint256 goodCreditScoreThreshold;
        uint256 goodCreditExtraGrace;
    }

    struct Deployment {
        ProtocolConfig config;
        ReceivableNFT receivableNFT;
        LiquidityPool liquidityPool;
        EvaluationAgent evaluationAgent;
        CreditFacility creditFacility;
        HKPayToken hkPayToken;
        address usdc;
        bool isMockUsdc;
    }

    function run() external returns (Deployment memory deployment) {
        DeployConfig memory cfg = _loadConfig();

        vm.startBroadcast(cfg.privateKey);

        deployment = _deployContracts(cfg);
        _configureProtocol(deployment, cfg);
        _handoffPermissions(deployment, cfg);

        vm.stopBroadcast();

        _writeDeploymentArtifact(deployment, cfg);
        _logSummary(deployment, cfg);
    }

    function _deployContracts(DeployConfig memory cfg) internal returns (Deployment memory deployment) {
        if (cfg.deployMockUsdc) {
            MockUSDC mockUsdc = new MockUSDC();
            deployment.usdc = address(mockUsdc);
            deployment.isMockUsdc = true;
        } else {
            deployment.usdc = cfg.usdcAddress;
        }

        deployment.config = new ProtocolConfig(cfg.deployer, cfg.treasury);
        deployment.receivableNFT = new ReceivableNFT(address(deployment.config));
        deployment.evaluationAgent = new EvaluationAgent(address(deployment.config), address(deployment.receivableNFT));
        deployment.liquidityPool = new LiquidityPool(IERC20(deployment.usdc), address(deployment.config));
        deployment.creditFacility = new CreditFacility(
            address(deployment.config),
            address(deployment.receivableNFT),
            address(deployment.liquidityPool),
            address(deployment.evaluationAgent),
            deployment.usdc
        );
        deployment.hkPayToken = new HKPayToken(cfg.protocolAdmin);
    }

    function _configureProtocol(Deployment memory deployment, DeployConfig memory cfg) internal {
        _grantAccessControlAdmin(IAccessControl(address(deployment.config)), cfg.protocolAdmin, cfg.deployer);
        _grantAccessControlAdmin(IAccessControl(address(deployment.receivableNFT)), cfg.protocolAdmin, cfg.deployer);
        _grantAccessControlAdmin(IAccessControl(address(deployment.evaluationAgent)), cfg.protocolAdmin, cfg.deployer);
        _grantAccessControlAdmin(IAccessControl(address(deployment.liquidityPool)), cfg.protocolAdmin, cfg.deployer);
        _grantAccessControlAdmin(IAccessControl(address(deployment.creditFacility)), cfg.protocolAdmin, cfg.deployer);

        if (cfg.guardian != cfg.deployer) {
            deployment.config.grantRole(deployment.config.GUARDIAN_ROLE(), cfg.guardian);
        }

        deployment.liquidityPool.grantRole(deployment.liquidityPool.FACILITY_ROLE(), address(deployment.creditFacility));
        deployment.receivableNFT.grantRole(deployment.receivableNFT.FACILITY_ROLE(), address(deployment.creditFacility));
        deployment.receivableNFT
            .grantRole(deployment.receivableNFT.EVALUATOR_ROLE(), address(deployment.evaluationAgent));
        deployment.evaluationAgent.grantRole(DEFAULT_ADMIN_ROLE, address(deployment.creditFacility));
        deployment.evaluationAgent.grantRole(deployment.evaluationAgent.EVALUATOR_ROLE(), cfg.evaluator);

        _applyProtocolConfigOverrides(deployment.config, cfg);
        _applyCreditFacilityOverrides(deployment.creditFacility, deployment.hkPayToken, cfg);
    }

    function _handoffPermissions(Deployment memory deployment, DeployConfig memory cfg) internal {
        if (!cfg.revokeDeployerAdmin || cfg.protocolAdmin == cfg.deployer) {
            return;
        }

        if (cfg.guardian != cfg.deployer) {
            deployment.config.revokeRole(deployment.config.GUARDIAN_ROLE(), cfg.deployer);
        }
        deployment.config.revokeRole(DEFAULT_ADMIN_ROLE, cfg.deployer);

        deployment.receivableNFT.revokeRole(DEFAULT_ADMIN_ROLE, cfg.deployer);
        deployment.evaluationAgent.revokeRole(DEFAULT_ADMIN_ROLE, cfg.deployer);
        deployment.liquidityPool.revokeRole(DEFAULT_ADMIN_ROLE, cfg.deployer);
        deployment.creditFacility.revokeRole(DEFAULT_ADMIN_ROLE, cfg.deployer);
    }

    function _applyProtocolConfigOverrides(ProtocolConfig config, DeployConfig memory cfg) internal {
        if (
            cfg.maxAdvanceRate != DEFAULT_MAX_ADVANCE_RATE || cfg.minInterestRate != DEFAULT_MIN_INTEREST_RATE
                || cfg.maxCreditDuration != DEFAULT_MAX_CREDIT_DURATION
                || cfg.protocolFeeRate != DEFAULT_PROTOCOL_FEE_RATE
        ) {
            config.updateParameters(cfg.maxAdvanceRate, cfg.minInterestRate, cfg.maxCreditDuration, cfg.protocolFeeRate);
        }

        if (cfg.defaultGracePeriod != DEFAULT_GRACE_PERIOD) {
            config.updateDefaultGracePeriod(cfg.defaultGracePeriod);
        }
    }

    function _applyCreditFacilityOverrides(
        CreditFacility creditFacility,
        HKPayToken hkPayToken,
        DeployConfig memory cfg
    ) internal {
        creditFacility.setNativeToken(address(hkPayToken));

        if (cfg.sellerStakeRate != DEFAULT_SELLER_STAKE_RATE) {
            creditFacility.updateSellerStakeRate(cfg.sellerStakeRate);
        }

        if (
            cfg.minTokenHoldingForPerks != DEFAULT_MIN_TOKEN_HOLDING
                || cfg.tokenHolderAprDiscountBps != DEFAULT_TOKEN_APR_DISCOUNT_BPS
                || cfg.tokenHolderGraceBonus != DEFAULT_TOKEN_GRACE_BONUS
                || cfg.goodCreditScoreThreshold != DEFAULT_GOOD_CREDIT_THRESHOLD
                || cfg.goodCreditExtraGrace != DEFAULT_GOOD_CREDIT_EXTRA_GRACE
        ) {
            creditFacility.updateTokenHolderPerks(
                cfg.minTokenHoldingForPerks,
                cfg.tokenHolderAprDiscountBps,
                cfg.tokenHolderGraceBonus,
                cfg.goodCreditScoreThreshold,
                cfg.goodCreditExtraGrace
            );
        }
    }

    function _grantAccessControlAdmin(IAccessControl target, address admin, address deployer) internal {
        if (admin != deployer) {
            target.grantRole(DEFAULT_ADMIN_ROLE, admin);
        }
    }

    function _writeDeploymentArtifact(Deployment memory deployment, DeployConfig memory cfg) internal {
        string memory artifactKey = "deployment";

        vm.serializeString(artifactKey, "network", _networkName(block.chainid));
        vm.serializeUint(artifactKey, "chainId", block.chainid);
        vm.serializeUint(artifactKey, "timestamp", block.timestamp);
        vm.serializeAddress(artifactKey, "deployer", cfg.deployer);
        vm.serializeAddress(artifactKey, "protocolAdmin", cfg.protocolAdmin);
        vm.serializeAddress(artifactKey, "treasury", cfg.treasury);
        vm.serializeAddress(artifactKey, "guardian", cfg.guardian);
        vm.serializeAddress(artifactKey, "evaluator", cfg.evaluator);
        vm.serializeAddress(artifactKey, "usdc", deployment.usdc);
        vm.serializeBool(artifactKey, "mockUsdc", deployment.isMockUsdc);
        vm.serializeAddress(artifactKey, "protocolConfig", address(deployment.config));
        vm.serializeAddress(artifactKey, "receivableNFT", address(deployment.receivableNFT));
        vm.serializeAddress(artifactKey, "evaluationAgent", address(deployment.evaluationAgent));
        vm.serializeAddress(artifactKey, "liquidityPool", address(deployment.liquidityPool));
        vm.serializeAddress(artifactKey, "creditFacility", address(deployment.creditFacility));
        string memory json = vm.serializeAddress(artifactKey, "hkPayToken", address(deployment.hkPayToken));

        string memory path = string.concat(vm.projectRoot(), "/deployments/", _networkName(block.chainid), ".json");

        vm.writeJson(json, path);
    }

    function _logSummary(Deployment memory deployment, DeployConfig memory cfg) internal view {
        console2.log("Deployment complete");
        console2.log("Network:", _networkName(block.chainid));
        console2.log("Deployer:", cfg.deployer);
        console2.log("Protocol admin:", cfg.protocolAdmin);
        console2.log("USDC:", deployment.usdc);
        console2.log("ProtocolConfig:", address(deployment.config));
        console2.log("ReceivableNFT:", address(deployment.receivableNFT));
        console2.log("EvaluationAgent:", address(deployment.evaluationAgent));
        console2.log("LiquidityPool:", address(deployment.liquidityPool));
        console2.log("CreditFacility:", address(deployment.creditFacility));
        console2.log("HKPayToken:", address(deployment.hkPayToken));
    }

    function _loadConfig() internal view returns (DeployConfig memory cfg) {
        cfg.privateKey = vm.envUint("PRIVATE_KEY");
        cfg.deployer = vm.addr(cfg.privateKey);
        cfg.protocolAdmin = vm.envOr("PROTOCOL_ADMIN", cfg.deployer);
        cfg.treasury = vm.envOr("TREASURY", cfg.protocolAdmin);
        cfg.guardian = vm.envOr("GUARDIAN", cfg.protocolAdmin);
        cfg.evaluator = vm.envOr("EVALUATOR", cfg.protocolAdmin);
        cfg.usdcAddress = vm.envOr("USDC_ADDRESS", address(0));
        cfg.deployMockUsdc = cfg.usdcAddress == address(0);
        cfg.revokeDeployerAdmin = vm.envOr("REVOKE_DEPLOYER_ADMIN", cfg.protocolAdmin != cfg.deployer);

        cfg.maxAdvanceRate = vm.envOr("MAX_ADVANCE_RATE", DEFAULT_MAX_ADVANCE_RATE);
        cfg.minInterestRate = vm.envOr("MIN_INTEREST_RATE", DEFAULT_MIN_INTEREST_RATE);
        cfg.maxCreditDuration = vm.envOr("MAX_CREDIT_DURATION", DEFAULT_MAX_CREDIT_DURATION);
        cfg.protocolFeeRate = vm.envOr("PROTOCOL_FEE_RATE", DEFAULT_PROTOCOL_FEE_RATE);
        cfg.defaultGracePeriod = vm.envOr("DEFAULT_GRACE_PERIOD", DEFAULT_GRACE_PERIOD);

        cfg.sellerStakeRate = vm.envOr("SELLER_STAKE_RATE", DEFAULT_SELLER_STAKE_RATE);
        cfg.minTokenHoldingForPerks = vm.envOr("MIN_TOKEN_HOLDING_FOR_PERKS", DEFAULT_MIN_TOKEN_HOLDING);
        cfg.tokenHolderAprDiscountBps = vm.envOr("TOKEN_HOLDER_APR_DISCOUNT_BPS", DEFAULT_TOKEN_APR_DISCOUNT_BPS);
        cfg.tokenHolderGraceBonus = vm.envOr("TOKEN_HOLDER_GRACE_BONUS", DEFAULT_TOKEN_GRACE_BONUS);
        cfg.goodCreditScoreThreshold = vm.envOr("GOOD_CREDIT_SCORE_THRESHOLD", DEFAULT_GOOD_CREDIT_THRESHOLD);
        cfg.goodCreditExtraGrace = vm.envOr("GOOD_CREDIT_EXTRA_GRACE", DEFAULT_GOOD_CREDIT_EXTRA_GRACE);
    }

    function _networkName(uint256 chainId) internal view returns (string memory) {
        if (chainId == 1) return "mainnet";
        if (chainId == 11155111) return "sepolia";
        if (chainId == 31337) return "anvil";
        return string.concat("chain-", vm.toString(chainId));
    }
}
