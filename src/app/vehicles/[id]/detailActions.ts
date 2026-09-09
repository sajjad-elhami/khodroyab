"use server";

import { createClient } from "@/lib/supabase/server";

export async function toggleVehicleFavoriteAction(vehicleId: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) return { ok: false as const, error: "کاربر وارد سیستم نشده است." };

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", vehicleId)
    .single();

  if (vehicleError || !vehicle) return { ok: false as const, error: "خودرو پیدا نشد." };

  const { data: existing, error: existingError } = await supabase
    .from("vehicle_favorites")
    .select("user_id")
    .eq("user_id", userId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (existingError) return { ok: false as const, error: existingError.message };

  if (existing) {
    const { error } = await supabase
      .from("vehicle_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("vehicle_id", vehicleId);

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, isFavorite: false };
  }

  const { error } = await supabase
    .from("vehicle_favorites")
    .insert({ user_id: userId, vehicle_id: vehicleId });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, isFavorite: true };
}

export async function getVehicleImagePathsAction(vehicleId: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) return { ok: false as const, error: "کاربر وارد سیستم نشده است.", paths: [] as string[] };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("dealership_id, role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) return { ok: false as const, error: "اطلاعات حساب کاربری دریافت نشد.", paths: [] as string[] };

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("dealership_id")
    .eq("id", vehicleId)
    .single();

  if (vehicleError || !vehicle) return { ok: false as const, error: "خودرو پیدا نشد.", paths: [] as string[] };

  if (profile.role !== "admin" && profile.dealership_id !== vehicle.dealership_id) {
    return { ok: false as const, error: "شما اجازه حذف این خودرو را ندارید.", paths: [] as string[] };
  }

  const { data: images, error } = await supabase
    .from("vehicle_images")
    .select("storage_path, thumbnail_path")
    .eq("vehicle_id", vehicleId);

  if (error) return { ok: false as const, error: error.message, paths: [] as string[] };

  return {
    ok: true as const,
    paths: Array.from(new Set((images ?? []).flatMap((image) => [image.storage_path, ...(image.thumbnail_path ? [image.thumbnail_path] : [])]))),
  };
}

export async function deleteVehicleAction(vehicleId: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) return { ok: false as const, error: "کاربر وارد سیستم نشده است." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("dealership_id, role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) return { ok: false as const, error: "اطلاعات حساب کاربری دریافت نشد." };

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("dealership_id")
    .eq("id", vehicleId)
    .single();

  if (vehicleError || !vehicle) return { ok: false as const, error: "خودرو پیدا نشد." };

  if (profile.role !== "admin" && profile.dealership_id !== vehicle.dealership_id) {
    return { ok: false as const, error: "شما اجازه حذف این خودرو را ندارید." };
  }

  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", vehicleId)
    .eq("dealership_id", vehicle.dealership_id);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
