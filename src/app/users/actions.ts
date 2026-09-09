"use server";

import { createClient } from "@/lib/supabase/server";

type UserRole = "admin" | "dealership_user";

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

  return { ok: true as const, supabase, userId };
}

export async function updateUserProfileAction(
  profileId: string,
  dealershipId: string | null,
  role: UserRole,
) {
  if (!profileId) {
    return { ok: false as const, error: "شناسه کاربر نامعتبر است." };
  }

  if (role !== "admin" && role !== "dealership_user") {
    return { ok: false as const, error: "نقش کاربر نامعتبر است." };
  }

  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  if (auth.userId === profileId && role !== "admin") {
    return {
      ok: false as const,
      error: "برای امنیت سیستم، مدیر فعلی نمی‌تواند دسترسی Admin خودش را حذف کند.",
    };
  }

  if (role === "admin" && dealershipId !== null) {
    return {
      ok: false as const,
      error: "حساب مدیر سیستم نباید به یک نمایشگاه متصل باشد.",
    };
  }

  if (dealershipId) {
    const { data: dealership, error: dealershipError } = await auth.supabase
      .from("dealerships")
      .select("id, is_active")
      .eq("id", dealershipId)
      .single();

    if (dealershipError || !dealership) {
      return { ok: false as const, error: "نمایشگاه انتخاب‌شده پیدا نشد." };
    }

    if (!dealership.is_active) {
      return { ok: false as const, error: "اتصال کاربر به نمایشگاه غیرفعال مجاز نیست." };
    }
  }

  const { error } = await auth.supabase
    .from("profiles")
    .update({ dealership_id: dealershipId, role })
    .eq("id", profileId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
