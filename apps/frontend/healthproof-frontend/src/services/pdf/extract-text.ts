import { extractTextFromImage } from "@/actions/ocr/extract-text-from-image";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

export interface PdfTextResult {
  text: string;
  hasText: boolean;
  error?: string;
  usedOcr?: boolean;
}

const MIN_NATIVE_TEXT_LENGTH = 60;

async function pdfToPageDataUrls(file: File): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const pdfjsLib = pdfjs.default ?? pdfjs;

  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const dataUrls: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    dataUrls.push(canvas.toDataURL("image/png"));
  }
  return dataUrls;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function ocrWithOpenAI(dataUrls: string[]): Promise<string> {
  const result = await extractTextFromImage({ images: dataUrls });
  if (!result.success || !result.text) {
    throw new Error(result.error || "OCR failed");
  }
  return result.text;
}

export async function extractDocumentText(file: File): Promise<PdfTextResult> {
  try {
    const isImage = file.type.startsWith("image/");

    if (isImage) {
      const dataUrl = await fileToDataUrl(file);
      const text = await ocrWithOpenAI([dataUrl]);
      return {
        text,
        hasText: text.length > 0,
        usedOcr: true,
      };
    }

    // PDF path: try native text extraction first
    const pdfjs = await import("pdfjs-dist");
    const pdfjsLib = pdfjs.default ?? pdfjs;

    if (typeof window !== "undefined") {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }

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
    if (trimmed.length >= MIN_NATIVE_TEXT_LENGTH) {
      return {
        text: trimmed,
        hasText: true,
        usedOcr: false,
      };
    }

    // Fall back to OpenAI Vision OCR for scanned/image-only PDFs
    const pageDataUrls = await pdfToPageDataUrls(file);
    const ocrText = await ocrWithOpenAI(pageDataUrls);

    return {
      text: ocrText,
      hasText: ocrText.length > 0,
      usedOcr: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      text: "",
      hasText: false,
      error: message.includes("worker")
        ? "worker_load_failed"
        : "extraction_failed",
    };
  }
}
