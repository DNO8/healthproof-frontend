/**
 * Shared LOINC types (no runtime secrets).
 * Can be imported by client and server.
 */

export interface LoincEntry {
  code: string;
  display: string;
  spanishDisplay: string;
  aliases: string[];
  component: string;
  system: string;
  scale: string;
  verified?: boolean;
}

export interface LoincSearchOptions {
  limit?: number;
  language?: "es" | "en";
}

export interface LoincSearchResult {
  results: LoincEntry[];
  apiFailed?: boolean;
  fromCache?: boolean;
}

export interface LoincSearchProvider {
  search(query: string, options?: LoincSearchOptions): Promise<LoincEntry[]>;
}
