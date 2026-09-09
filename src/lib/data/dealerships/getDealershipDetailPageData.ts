import type { SupabaseClient } from "@supabase/supabase-js";

export type DealershipDetailVehicle = {
  id: string;
  dealership_id: string;
  brand: string;
  model: string;
  trim: string | null;
  model_year: number | null;
  mileage: number | null;
  color: string | null;
  price: number | null;
  status: string;
  created_at: string;
  dealership_name: string;
  province_name: string | null;
  city_name: string | null;
};

export type DealershipDetailPageData = {
  dealership: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    is_active: boolean;
    province_id: string | null;
    city_id: string | null;
    province_name: string | null;
    city_name: string | null;
  };
  vehicles: DealershipDetailVehicle[];
  totalCount: number;
};

type DealershipDetailRpcPayload = {
  dealership?: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    is_active: boolean;
    province_id: string | null;
    city_id: string | null;
  };
  province_name?: string | null;
  city_name?: string | null;
  vehicles?: DealershipDetailVehicle[];
  total_count?: number;
};

export async function getDealershipDetailPageData(
  supabase: SupabaseClient,
  dealershipId: string,
): Promise<DealershipDetailPageData | null> {

  const { data, error } = await supabase.rpc(
    "get_dealership_detail_page_data",
    {
      p_dealership_id: dealershipId,
    }
  );

  if (error) {
    throw new Error(
      `Failed to load dealership detail page data: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  const payload = data as DealershipDetailRpcPayload;

  if (!payload.dealership) {
    return null;
  }

  return {
    dealership: {
      ...payload.dealership,
      province_name: payload.province_name ?? null,
      city_name: payload.city_name ?? null,
    },
    vehicles: Array.isArray(payload.vehicles) ? payload.vehicles : [],
    totalCount: Number(payload.total_count ?? 0),
  };
}
