import { defineChain } from "viem";
import { env } from "./env";

function asAddress(value: string, key: string): `0x${string}` {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`Invalid contract address for ${key}: ${value}`);
  }
  return value as `0x${string}`;
}

export const HEALTHPROOF_CHAIN = defineChain({
  id: env.CHAIN_ID,
  name: "Hygieia",
  nativeCurrency: {
    name: "HVE",
    symbol: "HVE",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [env.RPC_URL] },
    public: { http: [env.RPC_URL] },
  },
});

export const CONTRACT_ADDRESSES = {
  IdentityRegistry: asAddress(env.IDENTITY_REGISTRY_ADDRESS, "NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS"),
  GuardianRegistry: asAddress(env.GUARDIAN_REGISTRY_ADDRESS, "NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS"),
  PermissionManager: asAddress(env.PERMISSION_MANAGER_ADDRESS, "NEXT_PUBLIC_PERMISSION_MANAGER_ADDRESS"),
  ClinicalEpisodeRegistry: asAddress(
    env.CLINICAL_EPISODE_REGISTRY_ADDRESS,
    "NEXT_PUBLIC_CLINICAL_EPISODE_REGISTRY_ADDRESS",
  ),
  MedicalOrderRegistry: asAddress(
    env.MEDICAL_ORDER_REGISTRY_ADDRESS,
    "NEXT_PUBLIC_MEDICAL_ORDER_REGISTRY_ADDRESS",
  ),
  MedicalDocumentRegistry: asAddress(
    env.MEDICAL_DOCUMENT_REGISTRY_ADDRESS,
    "NEXT_PUBLIC_MEDICAL_DOCUMENT_REGISTRY_ADDRESS",
  ),
  HealthcareNetworkRegistry: asAddress(
    env.HEALTHCARE_NETWORK_REGISTRY_ADDRESS,
    "NEXT_PUBLIC_HEALTHCARE_NETWORK_REGISTRY_ADDRESS",
  ),
  AuditTrail: asAddress(env.AUDIT_TRAIL_ADDRESS, "NEXT_PUBLIC_AUDIT_TRAIL_ADDRESS"),
  HealthProofKernel: asAddress(env.HEALTH_PROOF_KERNEL_ADDRESS, "NEXT_PUBLIC_HEALTH_PROOF_KERNEL_ADDRESS"),
  HealthProofGateway: asAddress(env.HEALTH_PROOF_GATEWAY_ADDRESS, "NEXT_PUBLIC_HEALTH_PROOF_GATEWAY_ADDRESS"),
  HealthProofProtocol: asAddress(env.HEALTH_PROOF_PROTOCOL_ADDRESS, "NEXT_PUBLIC_HEALTH_PROOF_PROTOCOL_ADDRESS"),
} as const;

export const DEPLOYER_ADDRESS = asAddress(
  env.DEPLOYER_ADDRESS,
  "NEXT_PUBLIC_DEPLOYER_ADDRESS",
);
