"use client";

import { normalizeDigits } from "@/lib/utils/numberInput";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getVehicleModelsByBrand, getVehicleTrimsByModel } from "@/lib/data/catalog/clientCatalog";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { processVehicleImage } from "@/lib/images/processVehicleImage";
import VehicleBodyInspection, { type BodyPart, type Inspection } from "@/components/vehicles/VehicleBodyInspection";
import type { VehicleEditPageData } from "@/lib/data/vehicles/getVehicleEditPageData";
import VehicleCatalogSearch, { type VehicleCatalogSelection } from "@/components/admin/VehicleCatalogSearch";
import { checkVehicleDuplicateAction, createVehicleImageRowsAction, replaceVehicleBodyInspectionAction } from "../mutations";
import { updateEditableVehicleAction, deleteVehicleImageAction } from "./editActions";

type DuplicateVehicle = {
  vehicle_id: string; brand: string; model: string; trim_name: string | null;
  model_year: number | null; mileage: number | null; color: string | null;
  price: number | null; status: string; created_at: string; similarity_score: number;
  match_level: "strong" | "possible" | "weak";
};

type VehicleBrand = VehicleEditPageData["brands"][number];
type VehicleModel = VehicleEditPageData["models"][number];
type VehicleTrim = VehicleEditPageData["trims"][number];
type VehicleImage = VehicleEditPageData["images"][number];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VEHICLE_IMAGES = 10;

export default function EditVehicleClient({ initialData }: { initialData: VehicleEditPageData }) {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = useMemo(() => createClient(), []);
  const vehicle = initialData.vehicle;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(vehicle ? "" : "خودرو پیدا نشد.");
  const [duplicateVehicles, setDuplicateVehicles] = useState<DuplicateVehicle[]>([]);
  const [duplicateChecking, setDuplicateChecking] = useState(false);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>(initialData.models);
  const [vehicleTrims, setVehicleTrims] = useState<VehicleTrim[]>(initialData.trims);
  const [brandId, setBrandId] = useState(initialData.selectedBrandId ?? "");
  const [modelId, setModelId] = useState(initialData.selectedModelId ?? "");
  const [brand, setBrand] = useState(vehicle?.brand ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [trim, setTrim] = useState(vehicle?.trim ?? "");
  const [modelYear, setModelYear] = useState(vehicle?.model_year == null ? "" : String(vehicle.model_year));
  const [mileage, setMileage] = useState(vehicle?.mileage == null ? "" : String(vehicle.mileage));
  const [color, setColor] = useState(vehicle?.color ?? "");
  const [price, setPrice] = useState(vehicle?.price == null ? "" : String(vehicle.price));
  const [description, setDescription] = useState(vehicle?.description ?? "");
  const [status, setStatus] = useState(vehicle?.status ?? "available");
  const [bodyParts] = useState<BodyPart[]>(initialData.bodyParts);
  const [bodyInspection, setBodyInspection] = useState<Inspection[]>(initialData.bodyInspection);
  const [images, setImages] = useState<VehicleImage[]>(initialData.images);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const initialDuplicateSignature = useRef(JSON.stringify([vehicle?.dealership_id ?? "", brand, model, trim, modelYear, mileage, color]));

  async function loadModels(selectedBrandId: string) {
    const models = await getVehicleModelsByBrand(supabase, selectedBrandId);
    setVehicleModels(models as VehicleModel[]); return models as VehicleModel[];
  }

  async function loadTrims(selectedModelId: string) {
    const trims = await getVehicleTrimsByModel(supabase, selectedModelId);
    setVehicleTrims(trims as VehicleTrim[]); return trims as VehicleTrim[];
  }

  async function handleBrandChange(value: string) {
    const selected = initialData.brands.find((item) => item.id === value);
    setBrandId(value); setBrand(selected?.name_fa ?? ""); setModelId(""); setModel(""); setTrim(""); setVehicleModels([]); setVehicleTrims([]);
    if (!value) return;
    try { await loadModels(value); } catch (err) { setError(err instanceof Error ? err.message : "دریافت مدل‌ها ناموفق بود."); }
  }

  async function handleModelChange(value: string) {
    const selected = vehicleModels.find((item) => item.id === value);
    setModelId(value); setModel(selected?.name_fa ?? ""); setTrim(""); setVehicleTrims([]);
    if (!value) return;
    try { await loadTrims(value); } catch (err) { setError(err instanceof Error ? err.message : "دریافت تیپ‌ها ناموفق بود."); }
  }

  function handleTrimChange(value: string) {
    const selected = vehicleTrims.find((item) => item.id === value);
    setTrim(selected?.name_fa ?? "");
  }

  async function handleCatalogSearchSelect(selection: VehicleCatalogSelection) {
    setBrandId(selection.brandId); setBrand(selection.brandName); setModelId(""); setModel(""); setTrim(""); setVehicleModels([]); setVehicleTrims([]);
    try {
      const models = await loadModels(selection.brandId);
      if (!selection.modelId) return;
      const selectedModel = models.find((item) => item.id === selection.modelId);
      if (!selectedModel) return;
      setModelId(selectedModel.id); setModel(selectedModel.name_fa);
      const trims = await loadTrims(selectedModel.id);
      if (!selection.trimId) return;
      const selectedTrim = trims.find((item) => item.id === selection.trimId);
      if (selectedTrim) setTrim(selectedTrim.name_fa);
    } catch (err) { setError(err instanceof Error ? err.message : "انتخاب خودرو از کاتالوگ ناموفق بود."); }
  }

  async function checkVehicleDuplicates() {
    if (!vehicle?.dealership_id || !brand.trim() || !model.trim()) { setDuplicateVehicles([]); return; }
    setDuplicateChecking(true);
    const result = await checkVehicleDuplicateAction({ dealershipId: vehicle.dealership_id, brand: brand.trim(), model: model.trim(), trim: trim.trim() || null, modelYear: modelYear ? Number(modelYear) : null, mileage: mileage ? Number(mileage) : null, color: color.trim() || null, excludeVehicleId: id });
    setDuplicateVehicles(result.ok ? result.data as DuplicateVehicle[] : []);
    if (!result.ok) setError(result.error);
    setDuplicateChecking(false);
  }

  useEffect(() => {
    if (!vehicle?.dealership_id) return;
    const signature = JSON.stringify([vehicle.dealership_id, brand, model, trim, modelYear, mileage, color]);
    if (signature === initialDuplicateSignature.current) return;
    const timer = window.setTimeout(checkVehicleDuplicates, 600);
    return () => window.clearTimeout(timer);
  }, [vehicle?.dealership_id, brand, model, trim, modelYear, mileage, color]);

  function handleNewImages(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    const remaining = MAX_VEHICLE_IMAGES - images.length - newImages.length;
    if (remaining <= 0) { setError("حداکثر ۱۰ تصویر برای هر خودرو مجاز است."); return; }
    const filesToAdd = selected.slice(0, remaining);
    const invalid = filesToAdd.find((file) => !file.type.startsWith("image/"));
    if (invalid) { setError("فقط فایل‌های تصویری قابل انتخاب هستند."); return; }
    const oversized = filesToAdd.find((file) => file.size > MAX_IMAGE_SIZE);
    if (oversized) { setError(`حجم فایل "${oversized.name}" بیشتر از ۱۰ مگابایت است.`); return; }
    setError(""); setNewImages((current) => [...current, ...filesToAdd]);
  }

  function getImageUrl(path: string) { return supabase.storage.from("vehicle-images").getPublicUrl(path).data.publicUrl; }

  async function deleteExistingImage(image: VehicleImage) {
    if (!window.confirm("آیا مطمئنی می‌خواهی این تصویر حذف شود؟")) return;
    setDeletingImageId(image.id); setError("");
    const result = await deleteVehicleImageAction(image.id, id);
    if (!result.ok) { setError(`حذف تصویر ناموفق بود: ${result.error}`); setDeletingImageId(null); return; }
    setImages((current) => current.filter((item) => item.id !== image.id));
    setDeletingImageId(null);
  }

  async function updateVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicle) return;
    if (!brand.trim() || !model.trim()) { setError("برند و مدل خودرو الزامی است."); return; }
    const yearValue = modelYear.trim() ? Number(modelYear) : null;
    const mileageValue = mileage.trim() ? Number(mileage) : null;
    const priceValue = price.trim() ? Number(price) : null;
    if (yearValue !== null && (!Number.isInteger(yearValue) || yearValue < 1300 || yearValue > 1405)) { setError("سال مدل باید بین ۱۳۰۰ تا ۱۴۰۵ باشد."); return; }
    if (mileageValue !== null && (!Number.isInteger(mileageValue) || mileageValue < 0)) { setError("کارکرد باید یک عدد صحیح بزرگ‌تر یا مساوی صفر باشد."); return; }
    if (priceValue !== null && (!Number.isInteger(priceValue) || priceValue < 0)) { setError("قیمت باید یک عدد صحیح بزرگ‌تر یا مساوی صفر باشد."); return; }
    if (status !== "available" && status !== "sold") { setError("وضعیت خودرو نامعتبر است."); return; }

    const selectedTrim = vehicleTrims.find((item) => item.name_fa.trim() === trim.trim());
    setSaving(true); setError("");

    const vehicleResult = await updateEditableVehicleAction({
      vehicleId: id, brand, model, trim: trim.trim() || null, modelYear: yearValue, mileage: mileageValue,
      color: color.trim() || null, price: priceValue, description, status,
      transmission: selectedTrim?.transmission ?? vehicle.transmission,
      fuelType: selectedTrim?.fuel_type ?? vehicle.fuel_type,
    });
    if (!vehicleResult.ok) { setError(vehicleResult.error); setSaving(false); return; }

    const inspectionResult = await replaceVehicleBodyInspectionAction(id, bodyInspection.map((item) => ({ partCode: item.part_code, condition: item.condition, paintThicknessMicrons: item.paint_thickness_microns, notes: item.notes })));
    if (!inspectionResult.ok) { setError(`ذخیره کارشناسی بدنه ناموفق بود: ${inspectionResult.error}`); setSaving(false); return; }

    if (newImages.length > 0) {
      const available = MAX_VEHICLE_IMAGES - images.length;
      if (newImages.length > available) { setError("حداکثر ۱۰ تصویر برای هر خودرو مجاز است."); setSaving(false); return; }
      const maxSortOrder = images.reduce((max, image) => Math.max(max, image.sort_order), -1);
      const uploadedPaths: string[] = [];
      const imageRows: { storagePath: string; thumbnailPath: string; sortOrder: number }[] = [];
      try {
        for (let i = 0; i < newImages.length; i++) {
          const sourceFile = newImages[i];
          const processed = await processVehicleImage(sourceFile);
          const fileId = crypto.randomUUID();
          const storagePath = `${id}/gallery/${fileId}.webp`;
          const thumbnailPath = `${id}/gallery/thumb/${fileId}.webp`;
          const mainUpload = await supabase.storage.from("vehicle-images").upload(storagePath, processed.mainFile, { cacheControl: "31536000", upsert: false, contentType: "image/webp" });
          if (mainUpload.error) throw new Error(`آپلود تصویر "${sourceFile.name}" ناموفق بود: ${mainUpload.error.message}`);
          uploadedPaths.push(storagePath);
          const thumbUpload = await supabase.storage.from("vehicle-images").upload(thumbnailPath, processed.thumbnailFile, { cacheControl: "31536000", upsert: false, contentType: "image/webp" });
          if (thumbUpload.error) throw new Error(`آپلود thumbnail تصویر "${sourceFile.name}" ناموفق بود: ${thumbUpload.error.message}`);
          uploadedPaths.push(thumbnailPath);
          imageRows.push({ storagePath, thumbnailPath, sortOrder: maxSortOrder + i + 1 });
        }
        const rowsResult = await createVehicleImageRowsAction(id, imageRows);
        if (!rowsResult.ok) throw new Error(`ثبت اطلاعات تصاویر ناموفق بود: ${rowsResult.error}`);
        setImages((current) => [...current, ...imageRows.map((row, index) => ({ id: `new-${Date.now()}-${index}`, storage_path: row.storagePath, thumbnail_path: row.thumbnailPath, sort_order: row.sortOrder }))].sort((a, b) => a.sort_order - b.sort_order));
        setNewImages([]);
      } catch (imageError) {
        if (uploadedPaths.length) await supabase.storage.from("vehicle-images").remove(uploadedPaths);
        setError(imageError instanceof Error ? imageError.message : "پردازش یا آپلود تصویر ناموفق بود.");
        setSaving(false); return;
      }
    }
    router.push(`/vehicles/${id}`);
  }

  if (!vehicle) return <AdminLayout title="ویرایش خودرو" description="ویرایش اطلاعات خودرو"><div className="rounded-2xl bg-white p-8 shadow-sm">خودرو پیدا نشد.</div></AdminLayout>;

  return (
    <AdminLayout title="ویرایش خودرو" description="ویرایش اطلاعات خودرو در خودرو‌یاب" adminUserFullName={initialData.profile?.full_name?.trim() || "مدیر سیستم"}>
      <div className="mx-auto max-w-5xl space-y-6">
        <button type="button" onClick={() => router.push(`/vehicles/${id}`)} className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">بازگشت به جزئیات خودرو</button>
        {error && <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <form onSubmit={updateVehicle} className="space-y-6">
          {duplicateChecking && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">در حال بررسی خودروهای مشابه...</div>}
          {!duplicateChecking && duplicateVehicles.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-extrabold text-amber-950">خودروی بسیار مشابه پیدا شد</h3><p className="mt-1 text-sm text-amber-800">یک یا چند خودرو با مشخصات مشابه قبلاً در این نمایشگاه ثبت شده‌اند.</p><div className="mt-4 space-y-2">{duplicateVehicles.map((item) => <div key={item.vehicle_id} className="rounded-xl border border-amber-200 bg-white p-3"><div className="font-bold">{item.brand} {item.model}{item.trim_name ? ` · ${item.trim_name}` : ""}</div><div className="mt-2 text-xs text-slate-500">تطابق {item.similarity_score}٪</div></div>)}</div></div>}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-6 text-xl font-bold">اطلاعات خودرو</h2><VehicleCatalogSearch label="جستجوی سریع خودرو" placeholder="مثلاً پژو 207 MC، Toyota Corolla..." initialQuery={[brand, model, trim].filter(Boolean).join(" ")} onSelect={handleCatalogSearchSelect} initialCatalog={{ brands: vehicleBrands, models: vehicleModels, trims: vehicleTrims }} /><div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-gray-600">برند *<select required value={brandId} onChange={(e) => handleBrandChange(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3"><option value="">انتخاب برند</option>{initialData.brands.map((item) => <option key={item.id} value={item.id}>{item.name_fa}</option>)}</select></label>
            <label className="text-sm text-gray-600">مدل *<select required value={modelId} onChange={(e) => handleModelChange(e.target.value)} disabled={!brandId} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 disabled:bg-gray-100"><option value="">انتخاب مدل</option>{vehicleModels.map((item) => <option key={item.id} value={item.id}>{item.name_fa}</option>)}</select></label>
            <label className="text-sm text-gray-600">تیپ<select value={vehicleTrims.find((item) => item.name_fa === trim)?.id ?? ""} onChange={(e) => handleTrimChange(e.target.value)} disabled={!modelId} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 disabled:bg-gray-100"><option value="">انتخاب تیپ</option>{vehicleTrims.map((item) => <option key={item.id} value={item.id}>{item.name_fa}</option>)}</select></label>
            <label className="text-sm text-gray-600">سال مدل<select value={modelYear} onChange={(e) => setModelYear(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3"><option value="">انتخاب سال</option>{Array.from({ length: 106 }, (_, index) => 1405 - index).map((year) => <option key={year} value={year}>{year.toLocaleString("fa-IR", { useGrouping: false })} — {(year + 621).toLocaleString("fa-IR", { useGrouping: false })}</option>)}</select></label>
            <label className="text-sm text-gray-600">کارکرد (کیلومتر)<input value={mileage} onChange={(e) => setMileage(normalizeDigits(e.target.value))} inputMode="numeric" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3" /></label>
            <label className="text-sm text-gray-600">رنگ<input value={color} onChange={(e) => setColor(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3" /></label>
            <label className="text-sm text-gray-600">قیمت (تومان)<input value={price} onChange={(e) => setPrice(normalizeDigits(e.target.value))} inputMode="numeric" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3" /></label>
            <label className="text-sm text-gray-600">وضعیت<select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3"><option value="available">موجود</option><option value="sold">فروخته شده</option></select></label>
          </div><label className="mt-4 block text-sm text-gray-600">توضیحات<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3" /></label></section>

          <section>{bodyParts.length === 0 ? <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">قطعات کارشناسی بدنه در سیستم پیدا نشدند.</div> : <VehicleBodyInspection parts={bodyParts} value={bodyInspection} onChange={setBodyInspection} />}</section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-extrabold">تصاویر خودرو</h2><p className="mt-1 text-sm text-slate-500">تصاویر فعلی را حذف یا تصاویر جدید اضافه کن.</p>{images.length > 0 ? <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{images.map((image) => <div key={image.id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"><div className="aspect-[4/3]"><img src={getImageUrl(image.storage_path)} alt={`${brand} ${model}`} className="h-full w-full object-cover" /></div><button type="button" onClick={() => deleteExistingImage(image)} disabled={deletingImageId === image.id} className="absolute right-2 top-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{deletingImageId === image.id ? "در حال حذف..." : "حذف"}</button></div>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">هنوز تصویری ثبت نشده است.</div>}<div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5"><label className="block"><span className="text-sm font-bold">افزودن تصاویر جدید</span><span className="mt-1 block text-xs text-slate-500">حداکثر ۱۰ مگابایت برای هر تصویر</span><input type="file" accept="image/*" multiple onChange={(e) => { handleNewImages(e.target.files); e.currentTarget.value = ""; }} className="mt-4 block w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm" /></label>{newImages.length > 0 && <div className="mt-4 space-y-2">{newImages.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl bg-white px-4 py-3"><span className="truncate text-sm">{file.name}</span><button type="button" onClick={() => setNewImages((current) => current.filter((_, i) => i !== index))} className="text-xs font-bold text-red-600">حذف</button></div>)}</div>}</div></section>

          <div className="flex justify-end gap-3"><button type="button" onClick={() => router.push(`/vehicles/${id}`)} className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium">انصراف</button><button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "در حال ذخیره..." : "ذخیره تغییرات"}</button></div>
        </form>
      </div>
    </AdminLayout>
  );
}
