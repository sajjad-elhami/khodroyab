import NewVehicleClient from "./NewVehicleClient";
import { requireAuth } from "@/lib/auth/guards";
import { getVehicleNewPageData } from "@/lib/data/vehicles/getVehicleNewPageData";

type NewVehiclePageProps = {
  searchParams: Promise<{
    dealershipId?: string;
  }>;
};

export default async function NewVehiclePage({
  searchParams,
}: NewVehiclePageProps) {
  const { supabase } = await requireAuth();

  const params = await searchParams;

  const initialData = await getVehicleNewPageData(supabase, params.dealershipId ?? null);

  return <NewVehicleClient initialData={initialData} />;
}
