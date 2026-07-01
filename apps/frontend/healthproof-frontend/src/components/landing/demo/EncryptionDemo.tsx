"use client";

import { Check, FileText, Loader2, Lock, Unlock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { MOCK_CLINICAL_TEXT_EN, MOCK_CLINICAL_TEXT_ES } from "./mock-data";

interface EncryptionDemoProps {
  onEncrypted?: (iv: string, ciphertext: string) => void;
}

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function EncryptionDemo({ onEncrypted }: EncryptionDemoProps) {
  const t = useTranslations("demoFlow");
  const locale = useLocale();
  const plaintext =
    locale === "es" ? MOCK_CLINICAL_TEXT_ES : MOCK_CLINICAL_TEXT_EN;

  const [stage, setStage] = useState<"idle" | "encrypting" | "done">("idle");
  const [ciphertextB64, setCiphertextB64] = useState("");
  const [ivB64, setIvB64] = useState("");
  const [decrypted, setDecrypted] = useState("");

  useEffect(() => {
    if (stage !== "encrypting") return;

    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;

      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = new TextEncoder().encode(plaintext);
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        data,
      );

      const ctB64 = bufToBase64(encrypted);
      const ivB64Local = bufToBase64(iv.buffer);

      if (cancelled) return;
      setCiphertextB64(ctB64);
      setIvB64(ivB64Local);

      // Immediately decrypt to prove integrity
      const decryptedBuf = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encrypted,
      );
      const decryptedText = new TextDecoder().decode(decryptedBuf);
      if (cancelled) return;
      setDecrypted(decryptedText);

      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;
      setStage("done");
      onEncrypted?.(ivB64Local, ctB64);
    })();

    return () => {
      cancelled = true;
    };
  }, [stage, plaintext, onEncrypted]);

  if (stage === "idle") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-(--hp-border) bg-(--hp-layer) p-6 text-center">
        <FileText className="h-8 w-8 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">
          {t("encryptFileName")}
        </p>
        <button
          type="button"
          onClick={() => setStage("encrypting")}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-(--hp-shadow-raised) transition hover:bg-slate-700"
        >
          {t("encryptButton")}
        </button>
      </div>
    );
  }

  if (stage === "encrypting") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-(--hp-border) bg-(--hp-layer) p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-50">
          <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">
            {t("encryptingTitle")}
          </p>
          <p className="mt-1 text-xs text-slate-400">{t("encryptingDesc")}</p>
        </div>
        <div className="w-full space-y-1.5 rounded-2xl border border-(--hp-border) bg-white/50 p-4 text-left">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {t("plaintextLabel")}
            </p>
          </div>
          <p className="max-h-20 overflow-hidden text-[10px] font-mono leading-relaxed text-slate-500">
            {plaintext.split("\n").slice(0, 4).join("\n")}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
        <Check className="h-7 w-7 text-emerald-500" />
      </div>
      <p className="text-sm font-semibold text-slate-800">
        {t("encryptedTitle")}
      </p>

      <div className="w-full space-y-2 rounded-2xl border border-(--hp-border) bg-white/60 p-4 text-left">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {t("ciphertextLabel")}
          </p>
        </div>
        <p className="break-all font-mono text-[10px] text-slate-600">
          {ciphertextB64.slice(0, 80)}...
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Lock className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {t("ivLabel")}
          </p>
        </div>
        <p className="break-all font-mono text-[10px] text-slate-600">
          {ivB64}
        </p>
      </div>

      <div className="w-full space-y-1.5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-left">
        <div className="flex items-center gap-2">
          <Unlock className="h-3.5 w-3.5 text-emerald-500" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            {t("decryptedLabel")}
          </p>
        </div>
        <p className="max-h-20 overflow-hidden text-[10px] font-mono leading-relaxed text-emerald-700">
          {decrypted.split("\n").slice(0, 4).join("\n")}...
        </p>
        <p className="text-[10px] text-emerald-600">{t("integrityVerified")}</p>
      </div>
    </div>
  );
}
