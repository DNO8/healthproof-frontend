// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../access/PermissionManager.sol";
import "../clinical/MedicalDocumentRegistry.sol";
import "../audit/AuditTrail.sol";

/// @title HealthProofProtocol
/// @notice Orquestador principal del sistema HealthProof.
/// @dev Coordina permisos, documentos médicos y auditoría.

contract HealthProofProtocol {

    PermissionManager public permissionManager;

    MedicalDocumentRegistry public documentRegistry;

    AuditTrail public auditTrail;

    constructor(
        address permissionAddress,
        address documentAddress,
        address auditAddress
    ){
        permissionManager = PermissionManager(permissionAddress);
        documentRegistry = MedicalDocumentRegistry(documentAddress);
        auditTrail = AuditTrail(auditAddress);
    }

    /// -------------------------------------
    /// REGISTRO DE DOCUMENTO MÉDICO
    /// -------------------------------------

    function registerMedicalDocument(
        bytes32 documentId,
        address patient,
        address institution,
        bytes32 documentType,
        bytes32 clinicalHash,
        string calldata cid,
        bytes32 standard,
        bytes32 classification
    ) external {
        /// registrar documento en registry
        documentRegistry.registerDocument(
            documentId,
            patient,
            institution,
            documentType,
            clinicalHash,
            bytes32(0),
            cid,
            standard,
            classification,
            msg.sender
        );

        /// registrar evento en auditoría
        auditTrail.logEvent(
            patient,
            documentId,
            AuditTrail.ActionType.MEDICAL_QUERY
        );
    }

    /// -------------------------------------
    /// OTORGAR PERMISO
    /// -------------------------------------

    function grantAccess(
        address patient,
        address grantee,
        PermissionManager.Scope scope,
        bytes32 resourceId,
        uint64 expiresAt

    ) external {
        permissionManager.grantPermission(
            patient,
            grantee,
            scope,
            resourceId,
            expiresAt,
            msg.sender
        );
        auditTrail.logEvent(
            patient,
            resourceId,
            AuditTrail.ActionType.PERMISSION_GRANTED
        );
    }

    /// -------------------------------------
    /// REVOCAR PERMISO
    /// -------------------------------------

    function revokeAccess(
        address patient,
        address grantee
    ) external {
        permissionManager.revokePermission(
            patient,
            grantee,
            msg.sender
        );
        auditTrail.logEvent(
            patient,
            bytes32(uint256(uint160(grantee))),
            AuditTrail.ActionType.PERMISSION_REVOKED
        );
    }

    /// -------------------------------------
    /// VERIFICAR ACCESO A DOCUMENTO
    /// -------------------------------------

    function canAccessDocument(
        address patient,
        address requester,
        bytes32 documentId,
        bytes32 documentType,
        address institution

    ) external view returns(bool){

        return permissionManager.hasAccess(
            patient,
            requester,
            documentId,
            documentType,
            institution
        );
    }

    /// -------------------------------------
    /// REGISTRAR ACCESO A DOCUMENTO
    /// -------------------------------------

    function logDocumentAccess(
        address patient,
        bytes32 documentId
    ) external {
        auditTrail.logEvent(
            patient,
            documentId,
            AuditTrail.ActionType.DOCUMENT_ACCESS
        );
    }
}
