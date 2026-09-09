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

export type DashboardData = {
  current_user_id: string | null;
  vehicles: DashboardVehicle[];
  images: DashboardImage[];
  favorite_vehicle_ids: string[];
};

/**
 * Server-side Dashboard Data Access Layer.
 *
 * Important:
 * - Uses the authenticated Supabase server client.
 * - Keeps user-specific favorites scoped to the current auth context.
 * - Uses React request-level memoization to avoid duplicate calls
 *   during the same server render.
 * - Does not introduce a shared cross-user cache.
 */
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

    const payload = (data ?? {}) as Partial<DashboardData>;

    return {
      current_user_id:
        typeof payload.current_user_id === "string"
          ? payload.current_user_id
          : null,
      vehicles: Array.isArray(payload.vehicles)
        ? payload.vehicles
        : [],
      images: Array.isArray(payload.images)
        ? payload.images
        : [],
      favorite_vehicle_ids: Array.isArray(payload.favorite_vehicle_ids)
        ? payload.favorite_vehicle_ids
        : [],
    };
  },
);
