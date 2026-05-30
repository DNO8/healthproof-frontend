// IndexedDB-based keystore for ECDH private keys + SSS metadata
// CryptoKey objects marked as non-extractable can only be stored in IndexedDB

import { encryptShare1, decryptShare1 } from "./keystore-crypto";

const DB_NAME = "healthproof-keystore";
const DB_VERSION = 3; // v3: share1 encrypted at rest
const STORE_NAME = "ecdh-keys";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = (event.target as IDBOpenDBRequest).transaction;
      if (!tx) { reject(new Error("Upgrade transaction missing")); return; }

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "userId" });
      }
      // v2 → v3 migration: share1 may be plaintext; next save will encrypt it
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredKeyPair {
  userId: string;
  privateKey?: CryptoKey;
  publicKey?: CryptoKey;
  share1?: string; // hex-encoded SSS share 1 (with x-coordinate)
  masterSecretHash?: string; // hex SHA-256 hash for local integrity verification
  schemeVersion?: number;
  createdAt?: string;
}

export async function saveKeyPair(
  userId: string,
  keyPair: CryptoKeyPair,
  opts?: {
    share1?: string;
    masterSecretHash?: string;
    schemeVersion?: number;
  },
): Promise<void> {
  // Pre-encrypt share1 so the IndexedDB transaction and its put()
  // happen synchronously inside the same execution block.
  let encryptedShare1: string | undefined;
  if (opts?.share1) {
    encryptedShare1 = await encryptShare1(opts.share1, userId);
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const record: StoredKeyPair = {
      userId,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      createdAt: new Date().toISOString(),
      ...opts,
      share1: encryptedShare1,
    };

    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}

export async function getKeyPair(
  userId: string,
): Promise<StoredKeyPair | null> {
  const db = await openDb();
  const raw = await new Promise<StoredKeyPair | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.get(userId);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });

  if (!raw?.share1) {
    return raw;
  }

  // Decrypt share1 if encrypted; legacy plaintext passes through
  try {
    const decrypted = await decryptShare1(raw.share1, userId);
    return { ...raw, share1: decrypted };
  } catch {
    // If decryption fails, return raw so caller can handle (e.g., migration)
    return raw;
  }
}

export async function hasKeyPair(userId: string): Promise<boolean> {
  const pair = await getKeyPair(userId);
  return pair !== null;
}

export async function deleteKeyPair(userId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const request = store.delete(userId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Store the local SSS share1 in IndexedDB.
 */
export async function saveLocalShare1(
  userId: string,
  share1: string,
): Promise<void> {
  const encrypted = await encryptShare1(share1, userId);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const request = store.get(userId);
    request.onsuccess = () => {
      const existing = (request.result as StoredKeyPair | undefined) ?? { userId };
      const updated: StoredKeyPair = {
        ...existing,
        userId,
        share1: encrypted,
      };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Retrieve the local SSS share1 from IndexedDB.
 */
export async function getLocalShare1(userId: string): Promise<string | null> {
  const pair = await getKeyPair(userId);
  return pair?.share1 ?? null;
}

/**
 * Re-encrypt a plaintext share1 in IndexedDB (migration helper).
 * Call after detecting an unencrypted share1 on read.
 */
export async function migrateLocalShare1(userId: string): Promise<void> {
  const db = await openDb();
  const raw = await new Promise<StoredKeyPair | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(userId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });

  if (!raw?.share1) return;

  const { isEncryptedShare1 } = await import("./keystore-crypto");
  if (isEncryptedShare1(raw.share1)) return; // already encrypted

  const encrypted = await encryptShare1(raw.share1, userId);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const updated = { ...raw, share1: encrypted };
    const putReq = store.put(updated);
    putReq.onsuccess = () => resolve();
    putReq.onerror = () => reject(putReq.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Store the master secret hash locally.
 */
export async function saveLocalMasterSecretHash(
  userId: string,
  hash: string,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const request = store.get(userId);
    request.onsuccess = () => {
      const existing = (request.result as StoredKeyPair | undefined) ?? { userId };
      const updated: StoredKeyPair = {
        ...existing,
        userId,
        masterSecretHash: hash,
      };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Retrieve the local master secret hash.
 */
export async function getLocalMasterSecretHash(userId: string): Promise<string | null> {
  const pair = await getKeyPair(userId);
  return pair?.masterSecretHash ?? null;
}
