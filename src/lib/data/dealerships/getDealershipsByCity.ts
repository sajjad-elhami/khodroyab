import { createClient } from "@/lib/supabase/server";

export type DealershipByCity = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  province_id: string | null;
  city_id: string | null;
  is_active: boolean;
  vehicle_count: number;
};

export async function getDealershipsByCity(
  cityId: string,
): Promise<DealershipByCity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_dealerships_by_city",
    {
      p_city_id: cityId,
    },
  );

  if (error) {
    throw new Error(
      `Failed to load dealerships by city: ${error.message}`,
    );
  }

  return Array.isArray(data) ? (data as DealershipByCity[]) : [];
}
