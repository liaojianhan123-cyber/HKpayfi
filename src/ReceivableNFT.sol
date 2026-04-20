// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ProtocolConfig.sol";

/// @title ReceivableNFT
/// @notice ERC-721 token representing trade receivables (invoices)
contract ReceivableNFT is ERC721, AccessControl {
    bytes32 public constant EVALUATOR_ROLE = keccak256("EVALUATOR_ROLE");
    bytes32 public constant FACILITY_ROLE = keccak256("FACILITY_ROLE");

    enum ReceivableState {
        Created,
        Approved,
        Financed,
        Paid,
        Defaulted
    }

    struct ReceivableInfo {
        address borrower;
        address payer;
        uint256 faceAmount;
        uint256 dueDate;
        uint256 createdAt;
        ReceivableState state;
        string invoiceId;
    }

    ProtocolConfig public immutable config;

    uint256 private _nextTokenId;
    mapping(uint256 => ReceivableInfo) public receivables;

    event ReceivableMinted(uint256 indexed tokenId, address indexed borrower, uint256 faceAmount, uint256 dueDate);
    event ReceivableApproved(uint256 indexed tokenId);
    event ReceivableFinanced(uint256 indexed tokenId);
    event ReceivablePaid(uint256 indexed tokenId);
    event ReceivableDefaulted(uint256 indexed tokenId);

    constructor(address _config) ERC721("HKPayFi Receivable", "HKPR") {
        require(_config != address(0), "Invalid config");
        config = ProtocolConfig(_config);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Mint a new receivable NFT representing a trade invoice
    /// @param _payer Address of the invoice payer (buyer)
    /// @param _faceAmount Face value of the invoice in USDC (6 decimals)
    /// @param _dueDate Unix timestamp when payment is due
    /// @param _invoiceId Off-chain invoice reference ID
    function mint(address _payer, uint256 _faceAmount, uint256 _dueDate, string calldata _invoiceId)
        external
        returns (uint256 tokenId)
    {
        require(!config.paused(), "Protocol paused");
        require(_payer != address(0), "Invalid payer");
        require(_faceAmount > 0, "Invalid amount");
        require(_dueDate > block.timestamp, "Due date must be in future");

        tokenId = _nextTokenId++;

        receivables[tokenId] = ReceivableInfo({
            borrower: msg.sender,
            payer: _payer,
            faceAmount: _faceAmount,
            dueDate: _dueDate,
            createdAt: block.timestamp,
            state: ReceivableState.Created,
            invoiceId: _invoiceId
        });

        _mint(msg.sender, tokenId);

        emit ReceivableMinted(tokenId, msg.sender, _faceAmount, _dueDate);
    }

    /// @notice Approve a receivable after evaluation
    function approve(uint256 _tokenId) external onlyRole(EVALUATOR_ROLE) {
        ReceivableInfo storage r = receivables[_tokenId];
        require(r.state == ReceivableState.Created, "Not in Created state");
        r.state = ReceivableState.Approved;
        emit ReceivableApproved(_tokenId);
    }

    /// @notice Mark receivable as financed (called by CreditFacility)
    function markFinanced(uint256 _tokenId) external onlyRole(FACILITY_ROLE) {
        ReceivableInfo storage r = receivables[_tokenId];
        require(r.state == ReceivableState.Approved, "Not in Approved state");
        r.state = ReceivableState.Financed;
        emit ReceivableFinanced(_tokenId);
    }

    /// @notice Mark receivable as paid (called by CreditFacility on full repayment)
    function markPaid(uint256 _tokenId) external onlyRole(FACILITY_ROLE) {
        ReceivableInfo storage r = receivables[_tokenId];
        require(r.state == ReceivableState.Financed, "Not in Financed state");
        r.state = ReceivableState.Paid;
        emit ReceivablePaid(_tokenId);
    }

    /// @notice Mark receivable as defaulted
    function markDefaulted(uint256 _tokenId) external onlyRole(FACILITY_ROLE) {
        ReceivableInfo storage r = receivables[_tokenId];
        require(r.state == ReceivableState.Financed, "Not in Financed state");
        r.state = ReceivableState.Defaulted;
        emit ReceivableDefaulted(_tokenId);
    }

    /// @notice Get full receivable info
    function getReceivable(uint256 _tokenId) external view returns (ReceivableInfo memory) {
        return receivables[_tokenId];
    }

    // Required override for AccessControl + ERC721
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
