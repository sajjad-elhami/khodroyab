import type { SupabaseClient } from "@supabase/supabase-js";

type FavoritesPageRpcVehicle = {
  id: string;
  brand: string;
  model: string;
  trim: string | null;
  model_year: number | null;
  mileage: number | null;
  color: string | null;
  price: number | null;
  status: string;
  created_at: string;
  image_path: string | null;
};

type FavoritesPageRpcPayload = {
  vehicles?: FavoritesPageRpcVehicle[];
};

export type FavoritesPageVehicle = {
  id: string;
  brand: string;
  model: string;
  trim: string | null;
  model_year: number | null;
  mileage: number | null;
  color: string | null;
  price: number | null;
  status: string;
  created_at: string;
  image_url: string | null;
};

export type FavoritesPageData = {
  vehicles: FavoritesPageVehicle[];
};

export async function getFavoritesPageData(supabase: SupabaseClient): Promise<FavoritesPageData> {

  const { data, error } = await supabase.rpc("get_favorites_page_data");

  if (error) {
    throw new Error(
      `Failed to load favorites page data: ${error.message}`
    );
  }

  const payload = (data ?? {}) as FavoritesPageRpcPayload;

  const vehicles = Array.isArray(payload.vehicles)
    ? payload.vehicles.map((vehicle) => {
        let imageUrl: string | null = null;

        if (vehicle.image_path) {
          const { data: publicUrlData } = supabase.storage
            .from("vehicle-images")
            .getPublicUrl(vehicle.image_path);

          imageUrl = publicUrlData.publicUrl;
        }

        return {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          trim: vehicle.trim,
          model_year: vehicle.model_year,
          mileage: vehicle.mileage,
          color: vehicle.color,
          price: vehicle.price,
          status: vehicle.status,
          created_at: vehicle.created_at,
          image_url: imageUrl,
        };
      })
    : [];

  return {
    vehicles,
  };
}
