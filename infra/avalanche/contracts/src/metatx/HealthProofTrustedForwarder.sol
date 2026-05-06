// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title HealthProofTrustedForwarder
 * @notice Trusted forwarder for EIP-2771 meta-transactions
 * @dev Allows users to sign transactions off-chain, relayer executes and pays gas
 */
contract HealthProofTrustedForwarder is ERC2771Forwarder {
    constructor() ERC2771Forwarder("HealthProof") {}
}
