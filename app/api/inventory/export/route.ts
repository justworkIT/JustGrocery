import { NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import { getActiveStore } from "@/lib/auth/getCurrentStore";
import { getStoreInventoryList } from "@/lib/db/inventoryList";

export async function GET() {
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

  const items = await getStoreInventoryList(supabase, activeStore.store_id);

  const csv = Papa.unparse(
    items.map((item) => ({
      barcode: item.barcode,
      name: item.name,
      brand: item.brand ?? "",
      category: item.category ?? "",
      unit: item.unit ?? "",
      quantity: item.quantity,
      price: item.price ?? "",
      low_stock_threshold: item.lowStockThreshold ?? "",
      locations: item.locations.join("; "),
    }))
  );

  const storeSlug = activeStore.stores.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const dateStamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-${storeSlug}-${dateStamp}.csv"`,
    },
  });
}
