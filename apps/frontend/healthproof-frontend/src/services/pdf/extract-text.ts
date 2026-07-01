import type { TextItem } from "pdfjs-dist/types/src/display/api";

export interface PdfTextResult {
  text: string;
  hasText: boolean;
  error?: string;
}

export async function extractPdfText(file: File): Promise<PdfTextResult> {
  try {
    const pdfjs = await import("pdfjs-dist");
    const pdfjsLib = pdfjs.default ?? pdfjs;

    // Ensure the worker matches the installed library version
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
    return {
      text: trimmed,
      hasText: trimmed.length > 0,
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
