"use client";

import Link from "next/link";
import { useState } from "react";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import { loadMyDealershipInventoryAction } from "./myInventoryActions";
import type {
  MyDealershipPageData,
  MyDealershipVehicle,
} from "@/lib/data/dealerships/getMyDealershipPageData";

const PAGE_SIZE = 30;

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

function VehicleCard({ vehicle, isAdmin }: { vehicle: MyDealershipVehicle; isAdmin: boolean }) {
  return (
    <article className="overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <Link
        href={`/vehicles/${vehicle.id}`}
        className="flex min-h-[132px] gap-3 p-3 active:bg-gray-50"
      >
        <div
          className="h-[108px] w-[126px] shrink-0 overflow-hidden rounded-[17px] bg-gray-100"
          style={
            vehicle.image_url
              ? {
                  backgroundImage: `url(${vehicle.image_url})`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }
              : undefined
          }
        >
          {!vehicle.image_url && (
            <div className="flex h-full items-center justify-center text-xs font-medium text-gray-400">
              بدون تصویر
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-extrabold text-gray-950">
                {vehicle.brand} {vehicle.model}
              </h3>
              {vehicle.trim && (
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {vehicle.trim}
                </p>
              )}
            </div>

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

          {isAdmin && vehicle.dealership_name && (
            <p className="mt-1 truncate text-[11px] text-gray-400">
              {vehicle.dealership_name}
            </p>
          )}
        </div>
      </Link>

      <div className="border-t border-gray-100 px-3 py-2">
        <Link
          href={`/vehicles/${vehicle.id}/edit`}
          className="block rounded-xl py-2 text-center text-xs font-bold text-gray-600 active:bg-gray-50"
        >
          ویرایش خودرو
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

  const isAdmin = initialData.role === "admin";
  const hasMore = vehicles.length < totalCount;

  async function loadMore() {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError("");

    const result = await loadMyDealershipInventoryAction(
      vehicles.length,
      PAGE_SIZE,
    );

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

  return (
    <MobileAppShell>
      <div dir="rtl" className="mx-auto w-full max-w-xl px-4 pb-28 pt-[88px]">
        <header className="mb-5">
          <p className="text-xs font-bold text-gray-400">
            {isAdmin ? "مدیریت شبکه" : "نمایشگاه من"}
          </p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-950">
              {title}
            </h1>
            <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">
              {totalCount.toLocaleString("fa-IR")} خودرو
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {isAdmin
              ? "تمام خودروهای ثبت‌شده در شبکه خودرو‌یاب"
              : "فقط خودروهایی که با حساب کاربری شما ثبت شده‌اند"}
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {vehicles.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
            <div className="text-3xl">🚗</div>
            <h2 className="mt-3 text-base font-extrabold text-gray-900">
              {isAdmin
                ? "هنوز خودرویی در شبکه ثبت نشده است"
                : "هنوز خودرویی ثبت نکرده‌اید"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              برای شروع، یک خودرو ثبت کنید.
            </p>
            <Link
              href="/vehicles/new"
              className="mt-5 inline-flex rounded-2xl bg-gray-950 px-5 py-3 text-sm font-bold text-white active:scale-[0.98]"
            >
              ثبت خودرو
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                isAdmin={isAdmin}
              />
            ))}

            {hasMore && (
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
