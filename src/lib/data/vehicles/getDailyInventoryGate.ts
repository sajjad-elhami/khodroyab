import type { SupabaseClient } from "@supabase/supabase-js";

export type DailyInventoryGate = {
  isAdmin: boolean;
  dealershipId: string | null;
  requiresUpdate: boolean;
  totalAvailable: number;
  confirmedToday: number;
};

function getTehranBusinessDayCutoff() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = Number(get("hour") ?? "0");
  const minute = Number(get("minute") ?? "0");

  if (!year || !month || !day) {
    throw new Error("Unable to determine Tehran date.");
  }

  // Before 07:00 Tehran time, the previous confirmation is still valid.
  if (hour < 7 || (hour === 7 && minute < 0)) return null;

  return new Date(`${year}-${month}-${day}T07:00:00+03:30`);
}

export async function getDailyInventoryGate(
  supabase: SupabaseClient,
): Promise<DailyInventoryGate> {
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    throw new Error("User is not authenticated.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, dealership_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`);
  }

  const isAdmin = profile?.role === "admin";
  const dealershipId = profile?.dealership_id ?? null;

  if (isAdmin || !dealershipId) {
    return {
      isAdmin,
      dealershipId,
      requiresUpdate: false,
      totalAvailable: 0,
      confirmedToday: 0,
    };
  }

  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("id, inventory_confirmed_at")
    .eq("dealership_id", dealershipId)
    .eq("status", "available");

  if (vehiclesError) {
    throw new Error(`Failed to load inventory freshness: ${vehiclesError.message}`);
  }

  const totalAvailable = vehicles?.length ?? 0;
  const cutoff = getTehranBusinessDayCutoff();

  if (!cutoff) {
    return {
      isAdmin,
      dealershipId,
      requiresUpdate: false,
      totalAvailable,
      confirmedToday: totalAvailable,
    };
  }

  const cutoffMs = cutoff.getTime();
  const confirmedToday = (vehicles ?? []).filter(
    (vehicle) =>
      Boolean(vehicle.inventory_confirmed_at) &&
      new Date(vehicle.inventory_confirmed_at).getTime() >= cutoffMs,
  ).length;

  return {
    isAdmin,
    dealershipId,
    requiresUpdate: totalAvailable > 0 && confirmedToday < totalAvailable,
    totalAvailable,
    confirmedToday,
  };
}
