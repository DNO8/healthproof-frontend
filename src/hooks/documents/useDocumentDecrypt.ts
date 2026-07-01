"use client";

import { useCallback, useEffect, useState } from "react";
import { sileo } from "sileo";
import type { DecryptedFile } from "@/components/documents/FilePreview";
import { detectMime } from "@/components/documents/FilePreview";
import type { WrappedKey } from "@/services/encryption/ecdh";
import { downloadAndDecrypt } from "@/services/storage/download";

export function useDocumentDecrypt() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decryptedFile, setDecryptedFile] = useState<DecryptedFile | null>(
    null,
  );

  const decrypt = useCallback(
    async (opts: {
      cid: string;
      iv: string;
      wrappedKey: WrappedKey;
      senderPublicKeyJwk: string;
      myUserId: string;
    }): Promise<DecryptedFile | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await downloadAndDecrypt(opts);
        const mime = await detectMime(result.blob);
        const typedBlob = new Blob([result.blob], { type: mime });
        const typedUrl = URL.createObjectURL(typedBlob);
        const file: DecryptedFile = {
          url: typedUrl,
          blob: typedBlob,
          mime,
        };
        setDecryptedFile(file);
        return file;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[useDocumentDecrypt] error:", msg, err);
        setError(msg);
        if (msg.includes("Encryption keys not found")) {
          sileo.error({
            title: "Claves de cifrado no disponibles",
            description:
              "No se pueden desencriptar documentos en este navegador. Espera a que se recuperen las claves o inicia sesión con tu navegador original.",
            duration: 6000,
          });
        } else {
          sileo.error({
            title: "Error al desencriptar",
            description: msg.slice(0, 160),
            duration: 5000,
          });
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  function clear() {
    setDecryptedFile((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
    setError(null);
  }

  useEffect(() => {
    return () => {
      setDecryptedFile((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return null;
      });
    };
  }, []);

  return { decrypt, decryptedFile, loading, error, clear };
}
