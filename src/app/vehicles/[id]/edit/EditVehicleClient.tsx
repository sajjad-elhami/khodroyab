"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeDigits } from "@/lib/utils/numberInput";
import { getVehicleModelsByBrand, getVehicleTrimsByModel } from "@/lib/data/catalog/clientCatalog";
import { processVehicleImage } from "@/lib/images/processVehicleImage";
import KhodroyabChevronIcon from "@/components/vehicles/KhodroyabChevronIcon";
import VehicleBodyInspection, { type BodyPart, type Inspection } from "@/components/vehicles/VehicleBodyInspection";
import type { VehicleEditPageData } from "@/lib/data/vehicles/getVehicleEditPageData";
import { createVehicleImageRowsAction, replaceVehicleBodyInspectionAction } from "../../mutations";
import { updateEditableVehicleAction, deleteVehicleImageAction } from "./editActions";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES = 10;
const YEARS = Array.from({ length: 106 }, (_, i) => 1405 - i);
const FUEL_OPTIONS = ["بنزین", "گازوئیل", "دوگانه‌سوز", "هیبرید", "برقی"];
const COLOR_OPTIONS = ["سفید", "مشکی", "نقره‌ای", "خاکستری", "نوک‌مدادی", "آبی", "قرمز", "قهوه‌ای", "طلایی", "سبز", "زرد", "سایر"];
const CHASSIS_OPTIONS = ["سالم", "ضربه‌دار", "کشیده‌شده", "جوش‌خورده", "تعویض‌شده", "تعمیرشده", "نامشخص"];
const ENGINE_OPTIONS = ["سالم", "نیاز به بررسی", "تعمیرشده", "تعویض‌شده", "نامشخص"];
const GEARBOX_OPTIONS = ["سالم", "نیاز به بررسی", "تعمیرشده", "تعویض‌شده", "نامشخص"];
const GEARBOX_TYPES = ["دنده‌ای", "اتوماتیک", "CVT", "دوگانه‌کلاچه", "برقی"];

type Picker = "vehicle" | "mileage" | "fuel" | "year" | "color" | "price" | "chassis" | "engine" | "insurance" | "gearboxType" | "gearboxCondition" | null;
type Model = VehicleEditPageData["models"][number];
type Trim = VehicleEditPageData["trims"][number];
type Image = VehicleEditPageData["images"][number];

function formatPersianInteger(value: string) { const digits = normalizeDigits(value).replace(/\D/g, ""); return digits.replace(/\B(?=(\d{3})+(?!\d))/g, "٬").replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]); }
function parseChassis(value: string | null) { try { const x = value ? JSON.parse(value) : {}; return { front: x.front ?? "", rear: x.rear ?? "" }; } catch { return { front: "", rear: "" }; } }

export default function EditVehicleClient({ initialData }: { initialData: VehicleEditPageData }) {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = useMemo(() => createClient(), []);
  const vehicle = initialData.vehicle;
  const parsedChassis = parseChassis(vehicle?.chassis_condition ?? null);

  const [step, setStep] = useState(1);
  const [picker, setPicker] = useState<Picker>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [chassisTarget, setChassisTarget] = useState<"front" | "rear">("front");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(vehicle ? "" : "خودرو پیدا نشد.");
  const [brandId, setBrandId] = useState(initialData.selectedBrandId ?? "");
  const [modelId, setModelId] = useState(initialData.selectedModelId ?? "");
  const [brand, setBrand] = useState(vehicle?.brand ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [trim, setTrim] = useState(vehicle?.trim ?? "");
  const [models, setModels] = useState<Model[]>(initialData.models);
  const [trims, setTrims] = useState<Trim[]>(initialData.trims);
  const [modelYear, setModelYear] = useState(vehicle?.model_year == null ? "" : String(vehicle.model_year));
  const [mileage, setMileage] = useState(vehicle?.mileage == null ? "" : String(vehicle.mileage));
  const [color, setColor] = useState(vehicle?.color ?? "");
  const [price, setPrice] = useState(vehicle?.price == null ? "" : String(vehicle.price));
  const [fuelType, setFuelType] = useState(vehicle?.fuel_type ?? "");
  const [gearboxType, setGearboxType] = useState(vehicle?.transmission ?? "");
  const [gearboxCondition, setGearboxCondition] = useState(vehicle?.gearbox_condition ?? "");
  const [engineCondition, setEngineCondition] = useState(vehicle?.engine_condition ?? "");
  const [insuranceDeadline, setInsuranceDeadline] = useState(vehicle?.insurance_expiry_date ?? "");
  const [frontChassisCondition, setFrontChassisCondition] = useState(parsedChassis.front);
  const [rearChassisCondition, setRearChassisCondition] = useState(parsedChassis.rear);
  const [description, setDescription] = useState(vehicle?.description ?? "");
  const [bodyParts] = useState<BodyPart[]>(initialData.bodyParts as BodyPart[]);
  const [bodyInspection, setBodyInspection] = useState<Inspection[]>(initialData.bodyInspection as Inspection[]);
  const [existingImages, setExistingImages] = useState<Image[]>(initialData.images as Image[]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imageSheetOpen, setImageSheetOpen] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const newImagePreviews = useMemo(() => newImages.map((file, index) => ({ file, index, url: URL.createObjectURL(file) })), [newImages]);
  useEffect(() => () => newImagePreviews.forEach(x => URL.revokeObjectURL(x.url)), [newImagePreviews]);

  async function loadModels(value: string) { const result = await getVehicleModelsByBrand(supabase, value); setModels(result as Model[]); return result as Model[]; }
  async function loadTrims(value: string) { const result = await getVehicleTrimsByModel(supabase, value); setTrims(result as Trim[]); return result as Trim[]; }
  function openPicker(value: Picker) { setPickerSearch(""); setPicker(value); }
  function closePicker() { setPicker(null); setPickerSearch(""); }

  async function selectBrand(item: VehicleEditPageData["brands"][number]) { setBrandId(item.id); setBrand(item.name_fa); setModelId(""); setModel(""); setTrim(""); setTrims([]); closePicker(); try { const result = await loadModels(item.id); setModels(result); openPicker("vehicle"); } catch { setError("دریافت مدل‌ها ناموفق بود."); } }
  async function selectModel(item: Model) { setModelId(item.id); setModel(item.name_fa); setTrim(""); setTrims([]); closePicker(); try { const result = await loadTrims(item.id); setTrims(result); openPicker("vehicle"); } catch { setError("دریافت تیپ‌ها ناموفق بود."); } }
  function selectTrim(item: Trim) { setTrim(item.name_fa); if (item.fuel_type) setFuelType(item.fuel_type); if (item.transmission) setGearboxType(item.transmission); closePicker(); }
  function handleNewImages(files: FileList | null) { if (!files) return; const selected = Array.from(files); const remaining = MAX_IMAGES - existingImages.length - newImages.length; if (remaining <= 0) { setError("حداکثر ۱۰ تصویر برای هر خودرو مجاز است."); return; } const accepted = selected.slice(0, remaining); const invalid = accepted.find(file => !file.type.startsWith("image/")); if (invalid) { setError("فقط فایل‌های تصویری قابل انتخاب هستند."); return; } const oversized = accepted.find(file => file.size > MAX_IMAGE_SIZE); if (oversized) { setError(`حجم فایل «${oversized.name}» بیشتر از ۱۰ مگابایت است.`); return; } setNewImages(current => [...current, ...accepted]); setError(""); setImageSheetOpen(false); }
  async function deleteExistingImage(image: Image) { if (!window.confirm("آیا مطمئنی می‌خواهی این تصویر حذف شود؟")) return; setDeletingImageId(image.id); const result = await deleteVehicleImageAction(image.id, id); if (!result.ok) { setError(`حذف تصویر ناموفق بود: ${result.error}`); setDeletingImageId(null); return; } setExistingImages(current => current.filter(x => x.id !== image.id)); setDeletingImageId(null); }

  function validate(s: number) {
    if (s === 1) { if (existingImages.length + newImages.length === 0) return "حداقل یک عکس برای آگهی اضافه کنید."; if (!brand.trim() || !model.trim()) return "برند و مدل خودرو الزامی است."; if (trims.length > 0 && !trim.trim()) return "تیپ خودرو را انتخاب کنید."; }
    if (s === 2) { if (!mileage.trim()) return "کارکرد خودرو الزامی است."; if (!fuelType.trim()) return "نوع سوخت خودرو را انتخاب کنید."; if (!modelYear.trim()) return "مدل (سال تولید) الزامی است."; if (!color.trim()) return "رنگ خودرو را انتخاب کنید."; if (!price.trim()) return "قیمت خودرو الزامی است."; const year = Number(modelYear), km = Number(mileage), amount = Number(price); if (!Number.isInteger(year) || year < 1300 || year > 1405) return "سال مدل باید بین ۱۳۰۰ تا ۱۴۰۵ باشد."; if (!Number.isInteger(km) || km < 0) return "کارکرد باید یک عدد صحیح بزرگ‌تر یا مساوی صفر باشد."; if (!Number.isInteger(amount) || amount < 0) return "قیمت باید یک عدد صحیح بزرگ‌تر یا مساوی صفر باشد."; }
    if (s === 3 && (!frontChassisCondition.trim() || !rearChassisCondition.trim())) return "وضعیت شاسی جلو و عقب را کامل کنید.";
    return "";
  }
  function nextStep() { const message = validate(step); if (message) { setError(message); return; } setError(""); setStep(s => Math.min(3, s + 1)); }
  function backStep() { if (picker) { closePicker(); return; } if (step > 1) { setError(""); setStep(s => s - 1); } else router.back(); }

  async function saveVehicle(e: React.FormEvent) {
    e.preventDefault(); const message = validate(3) || validate(2) || validate(1); if (message || !vehicle) { setError(message || "خودرو پیدا نشد."); return; }
    setSaving(true); setError("");
    const selectedTrim = trims.find(item => item.name_fa.trim() === trim.trim());
    const result = await updateEditableVehicleAction({ vehicleId: id, brand, model, trim: trim.trim() || null, modelYear: Number(modelYear), mileage: Number(mileage), color: color.trim() || null, price: Number(price), description, status: vehicle.status === "sold" ? "sold" : "available", transmission: gearboxType || selectedTrim?.transmission || null, fuelType: fuelType || selectedTrim?.fuel_type || null, chassisCondition: JSON.stringify({ front: frontChassisCondition, rear: rearChassisCondition }), engineCondition: engineCondition || null, insuranceExpiryDate: insuranceDeadline || null, gearboxCondition: gearboxCondition || null });
    if (!result.ok) { setError(result.error); setSaving(false); return; }
    const inspection = await replaceVehicleBodyInspectionAction(id, bodyInspection.map(item => ({ partCode: item.part_code, condition: item.condition, paintThicknessMicrons: item.paint_thickness_microns, notes: item.notes }))); if (!inspection.ok) { setError(`ذخیره کارشناسی بدنه ناموفق بود: ${inspection.error}`); setSaving(false); return; }
    if (newImages.length) {
      const maxSort = existingImages.reduce((max, item) => Math.max(max, item.sort_order), -1); const rows: { storagePath: string; thumbnailPath: string; sortOrder: number }[] = []; const uploaded: string[] = [];
      try { for (let i = 0; i < newImages.length; i++) { const processed = await processVehicleImage(newImages[i]); const fileId = crypto.randomUUID(); const storagePath = `${id}/gallery/${fileId}.webp`; const thumbnailPath = `${id}/gallery/thumb/${fileId}.webp`; const main = await supabase.storage.from("vehicle-images").upload(storagePath, processed.mainFile, { cacheControl: "31536000", upsert: false, contentType: "image/webp" }); if (main.error) throw new Error(main.error.message); uploaded.push(storagePath); const thumb = await supabase.storage.from("vehicle-images").upload(thumbnailPath, processed.thumbnailFile, { cacheControl: "31536000", upsert: false, contentType: "image/webp" }); if (thumb.error) throw new Error(thumb.error.message); uploaded.push(thumbnailPath); rows.push({ storagePath, thumbnailPath, sortOrder: maxSort + i + 1 }); } const rowsResult = await createVehicleImageRowsAction(id, rows); if (!rowsResult.ok) throw new Error(rowsResult.error); }
      catch (uploadError) { if (uploaded.length) await supabase.storage.from("vehicle-images").remove(uploaded); setError(uploadError instanceof Error ? uploadError.message : "پردازش یا آپلود تصویر ناموفق بود."); setSaving(false); return; }
    }
    router.push(`/vehicles/${id}`);
  }

  const filteredBrands = initialData.brands.filter(x => `${x.name_fa} ${x.name_en ?? ""}`.toLowerCase().includes(pickerSearch.toLowerCase()));
  const filteredModels = models.filter(x => `${x.name_fa} ${x.name_en ?? ""}`.toLowerCase().includes(pickerSearch.toLowerCase()));
  const filteredTrims = trims.filter(x => `${x.name_fa} ${x.name_en ?? ""}`.toLowerCase().includes(pickerSearch.toLowerCase()));
  if (!vehicle) return <main dir="rtl" className="min-h-screen bg-gray-100 p-6 text-center">خودرو پیدا نشد.</main>;

  return <main dir="rtl" className="min-h-screen bg-gray-100 text-gray-900">
    <header className="border-b border-gray-100 bg-white"><div className="mx-auto max-w-xl px-4 pt-4"><div className="relative flex h-11 items-center justify-center"><button type="button" onClick={() => { setStep(1); setPicker(null); setError(""); }} className="absolute left-0 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-gray-500">پاک کردن</button><h1 className="text-[18px] font-extrabold text-gray-950">ویرایش خودرو</h1><button type="button" aria-label="مرحله قبل" onClick={backStep} className="absolute right-0 flex h-9 w-9 items-center justify-center rounded-full text-gray-700"><KhodroyabChevronIcon className="h-5 w-5" /></button></div><div className="mt-2 flex w-full gap-1.5">{[1,2,3].map(s => <span key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-emerald-500" : "bg-gray-200"}`} />)}</div></div></header>
    <div className="mx-auto max-w-xl px-4 py-6"><div className="mb-6 text-center"><p className="text-[12px] font-medium text-gray-500">{`صفحه ${step.toLocaleString("fa-IR")} از ۳`}</p><h2 className="mt-1 text-[17px] font-bold text-gray-900">{step === 1 ? "تصاویر و توضیحات" : step === 2 ? "مشخصات خودرو" : "تکمیل آگهی"}</h2></div>
      {error && <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <form onSubmit={e => { e.preventDefault(); if (step < 3) nextStep(); else saveVehicle(e); }} className="space-y-6"><section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"><div className="divide-y divide-gray-100">
        {step === 1 && <><div className="px-4 py-5"><div className="mb-4 flex items-center justify-between"><span className="text-[14px] font-bold">عکس آگهی <span className="text-red-500">*</span></span><span className="text-[11px] text-gray-400">حداقل یک عکس</span></div><div className="flex items-start gap-2 overflow-x-auto pb-1"><button type="button" onClick={() => setImageSheetOpen(true)} className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-600"><span className="text-2xl">＋</span><span className="text-[10px] font-semibold">افزودن عکس</span></button>{existingImages.map(image => <div key={image.id} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100"><img src={imageUrl(image.storage_path)} alt="عکس خودرو" className="h-full w-full object-cover"/><button type="button" onClick={() => deleteExistingImage(image)} disabled={deletingImageId === image.id} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">×</button></div>)}{newImagePreviews.map(({ index, url }) => <div key={`${url}-${index}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100"><img src={url} alt={`عکس ${index + 1}`} className="h-full w-full object-cover"/><button type="button" onClick={() => setNewImages(current => current.filter((_, i) => i !== index))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">×</button></div>)}</div></div><input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleNewImages(e.target.files)}/><input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleNewImages(e.target.files)}/><button type="button" onClick={() => openPicker("vehicle")} className="flex min-h-[64px] w-full items-center justify-between px-4 text-right"><span className="text-[14px] font-semibold text-gray-700">برند و مدل <span className="text-red-500">*</span></span><span className={`flex items-center gap-2 text-[14px] font-bold ${brand && model ? "text-red-600" : "text-gray-400"}`}>{brand && model ? `${brand} ${model}` : "انتخاب"}<span>‹</span></span></button></>}
        {step === 2 && <>{[["mileage","کارکرد (کیلومتر)",mileage ? `${formatPersianInteger(mileage)} کیلومتر` : "انتخاب"],["fuel","نوع سوخت",fuelType || "انتخاب"],["year","مدل (سال تولید)",modelYear ? Number(modelYear).toLocaleString("fa-IR",{useGrouping:false}) : "انتخاب"],["color","رنگ",color || "انتخاب"],["price","قیمت خودرو (تومان)",price ? `${formatPersianInteger(price)} تومان` : "انتخاب"]].map(([key,label,value]) => <button key={key} type="button" onClick={() => openPicker(key as Picker)} className="flex min-h-[64px] w-full items-center justify-between px-4 text-right"><span className="text-[14px] font-semibold text-gray-700">{label} <span className="text-red-500">*</span></span><span className={`flex items-center gap-2 text-[14px] font-bold ${value !== "انتخاب" ? "text-red-600" : "text-gray-400"}`}>{value}<span>‹</span></span></button>)}</>}
        {step === 3 && <><div className="space-y-2 px-4 py-3"><div className="text-[14px] font-semibold text-gray-700">وضعیت شاسی <span className="text-red-500">*</span></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { setChassisTarget("front"); openPicker("chassis"); }} className={`flex min-h-[60px] items-center justify-between rounded-xl border px-3 text-right text-[13px] font-bold ${frontChassisCondition ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 bg-white text-gray-500"}`}><span>شاسی جلو</span><span>{frontChassisCondition || "انتخاب"}</span></button><button type="button" onClick={() => { setChassisTarget("rear"); openPicker("chassis"); }} className={`flex min-h-[60px] items-center justify-between rounded-xl border px-3 text-right text-[13px] font-bold ${rearChassisCondition ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 bg-white text-gray-500"}`}><span>شاسی عقب</span><span>{rearChassisCondition || "انتخاب"}</span></button></div></div><div className="my-4"><VehicleBodyInspection parts={bodyParts} value={bodyInspection} onChange={setBodyInspection}/></div>{[["engine","وضعیت موتور",engineCondition],["insurance","مهلت بیمه شخص ثالث",insuranceDeadline ? new Intl.DateTimeFormat("fa-IR").format(new Date(`${insuranceDeadline}T00:00:00`)) : "انتخاب"],["gearboxType","نوع گیربکس",gearboxType],["gearboxCondition","وضعیت گیربکس",gearboxCondition]].map(([key,label,value]) => <button key={key} type="button" onClick={() => openPicker(key as Picker)} className="flex min-h-[64px] w-full items-center justify-between px-4 text-right"><span className="text-[14px] font-semibold text-gray-700">{label}</span><span className={`flex items-center gap-2 text-[14px] font-bold ${value && value !== "انتخاب" ? "text-red-600" : "text-gray-400"}`}>{value || "انتخاب"}<span>‹</span></span></button>)}<section className="box-border w-full rounded-2xl bg-white p-4"><label className="mb-2 block text-[13px] font-semibold text-gray-700">توضیحات</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="box-border block min-h-[110px] w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-[16px] leading-7 outline-none" placeholder="توضیحات خودرو..."/></section></>}
      </div></section><div className="flex gap-2"><button type="button" onClick={backStep} className="flex-1 rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700">{step === 1 ? "انصراف" : "مرحله قبل"}</button><button type="submit" disabled={saving} className="flex-[2] rounded-xl bg-emerald-600 py-3.5 text-sm font-extrabold text-white disabled:opacity-50">{saving ? "در حال ذخیره..." : step < 3 ? "ادامه" : "ذخیره تغییرات"}</button></div></form>
    </div>
    {imageSheetOpen && <div className="fixed inset-0 z-[70] flex items-end bg-black/40" onClick={() => setImageSheetOpen(false)}><div className="w-full rounded-t-3xl bg-white p-5" dir="rtl" onClick={e => e.stopPropagation()}><div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-200"/><button type="button" onClick={() => { setImageSheetOpen(false); cameraInputRef.current?.click(); }} className="flex w-full items-center justify-between border-b border-gray-100 py-4 font-bold">گرفتن عکس با دوربین<span>›</span></button><button type="button" onClick={() => { setImageSheetOpen(false); galleryInputRef.current?.click(); }} className="flex w-full items-center justify-between py-4 font-bold">انتخاب از گالری<span>›</span></button></div></div>}
    {picker && <div className="fixed inset-0 z-[80] bg-white" dir="rtl"><div className="flex h-full flex-col"><header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-4"><button type="button" onClick={closePicker} className="flex h-9 w-9 items-center justify-center text-gray-600"><KhodroyabChevronIcon className="h-5 w-5"/></button><h2 className="text-[17px] font-extrabold">{picker === "vehicle" ? "انتخاب برند و مدل" : picker === "mileage" ? "کارکرد" : picker === "fuel" ? "انتخاب نوع سوخت" : picker === "year" ? "انتخاب سال تولید" : picker === "color" ? "انتخاب رنگ" : picker === "price" ? "قیمت خودرو" : picker === "chassis" ? "وضعیت شاسی" : picker === "engine" ? "وضعیت موتور" : picker === "insurance" ? "مهلت بیمه شخص ثالث" : picker === "gearboxType" ? "نوع گیربکس" : "وضعیت گیربکس"}</h2><div className="w-9"/></header>{!["mileage","price","insurance"].includes(picker) && <div className="border-b border-gray-100 p-4"><input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder="جستجو" className="h-11 w-full rounded-xl bg-gray-100 px-3 text-[14px] outline-none"/></div>}<div className="flex-1 overflow-y-auto p-4">
      {picker === "vehicle" && (!brandId ? filteredBrands.map(item => <button key={item.id} type="button" onClick={() => selectBrand(item)} className="flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 text-right text-[14px] font-semibold">{item.name_fa}<span>‹</span></button>) : !modelId ? <><button type="button" onClick={() => { setBrandId(""); setBrand(""); setModels([]); }} className="mb-3 text-[13px] font-semibold text-gray-500">تغییر برند</button>{filteredModels.map(item => <button key={item.id} type="button" onClick={() => selectModel(item)} className="flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 text-right text-[14px] font-semibold">{item.name_fa}<span>‹</span></button>)}</> : <><button type="button" onClick={() => { setModelId(""); setModel(""); setTrims([]); }} className="mb-3 text-[13px] font-semibold text-gray-500">تغییر مدل</button>{filteredTrims.length === 0 ? <button type="button" onClick={closePicker} className="flex min-h-[56px] w-full border-b border-gray-100 px-2 text-right font-semibold">بدون انتخاب تیپ</button> : filteredTrims.map(item => <button key={item.id} type="button" onClick={() => selectTrim(item)} className={`flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 text-right font-semibold ${trim === item.name_fa ? "text-red-600" : "text-gray-900"}`}>{item.name_fa}<span>‹</span></button>)}</>}
      {picker === "mileage" && <div className="space-y-4"><input autoFocus inputMode="numeric" value={mileage} onChange={e => setMileage(normalizeDigits(e.target.value))} className="h-14 w-full rounded-xl border border-gray-200 px-4 text-center text-xl outline-none" placeholder="مثلاً ۵۰۰۰۰"/><button type="button" onClick={closePicker} className="w-full rounded-xl bg-emerald-600 py-4 font-bold text-white">تأیید {mileage ? `${formatPersianInteger(mileage)} کیلومتر` : ""}</button></div>}
      {picker === "price" && <div className="space-y-4"><input autoFocus inputMode="numeric" value={price} onChange={e => setPrice(normalizeDigits(e.target.value))} className="h-14 w-full rounded-xl border border-gray-200 px-4 text-center text-xl outline-none" placeholder="مثلاً ۱۵۰۰۰۰۰۰۰۰"/><button type="button" onClick={closePicker} className="w-full rounded-xl bg-emerald-600 py-4 font-bold text-white">تأیید {price ? `${formatPersianInteger(price)} تومان` : ""}</button></div>}
      {picker === "fuel" && FUEL_OPTIONS.filter(x => x.includes(pickerSearch)).map(x => <button key={x} type="button" onClick={() => { setFuelType(x); closePicker(); }} className={`flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 font-semibold ${fuelType === x ? "text-red-600" : ""}`}>{x}<span>‹</span></button>)}
      {picker === "year" && YEARS.map(y => <button key={y} type="button" onClick={() => { setModelYear(String(y)); closePicker(); }} className={`mb-2 flex min-h-[54px] w-full items-center justify-center rounded-xl border font-bold ${modelYear === String(y) ? "border-red-500 bg-red-50 text-red-600" : "border-gray-200"}`}>{y.toLocaleString("fa-IR",{useGrouping:false})} — {(y+621).toLocaleString("fa-IR",{useGrouping:false})}</button>)}
      {picker === "color" && COLOR_OPTIONS.filter(x => x.includes(pickerSearch)).map(x => <button key={x} type="button" onClick={() => { setColor(x); closePicker(); }} className={`flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 font-semibold ${color === x ? "text-red-600" : ""}`}>{x}<span>‹</span></button>)}
      {picker === "chassis" && CHASSIS_OPTIONS.filter(x => x.includes(pickerSearch)).map(x => <button key={x} type="button" onClick={() => { if (chassisTarget === "front") setFrontChassisCondition(x); else setRearChassisCondition(x); closePicker(); }} className="flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 font-semibold">{x}<span>‹</span></button>)}
      {picker === "engine" && ENGINE_OPTIONS.filter(x => x.includes(pickerSearch)).map(x => <button key={x} type="button" onClick={() => { setEngineCondition(x); closePicker(); }} className="flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 font-semibold">{x}<span>‹</span></button>)}
      {picker === "insurance" && <div className="space-y-4"><input type="date" value={insuranceDeadline} onChange={e => setInsuranceDeadline(e.target.value)} className="h-14 w-full rounded-xl border border-gray-200 px-4 text-center"/><button type="button" onClick={closePicker} className="w-full rounded-xl bg-emerald-600 py-4 font-bold text-white">تأیید</button></div>}
      {picker === "gearboxType" && GEARBOX_TYPES.filter(x => x.includes(pickerSearch)).map(x => <button key={x} type="button" onClick={() => { setGearboxType(x); closePicker(); }} className="flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 font-semibold">{x}<span>‹</span></button>)}
      {picker === "gearboxCondition" && GEARBOX_OPTIONS.filter(x => x.includes(pickerSearch)).map(x => <button key={x} type="button" onClick={() => { setGearboxCondition(x); closePicker(); }} className="flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 font-semibold">{x}<span>‹</span></button>)}
    </div></div></div>}
  </main>;
}

function imageUrl(path: string) { return createClient().storage.from("vehicle-images").getPublicUrl(path).data.publicUrl; }
