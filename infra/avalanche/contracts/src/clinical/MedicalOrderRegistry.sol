// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../identity/IdentityRegistry.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../metatx/ERC2771ContextUpgradeable.sol";

///  Gestiona órdenes médicas dentro del protocolo HealthProof.
///  Diseñado para flujos hospitalarios reales (consulta → orden → examen → resultado)

contract MedicalOrderRegistry is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ERC2771ContextUpgradeable
{

    IdentityRegistry public identityRegistry;
    address public gateway;

    function initialize(address identityAddress, address forwarder) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ERC2771Context_init(forwarder);
        identityRegistry = IdentityRegistry(identityAddress);
    }

    /// @dev Override _msgSender() to support ERC2771 meta-transactions
    function _msgSender() internal view override returns (address) {
        return _erc2771MsgSender();
    }

    /// @dev Override _msgData() to support ERC2771 meta-transactions
    function _msgData() internal view override returns (bytes calldata) {
        return _erc2771MsgData();
    }

    function setGateway(address _gateway) external {
        require(gateway == address(0), "Gateway already set");
        require(identityRegistry.getRole(_gateway) == IdentityRegistry.Role.DOCTOR || 
                identityRegistry.isVerified(_gateway), "Invalid gateway");
        gateway = _gateway;
    }

    /// Estados de una orden médica
    enum OrderStatus {
        CREATED,
        LAB_ASSIGNED,
        SAMPLE_COLLECTED,
        RESULT_READY,
        CLOSED
    }

    /// Estructura de orden médica
    struct MedicalOrder {
        address patient;
        address doctor;
        address institution;
        bytes32 episodeId;
        bytes32 orderType;
        bytes32 examType;
        address assignedLab;
        OrderStatus status;
        uint64 createdAt;
    }

    /// almacenamiento de órdenes
    mapping(bytes32 => MedicalOrder) public orders;

    /// índices por address (para listar sin costo de event scanning)
    mapping(address => bytes32[]) public patientOrders;
    mapping(address => bytes32[]) public doctorOrders;
    mapping(address => bytes32[]) public labOrders;

    /// eventos para indexadores
    event MedicalOrderCreated(
        bytes32 indexed orderId,
        address indexed patient,
        address indexed doctor,
        bytes32 episodeId,
        bytes32 examType,
        uint64 timestamp
    );

    event LabAssigned(
        bytes32 indexed orderId,
        address indexed lab,
        uint64 timestamp
    );

    event OrderStatusUpdated(
        bytes32 indexed orderId,
        OrderStatus status,
        uint64 timestamp
    );

    /// -------------------------------------
    /// MODIFIERS
    /// -------------------------------------

    modifier onlyVerified() {
        require(
            identityRegistry.isVerified(_msgSender()),
            "Entidad no verificada"
        );
        _;
    }

    modifier onlyDoctor() {
        require(
            identityRegistry.getRole(_msgSender())
                == IdentityRegistry.Role.DOCTOR,
            "Solo doctores"
        );
        _;
    }

    modifier onlyGatewayOrDoctor(address doctor) {
        address caller = _msgSender();
        if (caller == gateway) {
            // Gateway already validated the doctor, trust it
            require(
                identityRegistry.getRole(doctor) == IdentityRegistry.Role.DOCTOR,
                "Invalid doctor"
            );
        } else {
            // Direct call: doctor must be the caller
            require(
                doctor == caller &&
                identityRegistry.getRole(doctor) == IdentityRegistry.Role.DOCTOR,
                "Must be called by doctor or gateway"
            );
        }
        _;
    }

    modifier orderExists(bytes32 orderId) {
        require(
            orders[orderId].createdAt != 0,
            "Orden inexistente"
        );
        _;
    }

    /// -------------------------------------
    /// CREAR ORDEN MEDICA
    /// -------------------------------------

    function createOrder(
        bytes32 orderId,
        address patient,
        address institution,
        bytes32 episodeId,
        bytes32 orderType,
        bytes32 examType,
        address doctor
    )
        external
        onlyVerified
        onlyGatewayOrDoctor(doctor)
    {

        require(
            orders[orderId].createdAt == 0,
            "Orden ya existe"
        );

        orders[orderId] = MedicalOrder({
            patient: patient,
            doctor: doctor,
            institution: institution,
            episodeId: episodeId,
            orderType: orderType,
            examType: examType,
            assignedLab: address(0),
            status: OrderStatus.CREATED,
            createdAt: uint64(block.timestamp)
        });

        patientOrders[patient].push(orderId);
        doctorOrders[doctor].push(orderId);

        emit MedicalOrderCreated(
            orderId,
            patient,
            doctor,
            episodeId,
            examType,
            uint64(block.timestamp)
        );
    }

    /// -------------------------------------
    /// ASIGNAR LABORATORIO
    /// -------------------------------------

    function assignLab(
        bytes32 orderId,
        address lab
    )
        external
        orderExists(orderId)
        onlyVerified
    {

        MedicalOrder storage order = orders[orderId];

        require(
            _msgSender() == order.patient,
            "Solo el paciente puede asignar laboratorio"
        );

        require(
            identityRegistry.getRole(lab)
                == IdentityRegistry.Role.LAB,
            "Destino no es laboratorio"
        );

        order.assignedLab = lab;
        order.status = OrderStatus.LAB_ASSIGNED;
        labOrders[lab].push(orderId);
        emit LabAssigned(
            orderId,
            lab,
            uint64(block.timestamp)
        );
    }

    /// -------------------------------------
    /// ACTUALIZAR ESTADO
    /// -------------------------------------

    function updateStatus(
        bytes32 orderId,
        OrderStatus status
    )
        external
        orderExists(orderId)
        onlyVerified
    {

        MedicalOrder storage order = orders[orderId];

        /// solo laboratorio asignado o doctor
        require(
            _msgSender() == order.assignedLab ||
            _msgSender() == order.doctor,
            "No autorizado"
        );

        order.status = status;

        emit OrderStatusUpdated(
            orderId,
            status,
            uint64(block.timestamp)
        );
    }

    /// -------------------------------------
    /// OBTENER ORDEN
    /// -------------------------------------

    function getOrder(
        bytes32 orderId
    )
        external
        view
        orderExists(orderId)
        returns (MedicalOrder memory)
    {

        return orders[orderId];
    }

    /// -------------------------------------
    /// LISTAR ORDENES (paginado)
    /// -------------------------------------

    function getOrdersByPatient(
        address patient,
        uint256 offset,
        uint256 limit
    ) external view returns (bytes32[] memory result, uint256 total) {
        bytes32[] storage list = patientOrders[patient];
        total = list.length;
        if (offset >= total) return (new bytes32[](0), total);
        uint256 end = offset + limit;
        if (end > total) end = total;
        result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = list[i];
        }
    }

    function getOrdersByDoctor(
        address doctor,
        uint256 offset,
        uint256 limit
    ) external view returns (bytes32[] memory result, uint256 total) {
        bytes32[] storage list = doctorOrders[doctor];
        total = list.length;
        if (offset >= total) return (new bytes32[](0), total);
        uint256 end = offset + limit;
        if (end > total) end = total;
        result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = list[i];
        }
    }

    function getOrdersByLab(
        address lab,
        uint256 offset,
        uint256 limit
    ) external view returns (bytes32[] memory result, uint256 total) {
        bytes32[] storage list = labOrders[lab];
        total = list.length;
        if (offset >= total) return (new bytes32[](0), total);
        uint256 end = offset + limit;
        if (end > total) end = total;
        result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = list[i];
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // Solo el owner puede autorizar upgrades
    }

    uint256[50] private __gap;
}