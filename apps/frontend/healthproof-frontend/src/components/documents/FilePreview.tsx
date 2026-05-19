"use client";

import { useState, useEffect } from "react";

export type DecryptedFile = {
  url: string;
  blob: Blob;
  mime: string;
};

const MIME_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/json": ".json",
};

export function getExtensionFromMime(mime: string): string {
  return MIME_EXT[mime] ?? "";
}

export async function detectMime(blob: Blob): Promise<string> {
  const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  if (header[0] === 0x89 && header[1] === 0x50) return "image/png";
  if (header[0] === 0xff && header[1] === 0xd8) return "image/jpeg";
  if (header[0] === 0x47 && header[1] === 0x49) return "image/gif";
  if (header[0] === 0x25 && header[1] === 0x50) return "application/pdf";
  if (header[0] === 0x52 && header[1] === 0x49) return "image/webp";
  // Try reading as text
  try {
    const text = await blob.slice(0, 512).text();
    if (/^[\x20-\x7E\t\n\r]+$/.test(text)) {
      if (text.trimStart().startsWith("{")) return "application/json";
      return "text/plain";
    }
  } catch {
    /* not text */
  }
  return blob.type || "application/octet-stream";
}

export function FilePreview({ file }: { file: DecryptedFile }) {
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (
      file.mime === "text/plain" ||
      file.mime === "application/json" ||
      file.mime === "text/csv"
    ) {
      file.blob.text().then((t) => {
        if (file.mime === "application/json") {
          try {
            setTextContent(JSON.stringify(JSON.parse(t), null, 2));
          } catch {
            setTextContent(t);
          }
        } else {
          setTextContent(t);
        }
      });
    }
  }, [file]);

  if (file.mime.startsWith("image/")) {
    return (
      <div className="mt-4 flex justify-center">
        {/* biome-ignore lint: blob URL not compatible with next/image */}
        <img
          src={file.url}
          alt="Decrypted result"
          className="max-h-72 rounded-xl border border-slate-200 object-contain"
        />
      </div>
    );
  }

  if (file.mime === "application/pdf") {
    return (
      <div className="mt-4">
        <iframe
          src={file.url}
          className="h-80 w-full rounded-xl border border-slate-200"
          title="Decrypted PDF"
        />
      </div>
    );
  }

  if (textContent !== null) {
    return (
      <div className="mt-4">
        <pre className="neu-inset max-h-72 overflow-auto rounded-xl p-4 text-xs text-slate-700">
          {textContent}
        </pre>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 p-6">
      <span className="text-2xl">📄</span>
      <p className="text-xs text-slate-400">
        {file.mime} · {(file.blob.size / 1024).toFixed(1)} KB
      </p>
    </div>
  );
}
