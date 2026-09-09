"use server";

import { createClient } from "@/lib/supabase/server";
import { getVehiclesSearchPageData } from "@/lib/data/vehicles/getVehiclesSearchPageData";
import type { SearchVehiclesParams } from "@/lib/data/vehicles/searchVehicles";

export async function searchVehiclesAction(
  params: SearchVehiclesParams,
) {
  const supabase = await createClient();

  const start = performance.now();

  const result = await getVehiclesSearchPageData(supabase, params);

  const ms = performance.now() - start;

  console.log(
    `[ACTION_TIMING] searchVehiclesAction total=${ms.toFixed(1)}ms`
  );

  return result;
}

