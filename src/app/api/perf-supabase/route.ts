import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const claimsStart = performance.now();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claimsMs = performance.now() - claimsStart;

  const rpcStart = performance.now();
  const { data, error } = await supabase.rpc("get_vehicles_initial_page_data", {
    p_search: null,
    p_brand: null,
    p_model: null,
    p_year_from: null,
    p_year_to: null,
    p_price_from: null,
    p_price_to: null,
    p_mileage_from: null,
    p_mileage_to: null,
    p_color: null,
    p_status: "available",
    p_province_id: null,
    p_city_ids: [],
    p_dealership_id: null,
    p_sort: "newest",
    p_limit: 1,
    p_offset: 0,
    p_chassis_condition: null,
    p_body_condition: null,
    p_origin: null,
    p_fuel_type: null,
    p_transmission: null,
  });
  const rpcMs = performance.now() - rpcStart;

  return NextResponse.json({
    ok: !error && !claimsError,
    claimsMs: Number(claimsMs.toFixed(1)),
    authenticated: Boolean(claimsData?.claims?.sub),
    claimsError: claimsError?.message ?? null,
    rpcMs: Number(rpcMs.toFixed(1)),
    payloadBytes: data ? JSON.stringify(data).length : 0,
    rpcError: error?.message ?? null,
  });
}
