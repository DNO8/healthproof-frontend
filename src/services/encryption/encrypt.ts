// Client-side encryption using Web Crypto API
// Documents are encrypted before upload — server never sees plaintext

export async function encryptData(
  data: ArrayBuffer,
  key: CryptoKey,
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );

  return { encrypted, iv };
}

export async function encryptFile(
  file: File,
  key: CryptoKey,
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const buffer = await file.arrayBuffer();
  return encryptData(buffer, key);
}

export async function hashData(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return hashData(buffer);
}
