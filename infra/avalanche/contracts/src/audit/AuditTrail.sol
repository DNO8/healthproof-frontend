// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AuditTrail
/// @notice Registro auditable de eventos clínicos.

contract AuditTrail {

    enum ActionType {
        DOCUMENT_ACCESS,
        PERMISSION_GRANTED,
        PERMISSION_REVOKED,
        GUARDIAN_ACTION,
        MEDICAL_QUERY,
        EMERGENCY_REQUESTED,
        EMERGENCY_WITNESSED,
        EMERGENCY_APPROVED,
        EMERGENCY_REVOKED
    }

    event AuditEvent(
        address indexed actor,
        address indexed patient,
        bytes32 indexed resourceId,
        ActionType action,
        uint64 timestamp
    );

    function logEvent(
        address patient,
        bytes32 resourceId,
        ActionType action
    ) external {

        emit AuditEvent(
            msg.sender,
            patient,
            resourceId,
            action,
            uint64(block.timestamp)
        );
    }
}