"use client";

import { normalizeDigits } from "@/lib/utils/numberInput";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getVehicleModelsByBrand, getVehicleTrimsByModel } from "@/lib/data/catalog/clientCatalog";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { processVehicleImage } from "@/lib/images/processVehicleImage";
import VehicleBodyInspection, {
  type BodyPart,
  type Inspection,
} from "@/components/vehicles/VehicleBodyInspection";
import type { VehicleEditPageData } from "@/lib/data/vehicles/getVehicleEditPageData";
import VehicleCatalogSearch, {
  type VehicleCatalogSelection,
} from "@/components/admin/VehicleCatalogSearch";


type VehicleBrand = {
  id: string;
  name_fa: string;
  name_en: string | null;
  slug: string;
};

type VehicleModel = {
  id: string;
  brand_id: string;
  name_fa: string;
  name_en: string | null;
  slug: string;
  vehicle_class: string | null;
  body_type: string | null;
};

type VehicleTrim = {
  id: string;
  model_id: string;
  name_fa: string;
  name_en: string | null;
  slug: string;
  model_year_from: number | null;
  model_year_to: number | null;
  engine: string | null;
  transmission: string | null;
  fuel_type: string | null;
  drivetrain: string | null;
};


type DuplicateVehicle = {
  vehicle_id: string;
  brand: string;
  model: string;
  trim_name: string | null;
  model_year: number | null;
  mileage: number | null;
  color: string | null;
  price: number | null;
  status: string;
  created_at: string;
  similarity_score: number;
  match_level: "strong" | "possible" | "weak";
};

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  trim: string | null;
  model_year: number | null;
  mileage: number | null;
  color: string | null;
  price: number | null;
  description: string | null;
  status: string;
  dealership_id: string;
};

type VehicleImage = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  sort_order: number;
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VEHICLE_IMAGES = 10;

export default function EditVehicleClient({
  initialData,
}: {
  initialData: VehicleEditPageData;
}) {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(
    null
  );
  const [error, setError] = useState(
    initialData.vehicle ? "" : "خودرو پیدا نشد.",
  );
  const [duplicateVehicles, setDuplicateVehicles] =
    useState<DuplicateVehicle[]>([]);
  const [duplicateChecking, setDuplicateChecking] = useState(false);


  const [isAdmin, setIsAdmin] = useState(initialData.profile?.role === "admin");
  const [vehicleDealershipId, setVehicleDealershipId] = useState(
    initialData.vehicle?.dealership_id ?? "",
  );

  const [brand, setBrand] = useState(initialData.vehicle?.brand ?? "");
  const [brandId, setBrandId] = useState(initialData.selectedBrandId ?? "");
  const [model, setModel] = useState(initialData.vehicle?.model ?? "");
  const [modelId, setModelId] = useState(initialData.selectedModelId ?? "");
  const [trim, setTrim] = useState(initialData.vehicle?.trim ?? "");

  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>(initialData.brands);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>(initialData.models);
  const [vehicleTrims, setVehicleTrims] = useState<VehicleTrim[]>(initialData.trims);
  const [vehicleTransmission, setVehicleTransmission] = useState<string | null>(
    initialData.vehicle?.transmission ?? null,
  );
  const [vehicleFuelType, setVehicleFuelType] = useState<string | null>(
    initialData.vehicle?.fuel_type ?? null,
  );

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [trimsLoading, setTrimsLoading] = useState(false);
  const [modelYear, setModelYear] = useState(
    initialData.vehicle?.model_year != null
      ? String(initialData.vehicle.model_year)
      : "",
  );
  const [mileage, setMileage] = useState(
    initialData.vehicle?.mileage != null
      ? String(initialData.vehicle.mileage)
      : "",
  );
  const [color, setColor] = useState(initialData.vehicle?.color ?? "");
  const [price, setPrice] = useState(
    initialData.vehicle?.price != null
      ? String(initialData.vehicle.price)
      : "",
  );
  const [description, setDescription] = useState(
    initialData.vehicle?.description ?? "",
  );
  const [status, setStatus] = useState(initialData.vehicle?.status ?? "available");

  const [bodyParts, setBodyParts] = useState<BodyPart[]>(initialData.bodyParts);
  const [bodyInspection, setBodyInspection] = useState<Inspection[]>(initialData.bodyInspection);
  const [inspectionLoading, setInspectionLoading] = useState(false);

  const [images, setImages] = useState<VehicleImage[]>(initialData.images);
  const [newImages, setNewImages] = useState<File[]>([]);


  async function loadVehicleModels(selectedBrandId: string) {
    const supabase = createClient();

    setModelsLoading(true);

    try {
      const models = await getVehicleModelsByBrand(
        supabase,
        selectedBrandId,
      );

      setVehicleModels(models as VehicleModel[]);
      return models as VehicleModel[];
    } finally {
      setModelsLoading(false);
    }
  }

  async function loadVehicleTrims(selectedModelId: string) {
    const supabase = createClient();

    setTrimsLoading(true);

    try {
      const trims = await getVehicleTrimsByModel(
        supabase,
        selectedModelId,
      );

      setVehicleTrims(trims as VehicleTrim[]);
      return trims as VehicleTrim[];
    } finally {
      setTrimsLoading(false);
    }
  }

  async function handleBrandChange(value: string) {
    const selectedBrand = vehicleBrands.find(
      (item) => item.id === value
    );

    setBrandId(value);
    setBrand(selectedBrand?.name_fa ?? "");

    setModelId("");
    setModel("");
    setTrim("");
    setVehicleModels([]);
    setVehicleTrims([]);

    if (!value) return;

    try {
      await loadVehicleModels(value);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "دریافت مدل‌ها ناموفق بود."
      );
    }
  }

  async function handleModelChange(value: string) {
    const selectedModel = vehicleModels.find(
      (item) => item.id === value
    );

    setModelId(value);
    setModel(selectedModel?.name_fa ?? "");

    setTrim("");
    setVehicleTrims([]);

    if (!value) return;

    try {
      await loadVehicleTrims(value);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "دریافت تیپ‌ها ناموفق بود."
      );
    }
  }

  function handleTrimChange(value: string) {
    const selectedTrim = vehicleTrims.find(
      (item) => item.id === value
    );

    setTrim(selectedTrim?.name_fa ?? "");
  }

  async function handleCatalogSearchSelect(
    selection: VehicleCatalogSelection
  ) {
    setBrandId(selection.brandId);
    setBrand(selection.brandName);

    setModelId("");
    setModel("");
    setTrim("");
    setVehicleModels([]);
    setVehicleTrims([]);

    try {
      const models = await loadVehicleModels(selection.brandId);

      if (!selection.modelId) {
        return;
      }

      const selectedModel = models.find(
        (item) => item.id === selection.modelId
      );

      if (!selectedModel) {
        return;
      }

      setModelId(selectedModel.id);
      setModel(selectedModel.name_fa);

      const trims = await loadVehicleTrims(selectedModel.id);

      if (!selection.trimId) {
        return;
      }

      const selectedTrim = trims.find(
        (item) => item.id === selection.trimId
      );

      if (selectedTrim) {
        setTrim(selectedTrim.name_fa);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "انتخاب خودرو از کاتالوگ ناموفق بود."
      );
    }
  }

  const adminUserFullName =
    initialData.profile?.full_name?.trim() || "مدیر سیستم";

  function getImageUrl(path: string) {
    const supabase = createClient();

    return supabase.storage
      .from("vehicle-images")
      .getPublicUrl(path).data.publicUrl;
  }

  async function checkVehicleDuplicates() {
    if (!brand.trim() || !model.trim()) {
      setDuplicateVehicles([]);
      return;
    }

    setDuplicateChecking(true);

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "check_vehicle_duplicate",
      {
        p_dealership_id: vehicleDealershipId,
        p_brand: brand.trim(),
        p_model: model.trim(),
        p_trim: trim.trim() || null,
        p_model_year: modelYear ? Number(modelYear) : null,
        p_mileage: mileage ? Number(mileage) : null,
        p_color: color.trim() || null,
        p_exclude_vehicle_id: id,
      }
    );

    if (!error) {
      setDuplicateVehicles((data ?? []) as DuplicateVehicle[]);
    }

    setDuplicateChecking(false);
  }

  const initialDuplicateCheckSignatureRef = useRef(
    JSON.stringify([
      vehicleDealershipId,
      brand,
      model,
      trim,
      modelYear,
      mileage,
      color,
    ])
  );

  useEffect(() => {
    if (!vehicleDealershipId) return;

    const currentSignature = JSON.stringify([
      vehicleDealershipId,
      brand,
      model,
      trim,
      modelYear,
      mileage,
      color,
    ]);

    if (
      currentSignature ===
      initialDuplicateCheckSignatureRef.current
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      checkVehicleDuplicates();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [
    vehicleDealershipId,
    brand,
    model,
    trim,
    modelYear,
    mileage,
    color,
  ]);

  function handleNewImages(files: FileList | null) {
    if (!files) return;

    const selected = Array.from(files);

    const remainingSlots =
      MAX_VEHICLE_IMAGES - images.length - newImages.length;

    if (remainingSlots <= 0) {
      setError("حداکثر ۱۰ تصویر برای هر خودرو مجاز است.");
      return;
    }

    const filesToAdd = selected.slice(0, remainingSlots);

    if (selected.length > remainingSlots) {
      setError(
        `حداکثر ۱۰ تصویر برای هر خودرو مجاز است. فقط ${remainingSlots} تصویر اول اضافه می‌شود.`
      );
    } else {
      setError("");
    }

    const invalidType = filesToAdd.find(
      (file) => !file.type.startsWith("image/")
    );

    if (invalidType) {
      setError("فقط فایل‌های تصویری قابل انتخاب هستند.");
      return;
    }

    const oversized = filesToAdd.find(
      (file) => file.size > MAX_IMAGE_SIZE
    );

    if (oversized) {
      setError(
        `حجم فایل "${oversized.name}" بیشتر از ۱۰ مگابایت است.`
      );
      return;
    }

    setNewImages((current) => [...current, ...filesToAdd]);
  }

  function removeNewImage(index: number) {
    setNewImages((current) => current.filter((_, i) => i !== index));
  }

  async function deleteExistingImage(image: VehicleImage) {
    const confirmed = window.confirm(
      "آیا مطمئنی می‌خواهی این تصویر حذف شود؟"
    );

    if (!confirmed) return;

    setDeletingImageId(image.id);
    setError("");

    const supabase = createClient();

    const pathsToRemove = [
      image.storage_path,
      ...(image.thumbnail_path ? [image.thumbnail_path] : []),
    ];

    const { error: storageError } = await supabase.storage
      .from("vehicle-images")
      .remove(pathsToRemove);

    if (storageError) {
      setError(
        `حذف فایل تصویر ناموفق بود: ${storageError.message}`
      );
      setDeletingImageId(null);
      return;
    }

    const { error: rowError } = await supabase
      .from("vehicle_images")
      .delete()
      .eq("id", image.id)
      .eq("vehicle_id", id);

    if (rowError) {
      setError(
        `حذف اطلاعات تصویر ناموفق بود: ${rowError.message}`
      );
      setDeletingImageId(null);
      return;
    }

    setImages((current) =>
      current.filter((item) => item.id !== image.id)
    );

    setDeletingImageId(null);
  }

  async function updateVehicle(e: React.FormEvent) {
    e.preventDefault();

    const selectedTrim = vehicleTrims.find(
      (item) => item.name_fa.trim() === trim.trim()
    );

    if (!brand.trim() || !model.trim()) {
      setError("برند و مدل خودرو الزامی است.");
      return;
    }

    const yearValue = modelYear.trim() ? Number(modelYear) : null;
    const mileageValue = mileage.trim() ? Number(mileage) : null;
    const priceValue = price.trim() ? Number(price) : null;

    if (
      yearValue !== null &&
      (!Number.isInteger(yearValue) ||
        yearValue < 1300 ||
        yearValue > 1405)
    ) {
      setError("سال مدل باید بین ۱۳۰۰ تا ۱۵۰۰ باشد.");
      return;
    }

    if (
      mileageValue !== null &&
      (!Number.isInteger(mileageValue) || mileageValue < 0)
    ) {
      setError("کارکرد باید یک عدد صحیح بزرگ‌تر یا مساوی صفر باشد.");
      return;
    }

    if (
      priceValue !== null &&
      (!Number.isInteger(priceValue) || priceValue < 0)
    ) {
      setError("قیمت باید یک عدد صحیح بزرگ‌تر یا مساوی صفر باشد.");
      return;
    }

    if (status !== "available" && status !== "sold") {
      setError("وضعیت خودرو نامعتبر است.");
      return;
    }

    setSaving(true);
    setError("");

    const supabase = createClient();

    const { error: vehicleError } = await supabase
      .from("vehicles")
      .update({
        brand: brand.trim(),
        model: model.trim(),
        trim: trim.trim() || null,
        model_year: yearValue,
        mileage: mileageValue,
        color: color.trim() || null,
        price: priceValue,
        description: description.trim() || null,
        status,
        transmission: selectedTrim?.transmission ?? vehicleTransmission,
        fuel_type: selectedTrim?.fuel_type ?? vehicleFuelType,
      })
      .eq("id", id);

    if (vehicleError) {
      setError(vehicleError.message);
      setSaving(false);
      return;
    }

    /*
     * ذخیره کارشناسی بدنه
     *
     * ابتدا رکوردهای قبلی این خودرو حذف می‌شوند
     * و سپس وضعیت فعلی قطعات ذخیره می‌شود.
     */
    const { error: deleteInspectionError } = await supabase
      .from("vehicle_body_inspections")
      .delete()
      .eq("vehicle_id", id);

    if (deleteInspectionError) {
      setError(
        `پاک‌سازی کارشناسی قبلی ناموفق بود: ${deleteInspectionError.message}`
      );
      setSaving(false);
      return;
    }

    if (bodyInspection.length > 0) {
      const inspectionRows = bodyInspection.map((item) => ({
        vehicle_id: id,
        part_code: item.part_code,
        condition: item.condition,
        paint_thickness_microns:
          item.paint_thickness_microns,
        notes: item.notes,
      }));

      const { error: inspectionError } = await supabase
        .from("vehicle_body_inspections")
        .insert(inspectionRows);

      if (inspectionError) {
        setError(
          `ذخیره کارشناسی بدنه ناموفق بود: ${inspectionError.message}`
        );
        setSaving(false);
        return;
      }
    }

    if (newImages.length > 0) {
      const availableSlots =
        MAX_VEHICLE_IMAGES - images.length;

      if (newImages.length > availableSlots) {
        setError(
          `حداکثر ۱۰ تصویر برای هر خودرو مجاز است.`
        );
        setSaving(false);
        return;
      }

      const maxSortOrder = images.reduce(
        (max, image) => Math.max(max, image.sort_order),
        -1
      );

      const uploadedPaths: string[] = [];
      const createdRows: VehicleImage[] = [];

      try {
        for (let i = 0; i < newImages.length; i++) {
          const sourceFile = newImages[i];

          const processed = await processVehicleImage(sourceFile);
          const fileId = crypto.randomUUID();

          const storagePath =
            `${id}/gallery/${fileId}.webp`;

          const thumbnailPath =
            `${id}/gallery/thumb/${fileId}.webp`;

          const sortOrder =
            maxSortOrder + i + 1;

          const { error: mainUploadError } =
            await supabase.storage
              .from("vehicle-images")
              .upload(
                storagePath,
                processed.mainFile,
                {
                  cacheControl: "31536000",
                  upsert: false,
                  contentType: "image/webp",
                }
              );

          if (mainUploadError) {
            throw new Error(
              `آپلود تصویر "${sourceFile.name}" ناموفق بود: ${mainUploadError.message}`
            );
          }

          uploadedPaths.push(storagePath);

          const { error: thumbnailUploadError } =
            await supabase.storage
              .from("vehicle-images")
              .upload(
                thumbnailPath,
                processed.thumbnailFile,
                {
                  cacheControl: "31536000",
                  upsert: false,
                  contentType: "image/webp",
                }
              );

          if (thumbnailUploadError) {
            throw new Error(
              `آپلود thumbnail تصویر "${sourceFile.name}" ناموفق بود: ${thumbnailUploadError.message}`
            );
          }

          uploadedPaths.push(thumbnailPath);

          const { data: imageRow, error: imageRowError } =
            await supabase
              .from("vehicle_images")
              .insert({
                vehicle_id: id,
                storage_path: storagePath,
                thumbnail_path: thumbnailPath,
                sort_order: sortOrder,
              })
              .select(
                "id, storage_path, thumbnail_path, sort_order"
              )
              .single();

          if (imageRowError || !imageRow) {
            throw new Error(
              `ثبت اطلاعات تصویر "${sourceFile.name}" ناموفق بود: ${
                imageRowError?.message ?? "خطای نامشخص"
              }`
            );
          }

          createdRows.push(imageRow as VehicleImage);
        }
      } catch (imageError) {
        if (createdRows.length > 0) {
          await supabase
            .from("vehicle_images")
            .delete()
            .in(
              "id",
              createdRows.map((row) => row.id)
            );
        }

        if (uploadedPaths.length > 0) {
          await supabase.storage
            .from("vehicle-images")
            .remove(uploadedPaths);
        }

        setError(
          imageError instanceof Error
            ? imageError.message
            : "پردازش یا آپلود تصویر ناموفق بود."
        );
        setSaving(false);
        return;
      }

      setImages((current) =>
        [...current, ...createdRows].sort(
          (a, b) => a.sort_order - b.sort_order
        )
      );

      setNewImages([]);
    }

    router.push(`/vehicles/${id}`);
  }

  if (loading) {
    return (
      <AdminLayout
        title="ویرایش خودرو"
        description="در حال دریافت اطلاعات خودرو..."
      >
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            در حال دریافت اطلاعات خودرو...
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="ویرایش خودرو"
      description="ویرایش اطلاعات خودرو در خودرو‌یاب"
      adminUserFullName={adminUserFullName}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push(`/vehicles/${id}`)}
            className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            بازگشت به جزئیات خودرو
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && (
          <form onSubmit={updateVehicle} className="space-y-6">
          {duplicateChecking && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              در حال بررسی خودروهای مشابه...
            </div>
          )}

          {!duplicateChecking && duplicateVehicles.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <div className="text-xl">⚠️</div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-amber-950">
                    خودروی بسیار مشابه پیدا شد
                  </h3>

                  <p className="mt-1 text-sm leading-7 text-amber-800">
                    یک یا چند خودرو با مشخصات مشابه قبلاً در این نمایشگاه ثبت شده‌اند.
                    ممکن است این خودرو تکراری باشد؛ قبل از ثبت، اطلاعات را بررسی کنید.
                  </p>

                  <div className="mt-4 space-y-2">
                    {duplicateVehicles.map((vehicle) => (
                      <div
                        key={vehicle.vehicle_id}
                        className="rounded-xl border border-amber-200 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-bold text-slate-900">
                            {vehicle.brand} {vehicle.model}
                            {vehicle.trim_name
                              ? ` · ${vehicle.trim_name}`
                              : ""}
                          </div>

                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                            تطابق {vehicle.similarity_score}٪
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          {vehicle.model_year != null && (
                            <span>
                              سال ساخت {vehicle.model_year.toLocaleString("fa-IR", { useGrouping: false })}
                            </span>
                          )}

                          {vehicle.mileage != null && (
                            <span>
                              {vehicle.mileage.toLocaleString("fa-IR")} کیلومتر
                            </span>
                          )}

                          {vehicle.color && (
                            <span>{vehicle.color}</span>
                          )}

                          {vehicle.price != null && (
                            <span>
                              {vehicle.price.toLocaleString("fa-IR")} تومان
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-bold text-slate-950">
                اطلاعات خودرو
              </h2>

              <div className="md:col-span-2">
                <VehicleCatalogSearch
                  label="جستجوی سریع خودرو"
                  placeholder="مثلاً پژو 207 MC، Toyota Corolla..."
                  initialQuery={
                    brand
                      ? [brand, model, trim].filter(Boolean).join(" ")
                      : ""
                  }
                  onSelect={handleCatalogSearchSelect}
                  disabled={loading}
                  initialCatalog={{
                    brands: vehicleBrands,
                    models: vehicleModels,
                    trims: vehicleTrims,
                  }}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-gray-600">
                    برند *
                  </label>

                  <select
                    required
                    value={brandId}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    disabled={catalogLoading}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {catalogLoading ? "در حال دریافت برندها..." : "انتخاب برند"}
                    </option>

                    {vehicleBrands.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name_fa}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-600">
                    مدل *
                  </label>

                  <select
                    required
                    value={modelId}
                    onChange={(e) => handleModelChange(e.target.value)}
                    disabled={!brandId || modelsLoading}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {modelsLoading
                        ? "در حال دریافت مدل‌ها..."
                        : !brandId
                          ? "ابتدا برند را انتخاب کنید"
                          : "انتخاب مدل"}
                    </option>

                    {vehicleModels.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name_fa}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-600">
                    تیپ
                  </label>

                  <select
                    value={
                      vehicleTrims.find(
                        (item) => item.name_fa === trim
                      )?.id ?? ""
                    }
                    onChange={(e) => handleTrimChange(e.target.value)}
                    disabled={!modelId || trimsLoading}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {trimsLoading
                        ? "در حال دریافت تیپ‌ها..."
                        : !modelId
                          ? "ابتدا مدل را انتخاب کنید"
                          : vehicleTrims.length === 0
                            ? "تیپ ثبت‌شده‌ای وجود ندارد"
                            : "انتخاب تیپ"}
                    </option>

                    {vehicleTrims.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name_fa}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-600">
                    سال مدل
                  </label>

                  <select
                    value={modelYear}
                    onChange={(e) => setModelYear(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">انتخاب سال</option>

                    {Array.from(
                      { length: 106 },
                      (_, index) => 1405 - index
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year.toLocaleString("fa-IR", {
                          useGrouping: false,
                        })}{" "}
                        —{" "}
                        {(year + 621).toLocaleString("fa-IR", {
                          useGrouping: false,
                        })}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs text-gray-500">
                    سال شمسی — معادل میلادی
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-600">
                    کارکرد (کیلومتر)
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={mileage}
                    onChange={(e) =>
                      setMileage(
                        normalizeDigits(e.target.value)
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-600">
                    رنگ
                  </label>

                  <input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-600">
                    قیمت (تومان)
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={price}
                    onChange={(e) =>
                      setPrice(
                        normalizeDigits(e.target.value)
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-600">
                    وضعیت
                  </label>

                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none"
                  >
                    <option value="available">موجود</option>
                    <option value="sold">فروخته شده</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm text-gray-600">
                  توضیحات
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  rows={5}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </section>

            <section>
              {inspectionLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                  در حال دریافت اطلاعات کارشناسی بدنه...
                </div>
              ) : bodyParts.length === 0 ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
                  قطعات کارشناسی بدنه در سیستم پیدا نشدند.
                </div>
              ) : (
                <VehicleBodyInspection
                  parts={bodyParts}
                  value={bodyInspection}
                  onChange={setBodyInspection}
                />
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-400">
                  مدیریت تصاویر
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                  تصاویر خودرو
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  می‌توانی تصاویر فعلی را حذف کنی یا تصاویر جدید اضافه کنی.
                </p>
              </div>

              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                    >
                      <div className="aspect-[4/3]">
                        <img
                          src={getImageUrl(image.storage_path)}
                          alt={`${brand} ${model}`}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteExistingImage(image)}
                        disabled={deletingImageId === image.id}
                        className="absolute right-2 top-2 rounded-xl bg-red-600/95 px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingImageId === image.id
                          ? "در حال حذف..."
                          : "حذف"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                  <div className="text-3xl">📷</div>

                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    هنوز تصویری برای این خودرو ثبت نشده است.
                  </p>
                </div>
              )}

              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                <label className="block cursor-pointer">
                  <span className="block text-sm font-bold text-slate-800">
                    افزودن تصاویر جدید
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    حداکثر ۵ مگابایت برای هر تصویر
                  </span>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      handleNewImages(e.target.files);
                      e.currentTarget.value = "";
                    }}
                    className="mt-4 block w-full cursor-pointer rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm"
                  />
                </label>

                {newImages.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-bold text-slate-600">
                      تصاویر آماده برای افزودن:
                    </p>

                    {newImages.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-700">
                            {file.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/vehicles")}
                className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium hover:bg-gray-50"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={saving || inspectionLoading}
                className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
