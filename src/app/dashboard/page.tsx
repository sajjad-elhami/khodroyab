import DashboardClient from "./DashboardClient";
import { requireAuth } from "@/lib/auth/guards";
import { getDashboardData } from "@/lib/data/dashboard/getDashboardData";

export default async function DashboardPage() {
  const pageStart = performance.now();

  const authStart = performance.now();
  const { supabase } = await requireAuth();
  const authMs = performance.now() - authStart;

  const dataStart = performance.now();
  const dashboardData = await getDashboardData(supabase, 20);
  const dataMs = performance.now() - dataStart;

  const totalMs = performance.now() - pageStart;

  console.log(
    `[SERVER_TIMING] dashboard auth=${authMs.toFixed(1)}ms data=${dataMs.toFixed(1)}ms total=${totalMs.toFixed(1)}ms`
  );

  return <DashboardClient initialData={dashboardData} />;
}
