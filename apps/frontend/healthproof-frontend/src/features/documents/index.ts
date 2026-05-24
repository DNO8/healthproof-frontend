// Documents — on-chain registration via MedicalDocumentRegistry + off-chain secrets

export {
  registerDocumentOnChain as registerDocument,
} from "@/actions/documents/register-document-onchain";

export {
  listDocumentSecretsForWallet as listDocuments,
  getDocumentSecret as getDocument,
  type DocumentSecretRow,
} from "@/actions/documents/get-document-secret";
