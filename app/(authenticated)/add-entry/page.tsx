import Link from "next/link";

const METHODS = [
  {
    href: "/add-entry/scan",
    title: "Scan barcode",
    description: "Use your camera",
  },
  {
    href: "/add-entry/manual",
    title: "Manual entry",
    description: "Type in product details",
  },
  {
    href: "/add-entry/csv",
    title: "Upload CSV",
    description: "Bulk import entries",
  },
];

export default function AddEntryPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <h1 className="text-lg font-semibold">Add entry</h1>
      <div className="mt-4 flex flex-col gap-3">
        {METHODS.map((method) => (
          <Link
            key={method.href}
            href={method.href}
            className="rounded-lg border border-line bg-white p-4"
          >
            <p className="text-base font-medium">{method.title}</p>
            <p className="mt-1 text-sm text-ink/60">{method.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
