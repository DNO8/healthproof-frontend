// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../identity/IdentityRegistry.sol";
import "../identity/GuardianRegistry.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../metatx/ERC2771ContextUpgradeable.sol";

/// @title EmergencyAccessManager
/// @notice Gestiona acceso de emergencia (break-the-glass) a documentos médicos.
/// @dev Tres rutas: guardian-aprobado (72h), dual-doctor witness (4h), paciente consciente (sin límite).
contract EmergencyAccessManager is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ERC2771ContextUpgradeable
{
    IdentityRegistry public identityRegistry;
    GuardianRegistry public guardianRegistry;

    function initialize(
        address identityAddress,
        address guardianAddress,
        address forwarder
    ) public initializer {
        __Ownable_init(msg.sender);
        __ERC2771Context_init(forwarder);
        identityRegistry = IdentityRegistry(identityAddress);
        guardianRegistry = GuardianRegistry(guardianAddress);
    }

    function _msgSender() internal view override returns (address) {
        return _erc2771MsgSender();
    }

    function _msgData() internal view override returns (bytes calldata) {
        return _erc2771MsgData();
    }

    enum ActivationPath {
        GUARDIAN,
        DUAL_DOCTOR,
        PATIENT_SELF
    }

    enum Status {
        PENDING,
        APPROVED,
        EXPIRED,
        REJECTED,
        REVOKED
    }

    struct EmergencyRequest {
        bytes32 requestId;
        address patient;
        address requestingDoctor;
        address witnessDoctor;
        address approvedBy;
        bytes32 resourceId;
        ActivationPath path;
        Status status;
        uint64 requestedAt;
        uint64 activatedAt;
        uint64 expiresAt;
        bytes32 reasonHash;
    }

    mapping(bytes32 => EmergencyRequest) public requests;
    mapping(address => mapping(address => mapping(bytes32 => bytes32)))
        public emergencyRequestId;

    event EmergencyRequested(
        bytes32 indexed requestId,
        address indexed patient,
        address indexed doctor,
        bytes32 resourceId,
        ActivationPath path
    );
    event EmergencyWitnessed(
        bytes32 indexed requestId,
        address indexed witnessDoctor
    );
    event EmergencyApproved(
        bytes32 indexed requestId,
        address indexed approvedBy,
        uint64 expiresAt,
        ActivationPath path
    );
    event EmergencyRevoked(
        bytes32 indexed requestId,
        address indexed revokedBy
    );
    event EmergencyRejected(
        bytes32 indexed requestId,
        address indexed rejectedBy
    );

    bytes32 constant ZERO_BYTES32 =
        keccak256("");

    uint64 constant ACCESS_72H = 72 * 60 * 60;
    uint64 constant ACCESS_4H = 4 * 60 * 60;

    modifier onlyVerifiedDoctor() {
        require(
            identityRegistry.getRole(_msgSender()) == IdentityRegistry.Role.DOCTOR,
            "Solo doctor"
        );
        require(
            identityRegistry.isVerified(_msgSender()),
            "Doctor no verificado"
        );
        _;
    }

    modifier onlyVerified() {
        require(identityRegistry.isVerified(_msgSender()), "No verificado");
        _;
    }

    function requestEmergencyAccess(
        address patient,
        bytes32 resourceId,
        bytes32 reasonHash
    ) external onlyVerifiedDoctor returns (bytes32 requestId) {
        requestId = keccak256(
            abi.encodePacked(patient, _msgSender(), resourceId, block.timestamp)
        );

        require(
            requests[requestId].requestedAt == 0,
            "Request ya existe"
        );

        requests[requestId] = EmergencyRequest({
            requestId: requestId,
            patient: patient,
            requestingDoctor: _msgSender(),
            witnessDoctor: address(0),
            approvedBy: address(0),
            resourceId: resourceId,
            path: ActivationPath.GUARDIAN,
            status: Status.PENDING,
            requestedAt: uint64(block.timestamp),
            activatedAt: 0,
            expiresAt: 0,
            reasonHash: reasonHash
        });

        emergencyRequestId[patient][_msgSender()][resourceId] = requestId;

        emit EmergencyRequested(
            requestId,
            patient,
            _msgSender(),
            resourceId,
            ActivationPath.GUARDIAN
        );

        return requestId;
    }

    function approveByGuardian(bytes32 requestId) external {
        EmergencyRequest storage req = requests[requestId];
        require(req.requestedAt != 0, "Request no existe");
        require(req.status == Status.PENDING, "No esta pendiente");
        require(
            guardianRegistry.isGuardian(req.patient, _msgSender()),
            "No es guardian activo"
        );

        req.status = Status.APPROVED;
        req.approvedBy = _msgSender();
        req.activatedAt = uint64(block.timestamp);
        req.expiresAt = uint64(block.timestamp) + ACCESS_72H;
        req.path = ActivationPath.GUARDIAN;

        emit EmergencyApproved(
            requestId,
            _msgSender(),
            req.expiresAt,
            ActivationPath.GUARDIAN
        );
    }

    function witnessEmergency(bytes32 requestId) external onlyVerifiedDoctor {
        EmergencyRequest storage req = requests[requestId];
        require(req.requestedAt != 0, "Request no existe");
        require(req.status == Status.PENDING, "No esta pendiente");
        require(
            !guardianRegistry.hasActiveGuardian(req.patient),
            "Paciente tiene guardian"
        );
        require(
            _msgSender() != req.requestingDoctor,
            "Witness != requester"
        );
        require(
            identityRegistry.getRole(_msgSender()) == IdentityRegistry.Role.DOCTOR,
            "Witness debe ser doctor"
        );

        req.witnessDoctor = _msgSender();
        req.status = Status.APPROVED;
        req.approvedBy = _msgSender();
        req.activatedAt = uint64(block.timestamp);
        req.expiresAt = uint64(block.timestamp) + ACCESS_4H;
        req.path = ActivationPath.DUAL_DOCTOR;

        emit EmergencyWitnessed(requestId, _msgSender());
        emit EmergencyApproved(
            requestId,
            _msgSender(),
            req.expiresAt,
            ActivationPath.DUAL_DOCTOR
        );
    }

    function approveByPatient(bytes32 requestId) external {
        EmergencyRequest storage req = requests[requestId];
        require(req.requestedAt != 0, "Request no existe");
        require(req.status == Status.PENDING, "No esta pendiente");
        require(_msgSender() == req.patient, "Solo paciente");

        req.status = Status.APPROVED;
        req.approvedBy = _msgSender();
        req.activatedAt = uint64(block.timestamp);
        req.expiresAt = 0;
        req.path = ActivationPath.PATIENT_SELF;

        emit EmergencyApproved(
            requestId,
            _msgSender(),
            0,
            ActivationPath.PATIENT_SELF
        );
    }

    function revokeEmergencyAccess(bytes32 requestId) external {
        EmergencyRequest storage req = requests[requestId];
        require(req.requestedAt != 0, "Request no existe");
        require(req.status == Status.APPROVED, "No esta aprobado");
        require(
            _msgSender() == req.patient ||
            guardianRegistry.isGuardian(req.patient, _msgSender()),
            "No autorizado"
        );

        req.status = Status.REVOKED;

        emit EmergencyRevoked(requestId, _msgSender());
    }

    function rejectEmergency(bytes32 requestId) external {
        EmergencyRequest storage req = requests[requestId];
        require(req.requestedAt != 0, "Request no existe");
        require(req.status == Status.PENDING, "No esta pendiente");
        require(
            _msgSender() == req.patient ||
            guardianRegistry.isGuardian(req.patient, _msgSender()),
            "No autorizado"
        );

        req.status = Status.REJECTED;

        emit EmergencyRejected(requestId, _msgSender());
    }

    function isEmergencyActive(
        address patient,
        address doctor,
        bytes32 resourceId
    ) external view returns (bool) {
        bytes32 requestId = emergencyRequestId[patient][doctor][resourceId];
        if (requestId == bytes32(0)) return false;
        EmergencyRequest memory req = requests[requestId];
        if (req.status != Status.APPROVED) return false;
        if (req.expiresAt != 0 && block.timestamp > req.expiresAt) return false;
        return true;
    }

    function renewDualDoctor(
        bytes32 requestId,
        bytes32 newReasonHash
    ) external onlyVerifiedDoctor {
        EmergencyRequest storage req = requests[requestId];
        require(req.requestedAt != 0, "Request no existe");
        require(req.path == ActivationPath.DUAL_DOCTOR, "No es dual-doctor");
        require(
            req.status == Status.APPROVED || req.status == Status.EXPIRED,
            "Estado invalido"
        );
        require(
            !guardianRegistry.hasActiveGuardian(req.patient),
            "Paciente tiene guardian"
        );
        require(
            _msgSender() != req.requestingDoctor,
            "Renewer != requester"
        );

        req.witnessDoctor = _msgSender();
        req.status = Status.APPROVED;
        req.approvedBy = _msgSender();
        req.activatedAt = uint64(block.timestamp);
        req.expiresAt = uint64(block.timestamp) + ACCESS_4H;
        req.reasonHash = newReasonHash;

        emit EmergencyWitnessed(requestId, _msgSender());
        emit EmergencyApproved(
            requestId,
            _msgSender(),
            req.expiresAt,
            ActivationPath.DUAL_DOCTOR
        );
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // Solo owner puede autorizar upgrades
    }

    uint256[50] private __gap;
}
