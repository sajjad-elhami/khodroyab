import { cache } from "react";
import pool from "@/lib/db";
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

function getVehicleImageUrl(path: string | null) {
  if (!path) return null;

  const configuredBase =
    process.env.VEHICLE_IMAGE_BASE_URL ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/vehicle-images`
      : "");

  if (!configuredBase) return null;

  return `${configuredBase.replace(/\/$/, "")}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export const getVehiclesSearchPageData = cache(
  async (
    params: SearchVehiclesParams,
  ): Promise<VehiclesSearchPageData> => {
    const start = performance.now();

    const values = [
      params.search || null,
      params.brand || null,
      params.model || null,
      params.yearFrom ?? null,
      params.yearTo ?? null,
      params.priceFrom ?? null,
      params.priceTo ?? null,
      params.mileageFrom ?? null,
      params.mileageTo ?? null,
      params.color || null,
      params.status || null,
      params.provinceId || null,
      params.cityIds ?? [],
      params.dealershipId || null,
      params.sort ?? "newest",
      params.limit,
      params.offset,
      params.chassisCondition || null,
      params.bodyCondition || null,
      params.origin || null,
      params.fuelType || null,
      params.transmission || null,
    ];

    const { rows: vehicles } = await pool.query(
      `SELECT * FROM public.search_vehicles_multi(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
        $12,$13,$14,$15,$16,$17,$18,$19,$20,$21
      )`,
      values,
    );

    const vehicleIds = vehicles.map((vehicle) => String(vehicle.id));

    let images: VehicleSearchImage[] = [];
    let inspections: VehicleInspectionRow[] = [];

    if (vehicleIds.length > 0) {
      const [imageResult, inspectionResult] = await Promise.all([
        pool.query(
          `SELECT vehicle_id, storage_path, thumbnail_path, sort_order
           FROM public.vehicle_images
           WHERE vehicle_id = ANY($1::uuid[])
           ORDER BY vehicle_id, sort_order`,
          [vehicleIds],
        ),
        pool.query(
          `SELECT vehicle_id, part_code, condition
           FROM public.vehicle_body_inspections
           WHERE vehicle_id = ANY($1::uuid[])
           ORDER BY vehicle_id, part_code`,
          [vehicleIds],
        ),
      ]);

      images = imageResult.rows as VehicleSearchImage[];
      inspections = inspectionResult.rows as VehicleInspectionRow[];
    }

    const firstImageByVehicle = new Map<string, string>();

    for (const image of images) {
      if (!firstImageByVehicle.has(image.vehicle_id)) {
        const imageUrl = getVehicleImageUrl(
          image.thumbnail_path || image.storage_path,
        );

        if (imageUrl) {
          firstImageByVehicle.set(image.vehicle_id, imageUrl);
        }
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
      if (inspection.condition === "intact") continue;

      const summary = inspectionSummaries[inspection.vehicle_id];
      if (!summary) continue;

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

    const totalCount = Number(vehicles[0]?.total_count ?? 0);
    const totalMs = performance.now() - start;

    console.log(
      `[DATA_TIMING] getVehiclesSearchPageData direct-db=${totalMs.toFixed(1)}ms vehicles=${vehicles.length} images=${images.length} inspections=${inspections.length}`,
    );

    return {
      vehicles: vehiclesWithImages,
      images,
      inspectionSummaries,
      totalCount,
    };
  },
);
