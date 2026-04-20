// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title ProtocolConfig
/// @notice Global configuration and emergency controls for the HKPayFi protocol
contract ProtocolConfig is AccessControl, Pausable {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    /// @notice Maximum advance rate in basis points (e.g., 9500 = 95%)
    uint256 public maxAdvanceRate;

    /// @notice Minimum interest rate in basis points (e.g., 500 = 5%)
    uint256 public minInterestRate;

    /// @notice Maximum credit duration in seconds
    uint256 public maxCreditDuration;

    /// @notice Protocol fee rate in basis points, taken from interest
    uint256 public protocolFeeRate;

    /// @notice Treasury address for protocol fees
    address public treasury;

    /// @notice Grace period in seconds before a credit can be marked as defaulted
    uint256 public defaultGracePeriod;

    event ProtocolParametersUpdated(
        uint256 maxAdvanceRate, uint256 minInterestRate, uint256 maxCreditDuration, uint256 protocolFeeRate
    );
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event DefaultGracePeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    constructor(address _admin, address _treasury) {
        require(_admin != address(0), "Invalid admin");
        require(_treasury != address(0), "Invalid treasury");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);

        treasury = _treasury;
        maxAdvanceRate = 9000; // 90%
        minInterestRate = 500; // 5%
        maxCreditDuration = 180 days;
        protocolFeeRate = 1000; // 10% of interest
        defaultGracePeriod = 7 days;
    }

    /// @notice Pause all protocol operations (emergency)
    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    /// @notice Unpause protocol operations
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Update protocol parameters
    function updateParameters(
        uint256 _maxAdvanceRate,
        uint256 _minInterestRate,
        uint256 _maxCreditDuration,
        uint256 _protocolFeeRate
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_maxAdvanceRate <= 9500, "Advance rate too high");
        require(_minInterestRate >= 100, "Interest rate too low");
        require(_maxCreditDuration >= 7 days, "Duration too short");
        require(_protocolFeeRate <= 5000, "Fee rate too high");

        maxAdvanceRate = _maxAdvanceRate;
        minInterestRate = _minInterestRate;
        maxCreditDuration = _maxCreditDuration;
        protocolFeeRate = _protocolFeeRate;

        emit ProtocolParametersUpdated(_maxAdvanceRate, _minInterestRate, _maxCreditDuration, _protocolFeeRate);
    }

    /// @notice Update treasury address
    function updateTreasury(address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid treasury");
        address old = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(old, _treasury);
    }

    /// @notice Update default grace period
    function updateDefaultGracePeriod(uint256 _period) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_period >= 1 days, "Grace period too short");
        uint256 old = defaultGracePeriod;
        defaultGracePeriod = _period;
        emit DefaultGracePeriodUpdated(old, _period);
    }
}
