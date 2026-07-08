import { SupabaseClient } from "@supabase/supabase-js";

export type InventoryListItem = {
  barcode: string;
  name: string;
  brand: string | null;
  unit: string | null;
  category: string | null;
  quantity: number;
  price: number | null;
  lowStockThreshold: number | null;
  locations: string[];
};

/**
 * Combines store_inventory (quantity/price/threshold) with the distinct
 * locations currently holding stock (from inventory_batches). Used by
 * both the Inventory screen and the CSV export so they never drift.
 */
export async function getStoreInventoryList(
  supabase: SupabaseClient,
  storeId: string
): Promise<InventoryListItem[]> {
  const [inventoryRes, batchesRes] = await Promise.all([
    supabase
      .from("store_inventory")
      .select(
        "barcode, quantity, price, low_stock_threshold, products(name, brand, unit, categories(name))"
      )
      .eq("store_id", storeId),
    supabase
      .from("inventory_batches")
      .select("barcode, location")
      .eq("store_id", storeId)
      .gt("quantity", 0)
      .not("location", "is", null),
  ]);

  const inventory = inventoryRes.data ?? [];
  const batches = batchesRes.data ?? [];

  const locationsByBarcode = new Map<string, Set<string>>();
  for (const batch of batches) {
    if (!batch.location) continue;
    const set = locationsByBarcode.get(batch.barcode) ?? new Set<string>();
    set.add(batch.location);
    locationsByBarcode.set(batch.barcode, set);
  }

  const items: InventoryListItem[] = inventory.map((row) => {
    const product = row.products as any;
    return {
      barcode: row.barcode,
      name: product?.name ?? row.barcode,
      brand: product?.brand ?? null,
      unit: product?.unit ?? null,
      category: product?.categories?.name ?? null,
      quantity: Number(row.quantity),
      price: row.price,
      lowStockThreshold: row.low_stock_threshold,
      locations: Array.from(locationsByBarcode.get(row.barcode) ?? []),
    };
  });

  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}
