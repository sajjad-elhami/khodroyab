import type { SupabaseClient } from "@supabase/supabase-js";

export type DealershipPageProvince = {
  id: string;
  name: string;
};

type DealershipPageRpcPayload = {
  is_admin?: boolean;
  provinces?: DealershipPageProvince[];
};

export type DealershipPageData = {
  isAdmin: boolean;
  provinces: DealershipPageProvince[];
};

export async function getDealershipPageData(supabase: SupabaseClient): Promise<DealershipPageData> {

  const { data, error } = await supabase.rpc(
    "get_dealership_page_data",
  );

  if (error) {
    throw new Error(
      `Failed to load dealership page data: ${error.message}`,
    );
  }

  const payload = (data ?? {}) as DealershipPageRpcPayload;

  return {
    isAdmin: Boolean(payload.is_admin),
    provinces: Array.isArray(payload.provinces)
      ? payload.provinces
      : [],
  };
}
