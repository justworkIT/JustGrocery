import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveStore } from "@/lib/auth/getCurrentStore";

const EXPIRING_SOON_DAYS = 7;

export default async function HomePage() {
  const activeStore = await getActiveStore();

  if (!activeStore) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
        <h1 className="text-lg font-semibold">JustGrocery</h1>
        <p className="mt-3 text-sm text-ink/60">
          Your account isn&apos;t assigned to a store yet. Ask an owner or manager
          to add you.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const storeId = activeStore.store_id;

  const [inventoryRes, expiringRes] = await Promise.all([
    supabase
      .from("store_inventory")
      .select("barcode, quantity, price, low_stock_threshold, products(name, unit)")
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("inventory_batches")
      .select("barcode, expiry_date, quantity, products(name)")
      .eq("store_id", storeId)
      .not("expiry_date", "is", null)
      .lte(
        "expiry_date",
        new Date(Date.now() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)
      )
      .gt("quantity", 0)
      .order("expiry_date", { ascending: true })
      .limit(5),
  ]);

  const inventory = inventoryRes.data ?? [];
  const expiringBatches = expiringRes.data ?? [];

  const totalItems = inventory.length;
  const totalStockValue = inventory.reduce(
    (sum, row) => sum + (row.price ?? 0) * Number(row.quantity),
    0
  );
  const lowStock = inventory.filter(
    (row) =>
      row.low_stock_threshold != null &&
      Number(row.quantity) > 0 &&
      Number(row.quantity) <= row.low_stock_threshold
  );
  const outOfStock = inventory.filter((row) => Number(row.quantity) <= 0);
  const recentInventory = inventory.slice(0, 5);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <p className="text-xs text-ink/60">{activeStore.stores.name}</p>
      <h1 className="mt-0.5 text-lg font-semibold">Good day</h1>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatCard label="Total items" value={String(totalItems)} />
        <StatCard label="Stock value" value={formatCurrency(totalStockValue)} />
        <StatCard
          label="Low stock"
          value={String(lowStock.length)}
          tone={lowStock.length > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Out of stock"
          value={String(outOfStock.length)}
          tone={outOfStock.length > 0 ? "danger" : "default"}
        />
      </div>

      <Section title="Expiring soon">
        {expiringBatches.length === 0 ? (
          <EmptyRow text="Nothing expiring in the next 7 days." />
        ) : (
          expiringBatches.map((batch, i) => (
            <ListRow
              key={i}
              label={(batch.products as any)?.name ?? batch.barcode}
              value={formatDaysUntil(batch.expiry_date!)}
              tone={isUrgent(batch.expiry_date!) ? "danger" : "warn"}
            />
          ))
        )}
      </Section>

      <Section title="Low stock">
        {lowStock.length === 0 ? (
          <EmptyRow text="Nothing is running low." />
        ) : (
          lowStock
            .slice(0, 5)
            .map((row) => (
              <ListRow
                key={row.barcode}
                label={(row.products as any)?.name ?? row.barcode}
                value={`${row.quantity} ${(row.products as any)?.unit ?? ""}`}
                tone="warn"
              />
            ))
        )}
      </Section>

      <Section title="Current inventory" action={{ href: "/inventory", label: "View all" }}>
        {recentInventory.length === 0 ? (
          <EmptyRow text="No products stocked yet. Add your first entry." />
        ) : (
          recentInventory.map((row) => (
            <ListRow
              key={row.barcode}
              label={(row.products as any)?.name ?? row.barcode}
              value={`${row.quantity} ${(row.products as any)?.unit ?? ""}`}
            />
          ))
        )}
      </Section>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "danger";
}) {
  const border = tone === "warn" ? "border-warn" : tone === "danger" ? "border-danger" : "border-line";
  const text = tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : "text-ink";

  return (
    <div className={`rounded-lg border bg-white p-3 ${border}`}>
      <p className={`text-[10px] ${tone === "default" ? "text-ink/60" : text}`}>{label}</p>
      <p className={`mt-0.5 text-lg font-medium ${text}`}>{value}</p>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-ink/70">{title}</p>
        {action && (
          <Link href={action.href} className="text-xs font-medium text-brand">
            {action.label}
          </Link>
        )}
      </div>
      <div className="mt-1.5 flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

function ListRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "danger";
}) {
  const valueColor = tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : "text-brand";
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2">
      <span className="truncate text-xs">{label}</span>
      <span className={`shrink-0 text-xs font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="px-1 py-1 text-xs text-ink/50">{text}</p>;
}

function formatCurrency(amount: number): string {
  return `\u20b1${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function isUrgent(expiryDate: string): boolean {
  const days = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );
  return days <= 2;
}

function formatDaysUntil(expiryDate: string): string {
  const days = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );
  if (days < 0) return "Expired";
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}
