import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardVehicle = {
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
  dealership_name: string | null;
  city_id: string | null;
  city_name: string | null;
  province_id: string | null;
  province_name: string | null;
};

export type DashboardImage = {
  vehicle_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  sort_order: number;
};

export type DashboardStats = {
  total_vehicle_count: number;
  available_vehicle_count: number;
  my_vehicle_count: number;
  my_available_vehicle_count: number;
  favorite_count: number;
  dealership_count: number;
  user_count: number;
};

export type DashboardData = {
  current_user_id: string | null;
  role?: string | null;
  dealership_id?: string | null;
  dealership_name?: string | null;
  vehicles: DashboardVehicle[];
  images: DashboardImage[];
  favorite_vehicle_ids: string[];
  stats: DashboardStats;
};

export const getDashboardData = cache(
  async (
    supabase: SupabaseClient,
    vehicleLimit = 20,
  ): Promise<DashboardData> => {
    const { data, error } = await supabase.rpc("get_dashboard_data", {
      p_vehicle_limit: vehicleLimit,
    });

    if (error) {
      throw new Error(`Failed to load dashboard data: ${error.message}`);
    }

    const payload = (data ?? {}) as Partial<DashboardData> & {
      stats?: Partial<DashboardStats>;
    };

    return {
      current_user_id:
        typeof payload.current_user_id === "string"
          ? payload.current_user_id
          : null,
      role: typeof payload.role === "string" ? payload.role : null,
      dealership_id:
        typeof payload.dealership_id === "string"
          ? payload.dealership_id
          : null,
      dealership_name:
        typeof payload.dealership_name === "string"
          ? payload.dealership_name
          : null,
      vehicles: Array.isArray(payload.vehicles) ? payload.vehicles : [],
      images: Array.isArray(payload.images) ? payload.images : [],
      favorite_vehicle_ids: Array.isArray(payload.favorite_vehicle_ids)
        ? payload.favorite_vehicle_ids
        : [],
      stats: {
        total_vehicle_count: payload.stats?.total_vehicle_count ?? 0,
        available_vehicle_count: payload.stats?.available_vehicle_count ?? 0,
        my_vehicle_count: payload.stats?.my_vehicle_count ?? 0,
        my_available_vehicle_count:
          payload.stats?.my_available_vehicle_count ?? 0,
        favorite_count: payload.stats?.favorite_count ?? 0,
        dealership_count: payload.stats?.dealership_count ?? 0,
        user_count: payload.stats?.user_count ?? 0,
      },
    };
  },
);
