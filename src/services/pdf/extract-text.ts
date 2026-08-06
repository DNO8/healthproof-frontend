import * as pdfjsLib from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

import { env } from "@/lib/env";
import { extractDocumentTextClient } from "@/services/ocr/client-ocr";
import { redactPhi } from "@/services/phi/redactor";
import type { PhiMap } from "@/services/phi/types";

export interface PdfTextResult {
  /** Anonymized text that is safe to send to AI models. */
  text: string;
  /** Map of placeholder -> original PHI value. */
  phiMap: PhiMap;
  hasText: boolean;
  error?: string;
  usedOcr?: boolean;
}

const MIN_NATIVE_TEXT_LENGTH = 60;

function configurePdfWorker() {
  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = env.PDF_WORKER_PATH;
  }
}

export async function extractDocumentText(file: File): Promise<PdfTextResult> {
  console.log("[extractDocumentText] starting", {
    type: file.type,
    size: file.size,
  });
  try {
    const isImage = file.type.startsWith("image/");

    if (isImage) {
      const clientResult = await extractDocumentTextClient(file);
      if (clientResult.error || !clientResult.hasText) {
        return {
          text: "",
          phiMap: {},
          hasText: false,
          error: clientResult.error || "extraction_failed",
        };
      }
      const { redactedText, phiMap } = redactPhi(clientResult.text);
      return {
        text: redactedText,
        phiMap,
        hasText: redactedText.length > 0,
        usedOcr: true,
      };
    }

    // PDF path: try native text extraction first
    configurePdfWorker();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item): item is TextItem => "str" in item)
        .map((item) => item.str)
        .join(" ");
      fullText += `${pageText}\n`;
    }

    const trimmed = fullText.trim();
    console.log("[extractDocumentText] native text length", trimmed.length);
    if (trimmed.length >= MIN_NATIVE_TEXT_LENGTH) {
      const { redactedText, phiMap } = redactPhi(trimmed);
      await pdf.destroy();
      return {
        text: redactedText,
        phiMap,
        hasText: true,
        usedOcr: false,
      };
    }

    // Fall back to local Tesseract OCR for scanned/image-only PDFs
    await pdf.destroy();
    console.log("[extractDocumentText] falling back to local Tesseract OCR");
    const clientResult = await extractDocumentTextClient(file);
    if (clientResult.error || !clientResult.hasText) {
      return {
        text: "",
        phiMap: {},
        hasText: false,
        error: clientResult.error || "extraction_failed",
      };
    }

    const { redactedText, phiMap } = redactPhi(clientResult.text);
    console.log("[extractDocumentText] OCR result length", redactedText.length);
    return {
      text: redactedText,
      phiMap,
      hasText: redactedText.length > 0,
      usedOcr: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[extractDocumentText] failed", message);
    return {
      text: "",
      phiMap: {},
      hasText: false,
      error: message.includes("worker")
        ? "worker_load_failed"
        : "extraction_failed",
    };
  }
}
