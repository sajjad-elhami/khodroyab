"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getDealershipsByCity,
} from "@/lib/data/dealerships/getDealershipsByCity";

export async function getDealershipsByCityAction(cityId: string) {
  return getDealershipsByCity(cityId);
}

export type VehicleInventoryStatus = "available" | "sold";

export async function updateVehicleStatusAction(
  vehicleId: string,
  dealershipId: string,
  status: VehicleInventoryStatus,
) {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return { ok: false as const, error: "کاربر وارد سیستم نشده است." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("dealership_id, role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { ok: false as const, error: "اطلاعات حساب کاربری دریافت نشد." };
  }

  const isAdmin = profile.role === "admin";
  const canAccessDealership =
    isAdmin || profile.dealership_id === dealershipId;

  if (!canAccessDealership) {
    return {
      ok: false as const,
      error: "شما اجازه تغییر وضعیت خودروهای این نمایشگاه را ندارید.",
    };
  }

  const { error } = await supabase
    .from("vehicles")
    .update({ status })
    .eq("id", vehicleId)
    .eq("dealership_id", dealershipId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
