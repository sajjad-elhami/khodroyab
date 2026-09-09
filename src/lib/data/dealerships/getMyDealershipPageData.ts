import type { SupabaseClient } from "@supabase/supabase-js";

export type MyDealershipVehicle = {
  id: string;
  dealership_id: string;
  created_by: string | null;
  brand: string;
  model: string;
  trim: string | null;
  model_year: number | null;
  mileage: number | null;
  color: string | null;
  body_condition: string | null;
  chassis_condition: string | null;
  price: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  dealership_name: string | null;
  image_path: string | null;
  image_url: string | null;
};

export type MyDealershipPageData = {
  role: string | null;
  dealershipId: string | null;
  dealershipName: string | null;
  totalCount: number;
  vehicles: MyDealershipVehicle[];
};

type RpcVehicle = Omit<MyDealershipVehicle, "image_url">;

type RpcPayload = {
  role?: string | null;
  dealership_id?: string | null;
  dealership_name?: string | null;
  total_count?: number | string;
  vehicles?: RpcVehicle[];
};

export async function getMyDealershipPageData(
  supabase: SupabaseClient,
  limit = 30,
  offset = 0,
): Promise<MyDealershipPageData> {
  const { data, error } = await supabase.rpc("get_my_dealership_inventory", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    throw new Error(
      `Failed to load my dealership inventory: ${error.message}`,
    );
  }

  const payload = (data ?? {}) as RpcPayload;
  const rawVehicles = Array.isArray(payload.vehicles)
    ? payload.vehicles
    : [];

  const vehicles = rawVehicles.map((vehicle) => {
    let imageUrl: string | null = null;

    if (vehicle.image_path) {
      const { data: publicUrlData } = supabase.storage
        .from("vehicle-images")
        .getPublicUrl(vehicle.image_path);

      imageUrl = publicUrlData.publicUrl;
    }

    return {
      ...vehicle,
      image_url: imageUrl,
    };
  });

  return {
    role: payload.role ?? null,
    dealershipId: payload.dealership_id ?? null,
    dealershipName: payload.dealership_name ?? null,
    totalCount: Number(payload.total_count ?? 0),
    vehicles,
  };
}
