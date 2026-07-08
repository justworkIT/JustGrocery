import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Finds a category by name, creating it if it doesn't exist yet.
 * Keeps "category as free text on the form, foreign key in the DB"
 * so the UI doesn't need a separate category-management step just
 * to add a product.
 */
export async function getOrCreateCategoryId(
  supabase: SupabaseClient,
  name: string | null | undefined
): Promise<string | null> {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("name", trimmed)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("categories")
    .insert({ name: trimmed })
    .select("id")
    .single();

  // Race condition: another request created it between our check and insert.
  if (error) {
    const { data: retryFind } = await supabase
      .from("categories")
      .select("id")
      .eq("name", trimmed)
      .maybeSingle();
    if (retryFind) return retryFind.id;
    throw error;
  }

  return created.id;
}

export type ScanEventStatus = "found" | "not_found" | "added";

export async function logScanEvent(
  supabase: SupabaseClient,
  params: {
    storeId: string;
    staffId: string | null;
    barcode: string | null;
    productNameSnapshot: string | null;
    status: ScanEventStatus;
  }
) {
  await supabase.from("scan_events").insert({
    store_id: params.storeId,
    staff_id: params.staffId,
    barcode: params.barcode,
    product_name_snapshot: params.productNameSnapshot,
    status: params.status,
  });
}
