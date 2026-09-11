"use client";

import Link from "next/link";
import { useState } from "react";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import {
  deleteInventoryVehicleAction,
  loadMyDealershipInventoryAction,
  updateInventoryVehicleAction,
} from "./myInventoryActions";
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
  return `${value.toLocaleString("fa-IR").replace(/٬/g, "/")} تومان`;
}

function formatYear(value: number | null) {
  return value === null
    ? "—"
    : value.toLocaleString("fa-IR", { useGrouping: false });
}

function getTehranBusinessDayCutoff() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = Number(get("hour") ?? "0");
  const minute = Number(get("minute") ?? "0");

  if (!year || !month || !day) return null;
  if (hour < 7 || (hour === 7 && minute < 0)) return null;

  return new Date(`${year}-${month}-${day}T07:00:00+03:30`);
}

function isInventoryConfirmedToday(inventoryConfirmedAt: string | null) {
  const cutoff = getTehranBusinessDayCutoff();
  if (!cutoff) return true;
  if (!inventoryConfirmedAt) return false;
  return new Date(inventoryConfirmedAt).getTime() >= cutoff.getTime();
}

function VehicleCard({
  vehicle,
  onDeleted,
}: {
  vehicle: MyDealershipVehicle;
  onDeleted: (vehicleId: string) => void;
}) {
  const [busy, setBusy] = useState<"update" | "delete" | null>(null);
  const [actionError, setActionError] = useState("");
  const [confirmedAt, setConfirmedAt] = useState(
    vehicle.inventory_confirmed_at,
  );

  const confirmedToday = isInventoryConfirmedToday(confirmedAt);

  async function confirmInventory() {
    if (busy) return;
    setBusy("update");
    setActionError("");

    const result = await updateInventoryVehicleAction(vehicle.id);
    if (!result.ok) {
      setActionError(result.error);
      setBusy(null);
      return;
    }

    setConfirmedAt(result.inventoryConfirmedAt);
    setBusy(null);

    if (result.allConfirmedToday) {
      window.location.href = "/vehicles";
    }
  }

  async function deleteSoldVehicle() {
    if (busy || !window.confirm("آیا از حذف خودرو مطمئن هستید؟")) return;
    setBusy("delete");
    setActionError("");

    const result = await deleteInventoryVehicleAction(vehicle.id);
    if (!result.ok) {
      setActionError(result.error);
      setBusy(null);
      return;
    }

    onDeleted(vehicle.id);
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex h-[175px] flex-row-reverse" dir="rtl">
        <div className="h-full w-[122px] shrink-0 overflow-hidden rounded-2xl bg-gray-100">
          {vehicle.image_url ? (
            <img
              src={vehicle.image_url}
              alt={`${vehicle.model}${vehicle.model_year ? ` مدل ${formatYear(vehicle.model_year)}` : ""}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-3xl">🚘</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 px-3 py-2.5">
          <h2 className="truncate text-[15px] font-bold leading-5 text-gray-950">
            {vehicle.model}
            {vehicle.model_year !== null && (
              <span className="mr-1">مدل {formatYear(vehicle.model_year)}</span>
            )}
            {vehicle.color && <span className="mr-1">/ {vehicle.color}</span>}
          </h2>
          <p className="mt-1.5 text-[12px] font-medium text-gray-500">
            {vehicle.mileage !== null
              ? `${formatNumber(vehicle.mileage)} کیلومتر`
              : "کارکرد نامشخص"}
          </p>
          <p className="mt-1 text-[11px] font-medium text-gray-500">
            {formatPrice(vehicle.price)}
          </p>
        </div>
      </div>

      {actionError && (
        <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-3 border-t border-gray-100">
        <button
          type="button"
          onClick={confirmInventory}
          disabled={busy !== null}
          className={`py-2.5 text-xs font-extrabold disabled:opacity-50 ${
            confirmedToday ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {busy === "update"
            ? "در حال بروزرسانی..."
            : confirmedToday
              ? "بروزرسانی شد"
              : "نیاز به بروزرسانی"}
        </button>

        <button
          type="button"
          onClick={deleteSoldVehicle}
          disabled={busy !== null}
          className="border-x border-gray-100 py-2.5 text-xs font-extrabold text-red-600 disabled:opacity-40"
        >
          {busy === "delete" ? "در حال حذف..." : "فروخته شد"}
        </button>

        <Link
          href={`/vehicles/${vehicle.id}/edit`}
          className="py-2.5 text-center text-xs font-extrabold text-gray-800"
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

  const isAdmin = initialData.role === "admin";
  const hasMore = vehicles.length < totalCount;
  const isActive = isAdmin ? true : initialData.dealershipIsActive !== false;
  const title = isAdmin
    ? "کل موجودی خودرو‌یاب"
    : initialData.dealershipName ?? "نمایشگاه من";

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
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

  function handleDeleted(vehicleId: string) {
    setVehicles((current) => current.filter((v) => v.id !== vehicleId));
    setTotalCount((current) => Math.max(0, current - 1));
  }

  return (
    <MobileAppShell hideHeader>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-gray-100 bg-white">
        <div dir="rtl" className="mx-auto w-full max-w-xl px-4 py-2">
          {isAdmin ? (
            <div className="flex h-12 w-full items-center rounded-xl bg-gray-100 px-4">
              <h1 className="min-w-0 truncate text-[15px] font-bold text-gray-950">
                مدیر شبکه
              </h1>
            </div>
          ) : (
            <div className="flex h-12 w-full items-center justify-between gap-3 rounded-xl bg-gray-100 px-4">
              <h1 className="min-w-0 truncate text-[15px] font-bold text-gray-950">
                {title}
              </h1>
              <div
                className={`shrink-0 text-[12px] font-bold ${
                  isActive ? "text-emerald-600" : "text-red-600"
                }`}
              >
                <span className="ml-1 inline-block text-[9px]">●</span>
                {isActive ? "فعال" : "غیرفعال"}
              </div>
            </div>
          )}
        </div>
      </header>

      <div
        dir="rtl"
        className="mx-auto w-full max-w-xl px-4 pb-32 pt-[64px]"
      >
        <Link
          href="/vehicles/new"
          className="mb-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-[14px] font-extrabold text-white transition active:scale-[0.99]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-lg leading-none text-white">
            ＋
          </span>
          <span>ثبت خودروی جدید</span>
        </Link>

        {!isAdmin && !isActive && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            این نمایشگاه در حال حاضر غیرفعال است.
          </div>
        )}

        <div className="mb-3 mt-1 flex items-center justify-between">
          <h2 className="text-base font-black text-gray-950">خودروهای نمایشگاه</h2>
          <span className="text-xs font-bold text-gray-400">
            {totalCount.toLocaleString("fa-IR")} خودرو
          </span>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {vehicles.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
            <div className="text-2xl">🚗</div>
            <h2 className="mt-4 text-base font-extrabold">
              هنوز خودرویی ثبت نکرده‌اید
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              اولین خودرو را برای نمایشگاه ثبت کنید.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onDeleted={handleDeleted}
              />
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold"
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
