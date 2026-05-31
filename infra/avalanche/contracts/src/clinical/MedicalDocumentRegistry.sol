// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../identity/IdentityRegistry.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../metatx/ERC2771ContextUpgradeable.sol";

contract MedicalDocumentRegistry is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ERC2771ContextUpgradeable
{

    IdentityRegistry public identityRegistry;
    address public gateway;

    function initialize(address identityAddress, address forwarder) public initializer {
        __Ownable_init(msg.sender);
        __ERC2771Context_init(forwarder);
        identityRegistry = IdentityRegistry(identityAddress);
    }

    function setGateway(address _gateway) external onlyOwner {
        require(_gateway != address(0), "Invalid gateway");
        gateway = _gateway;
    }

    /// @dev Override _msgSender() to support ERC2771 meta-transactions
    function _msgSender() internal view override returns (address) {
        return _erc2771MsgSender();
    }

    /// @dev Override _msgData() to support ERC2771 meta-transactions
    function _msgData() internal view override returns (bytes calldata) {
        return _erc2771MsgData();
    }

    struct MedicalDocument {
        address patient;
        address issuer;
        address institution;
        bytes32 documentType;
        bytes32 clinicalHash;
        bytes32 episodeId;
        string cid;
        bytes32 standard;
        bytes32 classification;
        uint64 createdAt;
    }

    mapping(bytes32 => MedicalDocument) public documents;

    event DocumentRegistered(
        bytes32 indexed documentId,
        address indexed patient,
        address issuer
    );

    /// @dev When called via Gateway, verifies the provided issuer has a medical role.
    ///      When called directly, verifies the caller has a medical role.
    modifier onlyMedicalIssuerOrGatewayActor(address issuer) {
        address actor = (_msgSender() == gateway) ? issuer : _msgSender();
        require(identityRegistry.isVerified(actor), "Issuer not verified");
        IdentityRegistry.Role r = identityRegistry.getRole(actor);
        require(
            r == IdentityRegistry.Role.LAB ||
            r == IdentityRegistry.Role.DOCTOR ||
            r == IdentityRegistry.Role.INSTITUTION,
            "Invalid issuer role"
        );
        _;
    }

    function registerDocument(
        bytes32 documentId,
        address patient,
        address institution,
        bytes32 documentType,
        bytes32 clinicalHash,
        bytes32 episodeId,
        string calldata cid,
        bytes32 standard,
        bytes32 classification,
        address issuer
    ) external onlyMedicalIssuerOrGatewayActor(issuer) {

        documents[documentId] = MedicalDocument({
            patient: patient,
            issuer: issuer,
            institution: institution,
            documentType: documentType,
            clinicalHash: clinicalHash,
            episodeId: episodeId,
            cid: cid,
            standard: standard,
            classification: classification,
            createdAt: uint64(block.timestamp)
        });

        emit DocumentRegistered(
            documentId,
            patient,
            issuer
        );
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // Solo el owner puede autorizar upgrades
    }

    uint256[50] private __gap;
}