// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ProtocolConfig.sol";
import "./ReceivableNFT.sol";

/// @title EvaluationAgent
/// @notice On-chain credit scoring and borrower approval system
contract EvaluationAgent is AccessControl {
    bytes32 public constant EVALUATOR_ROLE = keccak256("EVALUATOR_ROLE");

    struct BorrowerProfile {
        bool isApproved;
        uint256 maxCreditLimit; // Maximum borrowing limit (USDC, 6 decimals)
        uint256 interestRate; // APR in basis points (e.g., 1500 = 15%)
        uint256 advanceRate; // Advance rate in basis points (e.g., 9000 = 90%)
        uint256 approvedAt;
        // Credit history
        uint256 totalRepaid;
        uint256 onTimeRepayments;
        uint256 lateRepayments;
        uint256 defaults;
        uint256 creditScore; // 0-100 score
    }

    ProtocolConfig public immutable config;
    ReceivableNFT public immutable receivableNFT;

    mapping(address => BorrowerProfile) public profiles;

    event BorrowerApproved(address indexed borrower, uint256 maxCreditLimit, uint256 interestRate, uint256 advanceRate);
    event BorrowerRevoked(address indexed borrower);
    event BorrowerBlacklisted(address indexed borrower);
    event CreditScoreUpdated(address indexed borrower, uint256 newScore);
    event RepaymentRecorded(address indexed borrower, bool onTime);

    constructor(address _config, address _receivableNFT) {
        require(_config != address(0), "Invalid config");
        require(_receivableNFT != address(0), "Invalid NFT");
        config = ProtocolConfig(_config);
        receivableNFT = ReceivableNFT(_receivableNFT);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Approve a borrower with credit parameters
    function approveBorrower(address _borrower, uint256 _maxCreditLimit, uint256 _interestRate, uint256 _advanceRate)
        external
        onlyRole(EVALUATOR_ROLE)
    {
        require(_borrower != address(0), "Invalid borrower");
        require(_interestRate >= config.minInterestRate(), "Interest rate below minimum");
        require(_advanceRate <= config.maxAdvanceRate(), "Advance rate above maximum");

        BorrowerProfile storage profile = profiles[_borrower];
        require(profile.defaults == 0, "Borrower blacklisted");

        bool isFirstApproval = profile.approvedAt < 1;
        profile.isApproved = true;
        profile.maxCreditLimit = _maxCreditLimit;
        profile.interestRate = _interestRate;
        profile.advanceRate = _advanceRate;
        profile.approvedAt = block.timestamp;

        // Initialize credit score for new borrowers
        if (isFirstApproval) {
            profile.creditScore = 50; // Start at mid-range (0-100 scale)
        }

        emit BorrowerApproved(_borrower, _maxCreditLimit, _interestRate, _advanceRate);
    }

    /// @notice Revoke borrower approval
    function revokeBorrower(address _borrower) external onlyRole(EVALUATOR_ROLE) {
        profiles[_borrower].isApproved = false;
        emit BorrowerRevoked(_borrower);
    }

    /// @notice Approve a receivable NFT for financing
    function approveReceivable(uint256 _tokenId) external onlyRole(EVALUATOR_ROLE) {
        receivableNFT.approve(_tokenId);
    }

    /// @notice Record a repayment outcome (called by CreditFacility)
    function recordRepayment(address _borrower, bool _onTime) external onlyRole(DEFAULT_ADMIN_ROLE) {
        BorrowerProfile storage profile = profiles[_borrower];

        if (_onTime) {
            profile.onTimeRepayments++;
            // Increase score +10, cap at 100
            if (profile.creditScore <= 90) {
                profile.creditScore += 10;
            } else {
                profile.creditScore = 100;
            }
        } else {
            profile.lateRepayments++;
            // Decrease score -20, floor at 0
            if (profile.creditScore >= 20) {
                profile.creditScore -= 20;
            } else {
                profile.creditScore = 0;
            }
        }

        emit CreditScoreUpdated(_borrower, profile.creditScore);
        emit RepaymentRecorded(_borrower, _onTime);
    }

    /// @notice Record a default (called by CreditFacility) — immediately blacklists borrower
    function recordDefault(address _borrower) external onlyRole(DEFAULT_ADMIN_ROLE) {
        BorrowerProfile storage profile = profiles[_borrower];
        profile.defaults++;
        profile.creditScore = 0;
        profile.isApproved = false; // Immediate permanent blacklist

        emit BorrowerBlacklisted(_borrower);
        emit CreditScoreUpdated(_borrower, 0);
    }

    /// @notice Record total repaid amount
    function recordRepaidAmount(address _borrower, uint256 _amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        profiles[_borrower].totalRepaid += _amount;
    }

    /// @notice Check if borrower is approved and has sufficient credit
    function canBorrow(address _borrower, uint256 _amount) external view returns (bool) {
        BorrowerProfile storage profile = profiles[_borrower];
        return profile.isApproved && _amount <= profile.maxCreditLimit;
    }

    /// @notice Calculate advance amount for a receivable
    function calculateAdvance(address _borrower, uint256 _faceAmount) external view returns (uint256) {
        BorrowerProfile storage profile = profiles[_borrower];
        require(profile.isApproved, "Borrower not approved");
        return (_faceAmount * profile.advanceRate) / 10000;
    }

    /// @notice Get borrower's full profile
    function getProfile(address _borrower) external view returns (BorrowerProfile memory) {
        return profiles[_borrower];
    }
}
