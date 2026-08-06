// Documents — on-chain registration via HealthProofGateway (EIP-2771 meta-tx) + off-chain secrets

export {
  type DocumentSecretRow,
  getDocumentSecret as getDocument,
  listDocumentSecretsForWallet as listDocuments,
} from "@/actions/documents/get-document-secret";
export { registerDocumentOnChain as registerDocument } from "@/actions/documents/register-document-onchain";
