"use client";

import * as pdfjsLib from "pdfjs-dist";
import { createWorker, type PSM } from "tesseract.js";

import { env } from "@/lib/env";

export interface ClientOcrResult {
  text: string;
  hasText: boolean;
  error?: string;
  pagesProcessed: number;
}

export interface ClientOcrOptions {
  /** Minimum number of characters to consider native extraction sufficient. */
  minNativeTextLength?: number;
  /** Tesseract PSM mode. Default 6 (uniform block of text). */
  psm?: PSM;
  /** Language(s) to use. Default "spa+eng". */
  lang?: string;
  /** Optional progress callback (0-1). */
  onProgress?: (progress: number) => void;
  /** Optional logger for tesseract.js. */
  logger?: (m: unknown) => void;
  /** Optional path to host the traineddata language files. Default uses tesseract.js CDN. */
  langPath?: string;
  /** Optional path to the tesseract.js worker script. Default uses tesseract.js bundled worker. */
  workerPath?: string;
  /** Optional path to the tesseract.js core script. Default uses tesseract.js bundled core. */
  corePath?: string;
}

const DEFAULT_OPTIONS = {
  minNativeTextLength: 60,
  psm: 6 as unknown as PSM,
  lang: "spa+eng",
  ...(env.TESSERACT_LANG_PATH ? { langPath: env.TESSERACT_LANG_PATH } : {}),
  ...(env.TESSERACT_WORKER_PATH
    ? { workerPath: env.TESSERACT_WORKER_PATH }
    : {}),
  ...(env.TESSERACT_CORE_PATH ? { corePath: env.TESSERACT_CORE_PATH } : {}),
};

type MergedClientOcrOptions = Omit<
  typeof DEFAULT_OPTIONS,
  "langPath" | "workerPath" | "corePath"
> &
  ClientOcrOptions;

/**
 * Extracts text from a PDF or image file using client-side OCR.
 *
 * Strategy:
 * 1. For PDFs: try native text extraction first. If too short, render each page
 *    to canvas and run Tesseract.
 * 2. For images: render to canvas and run Tesseract directly.
 *
 * No data is sent to external AI services. All processing happens in the browser.
 */
export async function extractDocumentTextClient(
  file: File,
  options: ClientOcrOptions = {},
): Promise<ClientOcrResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      return await extractFromPdf(file, opts);
    }

    if (file.type.startsWith("image/")) {
      return await extractFromImage(file, opts);
    }

    return {
      text: "",
      hasText: false,
      error: "Unsupported file type",
      pagesProcessed: 0,
    };
  } catch (err) {
    return {
      text: "",
      hasText: false,
      error: err instanceof Error ? err.message : "Unknown OCR error",
      pagesProcessed: 0,
    };
  }
}

async function extractFromPdf(
  file: File,
  options: MergedClientOcrOptions,
): Promise<ClientOcrResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    // 1. Native text extraction
    let nativeText = "";
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      nativeText += `${pageText}\n`;
    }

    if (nativeText.trim().length >= options.minNativeTextLength) {
      return {
        text: nativeText.trim(),
        hasText: true,
        pagesProcessed: pdfDocument.numPages,
      };
    }

    // 2. Tesseract OCR fallback
    worker = await createWorker(options.lang, 1, {
      logger: options.logger,
      errorHandler: (err) => {
        console.error("[tesseract] worker error", err);
      },
      ...(options.langPath ? { langPath: options.langPath } : {}),
      ...(options.workerPath ? { workerPath: options.workerPath } : {}),
      ...(options.corePath ? { corePath: options.corePath } : {}),
    });
    await worker.setParameters({
      tessedit_pageseg_mode: options.psm,
    });

    let ocrText = "";
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        return {
          text: "",
          hasText: false,
          error: "Canvas context not available",
          pagesProcessed: 0,
        };
      }
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport, canvas }).promise;

      const {
        data: { text },
      } = await worker.recognize(canvas);
      ocrText += `${text}\n`;

      if (options.onProgress) {
        options.onProgress(i / pdfDocument.numPages);
      }
    }

    return {
      text: ocrText.trim(),
      hasText: ocrText.trim().length > 0,
      pagesProcessed: pdfDocument.numPages,
    };
  } finally {
    await worker?.terminate();
    await pdfDocument.destroy();
  }
}

async function extractFromImage(
  file: File,
  options: MergedClientOcrOptions,
): Promise<ClientOcrResult> {
  const bitmap = await createImageBitmap(file);
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) {
      return {
        text: "",
        hasText: false,
        error: "Canvas context not available",
        pagesProcessed: 0,
      };
    }
    context.drawImage(bitmap, 0, 0);

    worker = await createWorker(options.lang, 1, {
      logger: options.logger,
      errorHandler: (err) => {
        console.error("[tesseract] worker error", err);
      },
      ...(options.langPath ? { langPath: options.langPath } : {}),
      ...(options.workerPath ? { workerPath: options.workerPath } : {}),
      ...(options.corePath ? { corePath: options.corePath } : {}),
    });
    await worker.setParameters({
      tessedit_pageseg_mode: options.psm,
    });

    const result = await worker.recognize(canvas);
    const text = result.data.text;

    return {
      text: text.trim(),
      hasText: text.trim().length > 0,
      pagesProcessed: 1,
    };
  } finally {
    await worker?.terminate();
    bitmap.close();
  }
}
