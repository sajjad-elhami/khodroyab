import type { SupabaseClient } from "@supabase/supabase-js";

export type VehicleDetailVehicle = {
  id: string;
  dealership_id: string;
  brand: string;
  model: string;
  trim: string | null;
  model_year: number | null;
  mileage: number | null;
  color: string | null;
  body_condition: string | null;
  chassis_condition: string | null;
  price: number | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  transmission: string | null;
  fuel_type: string | null;
  engine_condition: string | null;
  insurance_expiry_date: string | null;
  gearbox_condition: string | null;
};

export type VehicleDetailImage = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  sort_order: number;
};

export type VehicleDetailBodyPart = {
  code: string;
  name_fa: string;
  section: string | null;
  position: string | null;
  display_order: number | null;
  is_active: boolean;
};

export type VehicleDetailInspection = {
  part_code: string;
  condition: string;
  paint_thickness_microns: number | null;
  notes: string | null;
};

export type VehicleDetailProfile = {
  dealership_id: string | null;
  role: string | null;
};

export type VehicleDetailDealership = {
  phone: string | null;
  city_id: string | null;
};

export type VehicleMarketPosition = {
  vehicle_id: string;
  current_price: number | null;
  comparable_count: number;
  market_avg_price: number | null;
  market_weighted_avg_price: number | null;
  strong_comparable_count: number;
  outlier_count: number;
  comparison_scope:
    | "same_province_strict"
    | "same_province_expanded"
    | "national_strict"
    | "national_expanded"
    | "no_comparables";
  market_median_price: number | null;
  market_min_price: number | null;
  market_max_price: number | null;
  market_avg_mileage: number | null;
  percent_vs_market_avg: number | null;
  percent_vs_market_median: number | null;
  price_status:
    | "no_price"
    | "insufficient_data"
    | "below_market"
    | "above_market"
    | "at_market";
  message: string;
};

type VehicleDetailRpcPayload = {
  vehicle?: VehicleDetailVehicle | null;
  images?: VehicleDetailImage[];
  body_parts?: VehicleDetailBodyPart[];
  inspections?: VehicleDetailInspection[];
  profile?: VehicleDetailProfile | null;
  is_favorite?: boolean;
  dealership?: VehicleDetailDealership | null;
  city_name?: string | null;
  market_position?: VehicleMarketPosition | null;
};

export type VehicleDetailPageData = {
  vehicle: VehicleDetailVehicle | null;
  images: VehicleDetailImage[];
  bodyParts: VehicleDetailBodyPart[];
  bodyInspection: VehicleDetailInspection[];
  profile: VehicleDetailProfile | null;
  isFavorite: boolean;
  dealershipInfo: {
    phone: string | null;
    city: string | null;
  };
  marketPosition: VehicleMarketPosition | null;
};

export async function getVehicleDetailPageData(
  supabase: SupabaseClient,
  vehicleId: string,
): Promise<VehicleDetailPageData> {

  const { data, error } = await supabase.rpc(
    "get_vehicle_detail_page_data",
    {
      p_vehicle_id: vehicleId,
    },
  );

  if (error) {
    throw new Error(
      `Failed to load vehicle detail data: ${error.message}`,
    );
  }

  const payload =
    (data ?? {}) as VehicleDetailRpcPayload;

  return {
    vehicle: payload.vehicle ?? null,
    images: Array.isArray(payload.images)
      ? payload.images
      : [],
    bodyParts: Array.isArray(payload.body_parts)
      ? payload.body_parts
      : [],
    bodyInspection: Array.isArray(payload.inspections)
      ? payload.inspections
      : [],
    profile: payload.profile ?? null,
    isFavorite: Boolean(payload.is_favorite),
    dealershipInfo: {
      phone: payload.dealership?.phone ?? null,
      city: payload.city_name ?? null,
    },
    marketPosition: payload.market_position ?? null,
  };
}
