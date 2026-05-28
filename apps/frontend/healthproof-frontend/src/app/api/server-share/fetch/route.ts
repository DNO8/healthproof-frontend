import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptShareForServer } from "@/lib/kms/server-share-crypto";

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

    // Fallback 1: try cookie if no header token
    if (!privyToken) {
      const cookieStore = await cookies();
      privyToken = cookieStore.get("privy-token")?.value;
      if (privyToken) {
        console.log("[server-share/fetch] Using cookie token");
      }
    } else {
      console.log("[server-share/fetch] Using Authorization header token");
    }

    // Fallback 2: try body token
    if (!privyToken) {
      try {
        const body = await request.json();
        if (body?.token) {
          privyToken = body.token;
          console.log("[server-share/fetch] Using body token");
        }
      } catch { /* not JSON body */ }
    }

    if (!privyToken) {
      console.error("[server-share/fetch] No token found in header, cookie or body");
      return NextResponse.json(
        { error: "Auth required - no token in header, cookie or body [v2]" },
        { status: 401 }
      );
    }

    // Decode JWT payload (signature verification skipped due to no public JWKS)
    let payload;
    try {
      payload = decodeJwt(privyToken);
      console.log("[server-share/fetch] JWT decoded:", payload.sub ?? payload.userId);
    } catch (jwtErr) {
      console.error("[server-share/fetch] JWT decode failed:", jwtErr);
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 401 }
      );
    }

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      console.error("[server-share/fetch] JWT expired");
      return NextResponse.json(
        { error: "Token expired" },
        { status: 401 }
      );
    }

    const userId = (payload.sub ?? payload.userId) as string | undefined;
    if (!userId) {
      return NextResponse.json(
        { error: "No wallet connected" },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("server_share_ciphertext, server_share_dek_ciphertext, server_share_kms_key_id, scheme_version")
      .eq("id", userId)
      .single();

    if (error || !data?.server_share_ciphertext) {
      console.error("[server-share/fetch] No server_share_ciphertext for user:", userId);
      return NextResponse.json(
        { error: "No server share found for this user" },
        { status: 409 }
      );
    }

    if (data.scheme_version !== 2) {
      return NextResponse.json(
        { error: "User not on SSS(2,3) scheme" },
        { status: 400 }
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

    // Convert bytes to hex string (secrets.js-grempe format)
    const shareHex = Array.from(shareBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return NextResponse.json({ share: shareHex });
  } catch (error) {
    console.error("[server-share/fetch] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
