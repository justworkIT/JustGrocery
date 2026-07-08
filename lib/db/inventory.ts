import { SupabaseClient } from "@supabase/supabase-js";
import { getOrCreateCategoryId, logScanEvent } from "./entries";

export type EntryInput = {
  barcode: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  unit?: string | null;
  imageUrl?: string | null;
  source?: "openfoodfacts" | "manual";
  quantity: number;
  price?: number | null;
  lowStockThreshold?: number | null;
  location?: string | null;
  expiryDate?: string | null; // ISO date string, e.g. "2026-08-01"
  supplierId?: string | null;
};

export type EntryResult =
  | { ok: true; barcode: string; wasNewProduct: boolean }
  | { ok: false; barcode: string; error: string };

/**
 * Adds an entry to a store: creates the product in the shared catalog if
 * it's new (existing products are left as-is, not overwritten), adds a
 * new inventory batch, updates price/threshold if provided, and logs the
 * scan event. Used by manual entry, CSV import, and the "not found ->
 * add" flow so all three entry methods behave identically underneath.
 */
export async function addEntry(
  supabase: SupabaseClient,
  storeId: string,
  staffId: string | null,
  input: EntryInput
): Promise<EntryResult> {
  if (!input.barcode?.trim() || !input.name?.trim()) {
    return { ok: false, barcode: input.barcode, error: "barcode and name are required" };
  }

  const { data: existingProduct } = await supabase
    .from("products")
    .select("barcode")
    .eq("barcode", input.barcode)
    .maybeSingle();

  const wasNewProduct = !existingProduct;

  if (wasNewProduct) {
    const categoryId = await getOrCreateCategoryId(supabase, input.category);

    const { error: productError } = await supabase.from("products").insert({
      barcode: input.barcode,
      name: input.name,
      brand: input.brand ?? null,
      category_id: categoryId,
      unit: input.unit ?? null,
      image_url: input.imageUrl ?? null,
      source: input.source === "openfoodfacts" ? "openfoodfacts" : "manual",
    });

    if (productError) {
      return { ok: false, barcode: input.barcode, error: productError.message };
    }
  }

  const { error: batchError } = await supabase.from("inventory_batches").insert({
    store_id: storeId,
    barcode: input.barcode,
    quantity: input.quantity,
    location: input.location ?? null,
    expiry_date: input.expiryDate ?? null,
    supplier_id: input.supplierId ?? null,
  });

  if (batchError) {
    return { ok: false, barcode: input.barcode, error: batchError.message };
  }

  // The batch insert trigger already upserted store_inventory.quantity.
  // Set price/threshold on top of that if the caller provided them.
  if (input.price != null || input.lowStockThreshold != null) {
    const updates: Record<string, unknown> = {};
    if (input.price != null) updates.price = input.price;
    if (input.lowStockThreshold != null) updates.low_stock_threshold = input.lowStockThreshold;

    await supabase
      .from("store_inventory")
      .update(updates)
      .eq("store_id", storeId)
      .eq("barcode", input.barcode);
  }

  await logScanEvent(supabase, {
    storeId,
    staffId,
    barcode: input.barcode,
    productNameSnapshot: input.name,
    status: wasNewProduct ? "added" : "found",
  });

  return { ok: true, barcode: input.barcode, wasNewProduct };
}
