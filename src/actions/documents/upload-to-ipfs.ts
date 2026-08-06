"use server";

import { PinataSDK } from "pinata";
import { getAuthContext } from "@/lib/auth/server-auth";

const SERVER_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB — conservative for medical PDFs

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
  try {
    const auth = await getAuthContext();
    if (!auth) {
      throw new Error("[uploadToIpfsAction] Unauthorized.");
    }

    const pinata = getPinata();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw new Error("[uploadToIpfsAction] No file provided.");
    }

    if (file.size > SERVER_MAX_FILE_SIZE) {
      throw new Error(
        `[uploadToIpfsAction] File too large. Max ${SERVER_MAX_FILE_SIZE / 1024 / 1024} MB allowed.`,
      );
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
  } catch (error) {
    console.error("[uploadToIpfsAction] Failed:", error);
    throw error;
  }
}
