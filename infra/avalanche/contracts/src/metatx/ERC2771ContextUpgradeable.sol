// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/StorageSlot.sol";

/**
 * @dev Custom upgradeable version of ERC2771Context for UUPS proxies.
 * Stores _trustedForwarder in a storage slot instead of immutable variable.
 * Compatible with OpenZeppelin Contracts v5.0.1
 * 
 * Note: This contract does NOT inherit from Context to avoid conflicts when used
 * with OwnableUpgradeable. The using contract should call these functions directly
 * or override the standard _msgSender()/_msgData() to use these implementations.
 */
abstract contract ERC2771ContextUpgradeable {
    
    // Storage slot for trusted forwarder computed as keccak256("healthproof.trustedForwarder")
    bytes32 private constant _TRUSTED_FORWARDER_SLOT = bytes32(uint256(keccak256("healthproof.trustedForwarder")) - 1);
    
    /**
     * @dev Initializes the contract with a trusted forwarder.
     * To be called in the proxy's initializer.
     */
    function __ERC2771Context_init(address forwarder) internal {
        StorageSlot.getAddressSlot(_TRUSTED_FORWARDER_SLOT).value = forwarder;
    }
    
    /**
     * @dev Returns the trusted forwarder address.
     */
    function trustedForwarder() public view returns (address) {
        return StorageSlot.getAddressSlot(_TRUSTED_FORWARDER_SLOT).value;
    }
    
    /**
     * @dev Returns true if `forwarder` is the trusted forwarder.
     */
    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == trustedForwarder();
    }
    
    /**
     * @dev Returns the original sender - use this in place of _msgSender()
     * when the contract is called via trusted forwarder.
     */
    function _erc2771MsgSender() internal view returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            // The calldata is encoded as: originalCalldata + originalSender (20 bytes)
            // Extract last 20 bytes
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            sender = msg.sender;
        }
    }
    
    /**
     * @dev Returns the msg data excluding the appended sender - use this in place
     * of _msgData() when the contract is called via trusted forwarder.
     */
    function _erc2771MsgData() internal view returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender)) {
            // Exclude last 20 bytes (the appended sender address)
            return msg.data[:msg.data.length - 20];
        } else {
            return msg.data;
        }
    }
    
    /**
     * @dev Storage gap for future upgrades.
     */
    uint256[50] private __gap;
}
