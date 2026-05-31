// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../identity/IdentityRegistry.sol";
import "../identity/GuardianRegistry.sol";
import "./EmergencyAccessManager.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../metatx/ERC2771ContextUpgradeable.sol";

contract PermissionManager is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ERC2771ContextUpgradeable
{

    IdentityRegistry public identityRegistry;
    GuardianRegistry public guardianRegistry;
    EmergencyAccessManager public emergencyManager;
    address public gateway;

    function setEmergencyAccessManager(address emergencyAddress) external onlyOwner {
        emergencyManager = EmergencyAccessManager(emergencyAddress);
    }

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

    enum Scope {
        DOCUMENT,
        DOCUMENT_TYPE,
        INSTITUTION,
        FULL_ACCESS
    }

    struct Permission {
        address grantee;
        Scope scope;
        bytes32 resourceId;
        uint64 expiresAt;
        bool active;
    }

    mapping(address => Permission[]) private permissions;

    /// O(1) lookup: patient → grantee → active permission (last granted)
    mapping(address => mapping(address => Permission)) private permissionLookup;

    event PermissionGranted(
        address indexed patient,
        address indexed grantee,
        Scope scope
    );

    event PermissionRevoked(
        address indexed patient,
        address indexed grantee
    );

    modifier authorized(address patient) {
        require(
            _msgSender() == patient ||
            guardianRegistry.isGuardian(patient, _msgSender()),
            "No autorizado"
        );
        _;
    }

    /// @dev When called via Gateway, verifies the provided actor is patient or guardian.
    ///      When called directly, verifies the caller is patient or guardian.
    modifier authorizedOrGatewayActor(address patient, address actor) {
        if (_msgSender() == gateway) {
            require(
                actor == patient ||
                guardianRegistry.isGuardian(patient, actor),
                "No autorizado"
            );
        } else {
            require(
                _msgSender() == patient ||
                guardianRegistry.isGuardian(patient, _msgSender()),
                "No autorizado"
            );
        }
        _;
    }

    function grantPermission(
        address patient,
        address grantee,
        Scope scope,
        bytes32 resourceId,
        uint64 expiresAt,
        address actor
    )
        external
        authorizedOrGatewayActor(patient, actor)
    {

        require(
            identityRegistry.isVerified(grantee),
            "Entidad no verificada"
        );

        Permission memory newPerm = Permission({
            grantee: grantee,
            scope: scope,
            resourceId: resourceId,
            expiresAt: expiresAt,
            active: true
        });

        permissions[patient].push(newPerm);
        permissionLookup[patient][grantee] = newPerm;

        emit PermissionGranted(patient, grantee, scope);
    }

    function revokePermission(
        address patient,
        address grantee,
        address actor
    )
        external
        authorizedOrGatewayActor(patient, actor)
    {

        // O(1): invalidate lookup entry
        permissionLookup[patient][grantee].active = false;

        // Also invalidate all matching entries in the array (for historical cleanup)
        Permission[] storage list = permissions[patient];

        for(uint i; i < list.length; ){
            if(
                list[i].grantee == grantee &&
                list[i].active
            ){
                list[i].active = false;
            }

            unchecked { ++i; }
        }

        emit PermissionRevoked(patient, grantee);
    }

    function _checkPermission(
        Permission memory p,
        address requester,
        bytes32 documentId,
        bytes32 documentType,
        address institution
    )
        internal
        pure
        returns (bool)
    {
        if (!p.active) return false;
        if (p.grantee != requester) return false;

        if (p.scope == Scope.FULL_ACCESS)
            return true;

        if (p.scope == Scope.DOCUMENT && p.resourceId == documentId)
            return true;

        if (p.scope == Scope.DOCUMENT_TYPE && p.resourceId == documentType)
            return true;

        if (
            p.scope == Scope.INSTITUTION &&
            p.resourceId == bytes32(uint256(uint160(institution)))
        )
            return true;

        return false;
    }

    function hasAccess(
        address patient,
        address requester,
        bytes32 documentId,
        bytes32 documentType,
        address institution
    )
        external
        view
        returns(bool)
    {
        // O(1) fast-path: check lookup mapping for last granted permission
        Permission memory lookupPerm = permissionLookup[patient][requester];
        if (
            lookupPerm.grantee != address(0) &&
            lookupPerm.active &&
            (lookupPerm.expiresAt == 0 || block.timestamp <= lookupPerm.expiresAt)
        ) {
            if (_checkPermission(lookupPerm, requester, documentId, documentType, institution))
                return true;
        }

        // Fallback: scan array for historical permissions or multiple per grantee
        Permission[] memory list = permissions[patient];

        for(uint i; i < list.length; ){
            Permission memory p = list[i];

            if(!p.active){
                unchecked { ++i; }
                continue;
            }

            if(p.expiresAt != 0 && block.timestamp > p.expiresAt){
                unchecked { ++i; }
                continue;
            }

            if(p.grantee != requester){
                unchecked { ++i; }
                continue;
            }

            if(_checkPermission(p, requester, documentId, documentType, institution))
                return true;

            unchecked { ++i; }
        }

        // Emergency access fallback (break-the-glass)
        if (address(emergencyManager) != address(0)) {
            if (emergencyManager.isEmergencyActive(patient, requester, documentId)) {
                return true;
            }
        }

        return false;
    }

    /// @dev Paginated list of all permissions for a patient (from array storage)
    function getPermissions(
        address patient,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (Permission[] memory result, uint256 total)
    {
        Permission[] storage list = permissions[patient];
        total = list.length;
        if (offset >= total) return (new Permission[](0), total);

        uint256 end = offset + limit;
        if (end > total) end = total;

        result = new Permission[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = list[i];
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // Solo el owner puede autorizar upgrades
    }

    uint256[50] private __gap;
}