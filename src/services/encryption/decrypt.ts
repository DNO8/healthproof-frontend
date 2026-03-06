// Client-side decryption using Web Crypto API

export async function decryptData(
  encrypted: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encrypted,
  );
}

export async function decryptToBlob(
  encrypted: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
  mimeType: string,
): Promise<Blob> {
  const decrypted = await decryptData(encrypted, key, iv);
  return new Blob([decrypted], { type: mimeType });
}

export async function decryptToUrl(
  encrypted: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
  mimeType: string,
): Promise<string> {
  const blob = await decryptToBlob(encrypted, key, iv, mimeType);
  return URL.createObjectURL(blob);
}
