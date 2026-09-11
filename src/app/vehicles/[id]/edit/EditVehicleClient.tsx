"use client";

import type { VehicleEditPageData } from "@/lib/data/vehicles/getVehicleEditPageData";
import NewVehicleClient from "../../new/NewVehicleClient";

type Props = {
  initialData: VehicleEditPageData;
};

export default function EditVehicleClient({ initialData }: Props) {
  const { vehicle } = initialData;

  return (
    <NewVehicleClient
      initialData={{
        profile: initialData.profile
          ? {
              id: initialData.profile.id,
              dealership_id: initialData.profile.dealership_id,
              role: initialData.profile.role,
            }
          : null,
        isAdmin:
          initialData.profile?.role === "admin" ||
          initialData.profile?.role === "super_admin",
        dealerships: [],
        brands: initialData.brands,
        bodyParts: initialData.bodyParts,
        initialDealershipId: vehicle?.dealership_id ?? null,
      }}
      editMode={{
        vehicleId: vehicle?.id ?? "",
        vehicle,
        images: initialData.images,
        bodyInspection: initialData.bodyInspection,
        selectedBrandId: initialData.selectedBrandId,
        selectedModelId: initialData.selectedModelId,
      }}
    />
  );
}
