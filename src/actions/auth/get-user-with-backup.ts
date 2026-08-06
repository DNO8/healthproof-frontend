"use server";

import { verifySelf } from "@/lib/auth/privy-verify";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UserWithBackup {
  id: string;
  email: string;
  wallet_address: string | null;
  full_name: string | null;
  created_at: string;
  public_key: string | null;
  encrypted_private_key: string | null;
  key_share: string | null;
  key_version: number | null;
  // New SSS(2,3) + KMS fields
  server_share_ciphertext: string | null;
  server_share_dek_ciphertext: string | null;
  server_share_kms_key_id: string | null;
  recovery_code_hash: string | null;
  recovery_code_used_at: string | null;
  master_secret_hash: string | null;
  scheme_version: number | null;
}

/**
 * Get user data including encrypted private key backup.
 * Used for key recovery when IndexedDB is empty.
 * Restricted to the authenticated user only (HIPAA access control).
 *
 * @param idOrWallet - User ID or wallet address to look up.
 * @param _privyToken - Optional explicit Privy token (bypasses stale cookie issues).
 */
export async function getUserWithBackup(
  idOrWallet: string,
  _privyToken?: string,
): Promise<UserWithBackup | null> {
  try {
    await verifySelf(idOrWallet, _privyToken);
  } catch (authErr) {
    console.warn(
      "[getUserWithBackup] auth failed:",
      authErr instanceof Error ? authErr.message : authErr,
    );
    return null;
  }

  try {
    const supabase = createAdminClient();

    // Try lookup by Privy DID first
    const { data: row, error } = await supabase
      .from("users")
      .select(
        "id, email, wallet_address, full_name, created_at, public_key, encrypted_private_key, key_share, key_version, server_share_ciphertext, server_share_dek_ciphertext, server_share_kms_key_id, recovery_code_hash, recovery_code_used_at, master_secret_hash, scheme_version",
      )
      .eq("id", idOrWallet)
      .single();

    if (!error && row) {
      return {
        id: row.id as string,
        email: (row.email as string) ?? "",
        wallet_address: row.wallet_address as string | null,
        full_name: row.full_name as string | null,
        created_at: row.created_at as string,
        public_key: (row.public_key as string | null) ?? null,
        encrypted_private_key:
          (row.encrypted_private_key as string | null) ?? null,
        key_share: (row.key_share as string | null) ?? null,
        key_version: (row.key_version as number | null) ?? null,
        server_share_ciphertext:
          (row.server_share_ciphertext as string | null) ?? null,
        server_share_dek_ciphertext:
          (row.server_share_dek_ciphertext as string | null) ?? null,
        server_share_kms_key_id:
          (row.server_share_kms_key_id as string | null) ?? null,
        recovery_code_hash: (row.recovery_code_hash as string | null) ?? null,
        recovery_code_used_at:
          (row.recovery_code_used_at as string | null) ?? null,
        master_secret_hash: (row.master_secret_hash as string | null) ?? null,
        scheme_version: (row.scheme_version as number | null) ?? null,
      };
    }

    // Fall back to wallet_address lookup (normalize to lowercase for case-insensitive match)
    const walletLower = idOrWallet.toLowerCase();
    const { data: byWallet, error: walletErr } = await supabase
      .from("users")
      .select(
        "id, email, wallet_address, full_name, created_at, public_key, encrypted_private_key, key_share, key_version, server_share_ciphertext, server_share_dek_ciphertext, server_share_kms_key_id, recovery_code_hash, recovery_code_used_at, master_secret_hash, scheme_version",
      )
      .eq("wallet_address", walletLower)
      .single();

    if (walletErr || !byWallet) {
      return null;
    }

    return {
      id: byWallet.id as string,
      email: (byWallet.email as string) ?? "",
      wallet_address: byWallet.wallet_address as string | null,
      full_name: byWallet.full_name as string | null,
      created_at: byWallet.created_at as string,
      public_key: (byWallet.public_key as string | null) ?? null,
      encrypted_private_key:
        (byWallet.encrypted_private_key as string | null) ?? null,
      key_share: (byWallet.key_share as string | null) ?? null,
      key_version: (byWallet.key_version as number | null) ?? null,
      server_share_ciphertext:
        (byWallet.server_share_ciphertext as string | null) ?? null,
      server_share_dek_ciphertext:
        (byWallet.server_share_dek_ciphertext as string | null) ?? null,
      server_share_kms_key_id:
        (byWallet.server_share_kms_key_id as string | null) ?? null,
      recovery_code_hash:
        (byWallet.recovery_code_hash as string | null) ?? null,
      recovery_code_used_at:
        (byWallet.recovery_code_used_at as string | null) ?? null,
      master_secret_hash:
        (byWallet.master_secret_hash as string | null) ?? null,
      scheme_version: (byWallet.scheme_version as number | null) ?? null,
    };
  } catch (err) {
    console.error("[getUserWithBackup] failed", {
      idOrWallet,
      error:
        err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    return null;
  }
}
