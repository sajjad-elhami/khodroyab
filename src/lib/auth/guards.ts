import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAuth() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  return {
    supabase,
    userId,
  };
}

export async function requireAdmin() {
  const { supabase, userId } = await requireAuth();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return {
    supabase,
    userId,
    profile,
  };
}
