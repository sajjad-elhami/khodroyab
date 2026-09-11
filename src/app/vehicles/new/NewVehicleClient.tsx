"use client";

import { normalizeDigits } from "@/lib/utils/numberInput";
import type { NewVehiclePageData } from "@/lib/data/vehicles/getVehicleNewPageData";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getVehicleModelsByBrand, getVehicleTrimsByModel } from "@/lib/data/catalog/clientCatalog";
import { processVehicleImage } from "@/lib/images/processVehicleImage";
import { useRouter } from "next/navigation";
import KhodroyabChevronIcon from "@/components/vehicles/KhodroyabChevronIcon";
import VehicleBodyInspection, {
  type BodyPart,
  type Inspection,
} from "@/components/vehicles/VehicleBodyInspection";
import {
  createVehicleAction,
  createVehicleBodyInspectionAction,
  replaceVehicleBodyInspectionAction,
  createVehicleImageRowsAction,
  rollbackVehicleCreationAction,
} from "../mutations";


type DealershipOption = {
  id: string;
  name: string;
  is_active: boolean;
};

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


type EditModeData = {
  vehicleId: string;
  vehicle: {
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
    transmission: string | null;
    fuel_type: string | null;
    chassis_condition: string | null;
    engine_condition: string | null;
    insurance_expiry_date: string | null;
    gearbox_condition: string | null;
  } | null;
  images: Array<{
    id: string;
    storage_path: string;
    thumbnail_path: string | null;
    sort_order: number;
  }>;
  bodyInspection: Inspection[];
  selectedBrandId: string | null;
  selectedModelId: string | null;
};

type Props = {
  initialData: NewVehiclePageData;
  editMode?: EditModeData | null;
};

function formatPersianInteger(value: string): string {
  const digits = normalizeDigits(value).replace(/\D/g, "");
  if (!digits) return "";

  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return grouped.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}


export default function NewVehicleClient({
  initialData,
  editMode = null,
}: Props) {
  const router = useRouter();

  const isEditMode = Boolean(editMode?.vehicleId && editMode.vehicle);

  const dealerships = initialData.dealerships;

  const editVehicle = editMode?.vehicle ?? null;

  const editImages = editMode?.images ?? [];

  const editBodyInspection = editMode?.bodyInspection ?? [];

  const editSelectedBrandId = editMode?.selectedBrandId ?? "";

  const editSelectedModelId = editMode?.selectedModelId ?? "";

  const [dealershipId, setDealershipId] = useState(
    initialData.initialDealershipId ?? ""
  );

  const [brand, setBrand] = useState(editVehicle?.brand ?? "");
  const [model, setModel] = useState(editVehicle?.model ?? "");
  const [trim, setTrim] = useState(editVehicle?.trim ?? "");
  const [modelYear, setModelYear] = useState(
    editVehicle?.model_year == null ? "" : String(editVehicle.model_year)
  );

  const [brandId, setBrandId] = useState(editSelectedBrandId);
  const [modelId, setModelId] = useState("");

  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>(initialData.brands as VehicleBrand[]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [vehicleTrims, setVehicleTrims] = useState<VehicleTrim[]>([]);

  const selectedTrim = vehicleTrims.find(
    (item) => item.name_fa === trim
  );
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [trimsLoading, setTrimsLoading] = useState(false);
  const [mileage, setMileage] = useState(editVehicle?.mileage == null ? "" : String(editVehicle.mileage));
  const [color, setColor] = useState(editVehicle?.color ?? "");
  const [price, setPrice] = useState(editVehicle?.price == null ? "" : String(editVehicle.price));
  const [description, setDescription] = useState(editVehicle?.description ?? "");
  const [status, setStatus] = useState("available");

  const [bodyParts, setBodyParts] = useState<BodyPart[]>(initialData.bodyParts as BodyPart[]);
  const [bodyInspection, setBodyInspection] = useState<Inspection[]>(
    editBodyInspection
  );
  const [bodyCondition, setBodyCondition] = useState("");
  const [frontChassisCondition, setFrontChassisCondition] = useState("");
  const [rearChassisCondition, setRearChassisCondition] = useState("");
  const [chassisTarget, setChassisTarget] = useState<"front" | "rear">("front");
  const chassisCondition = JSON.stringify({
    front: frontChassisCondition,
    rear: rearChassisCondition,
  });
  const [inspectionLoading, setInspectionLoading] = useState(false);

  const [images, setImages] = useState<File[]>([]);
  const [imageSheetOpen, setImageSheetOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [fuelType, setFuelType] = useState(editVehicle?.fuel_type ?? "");
  const [engineCondition, setEngineCondition] = useState(editVehicle?.engine_condition ?? "");
  const [insuranceDeadline, setInsuranceDeadline] = useState("");
  const [insuranceMonths, setInsuranceMonths] = useState<number | null>(null);
  const [gearboxType, setGearboxType] = useState(editVehicle?.transmission ?? "");
  const [gearboxCondition, setGearboxCondition] = useState(editVehicle?.gearbox_condition ?? "");

  const [pickerOpen, setPickerOpen] = useState<
    | "vehicle"
    | "year"
    | "fuel"
    | "color"
    | "price"
    | "mileage"
    | "body"
    | "chassis"
    | "engine"
    | "insurance"
    | "gearboxType"
    | "gearboxCondition"
    | null
  >(null);

  const [pickerSearch, setPickerSearch] = useState("");

  const imagePreviews = useMemo(
    () =>
      images.map((file, index) => ({
        file,
        index,
        url: URL.createObjectURL(file),
      })),
    [images]
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // {isEditMode ? "ویرایش خودرو" : "ثبت خودرو"} — جریان سه‌مرحله‌ای
  const [currentStep, setCurrentStep] = useState(1);

  function clearVehicleForm() {
    setBrand("");
    setModel("");
    setTrim("");
    setModelYear("");
    setBrandId("");
    setModelId("");
    setVehicleTrims([]);
    setMileage("");
    setColor("");
    setPrice("");
    setDescription("");
    setStatus("available");
    setImages([]);
    setImageSheetOpen(false);
    setFuelType("");
    setEngineCondition("");
    setInsuranceDeadline("");
    setInsuranceMonths(null);
    setGearboxType("");
    setGearboxCondition("");
    setBodyCondition("");
    setFrontChassisCondition("");
    setRearChassisCondition("");
    setBodyInspection([]);
    setImages([]);
    setError("");
    setCurrentStep(1);
  }

  function validateStep(step: number) {
    if (step === 1) {
      if (images.length === 0) {
        return "حداقل یک عکس برای آگهی اضافه کنید.";
      }

      if (!brand.trim() || !model.trim()) {
        return "برند و مدل خودرو الزامی است.";
      }

      if (vehicleTrims.length > 0 && !trim.trim()) {
        return "تیپ خودرو را انتخاب کنید.";
      }

      return "";
    }

    if (step === 2) {
      if (!mileage.trim()) {
        return "کارکرد خودرو الزامی است.";
      }

      if (!fuelType.trim()) {
        return "نوع سوخت خودرو را انتخاب کنید.";
      }

      if (!modelYear.trim()) {
        return "مدل (سال تولید) الزامی است.";
      }

      if (!color.trim()) {
        return "رنگ خودرو را انتخاب کنید.";
      }

      if (!price.trim()) {
        return "قیمت خودرو الزامی است.";
      }

      const yearValue = Number(modelYear);
      const mileageValue = Number(mileage);
      const priceValue = Number(price);

      if (
        !Number.isInteger(yearValue) ||
        yearValue < 1300 ||
        yearValue > 1405
      ) {
        return "سال مدل باید بین ۱۳۰۰ تا ۱۴۰۵ باشد.";
      }

      if (
        !Number.isInteger(mileageValue) ||
        mileageValue < 0
      ) {
        return "کارکرد باید یک عدد صحیح بزرگ‌تر یا مساوی صفر باشد.";
      }

      if (
        !Number.isInteger(priceValue) ||
        priceValue < 0
      ) {
        return "قیمت باید یک عدد صحیح بزرگ‌تر یا مساوی صفر باشد.";
      }

      return "";
    }

    if (step === 3) {
      if (!frontChassisCondition.trim() || !rearChassisCondition.trim()) {
        return "وضعیت شاسی جلو و عقب را کامل کنید.";
      }

      return "";
    }

    return "";
  }

  function highlightMissingRegistrationFields() {
    if (currentStep !== 3) return;
    const targets = [
      ["شاسی جلو", !frontChassisCondition.trim()],
      ["شاسی عقب", !rearChassisCondition.trim()],
    ] as const;
    let first: HTMLElement | null = null;
    for (const [label, missing] of targets) {
      const node = Array.from(document.querySelectorAll("button")).find((element) => element.textContent?.includes(label)) as HTMLButtonElement | undefined;
      if (!node) continue;
      if (missing) {
        node.classList.add("border-red-400", "bg-red-50", "text-red-700", "ring-2", "ring-red-100");
        if (!first) first = node;
      } else {
        node.classList.remove("border-red-400", "bg-red-50", "text-red-700", "ring-2", "ring-red-100");
      }
    }
    first?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function goNextStep() {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      requestAnimationFrame(highlightMissingRegistrationFields);
      return;
    }
    setError("");
    setCurrentStep((step) => Math.min(step + 1, 3));
  }


  function goBackRegistrationStep() {
    setError("");
    if (pickerOpen) {
      setPickerOpen(null);
      setPickerSearch("");
      return;
    }

    if (currentStep > 1) {
      setCurrentStep((step) => step - 1);
      return;
    }

    router.back();
  }

  function openChassisPicker(target: "front" | "rear") {
    setChassisTarget(target);
    openPicker("chassis");
  }

  useEffect(() => {
    if (!brandId) {
      setVehicleModels([]);
      setVehicleTrims([]);
      setModelId("");
      setModel("");
      setTrim("");
      return;
    }

    loadVehicleModels(brandId);
  }, [brandId]);

  async function loadVehicleModels(selectedBrandId: string) {
    setModelsLoading(true);

    const supabase = createClient();

    try {
      const models = await getVehicleModelsByBrand(
        supabase,
        selectedBrandId,
      );

      setVehicleModels(models as VehicleModel[]);
    } catch (error) {
      setError(
        `دریافت مدل‌های برند ناموفق بود: ${
          error instanceof Error ? error.message : "خطای نامشخص"
        }`,
      );
      setVehicleModels([]);
    } finally {
      setModelsLoading(false);
    }
  }

  useEffect(() => {
    if (!modelId) {
      setVehicleTrims([]);
      setTrim("");
      return;
    }

    loadVehicleTrims(modelId);
  }, [modelId]);

  async function loadVehicleTrims(selectedModelId: string) {
    setTrimsLoading(true);

    const supabase = createClient();

    try {
      const trims = await getVehicleTrimsByModel(
        supabase,
        selectedModelId,
      );

      setVehicleTrims(trims as VehicleTrim[]);
    } catch (error) {
      setError(
        `دریافت تیپ‌های مدل ناموفق بود: ${
          error instanceof Error ? error.message : "خطای نامشخص"
        }`,
      );
      setVehicleTrims([]);
    } finally {
      setTrimsLoading(false);
    }
  }

  function handleBrandChange(value: string) {
    const selected = vehicleBrands.find((item) => item.id === value);

    setBrandId(value);
    setBrand(selected?.name_fa ?? "");

    setModelId("");
    setModel("");
    setTrim("");
    setVehicleModels([]);
    setVehicleTrims([]);
  }

  function handleModelChange(value: string) {
    const selected = vehicleModels.find((item) => item.id === value);

    setModelId(value);
    setModel(selected?.name_fa ?? "");
    setTrim("");
    setVehicleTrims([]);
  }

  function handleTrimChange(value: string) {
    setTrim(value);
  }

  async function handleImages(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles = Array.from(e.target.files ?? []);

    if (selectedFiles.length === 0) {
      e.target.value = "";
      return;
    }

    const remainingSlots = 10 - images.length;

    if (remainingSlots <= 0) {
      setError("حداکثر ۱۰ تصویر برای هر خودرو مجاز است.");
      e.target.value = "";
      return;
    }

    const filesToAdd = selectedFiles.slice(0, remainingSlots);

    if (selectedFiles.length > remainingSlots) {
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
      e.target.value = "";
      return;
    }

    const oversized = filesToAdd.find(
      (file) => file.size > 10 * 1024 * 1024
    );

    if (oversized) {
      setError(
        `حجم فایل "${oversized.name}" بیشتر از ۱۰ مگابایت است.`
      );
      e.target.value = "";
      return;
    }

    setImages((current) => [...current, ...filesToAdd]);

    e.target.value = "";
    setImageSheetOpen(false);
    setCurrentStep(1);
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, i) => i !== index));
  }

  function formatInsuranceDate(value: string) {
    if (!value) {
      return "انتخاب";
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return "انتخاب";
    }

    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  function openPicker(
    picker:
      | "vehicle"
      | "year"
      | "fuel"
      | "color"
      | "price"
      | "mileage"
      | "body"
      | "chassis"
      | "engine"
      | "insurance"
      | "gearboxType"
      | "gearboxCondition"
  ) {
    setPickerSearch("");
    setPickerOpen(picker);
  }

  function selectVehicle(modelItem: VehicleModel) {
    setModelId(modelItem.id);
    setModel(modelItem.name_fa);
    setTrim("");
    setVehicleTrims([]);
    setPickerSearch("");
  }

  function selectTrim(item: VehicleTrim) {
    setTrim(item.name_fa);

    if (item.fuel_type) {
      setFuelType(item.fuel_type);
    }

    if (item.transmission) {
      setGearboxType(item.transmission);
    }

    setPickerOpen(null);
    setPickerSearch("");
  }

  function selectBrandAndOpenModel(brandItem: VehicleBrand) {
    setBrandId(brandItem.id);
    setBrand(brandItem.name_fa);
    setModelId("");
    setModel("");
    setTrim("");
    setVehicleModels([]);
    setVehicleTrims([]);
    loadVehicleModels(brandItem.id);
  }

  function selectFuel(value: string) {
    setFuelType(value);
    setPickerOpen(null);
  }

  function selectColor(value: string) {
    setColor(value);
    setPickerOpen(null);
  }

  function selectBody(value: string) {
    setPickerOpen(null);
    setBodyInspection((current) => [
      ...current,
      {
        part_code: "overall_body",
        condition: value,
        paint_thickness_microns: null,
        notes: null,
      },
    ]);
  }

  function clearRegistrationForm() {
    setDealershipId(initialData.initialDealershipId ?? "");
    setBrand("");
    setModel("");
    setTrim("");
    setModelYear("");
    setBrandId("");
    setModelId("");
    setVehicleModels([]);
    setVehicleTrims([]);
    setMileage("");
    setColor("");
    setPrice("");
    setDescription("");
    setStatus("available");
    setBodyInspection([]);
    setImages([]);
    setFuelType("");
    setEngineCondition("");
    setInsuranceDeadline("");
    setGearboxType("");
    setGearboxCondition("");
    setPickerOpen(null);
    setPickerSearch("");
    setError("");
    setImageSheetOpen(false);
  }


  async function submitVehicle(e: React.FormEvent) {
    e.preventDefault();

    if (isEditMode && editMode?.vehicleId && editVehicle) {
      const valid1 = validateStep(1);
      const valid2 = validateStep(2);
      const valid3 = validateStep(3);

      if (!valid1 || !valid2 || !valid3) {
        return;
      }

      setSaving(true);
      setError("");

      try {
        const { updateEditableVehicleAction } = await import(
          "@/app/vehicles/[id]/edit/editActions"
        );

        await updateEditableVehicleAction({
          vehicleId: editMode.vehicleId,
          brand,
          model,
          trim: trim.trim() || null,
          modelYear: Number(modelYear),
          mileage: Number(mileage),
          color: color.trim() || null,
          price: Number(price),
          description: description.trim() || null,
          status: editVehicle.status === "sold" ? "sold" : "available",
          transmission: gearboxType || null,
          fuelType: fuelType || null,
          chassisCondition: JSON.stringify({
            front: frontChassisCondition,
            rear: rearChassisCondition,
          }),
          engineCondition: engineCondition || null,
          insuranceExpiryDate: insuranceDeadline || null,
          gearboxCondition: gearboxCondition || null,
        });

        const inspectionResult = await replaceVehicleBodyInspectionAction(
          editMode.vehicleId,
          bodyInspection.map((item) => ({
            partCode: item.part_code,
            condition: item.condition,
            paintThicknessMicrons: item.paint_thickness_microns,
            notes: item.notes,
          })),
        );

        if (!inspectionResult.ok) {
          throw new Error(
            `ثبت اطلاعات کارشناسی بدنه ناموفق بود: ${inspectionResult.error}`
          );
        }

        if (images.length > 0) {
          const uploadedImagePaths: string[] = [];
          const imageRows: Array<{
            storagePath: string;
            thumbnailPath: string;
            sortOrder: number;
          }> = [];

          try {
            for (let i = 0; i < images.length; i += 1) {
              const sourceFile = images[i];
              const processed = await processVehicleImage(sourceFile);

              const basePath =
                `${editMode.vehicleId}/${crypto.randomUUID()}`;

              const storagePath = `${basePath}.webp`;
              const thumbnailPath = `${basePath}-thumb.webp`;

              const supabase = createClient();

              const { error: uploadError } = await supabase.storage
                .from("vehicle-images")
                .upload(storagePath, processed.mainFile, {
                  cacheControl: "31536000",
                  upsert: false,
                  contentType: "image/webp",
                });

              if (uploadError) {
                throw new Error(
                  `آپلود تصویر "${sourceFile.name}" ناموفق بود: ${uploadError.message}`
                );
              }

              uploadedImagePaths.push(storagePath);

              const { error: thumbnailUploadError } =
                await supabase.storage
                  .from("vehicle-images")
                  .upload(thumbnailPath, processed.thumbnailFile, {
                    cacheControl: "31536000",
                    upsert: false,
                    contentType: "image/webp",
                  });

              if (thumbnailUploadError) {
                throw new Error(
                  `آپلود thumbnail تصویر "${sourceFile.name}" ناموفق بود: ${thumbnailUploadError.message}`
                );
              }

              uploadedImagePaths.push(thumbnailPath);

              imageRows.push({
                storagePath,
                thumbnailPath,
                sortOrder: editImages.length + i,
              });
            }

            const imageRowsResult = await createVehicleImageRowsAction(
              editMode.vehicleId,
              imageRows,
            );

            if (!imageRowsResult.ok) {
              throw new Error(
                `ثبت اطلاعات تصاویر ناموفق بود: ${imageRowsResult.error}`
              );
            }
          } catch (imageError) {
            if (uploadedImagePaths.length > 0) {
              await createClient()
                .storage
                .from("vehicle-images")
                .remove(uploadedImagePaths);
            }

            throw imageError;
          }
        }

        router.push(`/vehicles/${editMode.vehicleId}`);
        return;
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "ذخیره تغییرات با خطا مواجه شد."
        );
      } finally {
        setSaving(false);
      }

      return;
    }

    e.preventDefault();

    if (!dealershipId) {
      setError("نمایشگاه را انتخاب کنید.");
      return;
    }

    const finalValidationError = validateStep(1) || validateStep(2) || validateStep(3);

    if (finalValidationError) {
      setError(finalValidationError);
      return;
    }

    if (status !== "available" && status !== "sold") {
      setError("وضعیت خودرو نامعتبر است.");
      return;
    }

    const yearValue = modelYear.trim() ? Number(modelYear) : null;
    const mileageValue = mileage.trim() ? Number(mileage) : null;
    const priceValue = price.trim() ? Number(price) : null;

    if (
      yearValue === null ||
      !Number.isInteger(yearValue) ||
      yearValue < 1300 ||
      yearValue > 1405
    ) {
      setError("سال مدل باید بین ۱۳۰۰ تا ۱۴۰۵ باشد.");
      return;
    }

    if (
      mileageValue === null ||
      !Number.isInteger(mileageValue) ||
      mileageValue < 0
    ) {
      setError("کارکرد باید یک عدد صحیح بزرگ‌تر یا مساوی صفر باشد.");
      return;
    }

    if (
      priceValue === null ||
      !Number.isInteger(priceValue) ||
      priceValue < 0
    ) {
      setError("قیمت باید یک عدد صحیح بزرگ‌تر یا مساوی صفر باشد.");
      return;
    }

    setSaving(true);
    setError("");

    const bodyConditionPriority = [
      "stretched",
      "welded",
      "damaged",
      "replaced",
      "putty",
      "repaired",
      "painted",
      "spot_repair",
      "unknown",
    ];

    const bodyConditionLabels: Record<string, string> = {
      painted: "رنگ‌شده",
      spot_repair: "لکه‌گیری",
      putty: "بتونه",
      replaced: "تعویض‌شده",
      damaged: "ضربه‌دار",
      repaired: "تعمیرشده",
      welded: "جوش‌خورده",
      stretched: "کشیده‌شده",
      unknown: "نامشخص",
    };

    const inspectedConditions = new Set(
      bodyInspection
        .map((item) => item.condition)
        .filter((condition) => condition !== "intact"),
    );

    const derivedBodyCondition =
      bodyConditionPriority
        .map((condition) => bodyConditionLabels[condition])
        .find((_, index) =>
          inspectedConditions.has(bodyConditionPriority[index]),
        ) || "سالم";

    const vehicleResult = await createVehicleAction({
      dealershipId,
      brand,
      model,
      trim: trim.trim() || null,
      modelYear: yearValue,
      mileage: mileageValue,
      color: color.trim() || null,
      price: priceValue,
      description,
      status,
      transmission: gearboxType || selectedTrim?.transmission || null,
      fuelType: fuelType || selectedTrim?.fuel_type || null,
      bodyCondition: derivedBodyCondition,
      chassisCondition: chassisCondition || null,
      engineCondition: engineCondition || null,
      insuranceExpiryDate: insuranceDeadline || null,
      gearboxCondition: gearboxCondition || null,
    });

    if (!vehicleResult.ok) {
      setError(vehicleResult.error);
      setSaving(false);
      return;
    }

    const vehicleId = vehicleResult.vehicleId;

    /*
     * ذخیره کارشناسی بدنه
     */
    if (bodyInspection.length > 0) {
      const inspectionResult = await createVehicleBodyInspectionAction(
        vehicleId,
        bodyInspection.map((item) => ({
          partCode: item.part_code,
          condition: item.condition,
          paintThicknessMicrons: item.paint_thickness_microns,
          notes: item.notes,
        })),
      );

      if (!inspectionResult.ok) {
        await rollbackVehicleCreationAction(vehicleId);
        setError(
          `ذخیره کارشناسی بدنه ناموفق بود: ${inspectionResult.error}`
        );
        setSaving(false);
        return;
      }
    }

    /*
     * پردازش و آپلود تصاویر
     *
     * تصویر اصلی:
     *   {vehicle_id}/gallery/{uuid}.webp
     *
     * thumbnail:
     *   {vehicle_id}/gallery/thumb/{uuid}.webp
     */
    const uploadedImagePaths: string[] = [];
    const imageRows: {
      storagePath: string;
      thumbnailPath: string;
      sortOrder: number;
    }[] = [];

    try {
      for (let i = 0; i < images.length; i++) {
        const sourceFile = images[i];

        const processed = await processVehicleImage(sourceFile);
        const fileId = crypto.randomUUID();

        const storagePath =
          `${vehicleId}/gallery/${fileId}.webp`;

        const thumbnailPath =
          `${vehicleId}/gallery/thumb/${fileId}.webp`;

        const { error: mainUploadError } = await createClient().storage
          .from("vehicle-images")
          .upload(storagePath, processed.mainFile, {
            cacheControl: "31536000",
            upsert: false,
            contentType: "image/webp",
          });

        if (mainUploadError) {
          throw new Error(
            `آپلود تصویر "${sourceFile.name}" ناموفق بود: ${mainUploadError.message}`
          );
        }

        uploadedImagePaths.push(storagePath);

        const { error: thumbnailUploadError } =
          await createClient().storage
            .from("vehicle-images")
            .upload(thumbnailPath, processed.thumbnailFile, {
              cacheControl: "31536000",
              upsert: false,
              contentType: "image/webp",
            });

        if (thumbnailUploadError) {
          throw new Error(
            `آپلود thumbnail تصویر "${sourceFile.name}" ناموفق بود: ${thumbnailUploadError.message}`
          );
        }

        uploadedImagePaths.push(thumbnailPath);

        imageRows.push({
          storagePath,
          thumbnailPath,
          sortOrder: i,
        });
      }

      const imageRowsResult = await createVehicleImageRowsAction(
        vehicleId,
        imageRows,
      );

      if (!imageRowsResult.ok) {
        throw new Error(
          `ثبت اطلاعات تصاویر ناموفق بود: ${imageRowsResult.error}`
        );
      }
    } catch (imageError) {
      // Storage uploads stay client-side; clean up any files uploaded so far.
      if (uploadedImagePaths.length > 0) {
        await createClient().storage
          .from("vehicle-images")
          .remove(uploadedImagePaths);
      }

      // DB rollback stays server-side and re-checks authorization.
      await rollbackVehicleCreationAction(vehicleId);

      setError(
        imageError instanceof Error
          ? imageError.message
          : "پردازش یا آپلود تصویر ناموفق بود."
      );
      setSaving(false);
      return;
    }

    if (vehicleResult.isAdmin && dealershipId) {
      router.push(`/dealerships/${dealershipId}`);
    } else {
      router.push("/vehicles");
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gray-100 text-gray-900"
    >
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 pb-0 pt-4 sm:px-6">
          <div className="relative flex h-11 items-center justify-center">
            <button
              type="button"
              onClick={clearRegistrationForm}
              className="absolute left-0 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
            >
              پاک کردن
            </button>

            <h1 className="text-[18px] font-extrabold text-gray-950">
              {isEditMode ? "ویرایش خودرو" : "ثبت خودرو"}
            </h1>

            <button
              type="button"
              aria-label="مرحله قبل"
              onClick={goBackRegistrationStep}
              className="absolute right-0 flex h-9 w-9 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-50 active:scale-95"
            >
              <KhodroyabChevronIcon className="h-5 w-5" />
            </button>
          </div>

          <div
            className="mt-2 -mx-4 flex h-2 w-[calc(100%+2rem)] gap-1.5 bg-gray-100 px-4"
            aria-label={isEditMode ? "مراحل ویرایش خودرو" : "مراحل ثبت خودرو"}
          >
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={`h-2 flex-1 ${
                  currentStep >= step ? "bg-emerald-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 text-center">
          <p className="text-[12px] font-medium text-gray-500">
            {`صفحه ${currentStep.toLocaleString("fa-IR")} از ۳`}
          </p>
          <h2 className="mt-1 text-[17px] font-bold text-gray-900">
              {currentStep === 1
              ? "تصاویر و توضیحات"
              : currentStep === 2
                ? "مشخصات خودرو"
                : "تکمیل آگهی"}
            </h2>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();

            if (currentStep < 3) {
              goNextStep();
              return;
            }

            const validationError = validateStep(3);

            if (validationError) {
              setError(validationError);
              return;
            }

            submitVehicle(e);
          }}
          className="space-y-6"
        >
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="divide-y divide-gray-100">

              {currentStep === 1 && (
                <>
              {/* تصاویر */}
              <div className="px-4 py-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-gray-900">
                    عکس آگهی <span className="text-red-500">*</span>
                  </span>

                  <span className="text-[11px] text-gray-400">
                    حداقل یک عکس
                  </span>
                </div>

                <div className="flex items-start gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-600 active:scale-[0.98]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-6 w-6"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 8.5A2.5 2.5 0 017.5 6h1.7l1.1-1.5h3.4L14.8 6h1.7A2.5 2.5 0 0119 8.5v8A2.5 2.5 0 0116.5 19h-9A2.5 2.5 0 015 16.5v-8Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="12.5"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>

                    <span className="mt-1 text-[10px] font-semibold">
                      افزودن عکس
                    </span>
                  </button>

                  {imagePreviews.map(({ file, index, url }) => (
                    <div
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100"
                    >
                      <img
                        src={url}
                        alt={`عکس ${index + 1}`}
                        className="h-full w-full object-cover"
                      />

                      <button
                        type="button"
                        aria-label={`حذف عکس ${index + 1}`}
                        onClick={() => removeImage(index)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        >
                          <path
                            d="M6 6l12 12M18 6L6 18"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImages}
              />

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImages}
              />

              {/* برند و مدل */}
              <button
                type="button"
                onClick={() => openPicker("vehicle")}
                className="flex min-h-[64px] w-full items-center justify-between px-4 text-right active:bg-gray-50"
              >
                <span className="text-[14px] font-semibold text-gray-700">
                  برند و مدل <span className="text-red-500">*</span>
                </span>

                <span
                  className={`flex items-center gap-2 text-[14px] font-bold ${
                    brand && model ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {brand && model ? `${brand} ${model}` : "انتخاب"}

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M15 5l-7 7 7 7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
                </>
              )}

              {currentStep === 2 && (
                <>
              {/* کارکرد */}
              <button
                type="button"
                onClick={() => openPicker("mileage")}
                className="flex min-h-[64px] w-full items-center justify-between px-4 text-right active:bg-gray-50"
              >
                <span className="text-[14px] font-semibold text-gray-700">
                  کارکرد (کیلومتر) <span className="text-red-500">*</span>
                </span>

                <span
                  className={`flex items-center gap-2 text-[14px] font-bold ${
                    mileage ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {mileage ? `${formatPersianInteger(mileage)} کیلومتر` : "انتخاب"}

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M15 5l-7 7 7 7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              {/* سوخت */}
              <button
                type="button"
                onClick={() => openPicker("fuel")}
                className="flex min-h-[64px] w-full items-center justify-between px-4 text-right active:bg-gray-50"
              >
                <span className="text-[14px] font-semibold text-gray-700">
                  نوع سوخت <span className="text-red-500">*</span>
                </span>

                <span
                  className={`flex items-center gap-2 text-[14px] font-bold ${
                    fuelType ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {fuelType || "انتخاب"}

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M15 5l-7 7 7 7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              {/* سال */}
              <button
                type="button"
                onClick={() => openPicker("year")}
                className="flex min-h-[64px] w-full items-center justify-between px-4 text-right active:bg-gray-50"
              >
                <span className="text-[14px] font-semibold text-gray-700">
                  مدل (سال تولید) <span className="text-red-500">*</span>
                </span>

                <span
                  className={`flex items-center gap-2 text-[14px] font-bold ${
                    modelYear ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {modelYear
                    ? Number(modelYear).toLocaleString("fa-IR", {
                        useGrouping: false,
                      })
                    : "انتخاب"}

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M15 5l-7 7 7 7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              {/* رنگ */}
              <button
                type="button"
                onClick={() => openPicker("color")}
                className="flex min-h-[64px] w-full items-center justify-between px-4 text-right active:bg-gray-50"
              >
                <span className="text-[14px] font-semibold text-gray-700">
                  رنگ <span className="text-red-500">*</span>
                </span>

                <span
                  className={`flex items-center gap-2 text-[14px] font-bold ${
                    color ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {color || "انتخاب"}

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M15 5l-7 7 7 7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              {/* قیمت */}
              <button
                type="button"
                onClick={() => openPicker("price")}
                className="flex min-h-[64px] w-full items-center justify-between px-4 text-right active:bg-gray-50"
              >
                <span className="text-[14px] font-semibold text-gray-700">
                  قیمت خودرو (تومان) <span className="text-red-500">*</span>
                </span>

                <span
                  className={`flex items-center gap-2 text-[14px] font-bold ${
                    price ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {price ? `${formatPersianInteger(price)} تومان` : "انتخاب"}

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M15 5l-7 7 7 7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
                </>
              )}

              {currentStep === 3 && (
                <>
              {/* شاسی */}
              <div className="space-y-2 px-4 py-3">
                <div className="text-[14px] font-semibold text-gray-700">
                  وضعیت شاسی <span className="text-red-500">*</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openChassisPicker("front")} className={`flex min-h-[60px] items-center justify-between rounded-xl border px-3 text-right text-[13px] font-bold transition ${frontChassisCondition ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 bg-white text-gray-500"}`}>
                    <span>شاسی جلو</span><span>{frontChassisCondition || "انتخاب"}</span>
                  </button>
                  <button type="button" onClick={() => openChassisPicker("rear")} className={`flex min-h-[60px] items-center justify-between rounded-xl border px-3 text-right text-[13px] font-bold transition ${rearChassisCondition ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 bg-white text-gray-500"}`}>
                    <span>شاسی عقب</span><span>{rearChassisCondition || "انتخاب"}</span>
                  </button>
                </div>
              </div>

              <div className="my-4">
                <VehicleBodyInspection
                  parts={bodyParts}
                  value={bodyInspection}
                  onChange={setBodyInspection}
                />
              </div>

              {/* موتور */}
              <button
                type="button"
                onClick={() => openPicker("engine")}
                className="flex min-h-[64px] w-full items-center justify-between px-4 text-right active:bg-gray-50"
              >
                <span className="text-[14px] font-semibold text-gray-700">
                  وضعیت موتور
                </span>

                <span
                  className={`flex items-center gap-2 text-[14px] font-bold ${
                    engineCondition ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {engineCondition || "انتخاب"}
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M15 5l-7 7 7 7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              {/* بیمه */}
              <button
                type="button"
                onClick={() => openPicker("insurance")}
                className="flex min-h-[64px] w-full items-center justify-between px-4 text-right active:bg-gray-50"
              >
                <span className="text-[14px] font-semibold text-gray-700">
                  مهلت بیمه شخص ثالث
                </span>

                <span
                  className={`flex items-center gap-2 text-[14px] font-bold ${
                    insuranceDeadline ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {formatInsuranceDate(insuranceDeadline)}
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M15 5l-7 7 7 7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              {/* گیربکس */}
              <button
                type="button"
                onClick={() => openPicker("gearboxType")}
                className="flex min-h-[64px] w-full items-center justify-between px-4 text-right active:bg-gray-50"
              >
                <span className="text-[14px] font-semibold text-gray-700">
                  نوع گیربکس
                </span>

                <span
                  className={`flex items-center gap-2 text-[14px] font-bold ${
                    gearboxType ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {gearboxType || "انتخاب"}
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M15 5l-7 7 7 7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              {/* وضعیت گیربکس */}
              <button
                type="button"
                onClick={() => openPicker("gearboxCondition")}
                className="flex min-h-[64px] w-full items-center justify-between px-4 text-right active:bg-gray-50"
              >
                <span className="text-[14px] font-semibold text-gray-700">
                  وضعیت گیربکس
                </span>

                <span
                  className={`flex items-center gap-2 text-[14px] font-bold ${
                    gearboxCondition ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {gearboxCondition || "انتخاب"}
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M15 5l-7 7 7 7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              {/* توضیحات */}
              <section className="box-border w-full max-w-full rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <label
                  htmlFor="vehicle-description"
                  className="mb-2 block text-[13px] font-semibold text-gray-700"
                >
                  توضیحات
                </label>

                <textarea
                  id="vehicle-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="box-border block min-h-[110px] w-full max-w-full min-w-0 resize-none overflow-x-hidden rounded-xl border border-gray-200 bg-white px-3 py-3 text-[16px] leading-7 text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300"
                  placeholder="توضیحات خودرو..."
                />
              </section>
                </>
              )}
            </div>
          </section>

          {/* picker */}
          {pickerOpen && (
            <div className="fixed inset-0 z-[60] bg-white" dir="rtl">
              <div className="flex h-full flex-col">

                <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPickerOpen(null);
                      setPickerSearch("");
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600"
                    aria-label="بازگشت"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5"
                    >
                      <path
                        d="M15 5l-7 7 7 7"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  <h2 className="text-[17px] font-extrabold text-gray-950">
                    {pickerOpen === "vehicle"
                      ? "انتخاب برند و مدل"
                      : pickerOpen === "year"
                        ? "انتخاب سال تولید"
                        : pickerOpen === "fuel"
                          ? "انتخاب نوع سوخت"
                          : pickerOpen === "color"
                            ? "انتخاب رنگ"
                            : pickerOpen === "mileage"
                              ? "کارکرد"
                              : pickerOpen === "price"
                                ? "قیمت خودرو"
                                : pickerOpen === "body"
                                  ? "وضعیت بدنه"
                                  : pickerOpen === "chassis"
                                    ? "وضعیت شاسی"
                                    : pickerOpen === "engine"
                                      ? "وضعیت موتور"
                                      : pickerOpen === "insurance"
                                        ? "مهلت بیمه شخص ثالث"
                                        : pickerOpen === "gearboxType"
                                          ? "نوع گیربکس"
                                          : "وضعیت گیربکس"}
                  </h2>

                  <div className="w-9" />
                </header>

                {pickerOpen !== "price" && pickerOpen !== "mileage" && pickerOpen !== "insurance" && (
                  <div className="border-b border-gray-100 p-4">
                    <div className="flex h-11 items-center rounded-xl bg-gray-100 px-3">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-5 w-5 text-gray-400"
                      >
                        <circle
                          cx="11"
                          cy="11"
                          r="6.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                        <path
                          d="M16 16l4 4"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>

                      <input
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        placeholder="جستجو"
                        className="mr-2 w-full bg-transparent text-[14px] outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto">

                  {pickerOpen === "vehicle" && (
                    <div className="p-4">
                      {!brandId ? (
                        <div className="space-y-1">
                          {vehicleBrands
                            .filter((item) =>
                              `${item.name_fa} ${item.name_en ?? ""}`
                                .toLowerCase()
                                .includes(pickerSearch.toLowerCase())
                            )
                            .map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => selectBrandAndOpenModel(item)}
                                className="flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 text-right"
                              >
                                <span className="text-[14px] font-semibold text-gray-900">
                                  {item.name_fa}
                                </span>

                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className="h-4 w-4 text-gray-400"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M15 5l-7 7 7 7"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            ))}
                        </div>
                      ) : !modelId ? (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setBrandId("");
                              setBrand("");
                              setModelId("");
                              setModel("");
                              setTrim("");
                              setVehicleModels([]);
                              setVehicleTrims([]);
                              setPickerSearch("");
                            }}
                            className="mb-3 text-[13px] font-semibold text-gray-500"
                          >
                            تغییر برند
                          </button>

                          {modelsLoading ? (
                            <div className="py-8 text-center text-[13px] text-gray-400">
                              در حال دریافت مدل‌ها...
                            </div>
                          ) : (
                            vehicleModels
                              .filter((item) =>
                                `${item.name_fa} ${item.name_en ?? ""}`
                                  .toLowerCase()
                                  .includes(pickerSearch.toLowerCase())
                              )
                              .map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => selectVehicle(item)}
                                  className="flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 text-right"
                                >
                                  <span className="text-[14px] font-semibold text-gray-900">
                                    {item.name_fa}
                                  </span>

                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-4 w-4 text-gray-400"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M15 5l-7 7 7 7"
                                      stroke="currentColor"
                                      strokeWidth="1.7"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              ))
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setModelId("");
                              setModel("");
                              setTrim("");
                              setVehicleTrims([]);
                              setPickerSearch("");
                            }}
                            className="mb-3 text-[13px] font-semibold text-gray-500"
                          >
                            تغییر مدل
                          </button>

                          {trimsLoading ? (
                            <div className="py-8 text-center text-[13px] text-gray-400">
                              در حال دریافت تیپ‌ها...
                            </div>
                          ) : vehicleTrims.length === 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setTrim("");
                                setPickerOpen(null);
                                setPickerSearch("");
                              }}
                              className="flex min-h-[56px] w-full border-b border-gray-100 px-2 text-right text-[14px] font-semibold text-gray-700"
                            >
                              بدون انتخاب تیپ
                            </button>
                          ) : (
                            vehicleTrims
                              .filter((item) =>
                                `${item.name_fa} ${item.name_en ?? ""}`
                                  .toLowerCase()
                                  .includes(pickerSearch.toLowerCase())
                              )
                              .map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => selectTrim(item)}
                                  className={`flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 text-right ${
                                    trim === item.name_fa
                                      ? "text-red-600"
                                      : "text-gray-900"
                                  }`}
                                >
                                  <span className="text-[14px] font-semibold">
                                    {item.name_fa}
                                  </span>

                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-4 w-4 text-gray-400"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M15 5l-7 7 7 7"
                                      stroke="currentColor"
                                      strokeWidth="1.7"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {pickerOpen === "year" && (
                    <div className="space-y-1 p-4">
                      {Array.from(
                        { length: 106 },
                        (_, index) => 1405 - index
                      ).map((year) => {
                        const gregorianYear = year + 621;

                        return (
                          <button
                            key={year}
                            type="button"
                            onClick={() => {
                              setModelYear(String(year));
                              setPickerOpen(null);
                            }}
                            className={`flex min-h-[58px] w-full items-center justify-center rounded-xl border text-[15px] font-bold transition ${
                              modelYear === String(year)
                                ? "border-red-500 bg-red-50 text-red-600"
                                : "border-gray-200 bg-white text-gray-700 active:bg-gray-50"
                            }`}
                          >
                            <span dir="ltr" className="tabular-nums">
                              {year.toLocaleString("fa-IR", {
                                useGrouping: false,
                              })}
                              <span className="mx-2 text-gray-300">/</span>
                              <span>
                                {gregorianYear.toLocaleString("fa-IR", {
                                  useGrouping: false,
                                })}
                              </span>
                            </span>

                            {modelYear === String(year) && (
                              <span className="mr-3 text-red-500">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {pickerOpen === "fuel" && (
                    <div className="space-y-1 p-4">
                      {["بنزینی", "گازوئیلی", "دوگانه سوز", "هیبریدی", "برقی"]
                        .filter((item) =>
                          item.includes(pickerSearch)
                        )
                        .map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => selectFuel(item)}
                            className="flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 text-right text-[14px] font-semibold"
                          >
                            {item}
                          </button>
                        ))}
                    </div>
                  )}

                  {pickerOpen === "color" && (
                    <div className="space-y-1 p-4">
                      {[
                        "سفید",
                        "مشکی",
                        "خاکستری",
                        "نقره‌ای",
                        "طوسی",
                        "آبی",
                        "سرمه‌ای",
                        "آبی روشن",
                        "قرمز",
                        "زرشکی",
                        "عنابی",
                        "زرد",
                        "طلایی",
                        "سبز",
                        "سبز روشن",
                        "زیتونی",
                        "قهوه‌ای",
                        "کرم",
                        "بژ",
                        "نارنجی",
                        "صورتی",
                        "بنفش",
                        "مسی",
                        "دودی",
                        "نوک‌مدادی",
                        "نقره‌ای متالیک",
                        "سفید صدفی",
                        "مشکی متالیک"
                      ]
                        .filter((item) => item.includes(pickerSearch))
                        .map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => selectColor(item)}
                            className="flex min-h-[56px] w-full items-center justify-between border-b border-gray-100 px-2 text-right text-[14px] font-semibold"
                          >
                            {item}
                          </button>
                        ))}
                    </div>
                  )}

                  {(pickerOpen === "mileage" || pickerOpen === "price") && (
                <div className="p-4">
                  <label
                    className="mb-2 block text-[13px] font-semibold text-gray-600"
                  >
                    {pickerOpen === "mileage"
                      ? "کارکرد (کیلومتر)"
                      : "قیمت خودرو (تومان)"}
                  </label>

                  <input
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    value={
                      pickerOpen === "mileage"
                        ? formatPersianInteger(mileage)
                        : formatPersianInteger(price)
                    }
                    onChange={(e) => {
                      const value = normalizeDigits(e.target.value).replace(/\D/g, "");

                      if (pickerOpen === "mileage") {
                        setMileage(value);
                      } else {
                        setPrice(value);
                      }
                    }}
                    placeholder={
                      pickerOpen === "mileage"
                        ? "مثلاً ۸۵٬۰۰۰"
                        : "مثلاً ۲۰۰٬۰۰۰٬۰۰۰"
                    }
                    className="box-border w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-[16px] text-gray-900 outline-none focus:border-gray-400"
                  />


                  <button
                    type="button"
                    onClick={() => {
                      const value =
                        pickerOpen === "mileage" ? mileage : price;

                      if (!value.trim()) {
                        setError(
                          pickerOpen === "mileage"
                            ? "کارکرد را وارد کنید."
                            : "قیمت خودرو را وارد کنید."
                        );
                        return;
                      }

                      setError("");
                      setPickerOpen(null);
                    }}
                    className="mt-4 w-full rounded-xl bg-gray-900 py-3.5 text-[14px] font-bold text-white"
                  >
                    تأیید
                  </button>
                </div>
              )}

              {pickerOpen === "body" && (
                    <div className="space-y-1 p-4">
                      {["سالم", "رنگ‌شدگی", "تعویض", "تصادفی"]
                        .filter((item) => item.includes(pickerSearch))
                        .map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setBodyCondition(item);
                              setPickerOpen(null);
                            }}
                            className="flex min-h-[56px] w-full border-b border-gray-100 px-2 text-right text-[14px] font-semibold"
                          >
                            {item}
                          </button>
                        ))}
                    </div>
                  )}

                  {pickerOpen === "chassis" && (
                    <div className="space-y-1 p-4">
                      {["سالم", "ضربه‌خورده", "شاسی‌کشیده", "تعویض"]
                        .filter((item) => item.includes(pickerSearch))
                        .map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              if (chassisTarget === "front") {
                                setFrontChassisCondition(item);
                              } else {
                                setRearChassisCondition(item);
                              }
                              setPickerOpen(null);
                            }}
                            className="flex min-h-[56px] w-full border-b border-gray-100 px-2 text-right text-[14px] font-semibold"
                          >
                            {item}
                          </button>
                        ))}
                    </div>
                  )}

                  {pickerOpen === "engine" && (
                    <div className="space-y-1 p-4">
                      {["سالم", "نیاز به تعمیر", "تعمیر اساسی", "تعویض"]
                        .filter((item) => item.includes(pickerSearch))
                        .map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setEngineCondition(item);
                              setPickerOpen(null);
                            }}
                            className="flex min-h-[56px] w-full border-b border-gray-100 px-2 text-right text-[14px] font-semibold"
                          >
                            {item}
                          </button>
                        ))}
                    </div>
                  )}

                  {pickerOpen === "insurance" && (
                <div className="grid grid-cols-2 gap-2 p-4">
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(
                    (months) => (
                      <button
                        key={months}
                        type="button"
                        onClick={() => {
                          const base = new Date();
                          const day = base.getDate();

                          const target = new Date(
                            base.getFullYear(),
                            base.getMonth() + months,
                            1
                          );

                          const lastDay = new Date(
                            target.getFullYear(),
                            target.getMonth() + 1,
                            0
                          ).getDate();

                          target.setDate(Math.min(day, lastDay));

                          const yyyy = target.getFullYear();
                          const mm = String(target.getMonth() + 1).padStart(
                            2,
                            "0"
                          );
                          const dd = String(target.getDate()).padStart(2, "0");

                          setInsuranceDeadline(`${yyyy}-${mm}-${dd}`);
                          setInsuranceMonths(months);
                          setError("");
                          setPickerOpen(null);
                        }}
                        className={`rounded-xl border py-4 text-[14px] font-bold ${
                          insuranceMonths === months
                            ? "border-red-500 bg-red-50 text-red-600"
                            : "border-gray-200 text-gray-700"
                        }`}
                      >
                        {months.toLocaleString("fa-IR")} ماه
                      </button>
                    )
                  )}
                </div>
              )}

              {pickerOpen === "gearboxType" && (
                    <div className="space-y-1 p-4">
                      {["دنده‌ای", "اتومات"]
                        .filter((item) => item.includes(pickerSearch))
                        .map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setGearboxType(item);
                              setPickerOpen(null);
                            }}
                            className="flex min-h-[56px] w-full border-b border-gray-100 px-2 text-right text-[14px] font-semibold"
                          >
                            {item}
                          </button>
                        ))}
                    </div>
                  )}

                  {pickerOpen === "gearboxCondition" && (
                    <div className="space-y-1 p-4">
                      {["سالم", "نیاز به تعمیر", "تعویض"]
                        .filter((item) => item.includes(pickerSearch))
                        .map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setGearboxCondition(item);
                              setPickerOpen(null);
                            }}
                            className="flex min-h-[56px] w-full border-b border-gray-100 px-2 text-right text-[14px] font-semibold"
                          >
                            {item}
                          </button>
                        ))}
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || inspectionLoading}
            className="w-full rounded-2xl bg-gray-900 py-4 text-[14px] font-extrabold text-white disabled:opacity-50"
          >
            {saving
              ? "در حال ذخیره..."
              : currentStep < 3
                ? "ادامه"
                : isEditMode
                  ? "ذخیره تغییرات"
                  : "ثبت خودرو"}
          </button>
        </form>
      </div>
    </main>
  );
}
