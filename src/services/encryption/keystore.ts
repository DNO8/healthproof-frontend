// IndexedDB-based keystore for ECDH private keys
// CryptoKey objects marked as non-extractable can only be stored in IndexedDB

const DB_NAME = "healthproof-keystore";
const DB_VERSION = 1;
const STORE_NAME = "ecdh-keys";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "userId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredKeyPair {
  userId: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

export async function saveKeyPair(
  userId: string,
  keyPair: CryptoKeyPair,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const record: StoredKeyPair = {
      userId,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
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
