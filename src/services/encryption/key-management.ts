// Client-side key generation and management using Web Crypto API

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  const bytes = new Uint8Array(exported);
  return btoa(String.fromCharCode(...bytes));
}

export async function importKey(base64Key: string): Promise<CryptoKey> {
  const bytes = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export function encodeIv(iv: Uint8Array): string {
  return btoa(String.fromCharCode(...iv));
}

export function decodeIv(base64Iv: string): Uint8Array {
  return Uint8Array.from(atob(base64Iv), (c) => c.charCodeAt(0));
}
