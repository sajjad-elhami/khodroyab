"use server";

import { getVehiclesSearchPageData } from "@/lib/data/vehicles/getVehiclesSearchPageData";
import type { SearchVehiclesParams } from "@/lib/data/vehicles/searchVehicles";

export async function searchVehiclesAction(
  params: SearchVehiclesParams,
) {
  const start = performance.now();

  const result = await getVehiclesSearchPageData(params);

  const ms = performance.now() - start;

  console.log(
    `[ACTION_TIMING] searchVehiclesAction direct-db total=${ms.toFixed(1)}ms`,
  );

  return result;
}
