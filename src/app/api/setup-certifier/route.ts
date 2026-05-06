import { NextResponse } from "next/server";
import { setupDeployerAsCertifier } from "@/actions/setup-deployer-certifier";

/**
 * One-time setup endpoint: registers the deployer as CERTIFIER on-chain.
 * Call GET /api/setup-certifier once after deployment.
 * Safe to call multiple times (idempotent).
 */
export async function GET() {
  const result = await setupDeployerAsCertifier({});
  
  if (result.success) {
    return NextResponse.json({ 
      success: true, 
      txHash: result.data.txHash,
      alreadyCertifier: result.data.alreadyCertifier 
    });
  }
  
  return NextResponse.json(
    { error: result.error },
    { status: result.code }
  );
}
