"use client";

import { useMemo, useState } from "react";
import type { InventoryListItem } from "@/lib/db/inventoryList";

export default function InventoryList({ items }: { items: InventoryListItem[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.brand?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term) ||
        item.barcode.toLowerCase().includes(term)
    );
  }, [items, search]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search products"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-tap w-full rounded-md border border-line bg-white px-3 text-sm"
      />

      <p className="mt-2 text-xs text-ink/50">
        {filtered.length} of {items.length} product{items.length === 1 ? "" : "s"}
      </p>

      <div className="mt-2 flex flex-col gap-2">
        {filtered.length === 0 && (
          <p className="px-1 py-4 text-center text-sm text-ink/50">No products match.</p>
        )}
        {filtered.map((item) => (
          <InventoryRow key={item.barcode} item={item} />
        ))}
      </div>
    </div>
  );
}

function InventoryRow({ item }: { item: InventoryListItem }) {
  const isOut = item.quantity <= 0;
  const isLow =
    !isOut && item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold;

  const valueColor = isOut ? "text-danger" : isLow ? "text-warn" : "text-brand";

  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="truncate text-xs text-ink/50">
            {[item.brand, item.category].filter(Boolean).join(" \u00b7 ") || "\u2014"}
          </p>
        </div>
        <span className={`shrink-0 text-sm font-medium ${valueColor}`}>
          {item.quantity} {item.unit ?? ""}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-ink/50">
        {item.locations.length > 0 ? item.locations.join(", ") : "No location set"}
      </p>
    </div>
  );
}
