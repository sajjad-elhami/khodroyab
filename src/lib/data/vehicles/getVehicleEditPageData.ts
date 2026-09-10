import type { SupabaseClient } from "@supabase/supabase-js";

export type VehicleEditVehicle = {
  id: string; brand: string; model: string; trim: string | null; model_year: number | null; mileage: number | null; color: string | null; price: number | null; description: string | null; status: string; dealership_id: string; transmission: string | null; fuel_type: string | null; chassis_condition: string | null; engine_condition: string | null; insurance_expiry_date: string | null; gearbox_condition: string | null;
};
export type VehicleEditProfile = { id: string; full_name: string | null; dealership_id: string | null; role: string | null; };
export type VehicleEditImage = { id: string; storage_path: string; thumbnail_path: string | null; sort_order: number; };
export type VehicleEditBodyPart = { code: string; name_fa: string; section: string | null; position: string | null; display_order: number | null; is_active: boolean; };
export type VehicleEditInspection = { part_code: string; condition: string; paint_thickness_microns: number | null; notes: string | null; };
export type VehicleEditBrand = { id: string; name_fa: string; name_en: string | null; slug: string; };
export type VehicleEditModel = { id: string; brand_id: string; name_fa: string; name_en: string | null; slug: string; vehicle_class: string | null; body_type: string | null; };
export type VehicleEditTrim = { id: string; model_id: string; name_fa: string; name_en: string | null; slug: string; model_year_from: number | null; model_year_to: number | null; engine: string | null; transmission: string | null; fuel_type: string | null; drivetrain: string | null; };
export type VehicleEditPageData = { vehicle: VehicleEditVehicle | null; profile: VehicleEditProfile | null; images: VehicleEditImage[]; bodyParts: VehicleEditBodyPart[]; bodyInspection: VehicleEditInspection[]; brands: VehicleEditBrand[]; models: VehicleEditModel[]; trims: VehicleEditTrim[]; selectedBrandId: string | null; selectedModelId: string | null; };
type RpcPayload = Partial<Record<string, unknown>> & { vehicle?: VehicleEditVehicle | null; profile?: VehicleEditProfile | null; images?: VehicleEditImage[]; body_parts?: VehicleEditBodyPart[]; inspections?: VehicleEditInspection[]; brands?: VehicleEditBrand[]; models?: VehicleEditModel[]; trims?: VehicleEditTrim[]; selected_brand_id?: string | null; selected_model_id?: string | null; };

export async function getVehicleEditPageData(supabase: SupabaseClient, vehicleId: string): Promise<VehicleEditPageData> {
  const { data, error } = await supabase.rpc("get_vehicle_edit_page_data", { p_vehicle_id: vehicleId });
  if (error) throw new Error(`Failed to load vehicle edit data: ${error.message}`);
  const payload = (data ?? {}) as RpcPayload;
  return { vehicle: payload.vehicle ?? null, profile: payload.profile ?? null, images: Array.isArray(payload.images) ? payload.images : [], bodyParts: Array.isArray(payload.body_parts) ? payload.body_parts : [], bodyInspection: Array.isArray(payload.inspections) ? payload.inspections : [], brands: Array.isArray(payload.brands) ? payload.brands : [], models: Array.isArray(payload.models) ? payload.models : [], trims: Array.isArray(payload.trims) ? payload.trims : [], selectedBrandId: payload.selected_brand_id ?? null, selectedModelId: payload.selected_model_id ?? null };
}
