import VehiclesClient from "./VehiclesClient";
import DailyInventoryLock from "./DailyInventoryLock";
import { requireAuth } from "@/lib/auth/guards";
import { getVehiclesInitialPageData } from "@/lib/data/vehicles/getVehiclesInitialPageData";

export default async function VehiclesPage() {
  const pageStart = performance.now();

  const authStart = performance.now();
  const { supabase } = await requireAuth();
  const authMs = performance.now() - authStart;

  const dataStart = performance.now();
  const initialData = await getVehiclesInitialPageData(supabase);
  const dataMs = performance.now() - dataStart;
  const totalMs = performance.now() - pageStart;

  const gate = initialData.inventoryGate;

  console.log(
    `[SERVER_TIMING] vehicles auth=${authMs.toFixed(1)}ms initialData=${dataMs.toFixed(1)}ms total=${totalMs.toFixed(1)}ms locked=${gate.requiresUpdate} confirmed=${gate.confirmedToday}/${gate.totalAvailable}`,
  );

  if (gate.requiresUpdate) {
    return <DailyInventoryLock />;
  }

  return (
    <VehiclesClient
      initialData={initialData}
      initialSearchData={initialData.search}
    />
  );
}
