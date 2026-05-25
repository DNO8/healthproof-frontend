"use client";

import { useState, useEffect, useCallback } from "react";
import { downloadAndDecrypt } from "@/services/storage/download";
import { detectMime } from "@/components/documents/FilePreview";
import type { DecryptedFile } from "@/components/documents/FilePreview";
import type { WrappedKey } from "@/services/encryption/ecdh";

export function useDocumentDecrypt() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decryptedFile, setDecryptedFile] = useState<DecryptedFile | null>(null);

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
