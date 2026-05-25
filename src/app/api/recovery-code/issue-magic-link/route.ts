import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const PRIVY_VERIFY_URL = "https://auth.privy.io/api/v1/sessions/verify";
const MAGIC_LINK_SECRET = process.env.RECOVERY_MAGIC_LINK_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

interface PrivySession {
  user: {
    id: string;
    email?: string;
  };
}

/**
 * POST /api/recovery-code/issue-magic-link
 * Authenticated endpoint that generates a single-use magic link
 * for recovery code delivery.
 *
 * The link is HMAC-signed and contains a unique jti.
 * No Privy session validation on the show endpoint (supports cross-device email).
 */
export async function POST(request: Request) {
  try {
    if (!MAGIC_LINK_SECRET) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const privyToken = cookieStore.get("privy-token")?.value;

    if (!privyToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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
    const userId = session.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "No user connected" },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Verify user has a recovery code hash (onboarding completed)
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("recovery_code_hash")
      .eq("id", userId)
      .single();

    if (userErr || !user?.recovery_code_hash) {
      return NextResponse.json(
        { error: "No recovery code found for user" },
        { status: 404 }
      );
    }

    // Generate token and HMAC signature
    const jti = crypto.randomUUID();
    const tokenData = `${userId}:${jti}:${Date.now()}`;
    const encoder = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(MAGIC_LINK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      keyMaterial,
      encoder.encode(tokenData)
    );
    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    const token = `${btoa(tokenData)}.${signature}`;

    const tokenHash = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const tokenHashHex = Array.from(new Uint8Array(tokenHash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Store in DB with 15-minute expiry
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const { error: insertErr } = await supabase.from("recovery_magic_links").insert({
      user_id: userId,
      token_hash: tokenHashHex,
      jti,
      expires_at: expiresAt.toISOString(),
    });

    if (insertErr) {
      console.error("[issue-magic-link] DB error:", insertErr);
      return NextResponse.json(
        { error: "Failed to create magic link" },
        { status: 500 }
      );
    }

    // Audit log
    await supabase.from("recovery_audit").insert({
      user_id: userId,
      action: "issue_magic_link",
      metadata: { jti },
    });

    const magicLink = `${BASE_URL}/api/recovery-code/show/${encodeURIComponent(token)}`;

    return NextResponse.json({ magicLink, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error("[issue-magic-link] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
