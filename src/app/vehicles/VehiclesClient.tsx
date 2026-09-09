"use client";


import { normalizeDigits } from "@/lib/utils/numberInput";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { VehiclesInitialPageData } from "@/lib/data/vehicles/getVehiclesInitialPageData";
import type { VehiclesSearchPageData } from "@/lib/data/vehicles/getVehiclesSearchPageData";
import { searchVehiclesAction } from "./actions";
import { toggleVehicleFavoriteAction } from "./mutations";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import {
  BODY_CODES,
  STRUCTURE_CODES,
} from "@/components/vehicles/vehicleBodyDiagram";

type Province = {
  id: string;
  name: string;
};

type City = {
  id: string;
  province_id: string;
  name: string;
};

type Dealership = {
  id: string;
  name: string;
  province_id: string;
  city_id: string;
};

type VehicleInspectionSummary = {
  affectedCount: number;
  bodyAffectedCount: number;
  structureAffectedCount: number;
  conditionCounts: Record<string, number>;
};

type Vehicle = {
  id: string;
  dealership_id: string;
  brand: string;
  model: string;
  trim: string | null;
  model_year: number | null;
  mileage: number | null;
  color: string | null;
  body_condition: string | null;
  price: number | null;
  description: string | null;
  status: string;
  dealership_name: string;
  province_name: string | null;
  city_name: string | null;
  image_url: string | null;
};

const PAGE_SIZE = 12;

function normalizePersian(value: string) {
  return value
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .trim();
}

function formatNumber(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("fa-IR");
}

function formatYear(value: number | null) {
  if (value === null) return "—";

  return value.toLocaleString("fa-IR", {
    useGrouping: false,
  });
}

function formatPrice(value: number | null) {
  if (value === null) return "توافقی";

  const formatted = value
    .toLocaleString("fa-IR")
    .replace(/٬/g, "/");

  return `${formatted} تومان`;
}

function getStatusLabel(status: string) {
  if (status === "available") return "موجود";
  if (status === "sold") return "فروخته شده";
  return status || "نامشخص";
}

export default function VehiclesClient({
  initialData,
  initialSearchData,
}: {
  initialData: VehiclesInitialPageData;
  initialSearchData: VehiclesSearchPageData;
}) {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const lastFilterKeyRef = useRef<string | null>(null);
  const skipInitialFilterLoadRef = useRef(true);

  const [vehicles, setVehicles] = useState<Vehicle[]>(
    initialSearchData.vehicles as Vehicle[],
  );
  const [inspectionSummaries, setInspectionSummaries] =
    useState<Record<string, VehicleInspectionSummary>>(
      initialSearchData.inspectionSummaries,
    );

  const [provinces, setProvinces] = useState<Province[]>(
    initialData.provinces as Province[],
  );
  const [cities, setCities] = useState<City[]>([]);
  const [dealerships, setDealerships] = useState<Dealership[]>(
    initialData.dealerships as Dealership[],
  );


  const [userId, setUserId] = useState<string | null>(
    initialData.userId,
  );
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(initialData.favoriteVehicleIds),
  );

  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [mileageFrom, setMileageFrom] = useState("");
  const [mileageTo, setMileageTo] = useState("");
  const [color, setColor] = useState("");
  const [chassisCondition, setChassisCondition] = useState("");
  const [bodyCondition, setBodyCondition] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [vehicleOrigin, setVehicleOrigin] = useState("");

  // صفحه خودروها به صورت پیش‌فرض فقط خودروهای موجود را نشان می‌دهد.
  const [status, setStatus] = useState("available");

  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);
  const [dealershipId, setDealershipId] = useState("");

  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(
    initialSearchData.totalCount,
  );

  // تعداد کل آگهی‌های ثبت‌شده در خودرو‌یاب؛ مستقل از فیلترها
  const [allListingsCount, setAllListingsCount] = useState(
    initialData.allListingsCount,
  );

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);

  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [mobileFilterStep, setMobileFilterStep] = useState<
    "yearFrom" |
    "yearTo" |
    "color" |
    "origin" |
    "chassis" |
    "body" |
    null
  >(null);

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [selectedChassis, setSelectedChassis] = useState<string[]>([]);
  const [selectedBodyConditions, setSelectedBodyConditions] = useState<string[]>([]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE)
  );

  const hasMore = page < totalPages;

  const filteredCities = useMemo(() => {
    if (!provinceId) return cities;

    return cities.filter(
      (city) => city.province_id === provinceId
    );
  }, [cities, provinceId]);

  const filteredDealerships = useMemo(() => {
    return dealerships.filter((dealership) => {
      if (
        provinceId &&
        dealership.province_id !== provinceId
      ) {
        return false;
      }

      if (
        cityId &&
        dealership.city_id !== cityId
      ) {
        return false;
      }

      return true;
    });
  }, [dealerships, provinceId, cityId]);

  function formatPriceInput(value: string) {
    const digits = normalizeDigits(value).replace(/[^\d]/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("fa-IR");
  }

  function priceDescription(value: string, prefix: "از" | "تا") {
    const digits = normalizeDigits(value).replace(/[^\d]/g, "");
    if (!digits) return "";

    const n = Number(digits);

    if (n >= 1000000000) {
      const billions = n / 1000000000;

      return `${prefix} ${billions.toLocaleString("fa-IR", {
        maximumFractionDigits: 2,
      })} میلیارد تومان`;
    }

    if (n >= 1000000) {
      const millions = n / 1000000;

      return `${prefix} ${millions.toLocaleString("fa-IR", {
        maximumFractionDigits: 2,
      })} میلیون تومان`;
    }

    if (n >= 1000) {
      const thousands = n / 1000;

      return `${prefix} ${thousands.toLocaleString("fa-IR", {
        maximumFractionDigits: 2,
      })} هزار تومان`;
    }

    return `${prefix} ${n.toLocaleString("fa-IR")} تومان`;
  }

  const mobileYearOptions = Array.from({ length: 40 }, (_, i) => {
    const jalali = 1405 - i;
    const gregorian = 2026 - i;

    return {
      value: String(jalali),
      label: `${jalali.toLocaleString("fa-IR", {
        useGrouping: false,
      })}/${gregorian.toLocaleString("fa-IR", {
        useGrouping: false,
      })}`,
    };
  });

  const mobileColors = [
    ["سفید", "bg-white"],
    ["نقره ای", "bg-gray-300"],
    ["مشکی", "bg-black"],
    ["خاکستری", "bg-gray-500"],
    ["سفید صدفی", "bg-gray-50"],
    ["نوک مدادی", "bg-gray-700"],
    ["آبی", "bg-blue-600"],
    ["آلبالویی", "bg-red-900"],
    ["اطلسی", "bg-pink-400"],
    ["بادمجانی", "bg-purple-900"],
    ["برنز", "bg-amber-700"],
    ["بژ", "bg-orange-200"],
    ["بنفش", "bg-purple-600"],
    ["پوست پیازی", "bg-rose-200"],
    ["تیتانیوم", "bg-slate-400"],
    ["خاکی", "bg-yellow-800"],
    ["دلفینی", "bg-slate-500"],
    ["ذغالی", "bg-gray-800"],
    ["زرد", "bg-yellow-400"],
    ["زرشکی", "bg-red-800"],
    ["زیتونی", "bg-lime-800"],
    ["سبز", "bg-green-600"],
    ["سربی", "bg-slate-600"],
    ["سرمه ای", "bg-blue-950"],
    ["طلایی", "bg-yellow-600"],
    ["طوسی", "bg-gray-400"],
    ["عدسی", "bg-lime-200"],
    ["عنابی", "bg-red-700"],
    ["قرمز", "bg-red-600"],
    ["قهوه ای", "bg-amber-900"],
    ["کربن بلک", "bg-zinc-950"],
    ["کرم", "bg-stone-200"],
    ["گیلاسی", "bg-red-700"],
    ["مسی", "bg-orange-700"],
    ["موکا", "bg-amber-800"],
    ["نارنجی", "bg-orange-500"],
    ["نقره ای", "bg-slate-300"],
    ["یشمی", "bg-emerald-700"],
  ] as const;

  const mobileOrigins = [
    "داخلی",
    "وارداتی",
    "مونتاژ",
  ];

  const chassisOptions = [
    "هر دو سالم و پلمپ",
    "عقب ضربه خورده",
    "عقب رنگ شده",
    "جلو ضربه خورده",
    "جلو رنگ شده",
  ];

  const bodyConditionOptions = [
    "سالم و بی خط و خش",
    "خط و خش جزئی",
    "صافکاری بی رنگ",
    "رنگ شدی در چند ناحیه",
    "دور رنگ",
    "تمام رنگ",
    "تصادفی",
    "اوراقی",
  ];

  function toggleMultiValue(
    current: string[],
    value: string,
    setter: (value: string[]) => void
  ) {
    const exists = current.includes(value);

    if (exists) {
      setter(current.filter((item) => item !== value));
      return;
    }

    // Chassis: "هر دو سالم و پلمپ" cannot coexist with damage/paint.
    if (value === "هر دو سالم و پلمپ") {
      setter(["هر دو سالم و پلمپ"]);
      return;
    }

    // Any damage/paint selection removes the global healthy option.
    let next = current.filter((item) => item !== "هر دو سالم و پلمپ");

    // Rear hit vs rear paint are mutually exclusive.
    if (value === "عقب ضربه خورده") {
      next = next.filter((item) => item !== "عقب رنگ شده");
    }

    if (value === "عقب رنگ شده") {
      next = next.filter((item) => item !== "عقب ضربه خورده");
    }

    // Front hit vs front paint are mutually exclusive.
    if (value === "جلو ضربه خورده") {
      next = next.filter((item) => item !== "جلو رنگ شده");
    }

    if (value === "جلو رنگ شده") {
      next = next.filter((item) => item !== "جلو ضربه خورده");
    }

    setter([...next, value]);
  }

  function removeSelected(
    value: string,
    current: string[],
    setter: (value: string[]) => void
  ) {
    setter(current.filter((item) => item !== value));
  }

  function MobilePickerHeader({
    title,
    onBack,
  }: {
    title: string;
    onBack: () => void;
  }) {
    return (
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-bold text-gray-600"
        >
          بازگشت
        </button>

        <h2 className="text-[17px] font-extrabold tracking-[-0.01em] text-gray-950">
          {title}
        </h2>

        <span className="w-12" />
      </div>
    );
  }

  function MobileYearPicker({
    target,
  }: {
    target: "yearFrom" | "yearTo";
  }) {
    const selected = target === "yearFrom" ? yearFrom : yearTo;

    return (
      <div dir="rtl" className="fixed inset-0 z-[110] flex flex-col bg-gray-50">
        <MobilePickerHeader
          title="انتخاب سال تولید"
          onBack={() => setMobileFilterStep(null)}
        />

        <div className="flex-1 overflow-y-auto p-3">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {mobileYearOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  if (target === "yearFrom") {
                    setYearFrom(item.value);
                  } else {
                    setYearTo(item.value);
                  }

                  setMobileFilterStep(null);
                }}
                className={`flex min-h-14 w-full items-center justify-between border-b border-gray-100 px-4 text-base last:border-0 ${
                  selected === item.value
                    ? "bg-gray-100 font-extrabold"
                    : ""
                }`}
              >
                <span>{item.label}</span>

                {selected === item.value && (
                  <span className="text-red-600">✓</span>
                )}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                if (target === "yearFrom") {
                  setYearFrom("1365");
                } else {
                  setYearTo("1365");
                }

                setMobileFilterStep(null);
              }}
              className={`flex min-h-14 w-full items-center justify-between px-4 text-base ${
                selected === "1365"
                  ? "bg-gray-100 font-extrabold"
                  : ""
              }`}
            >
              <span>قبل از ۱۹۸۷/قبل از ۱۳۶۶</span>

              {selected === "1365" && (
                <span className="text-red-600">✓</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function MobileColorPicker() {
    return (
      <div dir="rtl" className="fixed inset-0 z-[110] flex flex-col bg-gray-50">
        <MobilePickerHeader
          title="انتخاب رنگ خودرو"
          onBack={() => setMobileFilterStep(null)}
        />

        <div className="flex-1 overflow-y-auto p-3 pb-24">
          {selectedColors.length > 0 && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3">
              <div className="mb-2 text-xs font-semibold text-red-700">
                انتخاب شده
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedColors.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      removeSelected(
                        value,
                        selectedColors,
                        setSelectedColors
                      )
                    }
                    className="flex items-center gap-1 rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-600"
                  >
                    {value}
                    <span>×</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {mobileColors.map(([label, colorClass]) => {
              const checked = selectedColors.includes(label);

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    toggleMultiValue(
                      selectedColors,
                      label,
                      setSelectedColors
                    )
                  }
                  className={`flex min-h-14 w-full items-center gap-3 border-b border-gray-100 px-4 text-right last:border-0 ${
                    checked ? "bg-red-50" : ""
                  }`}
                >
                  <span
                    className={`h-7 w-7 shrink-0 rounded-md border border-gray-300 ${colorClass}`}
                  />

                  <span className="flex-1 text-base">
                    {label}
                  </span>

                  {checked && (
                    <span className="text-red-600">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              setColor(selectedColors.join(","));
              setMobileFilterStep(null);
            }}
            className="w-full rounded-2xl bg-red-600 py-3.5 text-base font-bold text-white"
          >
            تایید
          </button>
        </div>
      </div>
    );
  }

  function MobileOriginPicker() {
    return (
      <div className="fixed inset-0 z-[110]">
        <button
          type="button"
          aria-label="بستن"
          onClick={() => setMobileFilterStep(null)}
          className="absolute inset-0 h-full w-full bg-black/40"
        />

        <div
          dir="rtl"
          className="absolute bottom-0 left-0 right-0 flex max-h-[50vh] min-h-[50vh] flex-col rounded-t-3xl bg-gray-50 shadow-2xl"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
            <button
              type="button"
              onClick={() => setMobileFilterStep(null)}
              className="text-base font-bold text-gray-600"
            >
              بازگشت
            </button>

            <h2 className="text-base font-bold text-gray-950">
              انتخاب داخلی/خارجی
            </h2>

            <span className="w-14" />
          </div>

          <div className="flex-1 overflow-y-auto p-3 pb-24">
            {selectedOrigins.length > 0 && (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3">
                <div className="mb-2 text-sm font-bold text-red-700">
                  انتخاب شده
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedOrigins.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        removeSelected(
                          value,
                          selectedOrigins,
                          setSelectedOrigins
                        )
                      }
                      className="flex min-h-10 items-center gap-1 rounded-full border border-red-300 bg-white px-3 text-sm font-bold text-red-600"
                    >
                      {value}
                      <span className="text-lg leading-none">×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {mobileOrigins.map((value) => {
                const checked = selectedOrigins.includes(value);

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      toggleMultiValue(
                        selectedOrigins,
                        value,
                        setSelectedOrigins
                      )
                    }
                    className={`flex min-h-14 w-full items-center gap-3 border-b border-gray-100 px-4 text-right text-base last:border-0 ${
                      checked ? "bg-red-50" : ""
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                        checked
                          ? "border-red-600 bg-red-600 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {checked && "✓"}
                    </span>

                    <span className="flex-1">
                      {value}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => {
                setVehicleOrigin(selectedOrigins.join(","));
                setMobileFilterStep(null);
              }}
              className="w-full rounded-2xl bg-red-600 py-3.5 text-base font-bold text-white"
            >
              تایید
            </button>
          </div>
        </div>
      </div>
    );
  }

  function MobileChassisPicker() {
    const hasRearHit = selectedChassis.includes("عقب ضربه خورده");
    const hasRearPaint = selectedChassis.includes("عقب رنگ شده");
    const hasFrontHit = selectedChassis.includes("جلو ضربه خورده");
    const hasFrontPaint = selectedChassis.includes("جلو رنگ شده");

    function chassisButton(
      label: string,
      disabled: boolean = false
    ) {
      const checked = selectedChassis.includes(label);

      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            toggleMultiValue(
              selectedChassis,
              label,
              setSelectedChassis
            )
          }
          className={`flex h-14 items-center justify-between rounded-xl border px-3 text-right text-base ${
            disabled
              ? "cursor-not-allowed bg-gray-100 text-gray-300"
              : checked
                ? "border-red-300 bg-red-50 font-extrabold text-red-700"
                : "border-gray-200 bg-white"
          }`}
        >
          <span>{label}</span>

          <span
            className={`h-6 w-6 rounded-md border ${
              checked
                ? "border-red-600 bg-red-600"
                : "border-gray-300 bg-white"
            }`}
          >
            {checked && (
              <span className="flex h-full items-center justify-center text-xs text-white">
                ✓
              </span>
            )}
          </span>
        </button>
      );
    }

    return (
      <div dir="rtl" className="fixed inset-0 z-[110] flex flex-col bg-gray-50">
        <MobilePickerHeader
          title="وضعیت شاسی ها"
          onBack={() => setMobileFilterStep(null)}
        />

        <div className="flex-1 overflow-y-auto p-3 pb-24">
          {selectedChassis.length > 0 && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3">
              <div className="mb-2 text-xs font-semibold text-red-700">
                انتخاب شده
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedChassis.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      removeSelected(
                        value,
                        selectedChassis,
                        setSelectedChassis
                      )
                    }
                    className="flex items-center gap-1 rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-600"
                  >
                    {value}
                    <span>×</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {chassisButton("هر دو سالم و پلمپ")}

            <div className="rounded-2xl border border-gray-200 bg-white p-3">
              <div className="mb-2 text-sm font-bold">
                عقب
              </div>

              <div className="grid grid-cols-2 gap-2">
                {chassisButton(
                  "عقب ضربه خورده",
                  hasRearPaint
                )}

                {chassisButton(
                  "عقب رنگ شده",
                  hasRearHit
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-3">
              <div className="mb-2 text-sm font-bold">
                جلو
              </div>

              <div className="grid grid-cols-2 gap-2">
                {chassisButton(
                  "جلو ضربه خورده",
                  hasFrontPaint
                )}

                {chassisButton(
                  "جلو رنگ شده",
                  hasFrontHit
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              setChassisCondition(selectedChassis.join(","));
              setMobileFilterStep(null);
            }}
            className="w-full rounded-2xl bg-red-600 py-3.5 text-base font-bold text-white"
          >
            تایید
          </button>
        </div>
      </div>
    );
  }



  useEffect(() => {
    const filterKey = JSON.stringify({
      search,
      brand,
      model,
      yearFrom,
      yearTo,
      mileageFrom,
      mileageTo,
      priceFrom,
      priceTo,
      color,
      chassisCondition,
      bodyCondition,
      selectedBodyConditions,
      fuelType,
      transmission,
      vehicleOrigin,
      status,
      provinceId,
      cityId,
      selectedCityIds,
      dealershipId,
      sort,
    });

    if (skipInitialFilterLoadRef.current) {
      skipInitialFilterLoadRef.current = false;
      lastFilterKeyRef.current = filterKey;
      return;
    }

    if (filterKey === lastFilterKeyRef.current) {
      return;
    }

    lastFilterKeyRef.current = filterKey;

    if (page === 1) {
      const timer = setTimeout(
        () => {
          loadVehicles();
        },
        search ? 350 : 0
      );

      return () => clearTimeout(timer);
    }
  }, [
    search,
    brand,
    model,
    yearFrom,
    yearTo,
    mileageFrom,
    mileageTo,
    priceFrom,
    priceTo,
    color,
    chassisCondition,
    bodyCondition,
    selectedBodyConditions,
    fuelType,
    transmission,
    vehicleOrigin,
    status,
    provinceId,
    cityId,
    selectedCityIds,
    dealershipId,
    sort,
  ]);

  useEffect(() => {
    if (page <= 1) return;

    loadVehicles();
  }, [page]);

  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        if (
          firstEntry.isIntersecting &&
          !loading &&
          !loadingMore &&
          hasMore
        ) {
          setPage((current) =>
            Math.min(current + 1, totalPages)
          );
        }
      },
      {
        rootMargin: "500px",
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [
    loading,
    loadingMore,
    hasMore,
    totalPages,
  ]);

  async function loadVehicles() {
    const currentPage = page;

    console.log(
      `[LOAD_VEHICLES_TRIGGER] page=${currentPage} offset=${(currentPage - 1) * PAGE_SIZE} search=${JSON.stringify(search)}`
    );

    if (currentPage === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setError("");

    try {
      const results = await searchVehiclesAction({
        search: normalizePersian(search) || null,
        brand: normalizePersian(brand) || null,
        model: normalizePersian(model) || null,

        yearFrom: yearFrom ? Number(yearFrom) : null,
        yearTo: yearTo ? Number(yearTo) : null,

        priceFrom: priceFrom ? Number(priceFrom) : null,
        priceTo: priceTo ? Number(priceTo) : null,

        mileageFrom: mileageFrom ? Number(mileageFrom) : null,
        mileageTo: mileageTo ? Number(mileageTo) : null,

        color: normalizePersian(color) || null,

        status: status || null,

        chassisCondition:
          normalizePersian(chassisCondition) || null,

        bodyCondition:
          normalizePersian(selectedBodyConditions.join(",")) || null,

        origin:
          normalizePersian(vehicleOrigin) || null,

        fuelType:
          normalizePersian(fuelType) || null,

        transmission:
          normalizePersian(transmission) || null,

        provinceId:
          provinceId || null,

        cityIds:
          selectedCityIds,

        dealershipId:
          dealershipId || null,

        sort,
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
      });

      if (currentPage === 1) {
        setVehicles([]);
        setInspectionSummaries({});
      }

      if (results.vehicles.length === 0) {
        if (currentPage === 1) {
          setVehicles([]);
          setInspectionSummaries({});
          setTotalCount(0);
        }

        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const vehiclesWithImages =
        results.vehicles as Vehicle[];

      setInspectionSummaries((current) => ({
        ...(currentPage === 1 ? {} : current),
        ...results.inspectionSummaries,
      }));

      setVehicles((current) => {
        if (currentPage === 1) {
          return vehiclesWithImages;
        }

        const existingIds = new Set(
          current.map((vehicle) => vehicle.id)
        );

        return [
          ...current,
          ...vehiclesWithImages.filter(
            (vehicle) => !existingIds.has(vehicle.id)
          ),
        ];
      });

      setTotalCount(results.totalCount);

      setLoading(false);
      setLoadingMore(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "خطا در دریافت خودروها";

      setError(message);

      if (currentPage === 1) {
        setVehicles([]);
        setInspectionSummaries({});
        setTotalCount(0);
      }

      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function toggleFavorite(
    vehicleId: string
  ) {
    if (!userId) return;

    const wasFavorite =
      favoriteIds.has(vehicleId);

    setFavoriteIds((current) => {
      const next = new Set(current);

      if (wasFavorite) {
        next.delete(vehicleId);
      } else {
        next.add(vehicleId);
      }

      return next;
    });

    const result = await toggleVehicleFavoriteAction(vehicleId);

    if (!result.ok) {
      setFavoriteIds((current) => {
        const next = new Set(current);

        if (wasFavorite) {
          next.add(vehicleId);
        } else {
          next.delete(vehicleId);
        }

        return next;
      });
    }
  }

  function resetFilters() {
    setSearch("");
    setBrand("");
    setModel("");
    setYearFrom("");
    setYearTo("");
    setPriceFrom("");
    setPriceTo("");
    setMileageFrom("");
    setMileageTo("");
    setColor("");
    setSelectedColors([]);
    setSelectedOrigins([]);
    setSelectedChassis([]);
    setSelectedBodyConditions([]);
    setChassisCondition("");
    setBodyCondition("");
    setFuelType("");
    setTransmission("");
    setVehicleOrigin("");
    setMobileFilterStep(null);
    setStatus("available");
    setProvinceId("");
    setCityId("");
    setSelectedCityIds([]);
    setDealershipId("");
    setSort("newest");
    setPage(1);
  }

  function handleFilterChange(
    setter: (value: string) => void,
    value: string
  ) {
    setter(value);
    setPage(1);
  }

  function handleProvinceChange(
    value: string
  ) {
    setProvinceId(value);
    setCityId("");
    setDealershipId("");
    setPage(1);
  }

  function handleCityChange(
    value: string
  ) {
    setCityId(value);
    setDealershipId("");
    setPage(1);
  }

  return (
    <MobileAppShell
      vehicleHeader={{
        provinces,
        selectedCityIds,
        onCityIdsChange: (value) => {
          setSelectedCityIds(value);
          setPage(1);
        },
        onClearLocation: () => {
          setSelectedCityIds([]);
          setPage(1);
        },
      }}
    >
      <div className="space-y-3">
        {/* Search header */}
        <section className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="flex h-12 w-full items-center gap-3 rounded-xl bg-gray-100 px-4 text-right"
          >
            <span className="text-xl text-gray-400">⌕</span>
            <span className="text-base text-gray-400">
              جستجوی خودرو...
            </span>
          </button>

          <div className="mt-2 flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => handleFilterChange(setSort, "newest")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                sort === "newest"
                  ? "bg-gray-950 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              جدیدترین
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange(setSort, "price_asc")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                sort === "price_asc"
                  ? "bg-gray-950 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              ارزان‌ترین
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange(setSort, "price_desc")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                sort === "price_desc"
                  ? "bg-gray-950 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              گران‌ترین
            </button>

            <span className="mr-auto shrink-0 text-[11px] text-gray-400">
              {loading
                ? "در حال جستجو..."
                : `${formatNumber(totalCount)} خودرو`}
            </span>
          </div>
        </section>

        {showFilters && (
          <div className="fixed inset-0 z-[90] flex flex-col bg-gray-50">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="text-sm font-bold text-gray-600"
              >
                بستن
              </button>

              <h2 className="text-base font-bold text-gray-950">
                فیلتر خودرو
              </h2>

              <button
                type="button"
                onClick={resetFilters}
                className="text-sm font-bold text-gray-500"
              >
                پاک کردن
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-28 pt-3">
              <div className="space-y-3">

                <section className="rounded-2xl border border-gray-200 bg-white p-3">
                  <h3 className="mb-2 text-sm font-bold">
                    برند و تیپ
                  </h3>

                  <div className="space-y-2">
                    <input
                      value={brand}
                      onChange={(e) =>
                        handleFilterChange(setBrand, e.target.value)
                      }
                      placeholder="برند"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-base outline-none"
                    />

                    <input
                      value={model}
                      onChange={(e) =>
                        handleFilterChange(setModel, e.target.value)
                      }
                      placeholder="تیپ"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-base outline-none"
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-3">
                  <h3 className="mb-2 text-sm font-bold">
                    مدل (سال تولید)
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileFilterStep("yearFrom")}
                      className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-3 text-right text-base"
                    >
                      از
                      {yearFrom && (
                        <span className="mr-2 font-bold">
                          {yearFrom === "1365"
                            ? "قبل از ۱۹۸۷"
                            : `${Number(yearFrom).toLocaleString("fa-IR", {
                              useGrouping: false,
                            })}/${(Number(yearFrom) + 621).toLocaleString("fa-IR", {
                              useGrouping: false,
                            })}`}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMobileFilterStep("yearTo")}
                      className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-3 text-right text-base"
                    >
                      تا
                      {yearTo && (
                        <span className="mr-2 font-bold">
                          {yearTo === "1365"
                            ? "قبل از ۱۹۸۷"
                            : `${Number(yearTo).toLocaleString("fa-IR", {
                              useGrouping: false,
                            })}/${(Number(yearTo) + 621).toLocaleString("fa-IR", {
                              useGrouping: false,
                            })}`}
                        </span>
                      )}
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-3">
                  <h3 className="mb-2 text-sm font-bold">
                    قیمت (تومان)
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex h-12 items-center rounded-xl border border-gray-200 bg-gray-50 px-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatPriceInput(priceFrom)}
                          onChange={(e) =>
                            handleFilterChange(
                              setPriceFrom,
                              normalizeDigits(e.target.value).replace(/[^\d]/g, "")
                            )
                          }
                          placeholder="از"
                          aria-label="حداقل قیمت"
                          className="min-w-0 flex-1 bg-transparent text-base outline-none"
                        />
                      </div>

                      {priceFrom && (
                        <p className="mt-1 px-1 text-[11px] text-gray-500">
                          {priceDescription(priceFrom, "از")}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex h-12 items-center rounded-xl border border-gray-200 bg-gray-50 px-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatPriceInput(priceTo)}
                          onChange={(e) =>
                            handleFilterChange(
                              setPriceTo,
                              normalizeDigits(e.target.value).replace(/[^\d]/g, "")
                            )
                          }
                          placeholder="تا"
                          aria-label="حداکثر قیمت"
                          className="min-w-0 flex-1 bg-transparent text-base outline-none"
                        />
                      </div>

                      {priceTo && (
                        <p className="mt-1 px-1 text-[11px] text-gray-500">
                          {priceDescription(priceTo, "تا")}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-3">
                  <h3 className="mb-2 text-sm font-bold">
                    کارکرد
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatPriceInput(mileageFrom)}
                      onChange={(e) =>
                        handleFilterChange(
                          setMileageFrom,
                          normalizeDigits(e.target.value).replace(/[^\d]/g, "")
                        )
                      }
                      placeholder="از"
                      aria-label="حداقل کارکرد"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-base outline-none"
                    />

                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatPriceInput(mileageTo)}
                      onChange={(e) =>
                        handleFilterChange(
                          setMileageTo,
                          normalizeDigits(e.target.value).replace(/[^\d]/g, "")
                        )
                      }
                      placeholder="تا"
                      aria-label="حداکثر کارکرد"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-base outline-none"
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setMobileFilterStep("color")}
                    className="flex min-h-14 w-full items-center justify-between px-4"
                  >
                    <span className="text-sm font-bold">
                      رنگ
                    </span>

                    <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-500">
                      {selectedColors.length ? (
                        `${selectedColors.length.toLocaleString("fa-IR")} انتخاب شده`
                      ) : (
                        <>
                          <span>انتخاب</span>
                          <span
                            aria-hidden="true"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[17px] font-normal leading-none text-gray-400"
                          >
                            ‹
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setMobileFilterStep("origin")}
                    className="flex min-h-14 w-full items-center justify-between px-4"
                  >
                    <span className="text-sm font-bold">
                      داخلی / خارجی
                    </span>

                    <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-500">
                      {selectedOrigins.length ? (
                        `${selectedOrigins.length.toLocaleString("fa-IR")} انتخاب شده`
                      ) : (
                        <>
                          <span>انتخاب</span>
                          <span
                            aria-hidden="true"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[17px] font-normal leading-none text-gray-400"
                          >
                            ‹
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setMobileFilterStep("chassis")}
                    className="flex min-h-14 w-full items-center justify-between px-4"
                  >
                    <span className="text-sm font-bold">
                      وضعیت شاسی ها
                    </span>

                    <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-500">
                      {selectedChassis.length ? (
                        `${selectedChassis.length.toLocaleString("fa-IR")} انتخاب شده`
                      ) : (
                        <>
                          <span>انتخاب</span>
                          <span
                            aria-hidden="true"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[17px] font-normal leading-none text-gray-400"
                          >
                            ‹
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setMobileFilterStep("body")}
                    className="flex min-h-14 w-full items-center justify-between px-4 text-right"
                  >
                    <span className="text-base font-bold">
                      وضعیت بدنه
                    </span>

                    <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-500">
                      {selectedBodyConditions.length > 0 ? (
                        `${selectedBodyConditions.length.toLocaleString("fa-IR")} انتخاب`
                      ) : (
                        <>
                          <span>انتخاب</span>
                          <span
                            aria-hidden="true"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[17px] font-normal leading-none text-gray-400"
                          >
                            ‹
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-3">
                  <h3 className="mb-2 text-sm font-bold">
                    نوع سوخت
                  </h3>

                  <select
                    value={fuelType}
                    onChange={(e) => {
                      setFuelType(e.target.value);
                      setPage(1);
                    }}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-base outline-none"
                  >
                    <option value="">
                      همه انواع سوخت
                    </option>
                    <option value="بنزینی">
                      بنزینی
                    </option>
                    <option value="دوگانه سوز">
                      دوگانه سوز
                    </option>
                    <option value="دیزلی">
                      دیزلی
                    </option>
                    <option value="هیبریدی">
                      هیبریدی
                    </option>
                    <option value="برقی">
                      برقی
                    </option>
                  </select>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-3">
                  <h3 className="mb-2 text-sm font-bold">
                    نوع گیربکس
                  </h3>

                  <select
                    value={transmission}
                    onChange={(e) => {
                      setTransmission(e.target.value);
                      setPage(1);
                    }}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-base outline-none"
                  >
                    <option value="">
                      همه انواع گیربکس
                    </option>
                    <option value="دنده‌ای">
                      دنده‌ای
                    </option>
                    <option value="اتوماتیک">
                      اتوماتیک
                    </option>
                    <option value="CVT">
                      CVT
                    </option>
                  </select>
                </section>

              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setShowFilters(false);
                }}
                className="w-full rounded-2xl bg-red-600 py-3.5 text-[15px] font-bold tracking-[-0.01em] text-white shadow-lg shadow-red-600/20 transition active:scale-[0.985]"
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <span>نمایش</span>
                  <span dir="ltr" className="tabular-nums">
                    +{formatNumber(allListingsCount)}
                  </span>
                  <span>آگهی</span>
                </span>
              </button>
            </div>
          </div>
        )}

        {mobileFilterStep === "yearFrom" && (
          <MobileYearPicker target="yearFrom" />
        )}

        {mobileFilterStep === "yearTo" && (
          <MobileYearPicker target="yearTo" />
        )}

        {mobileFilterStep === "color" && (
          <MobileColorPicker />
        )}

        {mobileFilterStep === "origin" && (
          <MobileOriginPicker />
        )}

        {mobileFilterStep === "body" && (
          <div dir="rtl" className="fixed inset-0 z-[110] flex flex-col bg-gray-50">
            <MobilePickerHeader
              title="وضعیت بدنه"
              onBack={() => setMobileFilterStep(null)}
            />

            <div className="flex-1 overflow-y-auto p-3 pb-24">
              {selectedBodyConditions.length > 0 && (
                <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-3">
                  <div className="mb-2 text-sm font-bold">
                    انتخاب‌های شما
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedBodyConditions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          setSelectedBodyConditions((current) =>
                            current.filter((value) => value !== item)
                          )
                        }
                        className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-sm font-bold text-red-700"
                      >
                        <span>{item}</span>
                        <span className="text-base leading-none">×</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {bodyConditionOptions.map((item) => {
                  const checked = selectedBodyConditions.includes(item);

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        toggleMultiValue(
                          selectedBodyConditions,
                          item,
                          setSelectedBodyConditions
                        )
                      }
                      className={`flex min-h-14 w-full items-center gap-3 border-b border-gray-100 px-4 text-right last:border-0 ${
                        checked ? "bg-red-50" : ""
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                          checked
                            ? "border-red-600 bg-red-600 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {checked ? "✓" : ""}
                      </span>

                      <span className="flex-1 text-base">
                        {item}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => {
                  setBodyCondition(selectedBodyConditions.join(","));
                  setMobileFilterStep(null);
                }}
                className="w-full rounded-2xl bg-red-600 py-3.5 text-base font-bold text-white"
              >
                تایید
              </button>
            </div>
          </div>
        )}

        {mobileFilterStep === "chassis" && (
          <MobileChassisPicker />
        )}


        {/* Result title */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-gray-950">
              خودروهای موجود
            </h1>

            <p className="mt-1 text-[11px] font-medium leading-5 text-gray-400">
              آگهی‌های ثبت‌شده توسط نمایشگاه‌ها
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500">
            {formatNumber(totalCount)} آگهی
          </span>
        </div>

        {/* Loading */}
        {loading && page === 1 ? (
          <div className="space-y-2">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="flex h-[104px] animate-pulse flex-row-reverse overflow-hidden rounded-2xl border border-gray-100 bg-white"
              >
                <div className="w-[116px] shrink-0 bg-gray-200" />

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-3">
                  <div className="h-4 w-2/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                  <div className="h-3 w-3/4 rounded bg-gray-200" />
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <section className="rounded-2xl border border-red-100 bg-white p-6 text-center">
            <div className="text-3xl">
              ⚠️
            </div>

            <h2 className="mt-3 text-sm font-bold text-gray-950">
              خطا در دریافت خودروها
            </h2>

            <p className="mt-2 text-xs leading-5 text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                loadVehicles()
              }
              className="mt-4 rounded-xl bg-gray-950 px-5 py-2.5 text-xs font-bold text-white"
            >
              تلاش دوباره
            </button>
          </section>
        ) : vehicles.length === 0 ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-3xl">
              🚗
            </div>

            <h2 className="mt-4 text-base font-bold text-gray-950">
              خودرویی پیدا نشد
            </h2>

            <p className="mt-2 text-xs leading-5 text-gray-400">
              عبارت جستجو یا فیلترها را تغییر دهید.
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-xl bg-gray-950 px-5 py-2.5 text-xs font-bold text-white"
            >
              پاک کردن فیلترها
            </button>
          </section>
        ) : (
          <>
            {/* Vehicle feed */}
            <div className="space-y-2.5">
              {vehicles.map((vehicle) => {
                 return (
                  <article
                    key={vehicle.id}
                    className="h-[132px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                  >
                    <Link
                      href={`/vehicles/${vehicle.id}`}
                      prefetch={false}
                      className="flex h-full flex-row-reverse"
                    >
                      {/* Image — physically LEFT */}
                      <div className="h-full w-[122px] shrink-0 overflow-hidden bg-gray-100">
                        {vehicle.image_url ? (
                          <img
                            src={vehicle.image_url}
                            alt={`${vehicle.model}${vehicle.model_year ? ` مدل ${formatYear(vehicle.model_year)}` : ""}`}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-100">
                            <span className="text-3xl">🚘</span>
                          </div>
                        )}
                      </div>

                      {/* Information — RIGHT */}
                      <div className="min-w-0 flex-1 px-3 py-2.5">
                        <h2 className="truncate text-[15px] font-bold leading-5 text-gray-950">
                          {vehicle.model}
                          {vehicle.model_year !== null && (
                            <span className="mr-1">
                              مدل {formatYear(vehicle.model_year)}
                            </span>
                          )}
                        </h2>

                        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] text-gray-500">
                          <span className="shrink-0">
                            {vehicle.mileage !== null
                              ? `${formatNumber(vehicle.mileage)} کیلومتر`
                              : "کارکرد نامشخص"}
                          </span>

                          {vehicle.color && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="truncate">{vehicle.color}</span>
                            </>
                          )}
                        </div>

                        <p className="mt-1.5 truncate text-[11px] font-medium leading-4 text-gray-500">
                          {formatPrice(vehicle.price)}
                        </p>

                        <p className="mt-1 truncate text-[11px] font-medium leading-4 text-gray-500">
                          {vehicle.city_name ||
                            vehicle.province_name ||
                            "ایران"}
                        </p>

                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <p className="min-w-0 truncate text-[10px] font-medium leading-4 text-gray-700">
                            {vehicle.dealership_name || "نمایشگاه"}
                          </p>

                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>

            {/* Infinite scroll sentinel */}
            <div
              ref={loadMoreRef}
              className="flex min-h-16 items-center justify-center"
            >
              {loadingMore ? (
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-950" />
                  در حال دریافت خودروهای بیشتر...
                </div>
              ) : hasMore ? (
                <span className="text-[10px] text-gray-300">
                  خودروهای بیشتر...
                </span>
              ) : (
                <div className="pb-2 text-center text-[10px] text-gray-300">
                  همه خودروها نمایش داده شدند
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MobileAppShell>
  );

}
