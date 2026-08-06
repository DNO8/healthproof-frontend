import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";

interface Chunk {
  content: string;
  metadata: Record<string, unknown>;
}

const DOCS_DIR = path.join(process.cwd(), "docs", "fhir-sources");

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

async function getEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
    encoding_format: "float",
  });
  const embedding = response.data[0]?.embedding;
  if (!embedding || embedding.length === 0) {
    throw new Error("Embedding response empty");
  }
  return embedding;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function loadLoincChunks(): Promise<Chunk[]> {
  const filePath = path.join(DOCS_DIR, "chile-loinc-subset.csv");
  const raw = await fs.readFile(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  const headers = parseCsvLine(lines[0] ?? "");
  const chunks: Chunk[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < 4) continue;
    const row = Object.fromEntries(
      headers.map((h, idx) => [h, values[idx] ?? ""]),
    );
    const aliases = (row.common_aliases ?? "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    const content = [
      `LOINC code: ${row.loinc_code}`,
      `English display: ${row.display}`,
      `Spanish display: ${row.spanish_display}`,
      `Common aliases: ${aliases.join(", ")}`,
      `Component: ${row.component}`,
      `System: ${row.system}`,
      `Scale: ${row.scale}`,
    ].join("\n");

    chunks.push({
      content,
      metadata: {
        category: "loinc",
        loinc_code: row.loinc_code,
        component: row.component,
        system: row.system,
        scale: row.scale,
      },
    });
  }

  return chunks;
}

async function loadGuidelineChunks(): Promise<Chunk[]> {
  const filePath = path.join(DOCS_DIR, "guia-clinica-chile.md");
  const raw = await fs.readFile(filePath, "utf-8");
  const chunks: Chunk[] = [];
  const sections = raw.split(/^##\s+/m).filter(Boolean);

  for (const section of sections) {
    const lines = section.split("\n");
    const title = lines[0].trim();
    const body = lines.slice(1).join("\n").trim();
    if (!body) continue;
    chunks.push({
      content: `## ${title}\n\n${body}`,
      metadata: {
        category: "guideline",
        title,
      },
    });
  }

  return chunks;
}

async function loadChunks(): Promise<Chunk[]> {
  const [loinc, guidelines] = await Promise.all([
    loadLoincChunks(),
    loadGuidelineChunks(),
  ]);
  return [...loinc, ...guidelines];
}

async function ingest() {
  const supabase = createAdminClient();
  const version = process.env.FHIR_KB_VERSION ?? "chile-1.0";

  const { error: deleteError } = await supabase
    .from("fhir_knowledge")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteError) {
    console.error("Failed to clear previous chunks", deleteError.message);
    throw new Error(deleteError.message);
  }

  const chunks = await loadChunks();
  for (const [index, chunk] of chunks.entries()) {
    const embedding = await getEmbedding(chunk.content);
    const { error } = await supabase.from("fhir_knowledge").insert({
      category: chunk.metadata.category,
      content: chunk.content,
      metadata: { ...chunk.metadata, version },
      embedding: JSON.stringify(embedding),
    });
    if (error) {
      console.error("Failed to insert chunk", { index, error: error.message });
      throw new Error(error.message);
    }
  }

  console.log("Ingest completed", { count: chunks.length, version });
}

ingest().catch((err) => {
  console.error(
    "Ingest failed",
    err instanceof Error ? err.message : String(err),
  );
  process.exit(1);
});
