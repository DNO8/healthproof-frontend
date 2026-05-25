// IndexedDB-based keystore for ECDH private keys + SSS metadata
// CryptoKey objects marked as non-extractable can only be stored in IndexedDB

const DB_NAME = "healthproof-keystore";
const DB_VERSION = 2;
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
      } else {
        // Migration from v1 to v2: store now holds extra fields; no schema change needed
      }
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
    };

    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getKeyPair(
  userId: string,
): Promise<StoredKeyPair | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.get(userId);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
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
        share1,
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
