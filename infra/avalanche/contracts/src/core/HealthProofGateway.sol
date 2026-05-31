// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HealthProofKernel.sol";
import "../identity/IdentityRegistry.sol";
import "../identity/GuardianRegistry.sol";
import "../clinical/ClinicalEpisodeRegistry.sol";
import "../clinical/MedicalOrderRegistry.sol";
import "../clinical/MedicalDocumentRegistry.sol";
import "../access/PermissionManager.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract HealthProofGateway is ERC2771Context {

    HealthProofKernel public kernel;
    IdentityRegistry public identityRegistry;
    GuardianRegistry public guardianRegistry;

    constructor(address kernelAddress, address identityAddress, address guardianAddress, address trustedForwarder) 
        ERC2771Context(trustedForwarder) 
    {
        kernel = HealthProofKernel(kernelAddress);
        identityRegistry = IdentityRegistry(identityAddress);
        guardianRegistry = GuardianRegistry(guardianAddress);
    }

    bytes32 constant EPISODE_MODULE =
        keccak256("EPISODE_MODULE");

    bytes32 constant ORDER_MODULE =
        keccak256("ORDER_MODULE");

    bytes32 constant DOCUMENT_MODULE =
        keccak256("DOCUMENT_MODULE");

    bytes32 constant PERMISSION_MODULE =
        keccak256("PERMISSION_MODULE");

    event EpisodeCreated(
        bytes32 indexed episodeId,
        address indexed patient,
        address indexed doctor
    );

    event MedicalOrderCreated(
        bytes32 indexed orderId,
        address indexed patient,
        bytes32 episodeId,
        address doctor
    );

    event MedicalDocumentRegistered(
        bytes32 indexed documentId,
        address indexed patient,
        bytes32 episodeId
    );

    event AccessGranted(
        address indexed patient,
        address indexed grantee,
        bytes32 resourceId
    );

    modifier notPaused(){
        require(!kernel.protocolPaused(),"Protocol paused");
        _;
    }

    modifier onlyVerifiedDoctor(address doctor) {
        require(doctor == _msgSender(), "Doctor must be caller");
        require(
            identityRegistry.getRole(doctor) == IdentityRegistry.Role.DOCTOR,
            "Caller must be verified doctor"
        );
        require(identityRegistry.isVerified(doctor), "Doctor not verified");
        _;
    }

    modifier onlyVerifiedIssuer() {
        address caller = _msgSender();
        require(identityRegistry.isVerified(caller), "Caller not verified");
        IdentityRegistry.Role r = identityRegistry.getRole(caller);
        require(
            r == IdentityRegistry.Role.LAB ||
            r == IdentityRegistry.Role.DOCTOR ||
            r == IdentityRegistry.Role.INSTITUTION,
            "Caller must be LAB/DOCTOR/INSTITUTION"
        );
        _;
    }

    modifier onlyVerifiedActor(address actor) {
        require(actor == _msgSender(), "Actor must be caller");
        require(identityRegistry.isVerified(actor), "Actor not verified");
        _;
    }

    modifier authorizedForPatient(address patient) {
        address caller = _msgSender();
        require(
            caller == patient || guardianRegistry.isGuardian(patient, caller),
            "Not authorized for patient"
        );
        _;
    }

    function createEpisode(
        bytes32 episodeId,
        address patient,
        address institution,
        bytes32 episodeType,
        bytes32 classification,
        address doctor
    )
        external
        notPaused
        onlyVerifiedDoctor(doctor)
    {
        address module = kernel.getModule(EPISODE_MODULE);

        ClinicalEpisodeRegistry(module).openEpisode(
            episodeId,
            patient,
            institution,
            episodeType,
            classification,
            doctor
        );

        emit EpisodeCreated(
            episodeId,
            patient,
            doctor
        );
    }

    function createMedicalOrder(
        bytes32 orderId,
        address patient,
        address institution,
        bytes32 episodeId,
        bytes32 orderType,
        bytes32 examType,
        address doctor
    )
        external
        notPaused
        onlyVerifiedDoctor(doctor)
    {
        address module = kernel.getModule(ORDER_MODULE);

        MedicalOrderRegistry(module).createOrder(
            orderId,
            patient,
            institution,
            episodeId,
            orderType,
            examType,
            doctor
        );

        emit MedicalOrderCreated(
            orderId,
            patient,
            episodeId,
            doctor
        );
    }

    function registerMedicalDocument(
        bytes32 documentId,
        address patient,
        address institution,
        bytes32 documentType,
        bytes32 clinicalHash,
        bytes32 episodeId,
        string calldata cid,
        bytes32 standard,
        bytes32 classification

    )
        external
        notPaused
        onlyVerifiedIssuer
    {

        address module = kernel.getModule(DOCUMENT_MODULE);

        MedicalDocumentRegistry(module).registerDocument(
            documentId,
            patient,
            institution,
            documentType,
            clinicalHash,
            episodeId,
            cid,
            standard,
            classification,
            _msgSender()
        );

        emit MedicalDocumentRegistered(
            documentId,
            patient,
            episodeId
        );
    }

    function grantAccess(

        address patient,
        address grantee,
        uint8 scope,
        bytes32 resourceId,
        uint64 expiresAt

    )
        external
        notPaused
        authorizedForPatient(patient)
    {

        address module = kernel.getModule(PERMISSION_MODULE);

        PermissionManager(module).grantPermission(
            patient,
            grantee,
            PermissionManager.Scope(scope),
            resourceId,
            expiresAt,
            _msgSender()
        );

        emit AccessGranted(
            patient,
            grantee,
            resourceId
        );
    }

    function revokeAccess(
        address patient,
        address grantee
    )
        external
        notPaused
        authorizedForPatient(patient)
    {
        address module = kernel.getModule(PERMISSION_MODULE);

        PermissionManager(module).revokePermission(
            patient,
            grantee,
            _msgSender()
        );

        emit AccessRevoked(
            patient,
            grantee
        );
    }

    event AccessRevoked(
        address indexed patient,
        address indexed grantee
    );

    // ==========================================
    // PROXY FUNCTIONS for Issue 2.2 (previously inaccessible)
    // ==========================================

    event LabAssignedViaGateway(
        bytes32 indexed orderId,
        address indexed lab,
        address indexed patient
    );

    event OrderStatusUpdatedViaGateway(
        bytes32 indexed orderId,
        uint8 status,
        address indexed updater
    );

    event EpisodeClosedViaGateway(
        bytes32 indexed episodeId,
        address indexed doctor
    );

    /// Assign lab to a medical order (proxy for MedicalOrderRegistry.assignLab)
    /// Callable by patient or patient's guardian
    function assignLabViaGateway(
        bytes32 orderId,
        address lab,
        address patient
    )
        external
        notPaused
        authorizedForPatient(patient)
    {
        address module = kernel.getModule(ORDER_MODULE);
        
        // Verify lab is valid
        require(
            identityRegistry.getRole(lab) == IdentityRegistry.Role.LAB,
            "Destino no es laboratorio"
        );

        MedicalOrderRegistry(module).assignLab(orderId, lab, patient);

        emit LabAssignedViaGateway(orderId, lab, patient);
    }

    /// Update order status (proxy for MedicalOrderRegistry.updateStatus)
    /// Callable by assigned lab or the doctor who created the order
    function updateOrderStatusViaGateway(
        bytes32 orderId,
        uint8 status,
        address updater
    )
        external
        notPaused
        onlyVerifiedActor(updater)
    {
        require(updater == _msgSender(), "Updater must be caller");
        
        address module = kernel.getModule(ORDER_MODULE);
        
        // Get order data using tuple destructuring
        // orders() returns: (patient, doctor, institution, episodeId, orderType, examType, assignedLab, orderStatus, createdAt)
        (,,,,,, address assignedLab, MedicalOrderRegistry.OrderStatus currentStatus,) = MedicalOrderRegistry(module).orders(orderId);
        (currentStatus); // silence unused warning
        
        // Get doctor from orders mapping - using a separate call
        (, address orderDoctor,,,,,,,) = MedicalOrderRegistry(module).orders(orderId);
        
        require(
            updater == orderDoctor || updater == assignedLab,
            "No autorizado: must be order doctor or assigned lab"
        );

        MedicalOrderRegistry(module).updateStatus(
            orderId, 
            MedicalOrderRegistry.OrderStatus(status),
            updater
        );

        emit OrderStatusUpdatedViaGateway(orderId, status, updater);
    }

    /// Close clinical episode (proxy for ClinicalEpisodeRegistry.closeEpisode)
    /// Callable by the doctor who opened the episode
    function closeEpisodeViaGateway(
        bytes32 episodeId,
        address doctor
    )
        external
        notPaused
        onlyVerifiedDoctor(doctor)
    {
        require(doctor == _msgSender(), "Doctor must be caller");
        
        address module = kernel.getModule(EPISODE_MODULE);
        
        // Get episode data - episodes() returns tuple
        // (patient, openedBy, institution, episodeType, classification, openedAt, active)
        (, address openedBy,,,,,) = ClinicalEpisodeRegistry(module).episodes(episodeId);
        
        // Validate doctor opened this episode
        require(
            openedBy == doctor,
            "Solo doctor creador puede cerrar"
        );

        ClinicalEpisodeRegistry(module).closeEpisode(episodeId, doctor);

        emit EpisodeClosedViaGateway(episodeId, doctor);
    }
}