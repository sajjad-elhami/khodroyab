"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyDealershipPageData } from "@/lib/data/dealerships/getMyDealershipPageData";

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
    revalidatePath("/dealerships");
    revalidatePath("/vehicles");
    return { ok: true as const };
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

    // First read every stored image path. Storage files are removed through
    // Supabase Storage API with the server-only admin key; SQL is not allowed
    // to delete rows from storage.objects.
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

    // DB records are deleted only after Storage API cleanup succeeds.
    const { error } = await supabase.rpc("delete_vehicle_completely", {
      p_vehicle_id: vehicleId,
    });
    if (error) throw error;

    // Invalidate every inventory surface so a successful deletion is visible
    // immediately, even when a server-rendered route was previously cached.
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
