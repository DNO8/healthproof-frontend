import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type {
  LoincEntry,
  LoincSearchOptions,
  LoincSearchProvider,
} from "./types";

const DEFAULT_TIMEOUT_MS = 5000;

export class LoincApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "LoincApiError";
  }
}

function getCredentials(): { username: string; password: string } {
  const username = process.env.LOINC_API_USERNAME ?? "";
  const password = process.env.LOINC_API_PASSWORD ?? "";
  if (!username || !password) {
    throw new LoincApiError("LOINC credentials not configured");
  }
  return { username, password };
}

function encodeBasicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export class LocalLoincProvider implements LoincSearchProvider {
  constructor(private readonly subset: LoincEntry[]) {}

  search(query: string, options?: LoincSearchOptions): Promise<LoincEntry[]> {
    const limit = options?.limit ?? 8;
    const q = query.toLowerCase().trim();
    if (!q) return Promise.resolve(this.subset.slice(0, limit));

    const scored = this.subset.map((entry) => {
      const haystack =
        `${entry.code} ${entry.display} ${entry.spanishDisplay} ${entry.aliases.join(" ")} ${entry.component}`.toLowerCase();
      let score = 0;
      if (entry.code === q) score += 100;
      if (entry.component.toLowerCase().includes(q)) score += 40;
      if (entry.spanishDisplay.toLowerCase().includes(q)) score += 30;
      if (entry.display.toLowerCase().includes(q)) score += 20;
      if (entry.aliases.some((a) => a.toLowerCase().includes(q))) score += 25;
      if (haystack.includes(q)) score += 10;
      return { entry, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return Promise.resolve(
      scored
        .filter((s) => s.score > 0)
        .slice(0, limit)
        .map((s) => s.entry),
    );
  }
}

export class ApiLoincProvider implements LoincSearchProvider {
  constructor(private readonly baseUrl = env.LOINC_SEARCH_BASE_URL) {}

  async search(
    query: string,
    options?: LoincSearchOptions,
  ): Promise<LoincEntry[]> {
    if (!query.trim()) return [];
    const { username, password } = getCredentials();
    const limit = options?.limit ?? 8;
    const language = options?.language === "es" ? "Spanish" : "English";

    const url = new URL(`${this.baseUrl}/loincs`);
    url.searchParams.set("query", query);
    url.searchParams.set("rows", String(limit));
    url.searchParams.set("language", language);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: encodeBasicAuth(username, password),
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new LoincApiError(
          `LOINC API returned ${response.status}`,
          response.status,
        );
      }

      const data = (await response.json()) as unknown;
      return parseLoincSearchApiResponse(data, limit);
    } catch (err) {
      if (err instanceof LoincApiError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new LoincApiError("LOINC API timeout");
      }
      throw new LoincApiError(
        err instanceof Error ? err.message : "LOINC API request failed",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class CachedLoincProvider implements LoincSearchProvider {
  private cache = new Map<
    string,
    { entries: LoincEntry[]; expiresAt: number }
  >();

  constructor(
    private readonly provider: LoincSearchProvider,
    private readonly ttlMs = 5 * 60 * 1000,
  ) {}

  async search(
    query: string,
    options?: LoincSearchOptions,
  ): Promise<LoincEntry[]> {
    const key = `${query.toLowerCase().trim()}:${options?.language ?? "en"}:${options?.limit ?? 8}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.entries;
    }
    const entries = await this.provider.search(query, options);
    this.cache.set(key, { entries, expiresAt: Date.now() + this.ttlMs });
    return entries;
  }
}

export class CompositeLoincProvider implements LoincSearchProvider {
  constructor(private readonly providers: LoincSearchProvider[]) {}

  async search(
    query: string,
    options?: LoincSearchOptions,
  ): Promise<LoincEntry[]> {
    for (const provider of this.providers) {
      try {
        const entries = await provider.search(query, options);
        if (entries.length > 0) return entries;
      } catch (err) {
        logger.warn(
          { provider: provider.constructor.name, error: String(err) },
          "LOINC provider failed, trying next",
        );
      }
    }
    return [];
  }
}

export async function lookupLoincCode(
  code: string,
): Promise<Partial<LoincEntry> | null> {
  const { username, password } = getCredentials();
  const url = new URL(`${env.LOINC_FHIR_BASE_URL}/CodeSystem/$lookup`);
  url.searchParams.set("system", "http://loinc.org");
  url.searchParams.set("code", code);
  url.searchParams.set("property", "COMPONENT");
  url.searchParams.set("property", "SYSTEM");
  url.searchParams.set("property", "SCALE_TYP");
  url.searchParams.set("property", "METHOD_TYP");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: encodeBasicAuth(username, password),
        Accept: "application/fhir+json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new LoincApiError(`LOINC lookup returned ${response.status}`);
    }

    const data = (await response.json()) as unknown;
    return parseLoincLookupResponse(code, data);
  } catch (err) {
    if (err instanceof LoincApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new LoincApiError("LOINC lookup timeout");
    }
    throw new LoincApiError(
      err instanceof Error ? err.message : "LOINC lookup failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function parseLoincSearchApiResponse(
  data: unknown,
  limit: number,
): LoincEntry[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const results = Array.isArray(d.result)
    ? d.result
    : Array.isArray(d.results)
      ? d.results
      : [];

  return results
    .slice(0, limit)
    .map((item: unknown): LoincEntry | null => {
      if (!item || typeof item !== "object") return null;
      const i = item as Record<string, unknown>;
      const code = String(
        i.loincNumber ?? i.code ?? i.LoincNumber ?? "",
      ).trim();
      const display = String(i.longName ?? i.display ?? i.name ?? "").trim();
      const spanishDisplay = String(
        i.spanishName ?? i.spanishDisplayName ?? i.spanishName ?? display,
      ).trim();
      const component = String(i.component ?? i.COMPONENT ?? "").trim();
      const system = String(i.system ?? i.SYSTEM ?? "").trim();
      const scale = String(i.scale ?? i.SCALE_TYP ?? "").trim();
      if (!code) return null;
      return {
        code,
        display: display || code,
        spanishDisplay: spanishDisplay || display || code,
        aliases: [] as string[],
        component: component || display,
        system: system || "Unknown",
        scale: scale || "Qn",
        verified: true,
      };
    })
    .filter((entry): entry is LoincEntry => entry !== null);
}

function parseLoincLookupResponse(
  code: string,
  data: unknown,
): Partial<LoincEntry> | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const display = String(d.display ?? "").trim();
  const properties = Array.isArray(d.parameter)
    ? d.parameter
    : Array.isArray((d as { parameter?: unknown }).parameter)
      ? (d.parameter as unknown[])
      : [];

  let component = "";
  let system = "";
  let scale = "";

  for (const param of properties) {
    if (!param || typeof param !== "object") continue;
    const p = param as Record<string, unknown>;
    if (p.name === "COMPONENT") component = String(p.valueString ?? "").trim();
    if (p.name === "SYSTEM") system = String(p.valueString ?? "").trim();
    if (p.name === "SCALE_TYP") scale = String(p.valueString ?? "").trim();
  }

  if (!display && !component) return null;
  return {
    code,
    display: display || code,
    spanishDisplay: display || code,
    aliases: [],
    component: component || display,
    system: system || "Unknown",
    scale: scale || "Qn",
    verified: true,
  };
}
