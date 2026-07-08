"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";

const EXPECTED_COLUMNS = [
  "barcode",
  "name",
  "brand",
  "category",
  "unit",
  "quantity",
  "price",
  "low_stock_threshold",
  "location",
  "expiry_date",
];

type ParsedRow = Record<string, string>;

type SubmitResult = {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{ ok: boolean; barcode: string; error?: string; wasNewProduct?: boolean }>;
};

export default function CsvEntryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  function handleFile(file: File) {
    setParseError(null);
    setResult(null);
    setFileName(file.name);

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (parsed) => {
        if (!parsed.data.length) {
          setParseError("This file has no rows.");
          setRows([]);
          return;
        }

        const headers = Object.keys(parsed.data[0]);
        const missing = ["barcode", "name", "quantity"].filter(
          (col) => !headers.includes(col)
        );
        if (missing.length > 0) {
          setParseError(
            `Missing required column(s): ${missing.join(", ")}. Expected columns: ${EXPECTED_COLUMNS.join(", ")}.`
          );
          setRows([]);
          return;
        }

        setRows(parsed.data);
      },
      error: (err) => setParseError(err.message),
    });
  }

  async function handleImport() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/entries/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      const body = await res.json();

      if (!res.ok) {
        setSubmitError(body.error ?? "Import failed.");
        setSubmitting(false);
        return;
      }

      setResult(body);
      setSubmitting(false);
    } catch {
      setSubmitError("Couldn't reach the server. Check your connection.");
      setSubmitting(false);
    }
  }

  function reset() {
    setRows([]);
    setFileName(null);
    setParseError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <h1 className="text-lg font-semibold">Upload CSV</h1>
      <p className="mt-1 text-sm text-ink/60">
        Required columns: barcode, name, quantity. Optional: brand, category, unit, price,
        low_stock_threshold, location, expiry_date.
      </p>

      {!result && (
        <>
          <label className="mt-4 flex h-tap items-center justify-center rounded-md border border-dashed border-line bg-white text-sm font-medium">
            {fileName ?? "Choose a CSV file"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>

          {parseError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {parseError}
            </p>
          )}

          {rows.length > 0 && !parseError && (
            <div className="mt-4">
              <p className="text-sm font-medium">
                {rows.length} row{rows.length === 1 ? "" : "s"} ready to import
              </p>
              <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-line bg-white">
                {rows.slice(0, 20).map((row, i) => (
                  <div key={i} className="border-b border-line px-3 py-2 text-xs last:border-b-0">
                    <span className="font-medium">{row.barcode}</span> — {row.name || "(no name)"}
                    {" \u00b7 "}
                    qty {row.quantity || "0"}
                  </div>
                ))}
                {rows.length > 20 && (
                  <div className="px-3 py-2 text-xs text-ink/60">
                    + {rows.length - 20} more row{rows.length - 20 === 1 ? "" : "s"}
                  </div>
                )}
              </div>

              {submitError && (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {submitError}
                </p>
              )}

              <button
                onClick={handleImport}
                disabled={submitting}
                className="mt-4 h-tap w-full rounded-md bg-brand text-base font-medium text-white disabled:opacity-60"
              >
                {submitting ? "Importing\u2026" : `Import ${rows.length} row${rows.length === 1 ? "" : "s"}`}
              </button>
            </div>
          )}
        </>
      )}

      {result && (
        <div className="mt-4 rounded-lg border border-line bg-white p-4">
          <p className="text-base font-medium">
            Imported {result.succeeded} of {result.total}
          </p>
          {result.failed > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-danger">{result.failed} row(s) failed:</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-ink/70">
                {result.results
                  .filter((r) => !r.ok)
                  .slice(0, 10)
                  .map((r, i) => (
                    <li key={i}>
                      {r.barcode || "(blank barcode)"}: {r.error}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => {
              reset();
              router.push("/add-entry");
              router.refresh();
            }}
            className="mt-4 h-tap w-full rounded-md bg-brand text-base font-medium text-white"
          >
            Done
          </button>
          <button
            onClick={reset}
            className="mt-2 h-tap w-full rounded-md border border-line bg-white text-base font-medium"
          >
            Upload another file
          </button>
        </div>
      )}
    </main>
  );
}
