"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyDealershipPageData } from "@/lib/data/dealerships/getMyDealershipPageData";

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    throw new Error("کاربر وارد سیستم نشده است.");
  }

  return { supabase, userId };
}

export async function updateInventoryVehicleAction(vehicleId: string) {
  try {
    const { supabase, userId } = await getCurrentUser();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, dealership_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const isAdmin = profile?.role === "admin";
    const dealershipId = profile?.dealership_id;

    let query = supabase
      .from("vehicles")
      .update({ inventory_confirmed_at: new Date().toISOString() })
      .eq("id", vehicleId);

    if (!isAdmin) {
      if (!dealershipId) {
        return { ok: false as const, error: "نمایشگاه کاربر مشخص نیست." };
      }
      query = query.eq("dealership_id", dealershipId);
    }

    const { error } = await query;
    if (error) throw error;

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "خطا در بروزرسانی موجودی خودرو.",
    };
  }
}

export async function markInventoryVehicleSoldAction(vehicleId: string) {
  try {
    const { supabase, userId } = await getCurrentUser();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, dealership_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const isAdmin = profile?.role === "admin";
    const dealershipId = profile?.dealership_id;

    let query = supabase
      .from("vehicles")
      .update({ status: "sold", inventory_confirmed_at: new Date().toISOString() })
      .eq("id", vehicleId);

    if (!isAdmin) {
      if (!dealershipId) {
        return { ok: false as const, error: "نمایشگاه کاربر مشخص نیست." };
      }
      query = query.eq("dealership_id", dealershipId);
    }

    const { error } = await query;
    if (error) throw error;

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "خطا در ثبت فروش خودرو.",
    };
  }
}

export async function loadMyDealershipInventoryAction(
  offset: number,
  limit = 30,
) {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return {
      ok: false as const,
      error: "کاربر وارد سیستم نشده است.",
    };
  }

  const safeOffset = Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 30;

  try {
    const data = await getMyDealershipPageData(
      supabase,
      safeLimit,
      safeOffset,
    );

    return { ok: true as const, data };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "خطا در دریافت موجودی نمایشگاه.",
    };
  }
}
