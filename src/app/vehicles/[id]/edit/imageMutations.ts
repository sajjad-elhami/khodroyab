"use server";

import { createClient } from "@/lib/supabase/server";

export async function deleteVehicleImageAction(
  imageId: string,
  vehicleId: string,
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

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("dealership_id")
    .eq("id", vehicleId)
    .single();

  if (vehicleError || !vehicle) {
    return { ok: false as const, error: "خودرو پیدا نشد." };
  }

  const allowed =
    profile.role === "admin" || profile.dealership_id === vehicle.dealership_id;

  if (!allowed) {
    return { ok: false as const, error: "شما اجازه حذف تصویر این خودرو را ندارید." };
  }

  const { data: image, error: imageError } = await supabase
    .from("vehicle_images")
    .select("id, storage_path, thumbnail_path")
    .eq("id", imageId)
    .eq("vehicle_id", vehicleId)
    .single();

  if (imageError || !image) {
    return { ok: false as const, error: "تصویر پیدا نشد." };
  }

  const paths = [
    image.storage_path,
    ...(image.thumbnail_path ? [image.thumbnail_path] : []),
  ];

  const { error: storageError } = await supabase.storage
    .from("vehicle-images")
    .remove(paths);

  if (storageError) {
    return { ok: false as const, error: storageError.message };
  }

  const { error: deleteError } = await supabase
    .from("vehicle_images")
    .delete()
    .eq("id", imageId)
    .eq("vehicle_id", vehicleId);

  if (deleteError) {
    return { ok: false as const, error: deleteError.message };
  }

  return { ok: true as const };
}
