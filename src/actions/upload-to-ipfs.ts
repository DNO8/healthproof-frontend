"use server";

import { PinataSDK } from "pinata";

let pinataInstance: PinataSDK | null = null;

function getPinata(): PinataSDK {
  if (!pinataInstance) {
    const jwt = process.env.PINATA_JWT_SECRET ?? "";
    if (!jwt) {
      throw new Error("[HealthProof] PINATA_JWT_SECRET not configured.");
    }
    const gw = process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "gateway.pinata.cloud";
    const gateway = gw.startsWith("http") ? gw : `https://${gw}`;

    pinataInstance = new PinataSDK({
      pinataJwt: jwt,
      pinataGateway: gateway,
    });
  }
  return pinataInstance;
}

export interface IpfsUploadResult {
  cid: string;
  ipfsUrl: string;
  gatewayUrl: string;
}

export async function uploadToIpfsAction(
  formData: FormData,
): Promise<IpfsUploadResult> {
  const pinata = getPinata();
  const file = formData.get("file") as File | null;

  if (!file) {
    throw new Error("No file provided.");
  }

  const result = await pinata.upload.public.file(file);
  const cid = result.cid;

  const gw = process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "gateway.pinata.cloud";
  const gateway = gw.startsWith("http") ? gw : `https://${gw}`;

  return {
    cid,
    ipfsUrl: `ipfs://${cid}`,
    gatewayUrl: `${gateway}/ipfs/${cid}`,
  };
}
