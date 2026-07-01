"use server";

import { logger } from "@/lib/logger";
import { getOpenAIClient } from "@/services/fhir-rag/openai-client";

export interface ExtractTextFromImageInput {
  images: string[];
}

export interface ExtractTextFromImageResult {
  success: boolean;
  text?: string;
  error?: string;
}

const OCR_SYSTEM_PROMPT = `You are a medical document OCR assistant.

Your task is to extract all readable text from the provided image(s) of a medical document (lab report, prescription, clinical note, etc.).

Guidelines:
- Preserve the original language (Spanish or English).
- Preserve structure: headers, sections, tables, and line breaks as much as possible.
- Include patient names, dates, exam names, values, units, reference ranges, and any medical notes.
- Do not summarize or interpret. Output only the extracted text.
- If the image is unreadable or not a medical document, output an empty string.`;

export async function extractTextFromImage(
  input: ExtractTextFromImageInput,
): Promise<ExtractTextFromImageResult> {
  try {
    if (!input.images || input.images.length === 0) {
      return { success: false, error: "No images provided" };
    }

    logger.info({ imageCount: input.images.length }, "OCR request started");

    const openai = getOpenAIClient();

    const content = input.images.map((dataUrl) => ({
      type: "image_url" as const,
      image_url: { url: dataUrl },
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: OCR_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            ...content,
            {
              type: "text" as const,
              text: "Extract all text from the medical document image(s) above.",
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";

    logger.info(
      { textLength: text.length, hasText: text.length > 0 },
      "OCR request completed",
    );

    return {
      success: true,
      text,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ error: message }, "OCR request failed");
    return {
      success: false,
      error: message,
    };
  }
}
