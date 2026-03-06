import type {
  GrantAccessParams,
  RevokeAccessParams,
  RegisterHashParams,
  TransactionReceipt,
} from "@/types/blockchain.types";

// Placeholder ABI — will be replaced with actual ABI when contracts are deployed
export const PERMISSIONS_ABI: unknown[] = [];
export const DOCUMENTS_ABI: unknown[] = [];

// Placeholder contract instances — will use ethers.Contract when ABIs are available

export async function grantAccess(
  _params: GrantAccessParams,
): Promise<TransactionReceipt> {
  // TODO: const contract = new ethers.Contract(address, PERMISSIONS_ABI, signer)
  // const tx = await contract.grantAccess(params.patient, params.grantee, params.resourceHash)
  // return { hash: tx.hash, blockNumber: 0, status: "PENDING", gasUsed: "0" }
  throw new Error("Contracts not deployed yet.");
}

export async function revokeAccess(
  _params: RevokeAccessParams,
): Promise<TransactionReceipt> {
  // TODO: const contract = new ethers.Contract(address, PERMISSIONS_ABI, signer)
  // const tx = await contract.revokeAccess(params.patient, params.grantee, params.resourceHash)
  throw new Error("Contracts not deployed yet.");
}

export async function registerHash(
  _params: RegisterHashParams,
): Promise<TransactionReceipt> {
  // TODO: const contract = new ethers.Contract(address, DOCUMENTS_ABI, signer)
  // const tx = await contract.registerHash(params.documentHash, params.owner)
  throw new Error("Contracts not deployed yet.");
}
