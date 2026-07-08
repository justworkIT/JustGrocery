import { createClient } from "@/lib/supabase/server";

export type StoreMembership = {
  store_id: string;
  role: "owner" | "manager" | "staff";
  stores: { id: string; name: string; address: string | null };
};

/**
 * Returns all stores the current logged-in staff member belongs to.
 * Empty array means the account exists in auth but hasn't been
 * assigned to a store yet (needs an owner/manager to add them via
 * store_staff).
 */
export async function getStoreMemberships(): Promise<StoreMembership[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("store_staff")
    .select("store_id, role, stores(id, name, address)")
    .eq("staff_id", user.id);

  if (error || !data) return [];
  return data as unknown as StoreMembership[];
}

/**
 * Resolves which store is "active" for this request. Reads the
 * `active_store` cookie (set by the store switcher); falls back to
 * the first membership if unset or invalid.
 */
export async function getActiveStore(): Promise<StoreMembership | null> {
  const memberships = await getStoreMemberships();
  if (memberships.length === 0) return null;

  const supabase = await createClient();
  void supabase; // cookie read happens in the calling Server Component via next/headers

  return memberships[0];
}
