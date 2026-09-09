import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { VehiclesPageData } from "./getVehiclesPageData";
import type { VehiclesSearchPageData } from "./getVehiclesSearchPageData";

type InitialRpcPayload = {
  search?: {
    vehicles?: Record<string, unknown>[];
    images?: VehiclesSearchPageData["images"];
    inspections?: {
      vehicle_id: string;
      part_code: string;
      condition: string;
    }[];
    total_count?: number | string;
  };
  user_id?: string | null;
  profile?: VehiclesPageData["profile"] | null;
  provinces?: VehiclesPageData["provinces"];
  dealerships?: VehiclesPageData["dealerships"];
  favorite_vehicle_ids?: string[];
  all_listings_count?: number;
};

export type VehiclesInitialPageData = {
  search: VehiclesSearchPageData;
  userId: string;
  profile: VehiclesPageData["profile"] | null;
  provinces: VehiclesPageData["provinces"];
  dealerships: VehiclesPageData["dealerships"];
  favoriteVehicleIds: string[];
  allListingsCount: number;
};

export const getVehiclesInitialPageData = cache(
  async (
    supabase: SupabaseClient,
  ): Promise<VehiclesInitialPageData> => {
    const rpcStart = performance.now();

    const { data, error } = await supabase.rpc(
      "get_vehicles_initial_page_data",
      {
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
        p_limit: 12,
        p_offset: 0,
        p_chassis_condition: null,
        p_body_condition: null,
        p_origin: null,
        p_fuel_type: null,
        p_transmission: null,
      },
    );

    const rpcMs = performance.now() - rpcStart;

    console.log(
      `[DATA_TIMING] getVehiclesInitialPageData rpc=${rpcMs.toFixed(1)}ms`,
    );

    if (error) {
      throw new Error(
        `Failed to load vehicles initial page data: ${error.message}`,
      );
    }

    const payload = (data ?? {}) as InitialRpcPayload;
    const searchPayload = payload.search ?? {};

    const vehicles = Array.isArray(searchPayload.vehicles)
      ? searchPayload.vehicles
      : [];

    const images = Array.isArray(searchPayload.images)
      ? searchPayload.images
      : [];

    const inspections = Array.isArray(searchPayload.inspections)
      ? searchPayload.inspections
      : [];

    const firstImageByVehicle = new Map<string, string>();

    for (const image of images) {
      if (!firstImageByVehicle.has(image.vehicle_id)) {
        const { data: publicUrlData } = supabase.storage
          .from("vehicle-images")
          .getPublicUrl(
            image.thumbnail_path || image.storage_path,
          );

        firstImageByVehicle.set(
          image.vehicle_id,
          publicUrlData.publicUrl,
        );
      }
    }

    const BODY_CODES = new Set([
      "hood",
      "front_left_fender",
      "front_right_fender",
      "rear_left_fender",
      "rear_right_fender",
      "front_left_door",
      "front_right_door",
      "rear_left_door",
      "rear_right_door",
      "trunk",
      "roof",
      "front_bumper",
      "rear_bumper",
    ]);

    const STRUCTURE_CODES = new Set([
      "front_left_chassis",
      "front_right_chassis",
      "rear_left_chassis",
      "rear_right_chassis",
      "front_left_pillar",
      "front_right_pillar",
      "rear_left_pillar",
      "rear_right_pillar",
      "floor",
      "roof_structure",
    ]);

    const inspectionSummaries: VehiclesSearchPageData["inspectionSummaries"] =
      {};

    for (const vehicle of vehicles) {
      const vehicleId = String(vehicle.id);

      inspectionSummaries[vehicleId] = {
        affectedCount: 0,
        bodyAffectedCount: 0,
        structureAffectedCount: 0,
        conditionCounts: {},
      };
    }

    for (const inspection of inspections) {
      if (inspection.condition === "intact") {
        continue;
      }

      const summary = inspectionSummaries[inspection.vehicle_id];

      if (!summary) {
        continue;
      }

      summary.affectedCount += 1;

      summary.conditionCounts[inspection.condition] =
        (summary.conditionCounts[inspection.condition] || 0) + 1;

      if (BODY_CODES.has(inspection.part_code)) {
        summary.bodyAffectedCount += 1;
      }

      if (STRUCTURE_CODES.has(inspection.part_code)) {
        summary.structureAffectedCount += 1;
      }
    }

    const vehiclesWithImages = vehicles.map((vehicle) => ({
      ...vehicle,
      image_url:
        firstImageByVehicle.get(String(vehicle.id)) ?? null,
    }));

    const userId = payload.user_id;

    if (!userId) {
      throw new Error("User is not authenticated.");
    }

    return {
      search: {
        vehicles: vehiclesWithImages,
        images,
        inspectionSummaries,
        totalCount: Number(searchPayload.total_count ?? 0),
      },
      userId,
      profile: payload.profile ?? null,
      provinces: payload.provinces ?? [],
      dealerships: payload.dealerships ?? [],
      favoriteVehicleIds: payload.favorite_vehicle_ids ?? [],
      allListingsCount:
        typeof payload.all_listings_count === "number"
          ? payload.all_listings_count
          : 0,
    };
  },
);
