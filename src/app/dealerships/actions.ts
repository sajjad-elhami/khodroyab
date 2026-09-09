"use server";

import { createClient } from "@/lib/supabase/server";
import { getDealershipsByCity } from "@/lib/data/dealerships/getDealershipsByCity";

export async function getDealershipsByCityAction(cityId: string) {
  return getDealershipsByCity(cityId);
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return { ok: false as const, error: "کاربر وارد سیستم نشده است." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !profile || profile.role !== "admin") {
    return { ok: false as const, error: "شما اجازه انجام این عملیات را ندارید." };
  }

  return { ok: true as const, supabase };
}

export type DealershipMutationInput = {
  name: string;
  phone: string | null;
  address: string | null;
  provinceId: string;
  cityId: string;
  isActive: boolean;
};

export async function createDealershipAction(input: DealershipMutationInput) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  if (!input.name.trim() || !input.provinceId || !input.cityId) {
    return { ok: false as const, error: "نام، استان و شهر نمایشگاه الزامی است." };
  }

  const { data, error } = await auth.supabase
    .from("dealerships")
    .insert({
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      province_id: input.provinceId,
      city_id: input.cityId,
      is_active: input.isActive,
    })
    .select("id, name, phone, address, province_id, city_id, is_active")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, dealership: data };
}

export async function updateDealershipAction(
  dealershipId: string,
  input: DealershipMutationInput,
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  if (!dealershipId || !input.name.trim() || !input.provinceId || !input.cityId) {
    return { ok: false as const, error: "اطلاعات نمایشگاه نامعتبر است." };
  }

  const { data, error } = await auth.supabase
    .from("dealerships")
    .update({
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      province_id: input.provinceId,
      city_id: input.cityId,
      is_active: input.isActive,
    })
    .eq("id", dealershipId)
    .select("id, name, phone, address, province_id, city_id, is_active")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, dealership: data };
}

export async function toggleDealershipAction(
  dealershipId: string,
  isActive: boolean,
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase
    .from("dealerships")
    .update({ is_active: isActive })
    .eq("id", dealershipId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
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

  const canAccessDealership =
    profile.role === "admin" || profile.dealership_id === dealershipId;

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

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
