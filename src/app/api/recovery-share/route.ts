import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const SHAMIR_ENCRYPTION_KEY = process.env.SHAMIR_ENCRYPTION_KEY;
const PRIVY_VERIFY_URL = "https://auth.privy.io/api/v1/sessions/verify";

interface PrivySession {
  user: {
    id: string;
    wallet_address: string;
  };
}

/**
 * POST /api/recovery-share
 * Authenticated endpoint that returns Shamir share 1 for a user.
 * The share is encrypted with SHAMIR_ENCRYPTION_KEY (server-side secret).
 * The client derives share 2 deterministically and reconstructs the secret.
 */
export async function POST(request: Request) {
  try {
    // Verify Privy authentication via cookie
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

    if (!session.user?.id || !session.user?.wallet_address) {
      return NextResponse.json(
        { error: "No wallet connected" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId || userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized: userId mismatch" },
        { status: 403 }
      );
    }

    if (!SHAMIR_ENCRYPTION_KEY) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Fetch encrypted share from Supabase
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("key_share")
      .eq("id", userId)
      .single();

    if (error || !data?.key_share) {
      return NextResponse.json(
        { error: "No recovery share found for this user" },
        { status: 404 }
      );
    }

    // Decrypt share using server secret
    const decryptedShare = await decryptShare(
      data.key_share,
      SHAMIR_ENCRYPTION_KEY
    );

    return NextResponse.json({ share: decryptedShare });
  } catch (error) {
    console.error("[recovery-share] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── Server-side share decryption ───────────────────────

async function decryptShare(
  encryptedBase64: string,
  key: string
): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), (c) =>
    c.charCodeAt(0)
  );

  const SALT_LENGTH = 16;
  const IV_LENGTH = 12;
  const KEY_LENGTH = 32;

  if (combined.length < SALT_LENGTH + IV_LENGTH) {
    throw new Error("Invalid encrypted share");
  }

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  // Derive key from server secret using PBKDF2
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  const cryptoKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH * 8 },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    ciphertext.buffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
