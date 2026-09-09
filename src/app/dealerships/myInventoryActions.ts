"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyDealershipPageData } from "@/lib/data/dealerships/getMyDealershipPageData";

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
