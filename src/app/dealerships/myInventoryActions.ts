"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyDealershipPageData } from "@/lib/data/dealerships/getMyDealershipPageData";

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

  if (hour < 7 || (hour === 7 && minute < 0)) return null;
  return new Date(`${year}-${month}-${day}T07:00:00+03:30`);
}

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) throw new Error("کاربر وارد سیستم نشده است.");
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

    if (!isAdmin && !dealershipId) {
      return { ok: false as const, error: "نمایشگاه کاربر مشخص نیست." };
    }

    const confirmedAt = new Date().toISOString();
    let query = supabase
      .from("vehicles")
      .update({ inventory_confirmed_at: confirmedAt })
      .eq("id", vehicleId);

    if (!isAdmin) {
      query = query.eq("dealership_id", dealershipId as string);
    }

    const { error } = await query;
    if (error) throw error;

    let allConfirmedToday = true;

    if (!isAdmin) {
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("inventory_confirmed_at")
        .eq("dealership_id", dealershipId as string)
        .eq("status", "available");

      if (vehiclesError) throw vehiclesError;

      const cutoff = getTehranBusinessDayCutoff();
      if (cutoff) {
        const cutoffMs = cutoff.getTime();
        allConfirmedToday = (vehicles ?? []).every(
          (vehicle) =>
            Boolean(vehicle.inventory_confirmed_at) &&
            new Date(vehicle.inventory_confirmed_at).getTime() >= cutoffMs,
        );
      }
    }

    revalidatePath("/dealerships");
    revalidatePath("/vehicles");

    return {
      ok: true as const,
      inventoryConfirmedAt: confirmedAt,
      allConfirmedToday,
    };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "خطا در بروزرسانی موجودی خودرو.",
    };
  }
}

export async function deleteInventoryVehicleAction(vehicleId: string) {
  try {
    const { supabase } = await getCurrentUser();

    const { data: images, error: imagesError } = await supabase
      .from("vehicle_images")
      .select("storage_path, thumbnail_path")
      .eq("vehicle_id", vehicleId);
    if (imagesError) throw imagesError;

    const paths = Array.from(
      new Set(
        (images ?? [])
          .flatMap((image) => [image.storage_path, image.thumbnail_path])
          .filter((path): path is string => Boolean(path)),
      ),
    );

    if (paths.length > 0) {
      const admin = createAdminClient();
      const { error: storageError } = await admin.storage
        .from("vehicle-images")
        .remove(paths);
      if (storageError) throw storageError;
    }

    const { error } = await supabase.rpc("delete_vehicle_completely", {
      p_vehicle_id: vehicleId,
    });
    if (error) throw error;

    revalidatePath("/dealerships");
    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${vehicleId}`);

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "خطا در حذف کامل خودرو.",
    };
  }
}

export async function markInventoryVehicleSoldAction(vehicleId: string) {
  return deleteInventoryVehicleAction(vehicleId);
}

export async function loadMyDealershipInventoryAction(offset: number, limit = 30) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) {
    return { ok: false as const, error: "کاربر وارد سیستم نشده است." };
  }
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 30;
  try {
    const data = await getMyDealershipPageData(supabase, safeLimit, safeOffset);
    return { ok: true as const, data };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "خطا در دریافت موجودی نمایشگاه.",
    };
  }
}
