type Props = {
  name: string;
  brand: string | null;
  unit: string | null;
  imageUrl: string | null;
  quantity: number;
  price: number | null;
  lowStockThreshold: number | null;
};

export default function ProductCard({
  name,
  brand,
  unit,
  imageUrl,
  quantity,
  price,
  lowStockThreshold,
}: Props) {
  const isLow =
    lowStockThreshold != null && quantity <= lowStockThreshold && quantity > 0;
  const isOut = quantity <= 0;

  const stockLabel = isOut ? "Out of stock" : isLow ? "Low stock" : "In stock";
  const stockColor = isOut ? "text-danger" : isLow ? "text-warn" : "text-brand";

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex gap-4">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="h-20 w-20 shrink-0 rounded-md bg-ink/5" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{name}</p>
          {brand && <p className="truncate text-sm text-ink/60">{brand}</p>}
          <p className={`mt-2 text-sm font-medium ${stockColor}`}>
            {stockLabel} {"\u00b7"} {quantity} {unit ?? "units"}
          </p>
        </div>
      </div>
      {price != null && (
        <p className="mt-3 text-sm text-ink/70">Price: {"\u20b1"}{price.toFixed(2)}</p>
      )}
    </div>
  );
}
