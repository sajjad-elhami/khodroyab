"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCitiesByProvince, getLocationCatalog } from "@/lib/data/catalog/clientCatalog";

type Province = {
  id: string;
  name: string;
};

type City = {
  id: string;
  province_id: string;
  name: string;
};

type VehicleHeaderProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  provinces?: Province[];
  cities?: City[];
  selectedCityIds?: string[];
  onCityIdsChange?: (value: string[]) => void;
  onClearLocation?: () => void;
};

type Props = {
  children: React.ReactNode;
  vehicleHeader?: VehicleHeaderProps;
};

const navItems = [
  { href: "/favorites", label: "نشان‌شده", icon: "bookmark" },
  { href: "/vehicles", label: "خودروها", icon: "car" },
  { href: "/vehicles/new", label: "ثبت خودرو", icon: "plus" },
  { href: "/dealerships", label: "نمایشگاه‌ها", icon: "store" },
  { href: "/market-analysis", label: "تحلیل بازار", icon: "chart" },
];

function NavIcon({
  name,
  active,
}: {
  name: string;
  active: boolean;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const className = active
    ? "h-[21px] w-[21px]"
    : "h-[21px] w-[21px]";

  if (name === "bookmark") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path {...common} d="M6.5 4.5A2.5 2.5 0 0 1 9 2h6a2.5 2.5 0 0 1 2.5 2.5v17l-5.5-3.4-5.5 3.4z" />
      </svg>
    );
  }

  if (name === "car") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path {...common} d="M5.2 16.5h13.6" />
        <path {...common} d="M6.2 16.5 4.8 11l1.7-4h10.9l1.8 4-1.1 5.5" />
        <path {...common} d="M7.2 7 8.3 4.5h7.4L16.8 7" />
        <path {...common} d="M4.8 11h14.4" />
        <circle {...common} cx="7.5" cy="16.8" r="1.4" />
        <circle {...common} cx="16.5" cy="16.8" r="1.4" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect {...common} x="4" y="4" width="16" height="16" rx="5" />
        <path {...common} d="M12 8v8M8 12h8" />
      </svg>
    );
  }

  if (name === "store") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path {...common} d="M4 10.5 5.8 4h12.4l1.8 6.5" />
        <path {...common} d="M4 10.5c.4 1.6 1.6 2.5 3.2 2.5s2.8-.9 3.2-2.5c.4 1.6 1.6 2.5 3.2 2.5s2.8-.9 3.2-2.5c.4 1.6 1.6 2.5 3.2 2.5" />
        <path {...common} d="M5.5 13v7h13v-7M9 20v-4h3v4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...common} d="M4 17.5 9 12l3.5 3 6.5-7" />
      <path {...common} d="M15 8h4v4" />
      <path {...common} d="M4 20h16" />
    </svg>
  );
}

const faNumber = new Intl.NumberFormat("fa-IR");

export default function MobileAppShell({
  children,
  vehicleHeader,
}: Props) {
  const pathname = usePathname();
  const isVehicleHeader = Boolean(vehicleHeader);

  const [provinceOpen, setProvinceOpen] = useState(false);
  const [locationMode, setLocationMode] = useState<
    "province" | "city"
  >("province");

  const [localProvinces, setLocalProvinces] = useState<Province[]>([]);
  const [localCities, setLocalCities] = useState<City[]>([]);

  const [provinceSearch, setProvinceSearch] = useState("");
  const [activeProvinceId, setActiveProvinceId] = useState("");

  const [localSelectedCityIds, setLocalSelectedCityIds] = useState<
    string[]
  >([]);

  useEffect(() => {
    if (isVehicleHeader || !provinceOpen) return;
    if (localProvinces.length > 0) return;

    let cancelled = false;

    const loadProvinces = async () => {
      const supabase = createClient();

      try {
        const { provinces } = await getLocationCatalog(
          supabase,
        );

        if (cancelled) return;

        setLocalProvinces(provinces);
      } catch {
        if (cancelled) return;

        setLocalProvinces([]);
      }
    };

    loadProvinces();

    return () => {
      cancelled = true;
    };
  }, [
    isVehicleHeader,
    provinceOpen,
    localProvinces.length,
  ]);

  useEffect(() => {
    if (!isVehicleHeader || !provinceOpen || !activeProvinceId) {
      return;
    }

    let cancelled = false;

    const loadCities = async () => {
      const supabase = createClient();

      try {
        const provinceCities = await getCitiesByProvince(
          supabase,
          activeProvinceId,
        );

        if (cancelled) return;

        setLocalCities((current) => {
          const otherProvinceCities = current.filter(
            (city) => city.province_id !== activeProvinceId,
          );

          return [
            ...otherProvinceCities,
            ...provinceCities,
          ];
        });
      } catch {
        if (cancelled) return;
      }
    };

    loadCities();

    return () => {
      cancelled = true;
    };
  }, [
    isVehicleHeader,
    provinceOpen,
    activeProvinceId,
  ]);

  const provinces = vehicleHeader?.provinces ?? localProvinces;
  const cities =
    vehicleHeader?.cities && vehicleHeader.cities.length > 0
      ? vehicleHeader.cities
      : localCities;

  const selectedCityIds = vehicleHeader
    ? vehicleHeader.selectedCityIds ?? []
    : localSelectedCityIds;

  const activeProvince = useMemo(
    () =>
      provinces.find(
        (province) => province.id === activeProvinceId
      ),
    [provinces, activeProvinceId]
  );

  const filteredProvinces = useMemo(() => {
    const query = provinceSearch.trim();

    if (!query) return provinces;

    return provinces.filter((province) =>
      province.name.includes(query)
    );
  }, [provinces, provinceSearch]);

  const filteredCities = useMemo(() => {
    if (!activeProvinceId) return [];

    const query = provinceSearch.trim();

    return cities.filter((city) => {
      if (city.province_id !== activeProvinceId) {
        return false;
      }

      if (!query) return true;

      return city.name.includes(query);
    });
  }, [cities, activeProvinceId, provinceSearch]);

  const fullySelectedProvinceIds = useMemo(() => {
    const selectedSet = new Set(selectedCityIds);
    const result = new Set<string>();

    for (const province of provinces) {
      const provinceCities = cities.filter(
        (city) => city.province_id === province.id
      );

      if (
        provinceCities.length > 0 &&
        provinceCities.every((city) =>
          selectedSet.has(city.id)
        )
      ) {
        result.add(province.id);
      }
    }

    return result;
  }, [provinces, cities, selectedCityIds]);

  const selectedCities = useMemo(() => {
    const selectedSet = new Set(selectedCityIds);

    return cities.filter(
      (city) =>
        selectedSet.has(city.id) &&
        !fullySelectedProvinceIds.has(city.province_id)
    );
  }, [
    cities,
    selectedCityIds,
    fullySelectedProvinceIds,
  ]);

  const selectedAllProvinces = useMemo(
    () =>
      provinces.filter((province) =>
        fullySelectedProvinceIds.has(province.id)
      ),
    [provinces, fullySelectedProvinceIds]
  );



  const selectedCitiesInActiveProvince = useMemo(() => {
    if (!activeProvinceId) return [];

    const provinceCityIds = new Set(
      cities
        .filter(
          (city) => city.province_id === activeProvinceId
        )
        .map((city) => city.id)
    );

    return selectedCityIds.filter((id) =>
      provinceCityIds.has(id)
    );
  }, [cities, activeProvinceId, selectedCityIds]);

  const activeProvinceCityIds = useMemo(
    () =>
      cities
        .filter(
          (city) => city.province_id === activeProvinceId
        )
        .map((city) => city.id),
    [cities, activeProvinceId]
  );

  const allCitiesInActiveProvinceSelected =
    activeProvinceId !== "" &&
    (fullySelectedProvinceIds.has(activeProvinceId) ||
      (activeProvinceCityIds.length > 0 &&
        activeProvinceCityIds.every((id) =>
          selectedCityIds.includes(id)
        )));

  function updateSelectedCityIds(nextIds: string[]) {
    const uniqueIds = Array.from(new Set(nextIds));

    if (vehicleHeader?.onCityIdsChange) {
      vehicleHeader.onCityIdsChange(uniqueIds);
    } else {
      setLocalSelectedCityIds(uniqueIds);
    }
  }

  function getProvinceCityIds(provinceId: string) {
    return cities
      .filter((city) => city.province_id === provinceId)
      .map((city) => city.id);
  }

  function removeProvinceSelection(provinceId: string) {
    const provinceCityIds = new Set(
      getProvinceCityIds(provinceId)
    );

    updateSelectedCityIds(
      selectedCityIds.filter(
        (id) => !provinceCityIds.has(id)
      )
    );
  }

  function openLocationPicker() {
    setProvinceSearch("");
    setLocationMode("province");
    setActiveProvinceId("");
    setProvinceOpen(true);
  }

  function selectProvince(province: Province) {
    setActiveProvinceId(province.id);
    setProvinceSearch("");
    setLocationMode("city");
  }

  function toggleCity(city: City) {
    if (selectedCityIds.includes(city.id)) {
      updateSelectedCityIds(
        selectedCityIds.filter(
          (id) => id !== city.id
        )
      );
      return;
    }

    updateSelectedCityIds([
      ...selectedCityIds,
      city.id,
    ]);
  }

  function toggleAllCitiesInProvince() {
    if (!activeProvinceId) return;

    const provinceCityIds =
      getProvinceCityIds(activeProvinceId);

    const selectedSet = new Set(selectedCityIds);

    const allSelected =
      provinceCityIds.length > 0 &&
      provinceCityIds.every((id) =>
        selectedSet.has(id)
      );

    if (allSelected) {
      provinceCityIds.forEach((id) =>
        selectedSet.delete(id)
      );
    } else {
      provinceCityIds.forEach((id) =>
        selectedSet.add(id)
      );
    }

    updateSelectedCityIds(
      Array.from(selectedSet)
    );
  }

  function confirmCities() {
    setProvinceSearch("");
    setProvinceOpen(false);
    setLocationMode("province");
    setActiveProvinceId("");
  }

  function clearLocation() {
    updateSelectedCityIds([]);

    if (vehicleHeader?.onClearLocation) {
      vehicleHeader.onClearLocation();
    }

    setProvinceSearch("");
    setLocationMode("province");
    setActiveProvinceId("");
    setProvinceOpen(false);
  }

  const headerLocationLabel =
    selectedCityIds.length > 0
      ? `${faNumber.format(selectedCityIds.length)} شهر`
      : "استان";

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#f6f7f9] text-gray-950"
    >
      <header className="fixed inset-x-0 top-0 z-40 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto w-full max-w-xl px-4 pb-3 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openLocationPicker}
              className="flex h-12 shrink-0 items-center gap-1.5 rounded-2xl border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-gray-800 active:scale-[0.98]"
            >
              <span className="text-base">⌖</span>

              <span className="max-w-[100px] truncate">
                {headerLocationLabel}
              </span>

              <span className="text-xs text-gray-400">
                ⌄
              </span>
            </button>

            {isVehicleHeader ? (
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-400">
                  ⌕
                </span>

                <input
                  value={vehicleHeader?.search ?? ""}
                  onChange={(event) =>
                    vehicleHeader?.onSearchChange?.(
                      event.target.value
                    )
                  }
                  placeholder="جستجو در شهرهای ایران"
                  className="h-12 w-full rounded-2xl bg-gray-100 px-10 text-right text-[16px] text-gray-900 outline-none placeholder:text-gray-400 focus:bg-gray-50"
                />

                {(vehicleHeader?.search ?? "").trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      vehicleHeader?.onSearchChange?.("")
                    }
                    className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sm text-gray-400 shadow-sm"
                    aria-label="پاک کردن جستجو"
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={openLocationPicker}
                className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-gray-100 px-4 text-right text-sm text-gray-400"
              >
                <span className="text-lg">⌕</span>

                <span className="truncate">
                  جستجو در شهرهای ایران
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl px-4 pb-28 pt-[82px]">
        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="mx-auto grid h-[76px] max-w-xl grid-cols-5 items-center px-2">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/favorites" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`flex h-full min-w-0 flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-gray-950" : "text-gray-400"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center transition-transform ${
                    active ? "scale-[1.04]" : ""
                  }`}
                >
                  <NavIcon name={item.icon} active={active} />
                </span>

                <span
                  className={`whitespace-nowrap text-[10px] leading-4 tracking-[-0.1px] ${
                    active
                      ? "font-extrabold text-gray-950"
                      : "font-semibold text-gray-500"
                  }`}
                >
                  {item.label}
                </span>

                <span
                  className={`mt-0.5 h-1 w-1 rounded-full transition-opacity ${
                    active
                      ? "bg-gray-950 opacity-100"
                      : "opacity-0"
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </nav>

      {provinceOpen && (
        <div className="fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden bg-white">
          <div className="flex h-full min-h-0 w-full flex-col bg-white">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 pb-4 pt-5">
              <div>
                <h2 className="text-lg font-extrabold text-gray-950">
                  {locationMode === "province"
                    ? "انتخاب موقعیت"
                    : activeProvince?.name ||
                      "انتخاب شهر"}
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  {locationMode === "province"
                    ? "استان موردنظر را انتخاب کنید"
                    : "شهرهای موردنظر را انتخاب کنید"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setProvinceOpen(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="shrink-0 p-4">
              <div className="flex h-12 items-center gap-2 rounded-2xl bg-gray-100 px-4">
                <span className="text-lg text-gray-400">
                  ⌕
                </span>

                <input
                  value={provinceSearch}
                  onChange={(event) =>
                    setProvinceSearch(
                      event.target.value
                    )
                  }
                  placeholder={
                    locationMode === "province"
                      ? "جستجوی استان"
                      : "جستجوی شهر"
                  }
                  className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-gray-400"
                  autoFocus
                />
              </div>
            </div>

            {locationMode === "province" &&
              selectedCityIds.length > 0 && (
                <div className="shrink-0 px-4 pb-3">
                  <div className="mb-2 text-[11px] font-bold text-gray-500">
                    شهرهای انتخاب‌شده
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedAllProvinces.map(
                      (province) => (
                          <div
                            key={`province-${province.id}`}
                            className="flex min-h-9 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5"
                          >
                            <span className="text-xs font-bold text-red-700">
                              کل شهرهای{" "}
                              {province.name}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                removeProvinceSelection(
                                  province.id
                                )
                              }
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base font-bold leading-none text-red-500 active:bg-red-100"
                              aria-label={`حذف کل شهرهای ${province.name}`}
                            >
                              ×
                            </button>
                          </div>
                        )
                    )}

                    {selectedCities.map((city) => (
                        <div
                          key={`city-${city.id}`}
                          className="flex min-h-9 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5"
                        >
                          <span className="text-xs font-bold text-red-700">
                            {city.name}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedCityIds(
                                selectedCityIds.filter(
                                  (id) =>
                                    id !== city.id
                                )
                              )
                            }
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base font-bold leading-none text-red-500 active:bg-red-100"
                            aria-label={`حذف ${city.name}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            <div className="min-h-0 flex-1 overflow-y-auto px-4">
              {locationMode === "province" ? (
                <div className="space-y-2 pb-6">
                  <button
                    type="button"
                    onClick={clearLocation}
                    className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-right active:bg-gray-100"
                  >
                    <span className="text-sm font-bold text-gray-800">
                      همه ایران
                    </span>

                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-md border-2 ${
                        selectedCityIds.length === 0
                          ? "border-gray-950 bg-gray-950 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {selectedCityIds.length ===
                        0 && "✓"}
                    </span>
                  </button>

                  {filteredProvinces.map(
                    (province) => (
                      <button
                        key={province.id}
                        type="button"
                        onClick={() =>
                          selectProvince(province)
                        }
                        className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-4 text-right active:bg-gray-50"
                      >
                        <span className="text-sm font-bold text-gray-800">
                          {province.name}
                        </span>

                        <span className="text-lg font-bold text-gray-400">
                          &gt;
                        </span>
                      </button>
                    )
                  )}

                  {filteredProvinces.length === 0 && (
                    <div className="py-10 text-center text-sm text-gray-400">
                      استانی پیدا نشد
                    </div>
                  )}
                </div>
              ) : (
                <div className="pb-28">
                  <button
                    type="button"
                    onClick={() => {
                      setProvinceSearch("");
                      setLocationMode(
                        "province"
                      );
                      setActiveProvinceId("");
                    }}
                    className="mb-3 flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-right text-sm font-bold text-gray-700"
                  >
                    <span>← تغییر استان</span>

                    <span>
                      {activeProvince?.name ||
                        "استان"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={
                      toggleAllCitiesInProvince
                    }
                    className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-right active:bg-gray-100"
                  >
                    <span className="text-sm font-bold text-gray-800">
                      همه شهرهای{" "}
                      {activeProvince?.name || ""}
                    </span>

                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                        allCitiesInActiveProvinceSelected
                          ? "border-gray-950 bg-gray-950 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {allCitiesInActiveProvinceSelected &&
                        "✓"}
                    </span>
                  </button>

                  <div className="mt-2 space-y-2">
                    {filteredCities.map((city) => {
                      const active =
                        selectedCityIds.includes(
                          city.id
                        );

                      return (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() =>
                            toggleCity(city)
                          }
                          className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-4 text-right active:bg-gray-50"
                        >
                          <span className="text-sm font-bold text-gray-800">
                            {city.name}
                          </span>

                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                              active
                                ? "border-gray-950 bg-gray-950 text-white"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {active && "✓"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {filteredCities.length === 0 && (
                    <div className="py-10 text-center text-sm text-gray-400">
                      شهری پیدا نشد
                    </div>
                  )}
                </div>
              )}
            </div>

            {locationMode === "city" && (
              <div className="shrink-0 border-t border-gray-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={confirmCities}
                  className="w-full rounded-2xl bg-gray-950 py-4 text-sm font-bold text-white active:scale-[0.99]"
                >
                  تأیید انتخاب
                  {selectedCitiesInActiveProvince.length >
                  0
                    ? ` (${faNumber.format(
                        selectedCitiesInActiveProvince.length
                      )})`
                    : ""}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
