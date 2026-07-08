"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";
import ProductCard from "@/components/ProductCard";

type LookupState =
  | { status: "scanning" }
  | { status: "loading"; barcode: string }
  | { status: "found"; barcode: string; product: any; inventory: any }
  | { status: "not-found"; barcode: string }
  | { status: "error"; message: string };

export default function ScanEntryPage() {
  const router = useRouter();
  const [state, setState] = useState<LookupState>({ status: "scanning" });

  async function handleDetected(barcode: string) {
    setState({ status: "loading", barcode });

    try {
      const res = await fetch(`/api/products/${encodeURIComponent(barcode)}`);

      if (res.status === 404) {
        setState({ status: "not-found", barcode });
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({
          status: "error",
          message: body.error ?? "Something went wrong looking that up.",
        });
        return;
      }

      const body = await res.json();
      setState({
        status: "found",
        barcode,
        product: body.product,
        inventory: body.inventory,
      });
    } catch {
      setState({
        status: "error",
        message: "Couldn't reach the server. Check your connection.",
      });
    }
  }

  function scanAgain() {
    setState({ status: "scanning" });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <h1 className="text-lg font-semibold">Scan barcode</h1>

      {state.status === "scanning" && (
        <div className="mt-4">
          <BarcodeScanner onDetected={handleDetected} />
          <p className="mt-3 text-center text-sm text-ink/60">
            Point the camera at a barcode.
          </p>
        </div>
      )}

      {state.status === "loading" && (
        <div className="mt-4 flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-ink/5">
          <p className="text-sm text-ink/60">
            Looking up {state.barcode}
            {"\u2026"}
          </p>
        </div>
      )}

      {state.status === "found" && (
        <div className="mt-4">
          <ProductCard
            name={state.product.name}
            brand={state.product.brand}
            unit={state.product.unit}
            imageUrl={state.product.image_url}
            quantity={state.inventory.quantity}
            price={state.inventory.price}
            lowStockThreshold={state.inventory.low_stock_threshold}
          />
          <button
            onClick={scanAgain}
            className="mt-4 h-tap w-full rounded-md border border-line bg-white text-base font-medium"
          >
            Scan another
          </button>
        </div>
      )}

      {state.status === "not-found" && (
        <div className="mt-4 rounded-lg border border-line bg-white p-4">
          <p className="text-base font-medium">Not in the catalog yet</p>
          <p className="mt-1 text-sm text-ink/60">
            Barcode {state.barcode} isn&apos;t in JustGrocery. Add it now.
          </p>
          <button
            onClick={() =>
              router.push(`/add-entry/manual?barcode=${encodeURIComponent(state.barcode)}`)
            }
            className="mt-4 h-tap w-full rounded-md bg-brand text-base font-medium text-white"
          >
            Add this product
          </button>
          <button
            onClick={scanAgain}
            className="mt-2 h-tap w-full rounded-md border border-line bg-white text-base font-medium"
          >
            Scan another instead
          </button>
        </div>
      )}

      {state.status === "error" && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">{state.message}</p>
          <button
            onClick={scanAgain}
            className="mt-4 h-tap w-full rounded-md border border-line bg-white text-base font-medium"
          >
            Try again
          </button>
        </div>
      )}
    </main>
  );
}
