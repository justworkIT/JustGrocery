// Supabase Edge Function: barcode-lookup
// Proxies Open Food Facts so the client never talks to a third party
// directly, keeps the response shape stable, and lets us swap providers
// later without touching the frontend.
//
// Deploy with: supabase functions deploy barcode-lookup

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product";

type NormalizedProduct = {
  barcode: string;
  name: string | null;
  brand: string | null;
  category: string | null;
  unit: string | null;
  image_url: string | null;
};

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let barcode: string | null = null;
  try {
    const body = await req.json();
    barcode = body.barcode;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!barcode) {
    return new Response(JSON.stringify({ error: "barcode is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const offRes = await fetch(
      `${OFF_BASE}/${encodeURIComponent(barcode)}.json`,
      { headers: { "User-Agent": "JustGrocery/1.0 (inventory app)" } }
    );

    if (!offRes.ok) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await offRes.json();

    if (data.status !== 1 || !data.product) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = data.product;
    const normalized: NormalizedProduct = {
      barcode,
      name: p.product_name || p.product_name_en || null,
      brand: p.brands || null,
      category: p.categories?.split(",")[0]?.trim() || null,
      unit: p.quantity || null,
      image_url: p.image_front_url || p.image_url || null,
    };

    return new Response(JSON.stringify({ found: true, product: normalized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ found: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
