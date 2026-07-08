import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveStore } from "@/lib/auth/getCurrentStore";
import { addEntry } from "@/lib/db/inventory";

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

  const result = await addEntry(supabase, activeStore.store_id, user.id, {
    barcode: body.barcode,
    name: body.name,
    brand: body.brand,
    category: body.category,
    unit: body.unit,
    imageUrl: body.image_url,
    source: body.source,
    quantity: Number(body.quantity) || 0,
    price: body.price != null ? Number(body.price) : null,
    lowStockThreshold: body.low_stock_threshold != null ? Number(body.low_stock_threshold) : null,
    location: body.location,
    expiryDate: body.expiry_date,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result, { status: 201 });
}
