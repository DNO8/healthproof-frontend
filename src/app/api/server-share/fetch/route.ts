import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptShareForServer } from "@/lib/kms/server-share-crypto";
import { createAdminClient as createKmsAdminClient } from "@/lib/supabase/admin";

const PRIVY_VERIFY_URL = "https://auth.privy.io/api/v1/sessions/verify";

interface PrivySession {
  user: {
    id: string;
    wallet_address: string;
  };
}

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
    const cookieStore = await cookies();
    const privyToken = cookieStore.get("privy-token")?.value;

    if (!privyToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify with Privy API
    const privyRes = await fetch(PRIVY_VERIFY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${privyToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!privyRes.ok) {
      return NextResponse.json(
        { error: "Invalid or expired authentication" },
        { status: 401 }
      );
    }

    const session = (await privyRes.json()) as PrivySession;

    if (!session.user?.id) {
      return NextResponse.json(
        { error: "No wallet connected" },
        { status: 401 }
      );
    }

    // Infer userId from session (prevents enumeration of other users)
    const userId = session.user.id;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("server_share_ciphertext, server_share_dek_ciphertext, server_share_kms_key_id, scheme_version")
      .eq("id", userId)
      .single();

    if (error || !data?.server_share_ciphertext) {
      return NextResponse.json(
        { error: "No server share found for this user" },
        { status: 404 }
      );
    }

    if (data.scheme_version !== 2) {
      return NextResponse.json(
        { error: "User not on SSS(2,3) scheme" },
        { status: 400 }
      );
    }

    if (!process.env.AWS_KMS_KEY_ID) {
      return NextResponse.json(
        { error: "KMS not configured" },
        { status: 503 }
      );
    }

    // Decrypt via KMS
    const shareBytes = await decryptShareForServer({
      encryptedShare: data.server_share_ciphertext,
      encryptedDek: data.server_share_dek_ciphertext,
      kmsKeyId: data.server_share_kms_key_id ?? "",
    });

    // Audit log
    await supabase.from("recovery_audit").insert({
      user_id: userId,
      action: "fetch_share",
      metadata: { scheme_version: data.scheme_version },
    });

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
