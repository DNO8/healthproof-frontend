import { avalancheFuji } from "viem/chains";

export const HEALTHPROOF_CHAIN = avalancheFuji;

export const CONTRACT_ADDRESSES = {
  IdentityRegistry: "0x9f196FC83abcBB47391f9D4aF9998E7a5c458D71",
  GuardianRegistry: "0xBFe33f7014E3619f39359E14dDcdF25D386D408C",
  PermissionManager: "0x322890CE0C0971e879003dD3A77f686e90f2E61F",
  ClinicalEpisodeRegistry: "0xD33a12d276e5a588dc87e8ab7D57F56c6aaA954f",
  MedicalOrderRegistry: "0xAa1381cECAA42ae0313ed1E987fA66007bD3bA26",
  MedicalDocumentRegistry: "0x7f1D7C04C2e4f3DaD7BB8c10c852B6d51Ad8c251",
  HealthcareNetworkRegistry: "0xC409f54D8FbEA73772d454995882442736fA0D91",
  AuditTrail: "0xFA62c68B31532c72B29a76e17D1e44C4CCe2C709",
  HealthProofKernel: "0xAEFcc18cB8C66c60d488658944B55F1C42a41C72",
  HealthProofGateway: "0xdA58547915d85F053A5f2A086135036cAF5B0a5D",
  HealthProofProtocol: "0xde323389d5Be45a947E354b840b1015d642E2BF2",
} as const;

export const DEPLOYER_ADDRESS =
  "0xe81461cB96b1503977E6a88b6509A47615c5bD00" as const;
