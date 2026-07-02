"use client";

import { Check, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CHILE_LOINC_SUBSET,
  searchLoinc,
} from "@/services/fhir-rag/loinc-subset";

interface LoincSelectorProps {
  value: string | null;
  onChange: (code: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  noMatchesLabel?: string;
  clearLabel?: string;
}

export function LoincSelector({
  value,
  onChange,
  placeholder = "Buscar código LOINC…",
  disabled,
  noMatchesLabel = "Sin coincidencias",
  clearLabel = "Limpiar LOINC",
}: LoincSelectorProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => CHILE_LOINC_SUBSET.find((e) => e.code === value) ?? null,
    [value],
  );

  const results = useMemo(() => searchLoinc(query, 6), [query]);

  return (
    <div className="relative">
      {selected ? (
        <div className="neu-pressed flex items-center justify-between rounded-lg px-3 py-1.5 text-xs">
          <div className="min-w-0">
            <span className="font-semibold text-slate-700">
              {selected.code}
            </span>
            <span className="ml-2 text-slate-500 truncate">
              {selected.spanishDisplay}
            </span>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 disabled:opacity-50"
            aria-label={clearLabel}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
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
            className="neu-pressed w-full rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400"
          />
          {open && !disabled && (
            <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto neu-surface rounded-lg shadow-sm border border-slate-200">
              {results.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500">
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
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">
                        {entry.code}
                      </span>
                      {value === entry.code && (
                        <Check className="h-3 w-3 text-sky-600" />
                      )}
                    </div>
                    <div className="text-slate-500 truncate">
                      {entry.spanishDisplay}
                    </div>
                    <div className="text-slate-400 text-[10px] truncate">
                      {entry.display}
                    </div>
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
