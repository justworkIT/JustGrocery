# JustGrocery

Mobile-first online grocery inventory system. Staff scan a product barcode to
check stock at their store, or add it to the shared catalog if it's new.

## Stack

![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat&logo=supabase&logoColor=white)
![Postgres](https://img.shields.io/badge/Postgres-4169E1?style=flat&logo=postgresql&logoColor=white)
![Open Food Facts](https://img.shields.io/badge/Open_Food_Facts-339900?style=flat&logo=openfoodfacts&logoColor=white)

## Status

Milestones 1-7 of the build plan are done:

1. **Foundation** — schema, multi-store RLS, auth, store context
2. **Scan -> Found** — camera scan, barcode lookup, stock display
3. **Scan -> Not found** — Open Food Facts auto-fill + manual add form
4. **Schema v2** — batches (with location/expiry/supplier), scan_events,
   shopping_list, suppliers, stock_transfers, stock_adjustments,
   categories as a managed table instead of free text
5. **Add entry** — renamed from "Scan"; three entry methods (scan,
   manual, CSV bulk import) that all share the same underlying logic
   and log to `scan_events`
6. **Dashboard** (`/home`, the new landing page) — total items, total
   stock value, low stock count, out of stock count, expiring-soon list
   (next 7 days), low-stock list, and a current-inventory preview
7. **Inventory** (`/inventory`) — searchable product list with stock
   status coloring, batch locations, and CSV export

Not yet built: shopping list UI (Milestone 8), transfers/adjustments UI
(Milestone 9), suppliers/categories admin UI (Milestone 10), staff
management + backup/restore (Milestone 11), polish/deploy (Milestone
12). POS is a future phase entirely, out of scope for now.

**Navigation note:** the bottom nav (`components/BottomNav.tsx`) already
links to `/shopping-list` and `/more` per the approved mockup, but those
routes don't exist yet — they'll 404 until their milestones are built.
Home, Add Entry, and Inventory are live.

**Export/import asymmetry:** the Inventory export CSV isn't a mirror of
the Add Entry CSV import format. Export aggregates `locations` (plural,
semicolon-joined — a product can have stock in multiple batches/locations)
and omits `expiry_date` (batch-level, not product-level). Re-importing an
exported file won't round-trip cleanly as-is.

**Known outstanding item:** no `garyrancho@gmail.com` Supabase Auth
account has been created yet, so none of this can be tested end-to-end
in a browser. See "Setup" below for how to create one.

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

The `.env.local.example` file already points at the `JustGrocery` Supabase
project (`hhtqfxgdxpqllwvbfova`) with its public anon key filled in — that
key is safe to expose client-side, all real access control is enforced by
Row Level Security policies in the database.

## Database

Schema and RLS policies live in Supabase directly (not yet mirrored as
migration files in this repo — see `supabase/functions/` for the one Edge
Function that is tracked here). Tables:

- `stores` — store/branch records
- `staff` — one row per `auth.users` account
- `store_staff` — many-to-many staff <-> store membership, with a role
  (`owner` / `manager` / `staff`)
- `products` — shared catalog, keyed by unique `barcode` (the primary key)
- `categories` — managed category list; `products.category_id` references it
- `suppliers` — simple directory, optionally linked from a batch
- `inventory_batches` — the source of truth for stock: quantity, location,
  expiry_date, supplier, per store per barcode. A trigger keeps
  `store_inventory.quantity` in sync as the derived sum of its batches —
  don't write to that quantity column directly, add a batch instead
- `store_inventory` — per-store price, low-stock threshold, and the
  derived `quantity` described above
- `scan_events` — every barcode lookup/add attempt, for the scan monitor
- `shopping_list` — low-stock items (auto or manually added)
- `stock_transfers` — moving a batch from one store to another
- `stock_adjustments` — manual stock corrections with a reason code

Staff can only read/write store-scoped data (`store_inventory`,
`inventory_batches`, `scan_events`, `shopping_list`, `stock_adjustments`)
for stores they belong to, enforced via RLS. `stock_transfers` is visible
to staff at either the source or destination store. `products`,
`categories`, and `suppliers` are shared catalogs: any authenticated
staff member (at any store) can read and add/edit entries.

## Add entry

`/add-entry` is the hub for the three entry methods, all of which share
the same logic in `lib/db/inventory.ts` (`addEntry`) so behavior is
consistent no matter how a product gets in:

- **Scan** (`/add-entry/scan`) — camera barcode scan → lookup → if not
  found, routes to Manual entry with the barcode pre-filled
- **Manual** (`/add-entry/manual`) — full form (product details + starting
  quantity, price, location, expiry, low-stock threshold); auto-fills from
  Open Food Facts if a barcode is present
- **CSV** (`/add-entry/csv`) — bulk import. Required columns: `barcode`,
  `name`, `quantity`. Optional: `brand`, `category`, `unit`, `price`,
  `low_stock_threshold`, `location`, `expiry_date`. Unknown barcodes are
  auto-created as new products (same behavior as manual entry); existing
  barcodes get a new batch added (restock) rather than being overwritten.

Every entry — found, not-found, or added — is logged to `scan_events`.

## Known gaps / next steps

- **No staff onboarding UI yet.** Right now, adding a staff member to a
  store means inserting a `store_staff` row directly in Supabase. A
  proper invite flow is future work.
- **No store switcher UI.** `getActiveStore()` currently returns the
  first store a staff member belongs to. If someone belongs to multiple
  stores, they can't switch yet.
- **Barcode scanner needs real-device testing.** iOS Safari and Android
  Chrome handle camera constraints differently; test on both before
  shipping.
- Inventory management (manual stock adjustments, low-stock dashboard)
  and deploy/polish are Milestones 4-5, not yet built.
