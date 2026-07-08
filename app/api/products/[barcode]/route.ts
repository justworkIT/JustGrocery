import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveStore } from "@/lib/auth/getCurrentStore";
import { logScanEvent } from "@/lib/db/entries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ barcode: string }> }
) {
  const { barcode } = await params;
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

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("barcode, name, brand, unit, image_url, categories(name)")
    .eq("barcode", barcode)
    .maybeSingle();

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }

  if (!product) {
    await logScanEvent(supabase, {
      storeId: activeStore.store_id,
      staffId: user.id,
      barcode,
      productNameSnapshot: null,
      status: "not_found",
    });
    return NextResponse.json({ found: false }, { status: 404 });
  }

  const { data: inventory } = await supabase
    .from("store_inventory")
    .select("quantity, price, low_stock_threshold")
    .eq("store_id", activeStore.store_id)
    .eq("barcode", product.barcode)
    .maybeSingle();

  await logScanEvent(supabase, {
    storeId: activeStore.store_id,
    staffId: user.id,
    barcode: product.barcode,
    productNameSnapshot: product.name,
    status: "found",
  });

  return NextResponse.json({
    found: true,
    product,
    inventory: inventory ?? {
      quantity: 0,
      price: null,
      low_stock_threshold: null,
    },
  });
}
