"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateEditableVehicleAction(input: {
  vehicleId: string;
  brand: string;
  model: string;
  trim: string | null;
  modelYear: number | null;
  mileage: number | null;
  color: string | null;
  price: number | null;
  description: string | null;
  status: "available" | "sold";
  transmission: string | null;
  fuelType: string | null;
}) {
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
    .eq("id", input.vehicleId)
    .single();

  if (vehicleError || !vehicle) return { ok: false as const, error: "خودرو پیدا نشد." };

  if (profile.role !== "admin" && profile.dealership_id !== vehicle.dealership_id) {
    return { ok: false as const, error: "شما اجازه ویرایش این خودرو را ندارید." };
  }

  const { error } = await supabase
    .from("vehicles")
    .update({
      brand: input.brand.trim(),
      model: input.model.trim(),
      trim: input.trim?.trim() || null,
      model_year: input.modelYear,
      mileage: input.mileage,
      color: input.color?.trim() || null,
      price: input.price,
      description: input.description?.trim() || null,
      status: input.status,
      transmission: input.transmission,
      fuel_type: input.fuelType,
    })
    .eq("id", input.vehicleId)
    .eq("dealership_id", vehicle.dealership_id);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
