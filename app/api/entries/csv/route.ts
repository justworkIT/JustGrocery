import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveStore } from "@/lib/auth/getCurrentStore";
import { addEntry, EntryInput } from "@/lib/db/inventory";

type CsvRow = {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  unit?: string;
  quantity: string | number;
  price?: string | number;
  low_stock_threshold?: string | number;
  location?: string;
  expiry_date?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const activeStore = await getActiveStore();
  if (!activeStore) {
    return NextResponse.json(
      { error: "You're not assigned to a store yet." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const rows: CsvRow[] = body.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  if (rows.length > 500) {
    return NextResponse.json(
      { error: "CSV is too large. Split it into batches of 500 rows or fewer." },
      { status: 400 }
    );
  }

  const results = [];

  for (const row of rows) {
    const input: EntryInput = {
      barcode: String(row.barcode ?? "").trim(),
      name: String(row.name ?? "").trim(),
      brand: row.brand || null,
      category: row.category || null,
      unit: row.unit || null,
      source: "manual",
      quantity: Number(row.quantity) || 0,
      price: row.price != null && row.price !== "" ? Number(row.price) : null,
      lowStockThreshold:
        row.low_stock_threshold != null && row.low_stock_threshold !== ""
          ? Number(row.low_stock_threshold)
          : null,
      location: row.location || null,
      expiryDate: row.expiry_date || null,
    };

    // Sequential, not parallel: keeps category find-or-create races from
    // happening within the same upload, and keeps error attribution
    // per-row and predictable.
    const result = await addEntry(supabase, activeStore.store_id, user.id, input);
    results.push(result);
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    total: rows.length,
    succeeded,
    failed: failed.length,
    results,
  });
}
