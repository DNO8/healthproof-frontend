// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IdentityRegistry.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../metatx/ERC2771ContextUpgradeable.sol";

contract GuardianRegistry is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ERC2771ContextUpgradeable
{

    IdentityRegistry public identityRegistry;

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

    enum GuardianshipType {
        PARENTAL,
        LEGAL_TUTOR,
        COURT_APPOINTED,
        VOLUNTARY_DELEGATION
    }

    struct Guardianship {
        address guardian;
        address certifier;
        GuardianshipType gType;
        bytes32 legalDocHash;
        uint256 validUntil;
        bool active;
    }

    mapping(address => Guardianship[]) public guardians;

    event GuardianshipGranted(
        address patient,
        address guardian,
        address certifier
    );

    event GuardianshipRevoked(
        address patient,
        address guardian,
        address revokedBy
    );

    /// Registrar tutela validada por certificador
    function grantGuardianship(
        address patient,
        address guardian,
        GuardianshipType gType,
        bytes32 legalDocHash,
        uint256 validUntil
    ) external {

        /// validar que quien ejecuta es certificador (via meta-tx o directo)
        require(
            identityRegistry.getRole(_msgSender())
                == IdentityRegistry.Role.CERTIFIER,
            "No autorizado"
        );

        guardians[patient].push(
            Guardianship({
                guardian: guardian,
                certifier: _msgSender(),
                gType: gType,
                legalDocHash: legalDocHash,
                validUntil: validUntil,
                active: true
            })
        );

        emit GuardianshipGranted(patient, guardian, _msgSender());
    }

    /// Revocar tutela (solo paciente o guardian activo puede revocar)
    function revokeGuardianship(address patient, address guardian) external {
        address caller = _msgSender();
        
        // Solo el paciente o un guardian activo puede revocar
        require(
            caller == patient || isGuardian(patient, caller),
            "No autorizado"
        );

        Guardianship[] storage list = guardians[patient];
        for (uint i = 0; i < list.length; i++) {
            if (list[i].guardian == guardian && list[i].active) {
                list[i].active = false;
                emit GuardianshipRevoked(patient, guardian, caller);
                return;
            }
        }
        
        revert("Guardian not found or already inactive");
    }

    function isGuardian(address patient, address guardian)
        public
        view
        returns (bool)
    {
        Guardianship[] memory list = guardians[patient];

        for (uint i = 0; i < list.length; i++) {

            if(
                list[i].guardian == guardian &&
                list[i].active &&
                (list[i].validUntil == 0 ||
                 block.timestamp <= list[i].validUntil)
            ){
                return true;
            }
        }

        return false;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // Solo el owner puede autorizar upgrades
    }

    uint256[50] private __gap;
}
