"use server";

import { createClient } from "@/lib/supabase/server";

export type VehicleMutationResult =
  | { ok: true }
  | { ok: false; error: string };

export type CreateVehicleInput = {
  dealershipId: string;
  brand: string;
  model: string;
  trim: string | null;
  modelYear: number;
  mileage: number;
  color: string | null;
  price: number;
  description: string | null;
  status: "available" | "sold";
  transmission: string | null;
  fuelType: string | null;
  bodyCondition: string | null;
  chassisCondition: string | null;
  engineCondition: string | null;
  insuranceExpiryDate: string | null;
  gearboxCondition: string | null;
};

export type UpdateVehicleInput = Omit<CreateVehicleInput, "dealershipId"> & {
  vehicleId: string;
};

export type CheckVehicleDuplicateInput = {
  dealershipId: string;
  brand: string;
  model: string;
  trim: string | null;
  modelYear: number | null;
  mileage: number | null;
  color: string | null;
  excludeVehicleId?: string | null;
};

export type VehicleBodyInspectionInput = {
  partCode: string;
  condition: string;
  paintThicknessMicrons: number | null;
  notes: string | null;
};

export type VehicleImageInput = {
  storagePath: string;
  thumbnailPath: string;
  sortOrder: number;
};

async function getAuthorizedContext() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return { ok: false as const, error: "کاربر وارد سیستم نشده است." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("dealership_id, role")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return { ok: false as const, error: "اطلاعات حساب کاربری دریافت نشد." };
  }

  return { ok: true as const, supabase, userId, profile };
}

function canAccessDealership(
  profile: { dealership_id: string | null; role: string | null },
  dealershipId: string,
) {
  return profile.role === "admin" || profile.dealership_id === dealershipId;
}

async function canAccessVehicle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: { dealership_id: string | null; role: string | null },
  vehicleId: string,
) {
  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .select("dealership_id")
    .eq("id", vehicleId)
    .single();

  if (error || !vehicle) {
    return { ok: false as const, error: "خودرو پیدا نشد." };
  }

  if (!canAccessDealership(profile, vehicle.dealership_id)) {
    return { ok: false as const, error: "شما اجازه دسترسی به این خودرو را ندارید." };
  }

  return { ok: true as const };
}

export async function checkVehicleDuplicateAction(
  input: CheckVehicleDuplicateInput,
) {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false as const, error: context.error, data: [] };

  if (!canAccessDealership(context.profile, input.dealershipId)) {
    return {
      ok: false as const,
      error: "شما اجازه بررسی خودروهای این نمایشگاه را ندارید.",
      data: [],
    };
  }

  const { data, error } = await context.supabase.rpc(
    "check_vehicle_duplicate",
    {
      p_dealership_id: input.dealershipId,
      p_brand: input.brand.trim(),
      p_model: input.model.trim(),
      p_trim: input.trim?.trim() || null,
      p_model_year: input.modelYear,
      p_mileage: input.mileage,
      p_color: input.color?.trim() || null,
      p_exclude_vehicle_id: input.excludeVehicleId ?? null,
    },
  );

  if (error) {
    return { ok: false as const, error: error.message, data: [] };
  }

  return { ok: true as const, data: data ?? [] };
}

export async function createVehicleAction(
  input: CreateVehicleInput,
) {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false as const, error: context.error };

  if (!canAccessDealership(context.profile, input.dealershipId)) {
    return { ok: false as const, error: "شما اجازه ثبت خودرو برای این نمایشگاه را ندارید." };
  }

  const { data: vehicle, error } = await context.supabase
    .from("vehicles")
    .insert({
      dealership_id: input.dealershipId,
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
      body_condition: input.bodyCondition,
      chassis_condition: input.chassisCondition,
      engine_condition: input.engineCondition,
      insurance_expiry_date: input.insuranceExpiryDate,
      gearbox_condition: input.gearboxCondition,
    })
    .select("id")
    .single();

  if (error || !vehicle) {
    return { ok: false as const, error: error?.message ?? "ثبت خودرو ناموفق بود." };
  }

  return { ok: true as const, vehicleId: vehicle.id, isAdmin: context.profile.role === "admin" };
}

export async function createVehicleBodyInspectionAction(
  vehicleId: string,
  inspections: VehicleBodyInspectionInput[],
): Promise<VehicleMutationResult> {
  if (inspections.length === 0) return { ok: true };

  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };

  const access = await canAccessVehicle(context.supabase, context.profile, vehicleId);
  if (!access.ok) return access;

  const { error } = await context.supabase
    .from("vehicle_body_inspections")
    .insert(
      inspections.map((item) => ({
        vehicle_id: vehicleId,
        part_code: item.partCode,
        condition: item.condition,
        paint_thickness_microns: item.paintThicknessMicrons,
        notes: item.notes,
      })),
    );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function replaceVehicleBodyInspectionAction(
  vehicleId: string,
  inspections: VehicleBodyInspectionInput[],
): Promise<VehicleMutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };

  const access = await canAccessVehicle(context.supabase, context.profile, vehicleId);
  if (!access.ok) return access;

  const { error: deleteError } = await context.supabase
    .from("vehicle_body_inspections")
    .delete()
    .eq("vehicle_id", vehicleId);

  if (deleteError) return { ok: false, error: deleteError.message };
  if (inspections.length === 0) return { ok: true };

  const { error: insertError } = await context.supabase
    .from("vehicle_body_inspections")
    .insert(
      inspections.map((item) => ({
        vehicle_id: vehicleId,
        part_code: item.partCode,
        condition: item.condition,
        paint_thickness_microns: item.paintThicknessMicrons,
        notes: item.notes,
      })),
    );

  if (insertError) return { ok: false, error: insertError.message };
  return { ok: true };
}

export async function createVehicleImageRowsAction(
  vehicleId: string,
  images: VehicleImageInput[],
): Promise<VehicleMutationResult> {
  if (images.length === 0) return { ok: true };

  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };

  const access = await canAccessVehicle(context.supabase, context.profile, vehicleId);
  if (!access.ok) return access;

  const { error } = await context.supabase
    .from("vehicle_images")
    .insert(
      images.map((item) => ({
        vehicle_id: vehicleId,
        storage_path: item.storagePath,
        thumbnail_path: item.thumbnailPath,
        sort_order: item.sortOrder,
      })),
    );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getVehicleImagePathsAction(vehicleId: string) {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false as const, error: context.error, paths: [] };

  const access = await canAccessVehicle(context.supabase, context.profile, vehicleId);
  if (!access.ok) return { ok: false as const, error: access.error, paths: [] };

  const { data, error } = await context.supabase
    .from("vehicle_images")
    .select("storage_path, thumbnail_path")
    .eq("vehicle_id", vehicleId);

  if (error) return { ok: false as const, error: error.message, paths: [] };

  const paths = Array.from(
    new Set(
      (data ?? []).flatMap((item) => [
        item.storage_path,
        ...(item.thumbnail_path ? [item.thumbnail_path] : []),
      ]),
    ),
  );

  return { ok: true as const, paths };
}

export async function deleteVehicleAction(
  vehicleId: string,
): Promise<VehicleMutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };

  const access = await canAccessVehicle(context.supabase, context.profile, vehicleId);
  if (!access.ok) return access;

  const { error } = await context.supabase
    .from("vehicles")
    .delete()
    .eq("id", vehicleId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateVehicleAction(
  input: UpdateVehicleInput,
): Promise<VehicleMutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };

  const { data: vehicle, error: vehicleError } = await context.supabase
    .from("vehicles")
    .select("dealership_id")
    .eq("id", input.vehicleId)
    .single();

  if (vehicleError || !vehicle) {
    return { ok: false, error: "خودرو پیدا نشد." };
  }

  if (!canAccessDealership(context.profile, vehicle.dealership_id)) {
    return { ok: false, error: "شما اجازه ویرایش این خودرو را ندارید." };
  }

  const { error } = await context.supabase
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
      body_condition: input.bodyCondition,
      chassis_condition: input.chassisCondition,
      engine_condition: input.engineCondition,
      insurance_expiry_date: input.insuranceExpiryDate,
      gearbox_condition: input.gearboxCondition,
    })
    .eq("id", input.vehicleId);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function toggleVehicleFavoriteAction(
  vehicleId: string,
): Promise<{ ok: true; isFavorite: boolean } | { ok: false; error: string }> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };

  const { data: vehicle, error: vehicleError } = await context.supabase
    .from("vehicles")
    .select("id")
    .eq("id", vehicleId)
    .single();

  if (vehicleError || !vehicle) {
    return { ok: false, error: "خودرو پیدا نشد." };
  }

  const { data: existing, error: existingError } = await context.supabase
    .from("vehicle_favorites")
    .select("user_id")
    .eq("user_id", context.userId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (existingError) return { ok: false, error: existingError.message };

  if (existing) {
    const { error } = await context.supabase
      .from("vehicle_favorites")
      .delete()
      .eq("user_id", context.userId)
      .eq("vehicle_id", vehicleId);

    if (error) return { ok: false, error: error.message };
    return { ok: true, isFavorite: false };
  }

  const { error } = await context.supabase
    .from("vehicle_favorites")
    .insert({ user_id: context.userId, vehicle_id: vehicleId });

  if (error) return { ok: false, error: error.message };
  return { ok: true, isFavorite: true };
}

export async function rollbackVehicleCreationAction(
  vehicleId: string,
): Promise<VehicleMutationResult> {
  const context = await getAuthorizedContext();
  if (!context.ok) return { ok: false, error: context.error };

  const { data: vehicle, error: vehicleError } = await context.supabase
    .from("vehicles")
    .select("dealership_id")
    .eq("id", vehicleId)
    .single();

  if (vehicleError || !vehicle) {
    return { ok: true };
  }

  if (!canAccessDealership(context.profile, vehicle.dealership_id)) {
    return { ok: false, error: "شما اجازه بازگردانی این خودرو را ندارید." };
  }

  const { error } = await context.supabase
    .from("vehicles")
    .delete()
    .eq("id", vehicleId);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
