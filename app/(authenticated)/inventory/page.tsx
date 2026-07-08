import { createClient } from "@/lib/supabase/server";
import { getActiveStore } from "@/lib/auth/getCurrentStore";
import { getStoreInventoryList } from "@/lib/db/inventoryList";
import InventoryList from "@/components/InventoryList";

export default async function InventoryPage() {
  const activeStore = await getActiveStore();

  if (!activeStore) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
        <h1 className="text-lg font-semibold">Inventory</h1>
        <p className="mt-3 text-sm text-ink/60">
          Your account isn&apos;t assigned to a store yet.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const items = await getStoreInventoryList(supabase, activeStore.store_id);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Inventory</h1>
        <a
          href="/api/inventory/export"
          download
          className="rounded-md border border-brand px-3 py-1.5 text-xs font-medium text-brand"
        >
          Export
        </a>
      </div>

      <div className="mt-4">
        <InventoryList items={items} />
      </div>
    </main>
  );
}
