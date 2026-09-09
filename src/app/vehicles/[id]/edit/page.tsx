import EditVehicleClient from "./EditVehicleClient";
import { requireAuth } from "@/lib/auth/guards";
import { getVehicleEditPageData } from "@/lib/data/vehicles/getVehicleEditPageData";

type EditVehiclePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditVehiclePage({
  params,
}: EditVehiclePageProps) {
  const { supabase } = await requireAuth();

  const { id } = await params;
  const initialData = await getVehicleEditPageData(supabase, id);

  return <EditVehicleClient initialData={initialData} />;
}
