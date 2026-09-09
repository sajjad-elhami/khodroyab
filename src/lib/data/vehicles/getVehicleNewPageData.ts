import type { SupabaseClient } from "@supabase/supabase-js";

export type NewVehicleProfile = {
  id: string;
  dealership_id: string | null;
  role: string | null;
};

export type NewVehicleDealership = {
  id: string;
  name: string;
  is_active: boolean;
};

export type NewVehicleBrand = {
  id: string;
  name_fa: string;
  name_en: string | null;
  slug: string;
};

export type NewVehicleBodyPart = {
  code: string;
  name_fa: string;
  section: string | null;
  position: string | null;
  display_order: number | null;
  is_active: boolean;
};

export type NewVehiclePageData = {
  profile: NewVehicleProfile | null;
  isAdmin: boolean;
  dealerships: NewVehicleDealership[];
  brands: NewVehicleBrand[];
  bodyParts: NewVehicleBodyPart[];
  initialDealershipId: string | null;
};

type RpcPayload = {
  profile?: NewVehicleProfile | null;
  is_admin?: boolean;
  dealerships?: NewVehicleDealership[];
  brands?: NewVehicleBrand[];
  body_parts?: NewVehicleBodyPart[];
  initial_dealership_id?: string | null;
};

export async function getVehicleNewPageData(
  supabase: SupabaseClient,
  requestedDealershipId: string | null = null,
): Promise<NewVehiclePageData> {

  const rpcStart = performance.now();

  const { data, error } = await supabase.rpc(
    "get_vehicle_new_page_data",
    {
      p_requested_dealership_id: requestedDealershipId,
    },
  );

  const rpcMs = performance.now() - rpcStart;
  console.log(
    `[RPC_TIMING] get_vehicle_new_page_data rpc=${rpcMs.toFixed(1)}ms`,
  );

  if (error) {
    throw new Error(
      `Failed to load vehicle new page data: ${error.message}`,
    );
  }

  const payload = (data ?? {}) as RpcPayload;

  return {
    profile: payload.profile ?? null,
    isAdmin: Boolean(payload.is_admin),
    dealerships: Array.isArray(payload.dealerships)
      ? payload.dealerships
      : [],
    brands: Array.isArray(payload.brands)
      ? payload.brands
      : [],
    bodyParts: Array.isArray(payload.body_parts)
      ? payload.body_parts
      : [],
    initialDealershipId:
      payload.initial_dealership_id ?? null,
  };
}
