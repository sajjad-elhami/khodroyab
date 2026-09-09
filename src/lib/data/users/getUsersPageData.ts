import type { SupabaseClient } from "@supabase/supabase-js";
import type { UsersPageData } from "./types";

type RpcPayload = {
  current_user_id?: string | null;
  profiles?: UsersPageData["profiles"];
  dealerships?: UsersPageData["dealerships"];
  emails?: UsersPageData["emails"];
};

export async function getUsersPageData(supabase: SupabaseClient): Promise<UsersPageData> {

  const { data, error } = await supabase.rpc("get_users_page_data");

  if (error) {
    throw new Error(`Failed to load users page data: ${error.message}`);
  }

  const payload = (data ?? {}) as RpcPayload;

  return {
    currentUserId: payload.current_user_id ?? null,
    profiles: Array.isArray(payload.profiles) ? payload.profiles : [],
    dealerships: Array.isArray(payload.dealerships)
      ? payload.dealerships
      : [],
    emails: Array.isArray(payload.emails) ? payload.emails : [],
  };
}
