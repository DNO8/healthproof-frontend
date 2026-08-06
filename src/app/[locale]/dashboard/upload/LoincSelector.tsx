"use client";

import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CHILE_LOINC_SUBSET,
  searchLoinc,
} from "@/services/fhir-rag/loinc-subset";
import type { LoincEntry } from "@/services/loinc/types";

interface LoincSelectorProps {
  value: string | null;
  onChange: (code: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  noMatchesLabel?: string;
  clearLabel?: string;
  /** Pre-fetched suggestions to show (e.g. from AI extraction or search-loinc) */
  extraOptions?: LoincEntry[];
}

export function LoincSelector({
  value,
  onChange,
  placeholder = "Buscar código LOINC…",
  disabled,
  noMatchesLabel = "Sin coincidencias",
  clearLabel = "Limpiar LOINC",
  extraOptions = [],
}: LoincSelectorProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () =>
      extraOptions.find((e) => e.code === value) ??
      CHILE_LOINC_SUBSET.find((e) => e.code === value) ??
      null,
    [value, extraOptions],
  );

  // Merge local search results with extraOptions (extraOptions first, deduped)
  const results = useMemo(() => {
    const localResults = query.trim() ? searchLoinc(query, 6) : [];
    const merged = [...extraOptions, ...localResults].filter(
      (item, idx, self) =>
        item.code && self.findIndex((i) => i.code === item.code) === idx,
    );
    // If there's a query, also filter extraOptions by it
    if (query.trim()) {
      const q = query.toLowerCase();
      return merged.filter(
        (e) =>
          e.code.toLowerCase().includes(q) ||
          e.spanishDisplay.toLowerCase().includes(q) ||
          e.display.toLowerCase().includes(q) ||
          e.aliases.some((a) => a.toLowerCase().includes(q)),
      );
    }
    return merged.slice(0, 8);
  }, [query, extraOptions]);

  return (
    <div className="relative">
      {selected ? (
        <div className="neu-pressed flex items-center justify-between rounded-xl px-3 py-2.5 text-sm">
          <div className="min-w-0 flex items-center gap-2">
            <span className="font-semibold text-sky-700 shrink-0">
              {selected.code}
            </span>
            <span className="text-slate-600 truncate">
              {selected.spanishDisplay || selected.display}
            </span>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => { onChange(null); setQuery(""); }}
            className="ml-2 shrink-0 text-slate-400 hover:text-slate-600 disabled:opacity-50"
            aria-label={clearLabel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="neu-inset w-full rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 bg-transparent"
          />
          {open && !disabled && (
            <div className="absolute z-10 mt-1 w-full max-h-52 overflow-y-auto neu-surface rounded-xl shadow border border-slate-200">
              {results.length === 0 ? (
                <div className="px-3 py-3 text-sm text-slate-500">
                  {noMatchesLabel}
                </div>
              ) : (
                results.map((entry) => (
                  <button
                    key={entry.code}
                    type="button"
                    onClick={() => {
                      onChange(entry.code);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sky-700 shrink-0">
                        {entry.code}
                      </span>
                      {value === entry.code && (
                        <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                      )}
                    </div>
                    <div className="text-slate-600 text-sm">
                      {entry.spanishDisplay}
                    </div>
                    {entry.spanishDisplay !== entry.display && (
                      <div className="text-slate-400 text-xs truncate">
                        {entry.display}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
      {open && !disabled && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
