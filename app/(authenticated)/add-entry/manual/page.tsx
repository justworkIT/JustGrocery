"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FormState = {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  imageUrl: string;
  quantity: string;
  price: string;
  lowStockThreshold: string;
  location: string;
  expiryDate: string;
};

function emptyForm(barcode: string): FormState {
  return {
    barcode,
    name: "",
    brand: "",
    category: "",
    unit: "",
    imageUrl: "",
    quantity: "0",
    price: "",
    lowStockThreshold: "0",
    location: "",
    expiryDate: "",
  };
}

export default function ManualEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBarcode = searchParams.get("barcode") ?? "";

  const [form, setForm] = useState<FormState>(emptyForm(initialBarcode));
  const [source, setSource] = useState<"openfoodfacts" | "manual">("manual");
  const [enriching, setEnriching] = useState(!!initialBarcode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialBarcode) return;

    const supabase = createClient();
    supabase.functions
      .invoke("barcode-lookup", { body: { barcode: initialBarcode } })
      .then(({ data, error }) => {
        if (error || !data?.found) {
          setEnriching(false);
          return;
        }
        const p = data.product;
        setForm((prev) => ({
          ...prev,
          name: p.name ?? "",
          brand: p.brand ?? "",
          category: p.category ?? "",
          unit: p.unit ?? "",
          imageUrl: p.image_url ?? "",
        }));
        setSource("openfoodfacts");
        setEnriching(false);
      })
      .catch(() => setEnriching(false));
  }, [initialBarcode]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.barcode.trim()) {
      setError("Barcode is required.");
      return;
    }
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: form.barcode.trim(),
          name: form.name.trim(),
          brand: form.brand.trim() || null,
          category: form.category.trim() || null,
          unit: form.unit.trim() || null,
          image_url: form.imageUrl.trim() || null,
          source,
          quantity: Number(form.quantity) || 0,
          price: form.price ? Number(form.price) : null,
          low_stock_threshold: Number(form.lowStockThreshold) || 0,
          location: form.location.trim() || null,
          expiry_date: form.expiryDate || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Couldn't save this entry.");
        setSubmitting(false);
        return;
      }

      router.push("/add-entry");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <h1 className="text-lg font-semibold">Manual entry</h1>

      {enriching && (
        <p className="mt-3 text-sm text-ink/60">Checking Open Food Facts{"\u2026"}</p>
      )}
      {!enriching && source === "openfoodfacts" && (
        <p className="mt-3 text-sm text-brand">
          Pre-filled from Open Food Facts. Check the details before saving.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <Field
          label="Barcode"
          required
          value={form.barcode}
          onChange={(v) => update("barcode", v)}
          disabled={!!initialBarcode}
        />
        <Field label="Name" required value={form.name} onChange={(v) => update("name", v)} />
        <Field label="Brand" value={form.brand} onChange={(v) => update("brand", v)} />
        <Field label="Category" value={form.category} onChange={(v) => update("category", v)} />
        <Field label="Unit (e.g. 500g, 1L, pc)" value={form.unit} onChange={(v) => update("unit", v)} />
        <Field
          label="Location (e.g. Aisle 004, Cold storage 2)"
          value={form.location}
          onChange={(v) => update("location", v)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Starting quantity"
            type="number"
            value={form.quantity}
            onChange={(v) => update("quantity", v)}
          />
          <Field label="Price" type="number" value={form.price} onChange={(v) => update("price", v)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Low stock threshold"
            type="number"
            value={form.lowStockThreshold}
            onChange={(v) => update("lowStockThreshold", v)}
          />
          <Field
            label="Expiry date"
            type="date"
            value={form.expiryDate}
            onChange={(v) => update("expiryDate", v)}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 h-tap rounded-md bg-brand text-base font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Saving\u2026" : "Save entry"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <input
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-tap w-full rounded-md border border-line bg-white px-3 text-base disabled:bg-ink/5"
      />
    </div>
  );
}
