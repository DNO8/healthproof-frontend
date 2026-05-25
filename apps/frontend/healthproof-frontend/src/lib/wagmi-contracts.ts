import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "./contracts";

import IdentityRegistryAbi from "./abis/IdentityRegistry.json";
import GuardianRegistryArtifact from "./abis/GuardianRegistry.json";
const GuardianRegistryAbi = GuardianRegistryArtifact.abi;
import PermissionManagerArtifact from "./abis/PermissionManager.json";
const PermissionManagerAbi = PermissionManagerArtifact.abi;
import ClinicalEpisodeRegistryAbi from "./abis/ClinicalEpisodeRegistry.json";
import MedicalOrderRegistryAbi from "./abis/MedicalOrderRegistry.json";
import MedicalDocumentRegistryAbi from "./abis/MedicalDocumentRegistry.json";
import HealthcareNetworkRegistryAbi from "./abis/HealthcareNetworkRegistry.json";
import AuditTrailArtifact from "./abis/AuditTrail.json";
const AuditTrailAbi = AuditTrailArtifact.abi;
import EmergencyAccessManagerArtifact from "./abis/EmergencyAccessManager.json";
const EmergencyAccessManagerAbi = EmergencyAccessManagerArtifact.abi;
import HealthProofGatewayAbi from "./abis/HealthProofGateway.json";
import HealthProofKernelAbi from "./abis/HealthProofKernel.json";
import HealthProofProtocolAbi from "./abis/HealthProofProtocol.json";

type ContractConfig = {
  address: `0x${string}`;
  abi: readonly Record<string, unknown>[];
  chainId: number;
};

function cfg(
  address: string,
  abi: unknown[],
): ContractConfig {
  return {
    address: address as `0x${string}`,
    abi: abi as readonly Record<string, unknown>[],
    chainId: HEALTHPROOF_CHAIN.id,
  };
}

export const identityRegistryConfig = cfg(
  CONTRACT_ADDRESSES.IdentityRegistry,
  IdentityRegistryAbi,
);

export const guardianRegistryConfig = cfg(
  CONTRACT_ADDRESSES.GuardianRegistry,
  GuardianRegistryAbi,
);

export const permissionManagerConfig = cfg(
  CONTRACT_ADDRESSES.PermissionManager,
  PermissionManagerAbi,
);

export const clinicalEpisodeRegistryConfig = cfg(
  CONTRACT_ADDRESSES.ClinicalEpisodeRegistry,
  ClinicalEpisodeRegistryAbi,
);

export const medicalOrderRegistryConfig = cfg(
  CONTRACT_ADDRESSES.MedicalOrderRegistry,
  MedicalOrderRegistryAbi,
);

export const medicalDocumentRegistryConfig = cfg(
  CONTRACT_ADDRESSES.MedicalDocumentRegistry,
  MedicalDocumentRegistryAbi,
);

export const healthcareNetworkRegistryConfig = cfg(
  CONTRACT_ADDRESSES.HealthcareNetworkRegistry,
  HealthcareNetworkRegistryAbi,
);

export const auditTrailConfig = cfg(
  CONTRACT_ADDRESSES.AuditTrail,
  AuditTrailAbi,
);

export const emergencyAccessManagerConfig = CONTRACT_ADDRESSES.EmergencyAccessManager
  ? cfg(CONTRACT_ADDRESSES.EmergencyAccessManager, EmergencyAccessManagerAbi)
  : undefined;

export const healthProofGatewayConfig = cfg(
  CONTRACT_ADDRESSES.HealthProofGateway,
  HealthProofGatewayAbi,
);

export const healthProofKernelConfig = cfg(
  CONTRACT_ADDRESSES.HealthProofKernel,
  HealthProofKernelAbi,
);

export const healthProofProtocolConfig = cfg(
  CONTRACT_ADDRESSES.HealthProofProtocol,
  HealthProofProtocolAbi,
);
