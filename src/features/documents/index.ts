// Documents — on-chain registration via HealthProofGateway (EIP-2771 meta-tx) + off-chain secrets

export {
  registerDocumentOnChain as registerDocument,
} from "@/actions/documents/register-document-onchain";

export {
  listDocumentSecretsForWallet as listDocuments,
  getDocumentSecret as getDocument,
  type DocumentSecretRow,
} from "@/actions/documents/get-document-secret";
