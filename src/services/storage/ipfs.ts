import { PinataSDK } from "pinata";
import { env } from "@/lib/env";

let pinataInstance: PinataSDK | null = null;

function getPinata(): PinataSDK {
  if (!pinataInstance) {
    if (!env.PINATA_JWT) {
      throw new Error("[HealthProof] PINATA_JWT_SECRET not configured.");
    }
    pinataInstance = new PinataSDK({
      pinataJwt: env.PINATA_JWT,
      pinataGateway: env.PINATA_GATEWAY,
    });
  }
  return pinataInstance;
}

export interface IpfsUploadResult {
  cid: string;
  ipfsUrl: string;
  gatewayUrl: string;
}

export async function uploadToIpfs(
  data: ArrayBuffer | Blob,
  fileName: string,
): Promise<IpfsUploadResult> {
  const pinata = getPinata();

  const file = new File([data], fileName, {
    type: "application/octet-stream",
  });

  const result = await pinata.upload.public.file(file);
  const cid = result.cid;

  return {
    cid,
    ipfsUrl: `ipfs://${cid}`,
    gatewayUrl: `${env.PINATA_GATEWAY}/ipfs/${cid}`,
  };
}

export async function uploadJsonToIpfs(
  json: object,
  name?: string,
): Promise<IpfsUploadResult> {
  const pinata = getPinata();

  let builder = pinata.upload.public.json(json);
  if (name) {
    builder = builder.name(name);
  }
  const result = await builder;
  const cid = result.cid;

  return {
    cid,
    ipfsUrl: `ipfs://${cid}`,
    gatewayUrl: `${env.PINATA_GATEWAY}/ipfs/${cid}`,
  };
}

export function getGatewayUrl(cid: string): string {
  return `${env.PINATA_GATEWAY}/ipfs/${cid}`;
}

export function cidFromIpfsUrl(ipfsUrl: string): string | null {
  const match = ipfsUrl.match(/^ipfs:\/\/(.+)$/);
  return match?.[1] ?? null;
}

export async function fetchFromIpfs(cid: string): Promise<ArrayBuffer> {
  const url = getGatewayUrl(cid);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

export async function deleteFromIpfs(fileId: string): Promise<void> {
  const pinata = getPinata();
  await pinata.files.public.delete([fileId]);
}
