"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import { loadMyDealershipInventoryAction } from "./myInventoryActions";
import type {
  MyDealershipPageData,
  MyDealershipVehicle,
} from "@/lib/data/dealerships/getMyDealershipPageData";

const PAGE_SIZE = 30;

type Filter = "all" | "available" | "sold";

function formatNumber(value: number | null) {
  return value === null ? "—" : value.toLocaleString("fa-IR");
}

function formatPrice(value: number | null) {
  if (value === null) return "توافقی";
  return `${value.toLocaleString("fa-IR")} تومان`;
}

function formatYear(value: number | null) {
  return value === null
    ? "—"
    : value.toLocaleString("fa-IR", { useGrouping: false });
}

function statusLabel(status: string) {
  return status === "available" ? "موجود" : "فروخته شده";
}

function VehicleCard({ vehicle }: { vehicle: MyDealershipVehicle }) {
  return (
    <article className="overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-[0_3px_18px_rgba(15,23,42,0.045)]">
      <div className="flex gap-3 p-3">
        <Link
          href={`/vehicles/${vehicle.id}`}
          className="h-[108px] w-[126px] shrink-0 overflow-hidden rounded-[17px] bg-gray-100 active:opacity-80"
          aria-label={`مشاهده ${vehicle.brand} ${vehicle.model}`}
        >
          {vehicle.image_url ? (
            <div
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${vehicle.image_url})` }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-medium text-gray-400">
              بدون تصویر
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/vehicles/${vehicle.id}`} className="min-w-0 active:opacity-70">
              <h3 className="truncate text-[15px] font-extrabold text-gray-950">
                {vehicle.brand} {vehicle.model}
              </h3>
              {vehicle.trim && (
                <p className="mt-0.5 truncate text-xs text-gray-500">{vehicle.trim}</p>
              )}
            </Link>

            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                vehicle.status === "available"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {statusLabel(vehicle.status)}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <span>{formatYear(vehicle.model_year)}</span>
            <span className="text-gray-300">•</span>
            <span>{formatNumber(vehicle.mileage)} کیلومتر</span>
          </div>

          <p className="mt-2 truncate text-sm font-extrabold text-gray-900">
            {formatPrice(vehicle.price)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-gray-100">
        <Link
          href={`/vehicles/${vehicle.id}`}
          className="py-2.5 text-center text-xs font-bold text-gray-500 active:bg-gray-50"
        >
          مشاهده
        </Link>
        <Link
          href={`/vehicles/${vehicle.id}/edit`}
          className="border-r border-gray-100 py-2.5 text-center text-xs font-extrabold text-gray-800 active:bg-gray-50"
        >
          ویرایش
        </Link>
      </div>
    </article>
  );
}

export default function MyDealershipClient({
  initialData,
}: {
  initialData: MyDealershipPageData;
}) {
  const [vehicles, setVehicles] = useState(initialData.vehicles);
  const [totalCount, setTotalCount] = useState(initialData.totalCount);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const isAdmin = initialData.role === "admin";
  const hasMore = vehicles.length < totalCount;

  const visibleVehicles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return vehicles.filter((vehicle) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "available" && vehicle.status === "available") ||
        (filter === "sold" && vehicle.status !== "available");

      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;

      const haystack = [vehicle.brand, vehicle.model, vehicle.trim ?? ""]
        .join(" ")
        .toLocaleLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [vehicles, query, filter]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError("");

    const result = await loadMyDealershipInventoryAction(vehicles.length, PAGE_SIZE);

    if (!result.ok) {
      setError(result.error);
      setLoadingMore(false);
      return;
    }

    setVehicles((current) => [...current, ...result.data.vehicles]);
    setTotalCount(result.data.totalCount);
    setLoadingMore(false);
  }

  const title = isAdmin
    ? "کل موجودی خودرو‌یاب"
    : initialData.dealershipName ?? "نمایشگاه من";

  const availableLoadedCount = vehicles.filter((v) => v.status === "available").length;
  const soldLoadedCount = vehicles.filter((v) => v.status !== "available").length;

  return (
    <MobileAppShell>
      <div dir="rtl" className="mx-auto w-full max-w-xl px-4 pb-32 pt-[88px]">
        <header className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-400">
                {isAdmin ? "مدیریت شبکه" : "نمایشگاه من"}
              </p>
              <h1 className="mt-1 truncate text-[25px] font-black tracking-tight text-gray-950">
                {title}
              </h1>
            </div>
            <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-gray-950 px-3 text-sm font-black text-white">
              {totalCount.toLocaleString("fa-IR")}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {isAdmin ? "مدیریت موجودی ثبت‌شده در شبکه" : "مدیریت سریع خودروهای نمایشگاه"}
          </p>
        </header>

        <div className="mb-5 grid grid-cols-3 gap-2">
          <div className="rounded-[18px] border border-gray-100 bg-white px-3 py-3 shadow-[0_3px_16px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-bold text-gray-400">کل موجودی</p>
            <p className="mt-1 text-lg font-black text-gray-950">{totalCount.toLocaleString("fa-IR")}</p>
          </div>
          <div className="rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-3 py-3">
            <p className="text-[11px] font-bold text-emerald-600">موجود</p>
            <p className="mt-1 text-lg font-black text-emerald-800">{availableLoadedCount.toLocaleString("fa-IR")}</p>
          </div>
          <div className="rounded-[18px] border border-gray-100 bg-white px-3 py-3 shadow-[0_3px_16px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-bold text-gray-400">فروخته</p>
            <p className="mt-1 text-lg font-black text-gray-700">{soldLoadedCount.toLocaleString("fa-IR")}</p>
          </div>
        </div>

        <Link
          href="/vehicles/new"
          className="mb-4 flex h-14 w-full items-center justify-center gap-2 rounded-[19px] bg-gray-950 text-[15px] font-extrabold text-white shadow-[0_8px_24px_rgba(15,23,42,0.14)] active:scale-[0.99]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xl leading-none">+</span>
          ثبت خودرو جدید
        </Link>

        <section className="mb-5">
          <div className="flex h-12 items-center gap-2 rounded-[17px] border border-gray-200 bg-white px-3 shadow-[0_3px_16px_rgba(15,23,42,0.035)]">
            <span className="text-lg text-gray-400">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجو در موجودی من"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
              inputMode="search"
              dir="rtl"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-full px-2 text-lg text-gray-400 active:bg-gray-100"
                aria-label="پاک کردن جستجو"
              >
                ×
              </button>
            )}
          </div>

          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(
              [
                ["all", "همه"],
                ["available", "موجود"],
                ["sold", "فروخته‌شده"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition ${
                  filter === value
                    ? "bg-gray-950 text-white"
                    : "border border-gray-200 bg-white text-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-black text-gray-950">خودروهای من</h2>
          <span className="text-xs font-bold text-gray-400">
            {visibleVehicles.length.toLocaleString("fa-IR")} نمایش داده‌شده
          </span>
        </div>

        {vehicles.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-2xl">🚗</div>
            <h2 className="mt-4 text-base font-extrabold text-gray-900">
              {isAdmin ? "هنوز خودرویی در شبکه ثبت نشده است" : "هنوز خودرویی ثبت نکرده‌اید"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">اولین خودرو را ثبت کنید و موجودی نمایشگاه را بسازید.</p>
            <Link
              href="/vehicles/new"
              className="mt-5 inline-flex rounded-2xl bg-gray-950 px-5 py-3 text-sm font-bold text-white active:scale-[0.98]"
            >
              ثبت خودرو
            </Link>
          </div>
        ) : visibleVehicles.length === 0 ? (
          <div className="rounded-[22px] border border-gray-100 bg-white px-5 py-12 text-center">
            <p className="text-sm font-bold text-gray-600">خودرویی با این جستجو پیدا نشد.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="mt-4 text-xs font-extrabold text-gray-900 underline underline-offset-4"
            >
              پاک کردن فیلترها
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleVehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}

            {hasMore && !query && filter === "all" && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-800 shadow-sm disabled:cursor-wait disabled:opacity-60"
              >
                {loadingMore ? "در حال دریافت..." : "نمایش خودروهای بیشتر"}
              </button>
            )}
          </div>
        )}
      </div>
    </MobileAppShell>
  );
}
