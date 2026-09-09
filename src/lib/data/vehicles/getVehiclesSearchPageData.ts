import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { SearchVehiclesParams } from "./searchVehicles";

export type VehicleSearchImage = {
  vehicle_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  sort_order: number;
};

export type VehicleInspectionSummary = {
  affectedCount: number;
  bodyAffectedCount: number;
  structureAffectedCount: number;
  conditionCounts: Record<string, number>;
};

type VehicleInspectionRow = {
  vehicle_id: string;
  part_code: string;
  condition: string;
};

type VehiclesSearchRpcPayload = {
  vehicles?: Record<string, unknown>[];
  images?: VehicleSearchImage[];
  inspections?: VehicleInspectionRow[];
  total_count?: number | string;
};

export type VehiclesSearchPageData = {
  vehicles: Record<string, unknown>[];
  images: VehicleSearchImage[];
  inspectionSummaries: Record<string, VehicleInspectionSummary>;
  totalCount: number;
};

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

export const getVehiclesSearchPageData = cache(
  async (supabase: SupabaseClient, 
    params: SearchVehiclesParams,
  ): Promise<VehiclesSearchPageData> => {

    const rpcStart = performance.now();

    const { data, error } = await supabase.rpc(
      "get_vehicles_search_page_data",
      {
        p_search: params.search || null,
        p_brand: params.brand || null,
        p_model: params.model || null,

        p_year_from: params.yearFrom ?? null,
        p_year_to: params.yearTo ?? null,

        p_price_from: params.priceFrom ?? null,
        p_price_to: params.priceTo ?? null,

        p_mileage_from: params.mileageFrom ?? null,
        p_mileage_to: params.mileageTo ?? null,

        p_color: params.color || null,
        p_status: params.status || null,

        p_province_id: params.provinceId || null,
        p_city_ids: params.cityIds ?? [],
        p_dealership_id: params.dealershipId || null,

        p_sort: params.sort ?? "newest",
        p_limit: params.limit,
        p_offset: params.offset,

        p_chassis_condition:
          params.chassisCondition || null,
        p_body_condition:
          params.bodyCondition || null,
        p_origin:
          params.origin || null,
        p_fuel_type:
          params.fuelType || null,
        p_transmission:
          params.transmission || null,
      },
    );

    const rpcMs = performance.now() - rpcStart;

    console.log(
      `[DATA_TIMING] getVehiclesSearchPageData rpc=${rpcMs.toFixed(1)}ms`,
    );

    if (error) {
      throw new Error(
        `Failed to load vehicle search data: ${error.message}`,
      );
    }

    const payload =
      (data ?? {}) as VehiclesSearchRpcPayload;

    const vehicles = Array.isArray(payload.vehicles)
      ? payload.vehicles
      : [];

    const images = Array.isArray(payload.images)
      ? payload.images
      : [];

    const inspections = Array.isArray(payload.inspections)
      ? payload.inspections
      : [];

    const processingStart = performance.now();

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

    const inspectionSummaries: Record<
      string,
      VehicleInspectionSummary
    > = {};

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

      const summary =
        inspectionSummaries[inspection.vehicle_id];

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

    const processingMs = performance.now() - processingStart;

    console.log(
      `[DATA_TIMING] getVehiclesSearchPageData processing=${processingMs.toFixed(1)}ms vehicles=${vehicles.length} images=${images.length} inspections=${inspections.length}`,
    );

    return {
      vehicles: vehiclesWithImages,
      images,
      inspectionSummaries,
      totalCount: Number(payload.total_count ?? 0),
    };
  },
);
