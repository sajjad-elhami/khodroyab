import type { SupabaseClient } from "@supabase/supabase-js";

export type DailyInventoryGate = {
  isAdmin: boolean;
  dealershipId: string | null;
  requiresUpdate: boolean;
  totalAvailable: number;
  confirmedToday: number;
};

function getTehranTodayCutoffIso() {
  const now = new Date();
  const tehranParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = tehranParts.find((part) => part.type === "year")?.value;
  const month = tehranParts.find((part) => part.type === "month")?.value;
  const day = tehranParts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to determine Tehran date.");
  }

  // The business day starts at 07:00 Tehran time.
  return new Date(`${year}-${month}-${day}T07:00:00+03:30`).toISOString();
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
  const cutoffIso = getTehranTodayCutoffIso();
  const confirmedToday = (vehicles ?? []).filter(
    (vehicle) =>
      Boolean(vehicle.inventory_confirmed_at) &&
      new Date(vehicle.inventory_confirmed_at).getTime() >= new Date(cutoffIso).getTime(),
  ).length;

  return {
    isAdmin,
    dealershipId,
    requiresUpdate: totalAvailable > 0 && confirmedToday < totalAvailable,
    totalAvailable,
    confirmedToday,
  };
}
