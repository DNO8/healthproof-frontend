import type {
  SignMessageParams,
  SignMessageResult,
} from "@/types/blockchain.types";

// Placeholder — will use ethers.BrowserProvider + signer when wallet is connected
// For now, provides the interface that the permission flow will call

export async function signMessage(
  _params: SignMessageParams,
): Promise<SignMessageResult> {
  // TODO: implement with ethers or wagmi
  // const provider = new ethers.BrowserProvider(window.ethereum)
  // const signer = await provider.getSigner()
  // const signature = await signer.signMessage(params.message)
  // return { signature, address: await signer.getAddress() }

  throw new Error(
    "Wallet signing not yet implemented. Connect a wallet first.",
  );
}

export async function getWalletAddress(): Promise<string | null> {
  // TODO: implement with ethers or wagmi/privy
  return null;
}

export function isWalletConnected(): boolean {
  // TODO: check wallet connection state
  return false;
}
