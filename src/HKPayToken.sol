// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title HKPayToken (HKP)
/// @notice Native utility token for the HKPayFi protocol.
/// @dev Holding HKP above a protocol-defined threshold grants sellers:
///        - Reduced APR on credit lines (snapshotted at drawdown)
///        - Extended default grace period (amount depends on credit score)
contract HKPayToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address _admin) ERC20("HKPayFi Token", "HKP") {
        require(_admin != address(0), "Invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
    }

    function mint(address _to, uint256 _amount) external onlyRole(MINTER_ROLE) {
        _mint(_to, _amount);
    }

    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }
}
