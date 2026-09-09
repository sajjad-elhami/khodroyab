import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

export type VehiclesPageProfile = {
  dealership_id: string | null;
  role: string | null;
};

export type VehiclesPageProvince = {
  id: string;
  name: string;
};

export type VehiclesPageDealership = {
  id: string;
  name: string;
  province_id: string;
  city_id: string;
};

export type VehiclesPageData = {
  userId: string;
  profile: VehiclesPageProfile | null;
  provinces: VehiclesPageProvince[];
  dealerships: VehiclesPageDealership[];
  favoriteVehicleIds: string[];
  allListingsCount: number;
};

type VehiclesPageRpcPayload = {
  user_id?: string | null;
  profile?: VehiclesPageProfile | null;
  provinces?: VehiclesPageProvince[];
  dealerships?: VehiclesPageDealership[];
  favorite_vehicle_ids?: string[];
  all_listings_count?: number;
};

export const getVehiclesPageData = cache(
  async (supabase: SupabaseClient, ): Promise<VehiclesPageData> => {

    const rpcStart = performance.now();

    const rpcResult = await supabase.rpc(
      "get_vehicles_page_data",
    );

    const rpcMs = performance.now() - rpcStart;

    const { data, error } = rpcResult;

    console.log(
      `[DATA_TIMING] getVehiclesPageData rpc=${rpcMs.toFixed(1)}ms`,
    );

    const rpcPayload = (data ?? {}) as Record<string, unknown>;

    if (error) {
      throw new Error(
        `Failed to load vehicles page data: ${error.message}`,
      );
    }

    const payload = (data ?? {}) as VehiclesPageRpcPayload;

    const userId = payload.user_id;

    if (!userId) {
      throw new Error("User is not authenticated.");
    }

    return {
      userId,
      profile: payload.profile ?? null,
      provinces: Array.isArray(payload.provinces)
        ? payload.provinces
        : [],
      dealerships: Array.isArray(payload.dealerships)
        ? payload.dealerships
        : [],
      favoriteVehicleIds: Array.isArray(payload.favorite_vehicle_ids)
        ? payload.favorite_vehicle_ids
        : [],
      allListingsCount:
        typeof payload.all_listings_count === "number"
          ? payload.all_listings_count
          : 0,
    };
  },
);
