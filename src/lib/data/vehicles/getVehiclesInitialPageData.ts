import { cache } from "react";
import type { VehiclesPageData } from "./getVehiclesPageData";
import type { VehiclesSearchPageData } from "./getVehiclesSearchPageData";
import { getVehiclesSearchPageData } from "./getVehiclesSearchPageData";
import pool from "@/lib/db";

export type VehiclesInitialPageData = {
  search: VehiclesSearchPageData;
  userId: string;
  profile: VehiclesPageData["profile"] | null;
  provinces: VehiclesPageData["provinces"];
  dealerships: VehiclesPageData["dealerships"];
  favoriteVehicleIds: string[];
  allListingsCount: number;
  inventoryGate: {
    requiresUpdate: boolean;
    totalAvailable: number;
    confirmedToday: number;
  };
};

export const getVehiclesInitialPageData = cache(
  async (): Promise<VehiclesInitialPageData> => {
    const start = performance.now();

    const [search, provincesResult, dealershipsResult, countResult] =
      await Promise.all([
        getVehiclesSearchPageData({
          search: null,
          brand: null,
          model: null,
          yearFrom: null,
          yearTo: null,
          priceFrom: null,
          priceTo: null,
          mileageFrom: null,
          mileageTo: null,
          color: null,
          status: "available",
          provinceId: null,
          cityIds: [],
          dealershipId: null,
          sort: "newest",
          limit: 12,
          offset: 0,
          chassisCondition: null,
          bodyCondition: null,
          origin: null,
          fuelType: null,
          transmission: null,
        }),
        pool.query(
          `SELECT id, name
           FROM public.provinces
           ORDER BY name`,
        ),
        pool.query(
          `SELECT id, name, province_id, city_id
           FROM public.dealerships
           WHERE is_active = true
           ORDER BY name`,
        ),
        pool.query(
          `SELECT count(*)::int AS count
           FROM public.vehicles`,
        ),
      ]);

    const totalAvailable = countResult.rows[0]?.count ?? 0;
    const totalMs = performance.now() - start;

    console.log(
      `[DATA_TIMING] getVehiclesInitialPageData direct-db=${totalMs.toFixed(1)}ms`,
    );

    return {
      search,
      userId: "",
      profile: null,
      provinces: provincesResult.rows,
      dealerships: dealershipsResult.rows,
      favoriteVehicleIds: [],
      allListingsCount: Number(totalAvailable),
      inventoryGate: {
        requiresUpdate: false,
        totalAvailable: Number(totalAvailable),
        confirmedToday: Number(totalAvailable),
      },
    };
  },
);
