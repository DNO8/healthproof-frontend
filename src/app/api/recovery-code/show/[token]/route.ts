import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAGIC_LINK_SECRET = process.env.RECOVERY_MAGIC_LINK_SECRET;

interface Params {
  token: string;
}

/**
 * GET /api/recovery-code/show/:token
 * Shows the recovery code for a valid magic link.
 * The link is validated via HMAC signature + jti non-consumed + expiry.
 * No Privy session required (supports opening email on another device).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    if (!MAGIC_LINK_SECRET) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { token } = await params;
    const decodedToken = decodeURIComponent(token);

    // Parse token
    const parts = decodedToken.split(".");
    if (parts.length !== 2) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    const [tokenDataB64, signatureB64] = parts;
    const tokenData = atob(tokenDataB64);
    const encoder = new TextEncoder();

    // Verify HMAC signature
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(MAGIC_LINK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = Uint8Array.from(atob(signatureB64), (c) =>
      c.charCodeAt(0)
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      keyMaterial,
      signatureBytes,
      encoder.encode(tokenData)
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid token signature" },
        { status: 403 }
      );
    }

    // Extract jti from tokenData
    const tokenParts = tokenData.split(":");
    if (tokenParts.length < 2) {
      return NextResponse.json(
        { error: "Malformed token data" },
        { status: 400 }
      );
    }
    const jti = tokenParts[1];

    const supabase = createAdminClient();

    // Lookup token in DB
    const tokenHash = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(decodedToken)
    );
    const tokenHashHex = Array.from(new Uint8Array(tokenHash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { data: link, error } = await supabase
      .from("recovery_magic_links")
      .select("user_id, expires_at, consumed_at")
      .eq("jti", jti)
      .single();

    if (error || !link) {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    // Check expiry
    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 410 }
      );
    }

    // Check consumed
    if (link.consumed_at) {
      return NextResponse.json(
        { error: "Token already used" },
        { status: 410 }
      );
    }

    // Mark as consumed
    await supabase
      .from("recovery_magic_links")
      .update({ consumed_at: new Date().toISOString() })
      .eq("jti", jti);

    // Fetch recovery code hash (we show the code itself only from the onboarding modal;
    // magic link reveals a new code or a short-lived view. For MVP, we return a status
    // and the frontend recovery flow will use the code the user already has.)
    // Since the recovery code was already shown during onboarding, this endpoint
    // returns a confirmation that the link is valid so the recovery page can proceed.
    await supabase.from("recovery_audit").insert({
      user_id: link.user_id,
      action: "consume_magic_link",
      metadata: { jti },
    });

    return NextResponse.json({
      valid: true,
      userId: link.user_id,
      message: "Magic link validated. Proceed to recovery page.",
    });
  } catch (error) {
    console.error("[recovery-code/show] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
