import type { JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyPrivyToken } from "@/lib/auth/privy-verify";
import { decryptShareForServer } from "@/lib/kms/server-share-crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/server-share/fetch
 * Authenticated endpoint that returns the server-side SSS share2.
 * The share is envelope-encrypted with AWS KMS; the server decrypts it
 * via KMS and returns the plaintext share to the authenticated client.
 *
 * Security: userId is inferred from the session, never from client params.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    let privyToken = authHeader?.replace("Bearer ", "");

    // Fallback: try cookie if no header token
    if (!privyToken) {
      const cookieStore = await cookies();
      privyToken = cookieStore.get("privy-token")?.value;
    }

    if (!privyToken) {
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    // Verify JWT signature against Privy JWKS (use header token, not cookie)
    let payload: JWTPayload;
    try {
      payload = await verifyPrivyToken(privyToken);
    } catch (_verifyErr) {
      console.error("[server-share/fetch] JWT verification failed");
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    const userId = (payload.sub ?? payload.userId) as string | undefined;
    if (!userId) {
      return NextResponse.json(
        { error: "No wallet connected" },
        { status: 401 },
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select(
        "server_share_ciphertext, server_share_dek_ciphertext, server_share_kms_key_id, scheme_version",
      )
      .eq("id", userId)
      .single();

    if (error || !data?.server_share_ciphertext) {
      console.error("[server-share/fetch] No server_share_ciphertext");
      return NextResponse.json(
        { error: "No server share found for this user" },
        { status: 409 },
      );
    }

    if (data.scheme_version !== 2) {
      return NextResponse.json(
        { error: "User not on SSS(2,3) scheme" },
        { status: 400 },
      );
    }

    // Decrypt via KMS
    const shareBytes = await decryptShareForServer({
      encryptedShare: data.server_share_ciphertext,
      encryptedDek: data.server_share_dek_ciphertext,
      kmsKeyId: data.server_share_kms_key_id ?? "",
    });

    // Audit log (best effort — table may not exist)
    try {
      await supabase.from("recovery_audit").insert({
        user_id: userId,
        action: "fetch_share",
        metadata: { scheme_version: data.scheme_version },
      });
    } catch {
      /* ignore audit log failures */
    }

    // Decode bytes back to the original secrets.js-grempe share string
    const share = new TextDecoder().decode(shareBytes);

    return NextResponse.json({ share });
  } catch (error) {
    console.error("[server-share/fetch] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
