import VehicleDetailClient from "./VehicleDetailClient";
import { requireAuth } from "@/lib/auth/guards";
import { getVehicleDetailPageData } from "@/lib/data/vehicles/getVehicleDetailPageData";

type VehicleDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VehicleDetailPage({
  params,
}: VehicleDetailPageProps) {
  const pageStart = performance.now();

  const authStart = performance.now();
  const { supabase } = await requireAuth();
  const authMs = performance.now() - authStart;

  const { id } = await params;

  const dataStart = performance.now();
  const initialData = await getVehicleDetailPageData(supabase, id);
  const dataMs = performance.now() - dataStart;

  const totalMs = performance.now() - pageStart;

  console.log(
    `[SERVER_TIMING] vehicle-detail auth=${authMs.toFixed(1)}ms data=${dataMs.toFixed(1)}ms total=${totalMs.toFixed(1)}ms`
  );

  return (
    <VehicleDetailClient initialData={initialData} />
  );
}
