// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../identity/IdentityRegistry.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../metatx/ERC2771ContextUpgradeable.sol";

contract ClinicalEpisodeRegistry is 
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
        require(identityRegistry.isVerified(_gateway), "Invalid gateway");
        gateway = _gateway;
    }

    struct ClinicalEpisode {
        address patient;
        address openedBy;
        address institution;
        bytes32 episodeType;
        bytes32 classification;
        uint64 openedAt;
        bool active;
    }

    mapping(bytes32 => ClinicalEpisode) public episodes;

    /// índices por address (para listar sin costo de event scanning)
    mapping(address => bytes32[]) public patientEpisodes;
    mapping(address => bytes32[]) public doctorEpisodes;

    event ClinicalEpisodeOpened(
        bytes32 indexed episodeId,
        address indexed patient,
        address indexed doctor,
        address institution,
        bytes32 episodeType,
        uint64 timestamp
    );

    event ClinicalEpisodeClosed(
        bytes32 indexed episodeId,
        address indexed patient,
        uint64 timestamp
    );

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
            "Solo doctor"
        );
        _;
    }

    modifier onlyGatewayOrDoctor(address doctor) {
        require(
            _msgSender() == gateway || _msgSender() == doctor,
            "Solo gateway o doctor"
        );
        _;
    }

    function openEpisode(
        bytes32 episodeId,
        address patient,
        address institution,
        bytes32 episodeType,
        bytes32 classification,
        address doctor
    )
        external
        onlyVerified
        onlyDoctor
        onlyGatewayOrDoctor(doctor)
    {
        require(
            episodes[episodeId].openedAt == 0,
            "Episodio ya existe"
        );

        episodes[episodeId] = ClinicalEpisode({
            patient: patient,
            openedBy: doctor,
            institution: institution,
            episodeType: episodeType,
            classification: classification,
            openedAt: uint64(block.timestamp),
            active: true
        });

        patientEpisodes[patient].push(episodeId);
        doctorEpisodes[doctor].push(episodeId);

        emit ClinicalEpisodeOpened(
            episodeId,
            patient,
            doctor,
            institution,
            episodeType,
            uint64(block.timestamp)
        );
    }

    function closeEpisode(
        bytes32 episodeId
    )
        external
        onlyVerified
        onlyDoctor
    {
        require(
            episodes[episodeId].active,
            "Episodio ya cerrado o no existe"
        );

        require(
            episodes[episodeId].openedBy == _msgSender(),
            "Solo doctor creador puede cerrar"
        );

        episodes[episodeId].active = false;

        address patient = episodes[episodeId].patient;
        emit ClinicalEpisodeClosed(episodeId, patient, uint64(block.timestamp));
    }

    function getEpisode(bytes32 episodeId)
        external
        view
        returns (ClinicalEpisode memory)
    {
        return episodes[episodeId];
    }

    /// -------------------------------------
    /// LISTAR EPISODIOS (paginado)
    /// -------------------------------------

    function getEpisodesByPatient(
        address patient,
        uint256 offset,
        uint256 limit
    ) external view returns (bytes32[] memory result, uint256 total) {
        bytes32[] storage list = patientEpisodes[patient];
        total = list.length;
        if (offset >= total) return (new bytes32[](0), total);
        uint256 end = offset + limit;
        if (end > total) end = total;
        result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = list[i];
        }
    }

    function getEpisodesByDoctor(
        address doctor,
        uint256 offset,
        uint256 limit
    ) external view returns (bytes32[] memory result, uint256 total) {
        bytes32[] storage list = doctorEpisodes[doctor];
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