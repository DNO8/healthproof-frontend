import "server-only";

import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenAIClient } from "./openai-client";

export async function getEmbedding(text: string): Promise<number[]> {
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

export async function retrieveContext(
  query: string,
  filter: Record<string, unknown> = {},
  matchCount = 8,
): Promise<
  Array<{ id: string; content: string; metadata: unknown; similarity: number }>
> {
  const embedding = await getEmbedding(query);
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("match_fhir_knowledge", {
    query_embedding: JSON.stringify(embedding),
    match_count: matchCount,
    filter,
  });

  if (error) {
    logger.error({ error: error.message }, "match_fhir_knowledge failed");
    throw new Error("Knowledge base query failed");
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    content: String(row.content),
    metadata: row.metadata,
    similarity: Number(row.similarity),
  }));
}

export async function retrieveContextForCategories(
  query: string,
  categories: string[],
  matchCount = 8,
): Promise<
  Array<{ id: string; content: string; metadata: unknown; similarity: number }>
> {
  const perCategory = Math.max(1, Math.floor(matchCount / categories.length));
  const results = await Promise.all(
    categories.map((category) =>
      retrieveContext(query, { category }, perCategory),
    ),
  );
  const merged = results
    .flat()
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, matchCount);
  return merged;
}
