import VehiclesClient from "./VehiclesClient";
import DailyInventoryLock from "./DailyInventoryLock";
import { requireAuth } from "@/lib/auth/guards";
import { getVehiclesInitialPageData } from "@/lib/data/vehicles/getVehiclesInitialPageData";
import { getDailyInventoryGate } from "@/lib/data/vehicles/getDailyInventoryGate";

export default async function VehiclesPage() {
  const pageStart = performance.now();

  const authStart = performance.now();
  const { supabase } = await requireAuth();
  const authMs = performance.now() - authStart;

  const gateStart = performance.now();
  const gate = await getDailyInventoryGate(supabase);
  const gateMs = performance.now() - gateStart;

  if (gate.requiresUpdate) {
    console.log(
      `[SERVER_TIMING] vehicles auth=${authMs.toFixed(1)}ms gate=${gateMs.toFixed(1)}ms locked=true confirmed=${gate.confirmedToday}/${gate.totalAvailable}`,
    );
    return <DailyInventoryLock />;
  }

  const dataStart = performance.now();
  const initialData = await getVehiclesInitialPageData(supabase);
  const dataMs = performance.now() - dataStart;
  const totalMs = performance.now() - pageStart;

  console.log(
    `[SERVER_TIMING] vehicles auth=${authMs.toFixed(1)}ms gate=${gateMs.toFixed(1)}ms initialData=${dataMs.toFixed(1)}ms total=${totalMs.toFixed(1)}ms`,
  );

  return (
    <VehiclesClient
      initialData={initialData}
      initialSearchData={initialData.search}
    />
  );
}
