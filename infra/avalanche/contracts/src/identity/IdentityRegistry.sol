// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract IdentityRegistry is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{

    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    modifier onlyAdmin() {
        require(owner() == msg.sender, "Not admin");
        _;
    }

    enum Role {
        PATIENT,
        DOCTOR,
        LAB,
        INSTITUTION,
        CERTIFIER,
        ADMIN
    }

    struct Entity {
        address wallet;
        Role role;
        string specialty;
        address institution;
        bool verified;
    }

    mapping(address => Entity) public entities;

    event EntityRegistered(address wallet, Role role);
    event EntityVerified(address wallet);
    event AdminTransferred(address previousAdmin, address newAdmin);

    function registerEntity(
        address wallet,
        Role role,
        string calldata specialty,
        address institution
    ) external onlyAdmin {

        entities[wallet] = Entity({
            wallet: wallet,
            role: role,
            specialty: specialty,
            institution: institution,
            verified: false
        });

        emit EntityRegistered(wallet, role);
    }

    function verifyEntity(address wallet)
        external
        onlyAdmin
    {
        entities[wallet].verified = true;
        emit EntityVerified(wallet);
    }

    function isVerified(address wallet)
        external
        view
        returns (bool)
    {
        return entities[wallet].verified;
    }

    function getRole(address wallet)
        external
        view
        returns (Role)
    {
        return entities[wallet].role;
    }

    function transferAdmin(address newAdmin)
        external
        onlyAdmin
    {
        require(newAdmin != address(0), "Invalid admin address");
        address previousAdmin = owner();
        transferOwnership(newAdmin);
        emit AdminTransferred(previousAdmin, newAdmin);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // Solo el owner puede autorizar upgrades
    }

    uint256[50] private __gap;
}