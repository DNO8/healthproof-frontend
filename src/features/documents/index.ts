// Documents — on-chain registration via MedicalDocumentRegistry + off-chain secrets

export {
  registerDocumentOnChain as registerDocument,
} from "@/actions/register-document-onchain";

export {
  listDocumentSecretsForWallet as listDocuments,
  getDocumentSecret as getDocument,
  type DocumentSecretRow,
} from "@/actions/get-document-secret";
