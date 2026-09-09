import { createClient } from "@/lib/supabase/server";

export type SearchVehiclesParams = {
  search?: string | null;
  brand?: string | null;
  model?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  mileageFrom?: number | null;
  mileageTo?: number | null;
  color?: string | null;
  status?: string | null;
  chassisCondition?: string | null;
  bodyCondition?: string | null;
  origin?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  provinceId?: string | null;
  cityIds?: string[];
  dealershipId?: string | null;
  sort?: string;
  limit: number;
  offset: number;
};

export type SearchVehicleRow = {
  id: string;
  dealership_id: string | null;
  brand: string | null;
  model: string | null;
  trim: string | null;
  model_year: number | null;
  mileage: number | null;
  color: string | null;
  price: number | null;
  status: string | null;
  created_at: string;
  total_count: number;
  [key: string]: unknown;
};

function nullable(value: string | null | undefined) {
  return value || null;
}

export async function searchVehicles(
  params: SearchVehiclesParams,
): Promise<SearchVehicleRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "search_vehicles_multi",
    {
      p_search: nullable(params.search),
      p_brand: nullable(params.brand),
      p_model: nullable(params.model),

      p_year_from: params.yearFrom ?? null,
      p_year_to: params.yearTo ?? null,

      p_price_from: params.priceFrom ?? null,
      p_price_to: params.priceTo ?? null,

      p_mileage_from: params.mileageFrom ?? null,
      p_mileage_to: params.mileageTo ?? null,

      p_color: nullable(params.color),

      p_status: nullable(params.status),

      p_chassis_condition: nullable(
        params.chassisCondition,
      ),

      p_body_condition: nullable(
        params.bodyCondition,
      ),

      p_origin: nullable(params.origin),
      p_fuel_type: nullable(params.fuelType),
      p_transmission: nullable(params.transmission),

      p_province_id: nullable(params.provinceId),
      p_city_ids: params.cityIds ?? [],

      p_dealership_id: nullable(
        params.dealershipId,
      ),

      p_sort: params.sort ?? "newest",

      p_limit: params.limit,
      p_offset: params.offset,
    },
  );

  if (error) {
    throw new Error(
      `Failed to search vehicles: ${error.message}`,
    );
  }

  return (data ?? []) as SearchVehicleRow[];
}
