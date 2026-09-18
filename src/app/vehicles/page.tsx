import VehiclesClient from "./VehiclesClient";
import { getVehiclesInitialPageData } from "@/lib/data/vehicles/getVehiclesInitialPageData";

export default async function VehiclesPage() {
  const pageStart = performance.now();

  const dataStart = performance.now();
  const initialData = await getVehiclesInitialPageData();
  const dataMs = performance.now() - dataStart;
  const totalMs = performance.now() - pageStart;

  console.log(
    `[SERVER_TIMING] vehicles direct-db initialData=${dataMs.toFixed(1)}ms total=${totalMs.toFixed(1)}ms`,
  );

  return (
    <VehiclesClient
      initialData={initialData}
      initialSearchData={initialData.search}
    />
  );
}
