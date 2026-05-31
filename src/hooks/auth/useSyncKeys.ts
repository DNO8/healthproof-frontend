"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useTranslations } from "next-intl";
import {
  generateKeyPair,
  exportPublicKey,
} from "@/services/encryption/ecdh";
import {
  saveKeyPair,
  hasKeyPair,
  getKeyPair,
  deleteKeyPair,
  saveLocalShare1,
  getLocalShare1,
  saveLocalMasterSecretHash,
} from "@/services/encryption/keystore";
import { updatePublicKey } from "@/actions/auth/update-public-key";
import { getUserPublicKey } from "@/actions/auth/get-user-public-key";
import { getUserWithBackup } from "@/actions/auth/get-user-with-backup";
import { hasEncryptedData } from "@/actions/documents/check-user-encrypted-data";
import { clearDbUserCache } from "@/hooks/auth/useDbUser";
import { useKeyConflictStore } from "@/state/key-conflict.store";
import { generateShares, reconstructSecret, hexToBytes } from "@/services/encryption/sss";
import { hashMasterSecret } from "@/services/encryption/integrity";
import {
  generateMasterSecret,
  importKeyPairFromMasterSecret,
} from "@/services/encryption/master-secret";
import {
  encodeRecoveryCode,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from "@/services/encryption/recovery-code";
import { saveKeyBackupBundle } from "@/actions/auth/save-key-backup-bundle";
import {
  encryptPrivateKeyV2,
  decryptPrivateKeyV2,
} from "@/services/encryption/key-backup";
import { saveEncryptedPrivateKey } from "@/actions/auth/save-encrypted-private-key";
import { requestTourStart } from "@/lib/onboarding/tour-events";

const SYNCED_KEY = "hp_keys_synced";

export interface RecoveryState {
  needsRecoveryCode: boolean;
  needsRegeneration: boolean;
  recoveryCode: string | null;
  step: "idle" | "show_recovery_code" | "needs_input" | "recovering";
}

export function useSyncKeys() {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const t = useTranslations("keyRecovery");
  const ranForRef = useRef<{ userId: string; wallet: string } | null>(null);
  const syncInProgressRef = useRef(false);
  const serverShareAttemptedRef = useRef(false);
  const setConflict = useKeyConflictStore((s) => s.setConflict);
  const clearConflict = useKeyConflictStore((s) => s.clearConflict);
  const setIsRecovering = useKeyConflictStore((s) => s.setIsRecovering);

  // ── Structured flow logging (never logs sensitive data) ──
  const logFlow = (step: string, meta?: Record<string, unknown>) => {
    const payload: Record<string, unknown> = { step };
    if (meta) {
      for (const [k, v] of Object.entries(meta)) {
        if (v === undefined || v === null) continue;
        if (typeof v === "string" && v.length > 20) {
          payload[k] = `${v.slice(0, 8)}...${v.slice(-4)}(${v.length})`;
        } else {
          payload[k] = v;
        }
      }
    }
    console.log("[useSyncKeys:flow]", payload);
  };

  // Robust gating: refs survive re-renders but NOT remounts.
  // Use sessionStorage as backup so we don't loop if PrivyTokenSync remounts.
  const alreadyProcessed = (uid: string) => {
    try {
      return sessionStorage.getItem(SYNCED_KEY) === uid;
    } catch {
      return false;
    }
  };

  // Helper: inject Privy token into server action payloads (required for withAuth)
  const withPrivyToken = async <T extends Record<string, unknown>>(data: T): Promise<T & { _privyToken?: string }> => {
    try {
      const token = await getAccessToken();
      return { ...data, ...(token ? { _privyToken: token } : {}) };
    } catch {
      return data;
    }
  };

  // Helper: fail fast when a withAuth-wrapped server action returns an error
  function assertOk<T>(
    result: { success: true; data: T } | { success: false; error: string; code: number },
    label: string,
  ): T {
    if (!result.success) {
      throw new Error(`${label} failed: ${result.error} (code ${result.code})`);
    }
    return result.data;
  }

  const RECOVERY_STATE_KEY = "hp_recovery_state";
  const [recoveryState, setRecoveryStateInternal] = useState<RecoveryState>(() => {
    if (typeof window === "undefined") {
      return {
        needsRecoveryCode: false,
        needsRegeneration: false,
        recoveryCode: null,
        step: "idle",
      };
    }
    try {
      const raw = sessionStorage.getItem(RECOVERY_STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RecoveryState & { userId?: string };
        if (parsed.userId && parsed.userId === user?.id) {
          // Never restore recoveryCode from storage (show-once only)
          return { ...parsed, recoveryCode: null };
        }
      }
    } catch {
      /* ignore */
    }
    return {
      needsRecoveryCode: false,
      needsRegeneration: false,
      recoveryCode: null,
      step: "idle",
    };
  });

  const setRecoveryState = (
    next: RecoveryState | ((prev: RecoveryState) => RecoveryState),
  ) => {
    setRecoveryStateInternal((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      try {
        // Persist UI flags only; recoveryCode must never touch storage
        const { recoveryCode: _, ...persistable } = value;
        sessionStorage.setItem(
          RECOVERY_STATE_KEY,
          JSON.stringify({ ...persistable, userId })
        );
      } catch {
        /* ignore */
      }
      return value;
    });
  };

  const userId = user?.id;
  const walletAddress = user?.wallet?.address;

  // ── Helper: onboard a brand-new user with SSS(2,3) + KMS ──
  const onboardNewUser = async (uid: string) => {
    logFlow("onboard:start", { schemeVersion: 2 });
    const { masterSecret, publicKeyJwk, keyPair } = await generateMasterSecret();

    // SSS(2,3) over the master secret (serialized JWK bytes)
    const shares = generateShares(masterSecret, 2, 3);
    const [share1, share2, share3] = shares;

    // Compute hashes
    const masterHash = await hashMasterSecret(masterSecret);
    const recoveryCode = encodeRecoveryCode(hexToBytes(share3));
    const recoveryHash = await hashRecoveryCode(recoveryCode);

    // Save share1 locally
    await saveKeyPair(uid, keyPair, {
      share1,
      masterSecretHash: masterHash,
      schemeVersion: 2,
    });

    // Atomically save all SSS v2 backup fields
    assertOk(await saveKeyBackupBundle(await withPrivyToken({
      userId: uid,
      share2,
      recoveryCodeHash: recoveryHash,
      masterSecretHash: masterHash,
      publicKey: publicKeyJwk,
    })), "saveKeyBackupBundle");

    // Backup encrypted private key for silent cross-device recovery
    try {
      const privJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
      const encrypted = await encryptPrivateKeyV2(JSON.stringify(privJwk), uid);
      assertOk(await saveEncryptedPrivateKey(await withPrivyToken({ id: uid, encrypted_private_key: encrypted })), "saveEncryptedPrivateKey");
    } catch (e) {
      logFlow("onboard:backup-fail", { reason: e instanceof Error ? e.message : "unknown" });
      try {
        const { sileo } = await import("sileo");
        sileo.error({
          title: t("backupCreateWarning"),
          description: t("backupCreateWarningDesc"),
          duration: 5000,
        });
      } catch { /* sileo not available in tests */ }
    }

    sessionStorage.setItem(SYNCED_KEY, uid);
    clearDbUserCache();
    clearConflict();
    logFlow("onboard:complete", { hasRecoveryCode: true });
    try {
      const { sileo } = await import("sileo");
      sileo.success({
        title: t("keysGenerated"),
        description: t("keysGeneratedDesc"),
        duration: 5000,
      });
    } catch { /* sileo not available in tests */ }

    // Show recovery code to the user immediately
    setRecoveryState({
      needsRecoveryCode: true,
      needsRegeneration: false,
      recoveryCode,
      step: "show_recovery_code",
    });

    requestTourStart();
  };

  // ── Helper: reconstruct from two shares ──
  const reconstructFromShares = async (
    shareA: string,
    shareB: string,
    expectedHash: string
  ): Promise<{ keyPair: CryptoKeyPair; publicKeyJwk: string } | null> => {
    try {
      const reconstructed = reconstructSecret([shareA, shareB]);
      const reconstructedHash = await hashMasterSecret(reconstructed);
      if (reconstructedHash !== expectedHash) {
        console.error("[useSyncKeys] Master secret hash mismatch", {
          expectedHashPrefix: expectedHash.slice(0, 16),
          reconstructedHashPrefix: reconstructedHash.slice(0, 16),
          shareAPrefix: shareA.slice(0, 16),
          shareBPrefix: shareB.slice(0, 16),
          reconstructedLength: reconstructed.length,
        });
        return null;
      }
      return await importKeyPairFromMasterSecret(reconstructed);
    } catch (e) {
      console.error("[useSyncKeys] Reconstruction failed:", e);
      return null;
    }
  };

  // ── Helper: fetch server share2 ──
  const fetchServerShare = async (): Promise<string | null> => {
    if (serverShareAttemptedRef.current) {
      console.log("[useSyncKeys] fetchServerShare: already attempted this session, skipping");
      return null;
    }
    // Also check a sessionStorage flag so we don't re-fetch across remounts
    const flagKey = "hp_server_share_attempted";
    try {
      if (sessionStorage.getItem(flagKey) === "1") {
        console.log("[useSyncKeys] fetchServerShare: sessionStorage flag set, skipping");
        return null;
      }
      sessionStorage.setItem(flagKey, "1");
    } catch {
      /* ignore storage errors */
    }
    serverShareAttemptedRef.current = true;
    try {
      const token = await getAccessToken();
      if (!token) {
        console.error("[useSyncKeys] fetchServerShare: no Privy token available");
        return null;
      }
      const res = await fetch("/api/server-share/fetch", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 409) {
          console.warn("[useSyncKeys] fetchServerShare: no server share stored for this user (409)");
        } else {
          console.error("[useSyncKeys] fetchServerShare failed:", res.status, res.statusText);
        }
        return null;
      }
      const { share } = await res.json();
      return share as string;
    } catch (e) {
      console.error("[useSyncKeys] fetchServerShare failed:", e);
      return null;
    }
  };

  // Guard: if recovery state in sessionStorage belongs to another user, reset it
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = sessionStorage.getItem(RECOVERY_STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RecoveryState & { userId?: string };
        if (parsed.userId === userId) {
          setRecoveryStateInternal((current) =>
            current.step === "idle" ? parsed : current
          );
        } else {
          sessionStorage.removeItem(RECOVERY_STATE_KEY);
          setRecoveryStateInternal({
            needsRecoveryCode: false,
            needsRegeneration: false,
            recoveryCode: null,
            step: "idle",
          });
        }
      }
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    if (!ready || !authenticated || !userId || !walletAddress) return;

    // sessionStorage gate: survives remounts / StrictMode double-mount
    if (alreadyProcessed(userId)) {
      return;
    }

    const alreadyRan = ranForRef.current;
    if (
      alreadyRan &&
      alreadyRan.userId === userId &&
      alreadyRan.wallet === walletAddress
    ) {
      return;
    }

    // Cooldown after errors, persisted in sessionStorage so it survives remounts.
    // Successful runs are gated by SYNCED_KEY + ranForRef. Recovery state is
    // persisted in sessionStorage so the modal still shows after remount.
    try {
      const lastErrTs = parseInt(sessionStorage.getItem("hp_keys_sync_error") ?? "0", 10);
      if (Date.now() - lastErrTs < 60_000) {
        console.warn("[useSyncKeys] In error cooldown, skipping sync");
        return;
      }
    } catch {
      /* ignore */
    }

    ranForRef.current = { userId, wallet: walletAddress };
    if (syncInProgressRef.current) return;
    syncInProgressRef.current = true;

    (async () => {
      try {
        const localExists = await hasKeyPair(userId);
        const dbPk = await getUserPublicKey(userId);
        const alreadySynced = sessionStorage.getItem(SYNCED_KEY);

        logFlow("sync:start", {
          localExists,
          hasDbPk: !!dbPk,
          alreadySynced: alreadySynced === userId,
        });

        // If sessionStorage says synced but DB has no public_key, force re-sync
        if (alreadySynced === userId && dbPk) {
          logFlow("sync:already-synced");
          return;
        }

        const userWithBackup = await getUserWithBackup(userId);
        const schemeVersion = userWithBackup?.scheme_version ?? 0;
        const wallet = userWithBackup?.wallet_address;

        logFlow("sync:backup-state", {
          schemeVersion,
          hasServerShare: !!userWithBackup?.server_share_ciphertext,
          hasRecoveryHash: !!userWithBackup?.recovery_code_hash,
          hasEncryptedPrivateKey: !!userWithBackup?.encrypted_private_key,
        });

        // ── Case A: New user (no keys anywhere) ──
        if (!localExists && !dbPk && !schemeVersion) {
          logFlow("sync:case-A", { reason: "new-user" });
          await onboardNewUser(userId);
          return;
        }

        // ── Case B: IndexedDB has keys ──
        if (localExists) {
          logFlow("sync:case-B", { reason: "local-exists" });
          const kp = await getKeyPair(userId);
          if (!kp) {
            ranForRef.current = null;
            return;
          }

          let localPk: string;
          try {
            localPk = await exportPublicKey(kp.publicKey!);
          } catch {
            // Local keypair corrupted → delete and re-onboard or recover
            await deleteKeyPair(userId);
            ranForRef.current = null;
            return;
          }

          if (dbPk === localPk) {
            logFlow("sync:case-B:keys-match");
            // Lazy migration: create encrypted_private_key backup if missing
            if (!userWithBackup?.encrypted_private_key) {
              logFlow("sync:lazy-migration:start", { reason: "missing-encrypted-private-key" });
              try {
                let privJwkStr: string;
                try {
                  const privJwk = await crypto.subtle.exportKey("jwk", kp.privateKey!);
                  privJwkStr = JSON.stringify(privJwk);
                } catch (exportErr) {
                  // Key is non-extractable → reconstruct master secret from SSS shares
                  const localShare1 = await getLocalShare1(userId);
                  if (!localShare1) throw new Error("No local share1 for reconstruction");
                  const share2 = await fetchServerShare();
                  if (!share2) {
                    if (!userWithBackup?.server_share_ciphertext) {
                      console.warn("[useSyncKeys] No server share stored for user; cross-device backup unavailable");
                      throw new Error("CROSS_DEVICE_BACKUP_UNAVAILABLE");
                    }
                    throw new Error("No server share2 for reconstruction");
                  }
                  const reconstructed = reconstructSecret([localShare1, share2]);
                  const hash = await hashMasterSecret(reconstructed);
                  if (hash !== userWithBackup?.master_secret_hash) {
                    throw new Error("Master secret hash mismatch during reconstruction");
                  }
                  privJwkStr = new TextDecoder().decode(reconstructed);
                }
                const encrypted = await encryptPrivateKeyV2(privJwkStr, userId);
                assertOk(await saveEncryptedPrivateKey(await withPrivyToken({ id: userId, encrypted_private_key: encrypted })), "saveEncryptedPrivateKey");
                logFlow("sync:lazy-migration:success");
                try {
                  const { sileo } = await import("sileo");
                  sileo.success({
                    title: t("crossDeviceBackupReady"),
                    description: t("crossDeviceBackupReadyDesc"),
                    duration: 5000,
                  });
                } catch { /* sileo not available in tests */ }
              } catch (e) {
                const reason = e instanceof Error ? e.message : "unknown";
                if (e instanceof Error && e.message === "CROSS_DEVICE_BACKUP_UNAVAILABLE") {
                  logFlow("sync:lazy-migration:skip", { reason: "no-server-share" });
                  try {
                    const { sileo } = await import("sileo");
                    sileo.error({
                      title: t("crossDeviceBackupUnavailable"),
                      description: t("crossDeviceBackupUnavailableDesc"),
                      duration: 6000,
                    });
                  } catch { /* sileo not available in tests */ }
                } else {
                  logFlow("sync:lazy-migration:fail", { reason });
                  try {
                    const { sileo } = await import("sileo");
                    sileo.error({
                      title: t("backupCreateFailed"),
                      description: t("backupCreateFailedDesc"),
                      duration: 5000,
                    });
                  } catch { /* sileo not available in tests */ }
                }
              }
            }
            // If the user has no server share at all, they may want to regenerate
            // for cross-device support — but ONLY if they have no encrypted data.
            if (!userWithBackup?.server_share_ciphertext && walletAddress) {
              try {
                const hasData = await hasEncryptedData(walletAddress);
                if (!hasData) {
                  console.warn("[useSyncKeys] No server share and no encrypted data — safe to regenerate");
                  setRecoveryState({
                    needsRecoveryCode: false,
                    needsRegeneration: true,
                    recoveryCode: null,
                    step: "idle",
                  });
                  return;
                }
              } catch {
                /* ignore check failure */
              }
            }
            sessionStorage.setItem(SYNCED_KEY, userId);
            return;
          }

          // DB key differs → try auto-recovery from backup, then set up recovery
          if (dbPk && dbPk !== localPk) {
            logFlow("sync:case-B:key-mismatch", {
              hasEncryptedBackup: !!userWithBackup?.encrypted_private_key,
            });
            const userWithBackupMismatch = await getUserWithBackup(userId);

            // Step 1: Try silent auto-recovery from encrypted_private_key backup
            if (userWithBackupMismatch?.encrypted_private_key && userWithBackupMismatch?.public_key) {
              logFlow("sync:auto-recovery:attempt", { source: "encrypted-private-key" });
              const decrypted = await decryptPrivateKeyV2(
                userWithBackupMismatch.encrypted_private_key,
                userId
              );

              if (decrypted) {
                try {
                  const privJwk = JSON.parse(decrypted) as JsonWebKey;
                  const pubJwk = JSON.parse(userWithBackupMismatch.public_key) as JsonWebKey;
                  const privateKey = await crypto.subtle.importKey(
                    "jwk",
                    privJwk,
                    { name: "ECDH", namedCurve: "P-256" },
                    false,
                    ["deriveKey", "deriveBits"]
                  );
                  const publicKey = await crypto.subtle.importKey(
                    "jwk",
                    pubJwk,
                    { name: "ECDH", namedCurve: "P-256" },
                    true,
                    []
                  );
                  // Auto-recovery: just import the keypair from backup.
                  // Do NOT regenerate SSS shares — existing recovery code and server share2 remain valid.
                  await saveKeyPair(userId, { privateKey, publicKey }, {
                    masterSecretHash: userWithBackupMismatch.master_secret_hash ?? undefined,
                    schemeVersion: 2,
                  });
                  logFlow("sync:auto-recovery:success", { source: "encrypted-private-key" });
                  sessionStorage.setItem(SYNCED_KEY, userId);
                  clearConflict();
                  try {
                    const { sileo } = await import("sileo");
                    sileo.success({
                      title: t("recoverySuccess"),
                      description: t("recoverySuccess"),
                      duration: 5000,
                    });
                  } catch { /* sileo not available in tests */ }
                  return;
                } catch (e) {
                  const reason = e instanceof Error ? e.message : "unknown";
                  logFlow("sync:auto-recovery:fail", { source: "encrypted-private-key", reason });
                  try {
                    const { sileo } = await import("sileo");
                    sileo.error({
                      title: t("autoRecoveryFailed"),
                      description: t("autoRecoveryFailedDesc"),
                      duration: 6000,
                    });
                  } catch { /* sileo not available in tests */ }
                  try {
                    sessionStorage.setItem("hp_keys_sync_error", String(Date.now()));
                  } catch { /* ignore */ }
                }
              }
            }

            // Auto-recovery failed → delete incorrect local keys and offer recovery/regenerate
            logFlow("sync:auto-recovery:fallback", { canRegenerate: !userWithBackupMismatch?.server_share_ciphertext });
            try {
              const { sileo } = await import("sileo");
              sileo.error({
                title: t("keyMismatchDetected"),
                description: t("keyMismatchDetectedDesc"),
                duration: 6000,
              });
            } catch { /* sileo not available in tests */ }
            await deleteKeyPair(userId);

            if (!userWithBackupMismatch?.server_share_ciphertext) {
              setRecoveryState({
                needsRecoveryCode: false,
                needsRegeneration: true,
                recoveryCode: null,
                step: "idle",
              });
            } else {
              setRecoveryState({
                needsRecoveryCode: true,
                needsRegeneration: false,
                recoveryCode: null,
                step: "needs_input",
              });
            }
            setConflict("key_mismatch");
            return;
          }

          // No DB key → save local to DB
          logFlow("sync:case-B:no-db-key", { action: "save-local-to-db" });
          const pubRes = await updatePublicKey(await withPrivyToken({
            id: userId,
            public_key: localPk,
          }));
          if (pubRes.success) {
            logFlow("sync:case-B:local-saved-to-db");
            sessionStorage.setItem(SYNCED_KEY, userId);
            clearDbUserCache();
          } else {
            ranForRef.current = null;
          }
          return;
        }

        // ── Case C: IndexedDB empty, user on scheme v2 ──
        if (schemeVersion === 2) {
          logFlow("sync:case-C", { reason: "indexeddb-empty-scheme-v2" });
          setIsRecovering(true);
          // Step 1: Try silent auto-recovery from encrypted_private_key backup
          if (userWithBackup?.encrypted_private_key && userWithBackup?.public_key) {
            logFlow("sync:case-C:auto-recovery:attempt", { source: "encrypted-private-key" });
            const decrypted = await decryptPrivateKeyV2(
              userWithBackup.encrypted_private_key,
              userId
            );
            if (decrypted) {
              try {
                const privJwk = JSON.parse(decrypted) as JsonWebKey;
                const pubJwk = JSON.parse(userWithBackup.public_key) as JsonWebKey;

                // Defensive: verify encrypted_private_key matches current master_secret_hash
                const encoder = new TextEncoder();
                const backupMasterSecret = encoder.encode(JSON.stringify(privJwk));
                const backupHash = await hashMasterSecret(backupMasterSecret);
                if (backupHash !== userWithBackup.master_secret_hash) {
                  logFlow("sync:case-C:auto-recovery:hash-mismatch", {
                    backupHashPrefix: backupHash.slice(0, 16),
                    dbHashPrefix: userWithBackup.master_secret_hash?.slice(0, 16),
                  });
                  throw new Error("encrypted_private_key does not match current master_secret_hash");
                }

                const privateKey = await crypto.subtle.importKey(
                  "jwk",
                  privJwk,
                  { name: "ECDH", namedCurve: "P-256" },
                  false,
                  ["deriveKey", "deriveBits"]
                );
                const publicKey = await crypto.subtle.importKey(
                  "jwk",
                  pubJwk,
                  { name: "ECDH", namedCurve: "P-256" },
                  true,
                  []
                );
                // Auto-recovery: just import the keypair from backup.
                // Do NOT regenerate SSS shares or call saveKeyBackupBundle —
                // the user's existing recovery code and server share2 remain valid.
                await saveKeyPair(userId, { privateKey, publicKey }, {
                  masterSecretHash: userWithBackup.master_secret_hash ?? undefined,
                  schemeVersion: 2,
                });
                sessionStorage.setItem(SYNCED_KEY, userId);
                clearConflict();
                logFlow("sync:case-C:auto-recovery:success", { source: "encrypted-private-key" });
                try {
                  const { sileo } = await import("sileo");
                  sileo.success({
                    title: t("recoverySuccess"),
                    description: t("recoverySuccess"),
                    duration: 5000,
                  });
                } catch {
                  /* sileo not available in tests */
                }
                return;
              } catch (e) {
                const reason = e instanceof Error ? e.message : "unknown";
                logFlow("sync:case-C:auto-recovery:fail", { source: "encrypted-private-key", reason });
                try {
                  sessionStorage.setItem("hp_keys_sync_error", String(Date.now()));
                } catch { /* ignore */ }
              }
            }
          }

          // Step 2: Try normal SSS recovery with local share1 + server share2
          const localShare1 = await getLocalShare1(userId);
          if (localShare1) {
            logFlow("sync:case-C:sss-recovery:attempt");
            serverShareAttemptedRef.current = false;
            try { sessionStorage.removeItem("hp_server_share_attempted"); } catch { /* ignore */ }
            const share2 = await fetchServerShare();
            if (!share2) {
              logFlow("sync:case-C:sss-recovery:fail", { reason: "server-share2-unavailable" });
              if (!userWithBackup?.server_share_ciphertext) {
                setRecoveryState({
                  needsRecoveryCode: false,
                  needsRegeneration: true,
                  recoveryCode: null,
                  step: "idle",
                });
                return;
              }
              setRecoveryState({
                needsRecoveryCode: true,
                needsRegeneration: false,
                recoveryCode: null,
                step: "needs_input",
              });
              return;
            }

            const result = await reconstructFromShares(
              localShare1,
              share2,
              userWithBackup?.master_secret_hash ?? ""
            );

            if (!result) {
              setRecoveryState({
                needsRecoveryCode: true,
                needsRegeneration: false,
                recoveryCode: null,
                step: "needs_input",
              });
              return;
            }

            await saveKeyPair(userId, result.keyPair, {
              share1: localShare1,
              masterSecretHash: userWithBackup?.master_secret_hash ?? undefined,
              schemeVersion: 2,
            });
            logFlow("sync:case-C:sss-recovery:success");
            sessionStorage.setItem(SYNCED_KEY, userId);
            clearConflict();
            return;
          }

          // Step 3: No local share1 → need recovery code or regeneration
          logFlow("sync:case-C:fallback", { hasServerShare: !!userWithBackup?.server_share_ciphertext });
          try {
            const { sileo } = await import("sileo");
            sileo.error({
              title: t("recoveryCodeRequired"),
              description: t("recoveryCodeRequiredDesc"),
              duration: 6000,
            });
          } catch { /* sileo not available in tests */ }
          if (!userWithBackup?.server_share_ciphertext) {
            setRecoveryState({
              needsRecoveryCode: false,
              needsRegeneration: true,
              recoveryCode: null,
              step: "idle",
            });
            return;
          }
          setRecoveryState({
            needsRecoveryCode: true,
            needsRegeneration: false,
            recoveryCode: null,
            step: "needs_input",
          });
          return;
        }

        // ── Case D: Legacy migration (scheme v1 or encrypted_private_key) ──
        if (schemeVersion === 1 || userWithBackup?.encrypted_private_key) {
          logFlow("sync:case-D", { reason: "legacy-migration", schemeVersion });
          // Attempt legacy recovery first
          let legacyPrivJwk: JsonWebKey | null = null;
          let legacyPubJwk: JsonWebKey | null = null;

          if (userWithBackup?.encrypted_private_key && userWithBackup?.public_key) {
            logFlow("sync:case-D:legacy-recovery:attempt");
            const decrypted = await decryptPrivateKeyV2(
              userWithBackup.encrypted_private_key,
              userId
            );
            if (decrypted) {
              legacyPrivJwk = JSON.parse(decrypted) as JsonWebKey;
              legacyPubJwk = JSON.parse(userWithBackup.public_key) as JsonWebKey;
              logFlow("sync:case-D:legacy-recovery:success");
            } else {
              logFlow("sync:case-D:legacy-recovery:fail", { reason: "decrypt-failed" });
              try {
                const { sileo } = await import("sileo");
                sileo.error({
                  title: t("legacyDecryptFailed"),
                  description: t("legacyDecryptFailedDesc"),
                  duration: 5000,
                });
              } catch { /* sileo not available in tests */ }
            }
          }

          if (legacyPrivJwk && legacyPubJwk) {
            // Convert legacy private key JWK bytes into a "master secret" for SSS
            const encoder = new TextEncoder();
            const masterSecret = encoder.encode(JSON.stringify(legacyPrivJwk));
            const shares = generateShares(masterSecret, 2, 3);
            const [share1, share2, share3] = shares;

            const masterHash = await hashMasterSecret(masterSecret);
            const recoveryCode = encodeRecoveryCode(hexToBytes(share3));
            const recoveryHash = await hashRecoveryCode(recoveryCode);

            // Import keypair from legacy JWK
            const privateKey = await crypto.subtle.importKey(
              "jwk",
              legacyPrivJwk,
              { name: "ECDH", namedCurve: "P-256" },
              false,
              ["deriveKey", "deriveBits"]
            );
            const publicKey = await crypto.subtle.importKey(
              "jwk",
              legacyPubJwk,
              { name: "ECDH", namedCurve: "P-256" },
              true,
              []
            );

            await saveKeyPair(userId, { privateKey, publicKey }, {
              share1,
              masterSecretHash: masterHash,
              schemeVersion: 2,
            });

            assertOk(await saveKeyBackupBundle(await withPrivyToken({
              userId,
              share2,
              recoveryCodeHash: recoveryHash,
              masterSecretHash: masterHash,
              publicKey: JSON.stringify(legacyPubJwk),
            })), "saveKeyBackupBundle");
            logFlow("sync:case-D:complete", { hasNewRecoveryCode: true });

            sessionStorage.setItem(SYNCED_KEY, userId);
            clearDbUserCache();
            clearConflict();
            // Show the new recovery code — old one is now invalid
            setRecoveryState({
              needsRecoveryCode: true,
              needsRegeneration: false,
              recoveryCode,
              step: "show_recovery_code",
            });
            try {
              const { sileo } = await import("sileo");
              sileo.success({
                title: t("recoveryCodeUpdated"),
                description: t("recoveryCodeUpdatedDesc"),
                duration: 8000,
              });
            } catch { /* sileo not available in tests */ }
            return;
          }

          // Legacy recovery failed → treat as missing keys
        }

        // ── Case E: No keys anywhere but data exists ──
        if (wallet) {
          const hasData = await hasEncryptedData(wallet);
          if (hasData) {
            setConflict("missing_local_keys");
            return;
          }
        }

        // ── Case F: No keys anywhere ──
        // If user already exists in DB (has scheme or public key), they must
        // recover or explicitly choose to regenerate. NEVER auto-create new keys
        // for an existing account — that would overwrite their encryption data.
        if (schemeVersion || dbPk) {
          if (schemeVersion === 2 && userWithBackup?.server_share_ciphertext) {
            setRecoveryState({
              needsRecoveryCode: true,
              needsRegeneration: false,
              recoveryCode: null,
              step: "needs_input",
            });
          } else {
            setRecoveryState({
              needsRecoveryCode: false,
              needsRegeneration: true,
              recoveryCode: null,
              step: "idle",
            });
          }
          return;
        }

        // Only for brand-new users with no DB record whatsoever
        await onboardNewUser(userId);
      } catch (err) {
        console.error("[useSyncKeys] Error syncing keys:", err);
        setIsRecovering(false);
        try {
          sessionStorage.setItem("hp_keys_sync_error", String(Date.now()));
        } catch {
          /* ignore */
        }
      } finally {
        syncInProgressRef.current = false;
      }
    })();
  }, [ready, authenticated, userId, walletAddress, setConflict, clearConflict, setIsRecovering]);

  // ── Manual recovery with recovery code ──
  const recoverWithCode = async (code: string): Promise<boolean> => {
    if (!userId) return false;
    logFlow("recover:start", { hasCode: !!code });
    try {
      setRecoveryState((s) => ({ ...s, step: "recovering" }));

      const userWithBackup = await getUserWithBackup(userId);
      if (!userWithBackup?.master_secret_hash) {
        try {
          const { sileo } = await import("sileo");
          sileo.error({
            title: t("noBackup"),
            description: t("noBackupDesc"),
            duration: 5000,
          });
        } catch { /* sileo not available in tests */ }
        return false;
      }

      serverShareAttemptedRef.current = false;
      try { sessionStorage.removeItem("hp_server_share_attempted"); } catch { /* ignore */ }
      const share2 = await fetchServerShare();
      if (!share2) {
        try {
          const { sileo } = await import("sileo");
          sileo.error({
            title: t("noServerShare"),
            description: t("noServerShareDesc"),
            duration: 5000,
          });
        } catch { /* sileo not available in tests */ }
        return false;
      }

      // Decode recovery code to share3 bytes, then to hex string
      const { decodeRecoveryCode } = await import("@/services/encryption/recovery-code");
      const share3Bytes = decodeRecoveryCode(code);
      const share3 = Array.from(share3Bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Diagnose: check if recovery code matches the stored recovery hash
      const enteredRecoveryHash = await hashRecoveryCode(normalizeRecoveryCode(code));
      if (userWithBackup.recovery_code_hash && enteredRecoveryHash !== userWithBackup.recovery_code_hash) {
        console.error("[useSyncKeys] Recovery code hash mismatch — code may be from an older generation", {
          expectedRecoveryHashPrefix: userWithBackup.recovery_code_hash.slice(0, 16),
          enteredRecoveryHashPrefix: enteredRecoveryHash.slice(0, 16),
        });
        try {
          const { sileo } = await import("sileo");
          sileo.error({
            title: t("recoveryCodeExpired"),
            description: t("recoveryCodeExpiredDesc"),
            duration: 8000,
          });
        } catch { /* sileo not available in tests */ }
        return false;
      }

      const result = await reconstructFromShares(
        share2,
        share3,
        userWithBackup.master_secret_hash
      );
      if (!result) {
        try {
          const { sileo } = await import("sileo");
          sileo.error({
            title: t("reconstructFailed"),
            description: t("reconstructFailedDesc"),
            duration: 5000,
          });
        } catch { /* sileo not available in tests */ }
        return false;
      }

      // Generate new share1 for this device
      const { generateShares } = await import("@/services/encryption/sss");
      const encoder = new TextEncoder();
      const masterSecret = encoder.encode(JSON.stringify(
        await crypto.subtle.exportKey("jwk", result.keyPair.privateKey)
      ));
      const newShares = generateShares(masterSecret, 2, 3);
      const newShare1 = newShares[0];

      await saveKeyPair(userId, result.keyPair, {
        share1: newShare1,
        masterSecretHash: userWithBackup.master_secret_hash,
        schemeVersion: 2,
      });

      sessionStorage.setItem(SYNCED_KEY, userId);
      clearConflict();
      setRecoveryState({
        needsRecoveryCode: false,
        needsRegeneration: false,
        recoveryCode: null,
        step: "idle",
      });
      try {
        const { sileo } = await import("sileo");
        sileo.success({
          title: t("recoverySuccess"),
          description: t("recoverySuccessDesc"),
          duration: 5000,
        });
      } catch {
        /* sileo not available in tests */
      }
      return true;
    } catch (e) {
      console.error("[useSyncKeys] recoverWithCode failed:", e);
      setRecoveryState((s) => ({ ...s, step: "needs_input" }));
      try {
        const { sileo } = await import("sileo");
        sileo.error({
          title: t("recoveryFailed"),
          description: t("recoveryFailedDesc"),
          duration: 5000,
        });
      } catch {
        /* sileo not available in tests */
      }
      return false;
    }
  };

  // ── Regenerate keys for users who lost everything ──
  const regenerateKeys = async (): Promise<boolean> => {
    if (!userId) return false;
    try {
      console.warn("[useSyncKeys] Regenerating keys for user");
      // Only clear server-share gate; keep ranForRef so the effect stays blocked
      serverShareAttemptedRef.current = false;
      try {
        sessionStorage.removeItem("hp_server_share_attempted");
      } catch { /* ignore */ }
      const { masterSecret, publicKeyJwk, keyPair } = await generateMasterSecret();
      logFlow("regenerate:master-secret", { length: masterSecret.length });

      const shares = generateShares(masterSecret, 2, 3);
      logFlow("regenerate:shares-generated", {
        count: shares.length,
        types: shares.map((s) => typeof s),
      });

      const [share1, share2, share3] = shares;

      // Diagnostic logging for share2 before sending to server
      logFlow("regenerate:share2-check", {
        type: typeof share2,
        length: share2?.length,
        isString: typeof share2 === "string",
        prefix: typeof share2 === "string" ? share2.slice(0, 16) : null,
      });

      if (!share2 || typeof share2 !== "string") {
        console.error("[useSyncKeys] regenerateKeys aborted: share2 is missing or not a string", {
          share2: typeof share2 === "string" ? `${share2.slice(0, 20)}...` : share2,
        });
        throw new Error("Generated share2 is missing or invalid. This is a bug; please report it.");
      }

      const masterHash = await hashMasterSecret(masterSecret);
      const recoveryCode = encodeRecoveryCode(hexToBytes(share3));
      const recoveryHash = await hashRecoveryCode(recoveryCode);

      await saveKeyPair(userId, keyPair, {
        share1,
        masterSecretHash: masterHash,
        schemeVersion: 2,
      });

      assertOk(await saveKeyBackupBundle(await withPrivyToken({
        userId,
        share2,
        recoveryCodeHash: recoveryHash,
        masterSecretHash: masterHash,
        publicKey: publicKeyJwk,
      })), "saveKeyBackupBundle");

      // Update encrypted_private_key backup so cross-device recovery stays in sync
      const privJwkStr = new TextDecoder().decode(masterSecret);
      const encryptedPriv = await encryptPrivateKeyV2(privJwkStr, userId);
      assertOk(await saveEncryptedPrivateKey(await withPrivyToken({ id: userId, encrypted_private_key: encryptedPriv })), "saveEncryptedPrivateKey");

      sessionStorage.setItem(SYNCED_KEY, userId);
      clearConflict();
      clearDbUserCache();

      // Show the new recovery code
      setRecoveryState({
        needsRecoveryCode: true,
        needsRegeneration: false,
        recoveryCode,
        step: "show_recovery_code",
      });
      try {
        const { sileo } = await import("sileo");
        sileo.success({
          title: t("regenerateSuccess"),
          description: t("regenerateSuccessDesc"),
          duration: 5000,
        });
      } catch { /* sileo not available in tests */ }
      return true;
    } catch (e) {
      console.error("[useSyncKeys] regenerateKeys failed:", e);
      // Cooldown so the effect doesn't retry immediately
      try {
        sessionStorage.setItem("hp_keys_sync_error", String(Date.now()));
      } catch { /* ignore */ }
      // Clean up partially saved local keys so the next sync starts fresh
      try {
        await deleteKeyPair(userId);
      } catch { /* ignore */ }
      try {
        const { sileo } = await import("sileo");
        sileo.error({
          title: t("regenerateFailed"),
          description: t("regenerateFailedDesc"),
          duration: 5000,
        });
      } catch { /* sileo not available in tests */ }
      return false;
    }
  };

  // ── Dismiss recovery code modal ──
  const dismissRecoveryCode = () => {
    setRecoveryState({
      needsRecoveryCode: false,
      needsRegeneration: false,
      recoveryCode: null,
      step: "idle",
    });
  };

  return { recoveryState, recoverWithCode, dismissRecoveryCode, regenerateKeys };
}
