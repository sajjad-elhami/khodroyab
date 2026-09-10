"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toggleVehicleFavoriteAction } from "@/app/vehicles/mutations";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import type { DashboardData } from "@/lib/data/dashboard/getDashboardData";

type Vehicle = {
  id: string;
  dealership_id: string;
  brand: string;
  model: string;
  trim: string | null;
  model_year: number | null;
  mileage: number | null;
  color: string | null;
  price: number | null;
  status: string;
  created_at: string;
  dealership_name: string | null;
  city_name: string | null;
  province_name: string | null;
  image_url: string | null;
};

const faNumber = new Intl.NumberFormat("fa-IR");

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return faNumber.format(value);
}

function formatYear(value: number | null) {
  if (!value) return "—";
  return value.toLocaleString("fa-IR", { useGrouping: false });
}

function formatPrice(value: number | null) {
  if (!value) return "قیمت توافقی";
  return `${formatNumber(Math.round(value / 1000000))} میلیون`;
}

function relativeTime(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${formatNumber(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${formatNumber(hours)} ساعت پیش`;
  return `${formatNumber(Math.floor(hours / 24))} روز پیش`;
}

function statusLabel(status: string) {
  if (status === "available") return "موجود";
  if (status === "sold") return "فروخته شده";
  if (status === "reserved") return "رزرو شده";
  return status || "نامشخص";
}

export default function Dashboard({ initialData }: { initialData: DashboardData }) {
  const supabase = useMemo(() => createClient(), []);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set(initialData.favorite_vehicle_ids));
  const [userId, setUserId] = useState<string | null>(initialData.current_user_id);
  const [error, setError] = useState("");

  useEffect(() => {
    const firstImageMap = new Map<string, string>();
    for (const image of initialData.images ?? []) {
      if (!firstImageMap.has(image.vehicle_id)) {
        const { data } = supabase.storage.from("vehicle-images").getPublicUrl(image.thumbnail_path || image.storage_path);
        firstImageMap.set(image.vehicle_id, data.publicUrl);
      }
    }

    setVehicles((initialData.vehicles ?? []).map((vehicle) => ({
      id: vehicle.id,
      dealership_id: vehicle.dealership_id ?? "",
      brand: vehicle.brand ?? "",
      model: vehicle.model ?? "",
      trim: vehicle.trim,
      model_year: vehicle.model_year,
      mileage: vehicle.mileage,
      color: vehicle.color,
      price: vehicle.price,
      status: vehicle.status ?? "",
      created_at: vehicle.created_at,
      dealership_name: vehicle.dealership_name,
      city_name: vehicle.city_name,
      province_name: vehicle.province_name,
      image_url: firstImageMap.get(vehicle.id) ?? null,
    })));
    setFavoriteIds(new Set(initialData.favorite_vehicle_ids));
    setUserId(initialData.current_user_id);
    setError("");
  }, [initialData, supabase]);

  const stats = initialData.stats;
  const recentVehicles = vehicles.slice(0, 8);
  const localInsights = useMemo(() => {
    const cityCounts = new Map<string, number>();
    const brandCounts = new Map<string, number>();
    for (const vehicle of vehicles) {
      const city = vehicle.city_name || vehicle.province_name || "نامشخص";
      cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
      brandCounts.set(vehicle.brand || "نامشخص", (brandCounts.get(vehicle.brand || "نامشخص") ?? 0) + 1);
    }
    return {
      topCity: [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0],
      topBrand: [...brandCounts.entries()].sort((a, b) => b[1] - a[1])[0],
    };
  }, [vehicles]);

  const toggleFavorite = async (event: React.MouseEvent<HTMLButtonElement>, vehicleId: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (!userId) return;

    const wasFavorite = favoriteIds.has(vehicleId);
    setFavoriteIds((current) => {
      const next = new Set(current);
      wasFavorite ? next.delete(vehicleId) : next.add(vehicleId);
      return next;
    });

    const result = await toggleVehicleFavoriteAction(vehicleId);
    if (!result.ok) {
      setFavoriteIds((current) => {
        const next = new Set(current);
        wasFavorite ? next.add(vehicleId) : next.delete(vehicleId);
        return next;
      });
      setError("تغییر نشان‌شده‌ها انجام نشد.");
    }
  };

  return (
    <MobileAppShell>
      <div className="space-y-5">
        <section className="rounded-[28px] bg-gray-950 p-5 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold text-gray-400">خودرو‌یاب</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight">داشبورد</h1>
              <p className="mt-2 text-xs leading-5 text-gray-400">{initialData.dealership_name || "شبکه نمایشگاه‌های خودرو"}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-xl">🚘</div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {[
            ["کل خودروها", stats.total_vehicle_count, "آگهی"],
            ["موجود", stats.available_vehicle_count, "در بازار"],
            ["خودروهای من", stats.my_vehicle_count, "ثبت‌شده"],
            ["نشان‌شده", stats.favorite_count, "ذخیره‌شده"],
          ].map(([label, value, hint]) => (
            <div key={label as string} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-400">{label}</p>
              <p className="mt-2 text-2xl font-extrabold text-gray-950">{formatNumber(value as number)}</p>
              <p className="mt-1 text-[10px] font-medium text-gray-400">{hint}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-3 gap-2">
          <Link href="/vehicles/new" prefetch={false} className="rounded-2xl bg-red-600 px-3 py-3 text-center text-xs font-extrabold text-white active:scale-[0.98]">＋ ثبت خودرو</Link>
          <Link href="/vehicles" prefetch={false} className="rounded-2xl bg-white px-3 py-3 text-center text-xs font-extrabold text-gray-800 shadow-sm ring-1 ring-gray-100">خودروها</Link>
          <Link href="/market-analysis" prefetch={false} className="rounded-2xl bg-white px-3 py-3 text-center text-xs font-extrabold text-gray-800 shadow-sm ring-1 ring-gray-100">تحلیل بازار</Link>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div><h2 className="font-extrabold text-gray-950">وضعیت شبکه</h2><p className="mt-1 text-[11px] text-gray-400">نمای کلی فعالیت خودرو‌یاب</p></div>
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700">فعال</span>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-xs font-bold"><span>خودروهای موجود</span><span>{formatNumber(stats.available_vehicle_count)} از {formatNumber(stats.total_vehicle_count)}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gray-950" style={{ width: `${stats.total_vehicle_count ? Math.min(100, (stats.available_vehicle_count / stats.total_vehicle_count) * 100) : 0}%` }} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gray-50 p-3"><p className="text-[10px] text-gray-400">نمایشگاه‌های فعال</p><p className="mt-1 font-extrabold">{formatNumber(stats.dealership_count)}</p></div>
              <div className="rounded-2xl bg-gray-50 p-3"><p className="text-[10px] text-gray-400">کاربران</p><p className="mt-1 font-extrabold">{formatNumber(stats.user_count)}</p></div>
            </div>
          </div>
        </section>

        {vehicles.length > 0 && (
          <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div><h2 className="font-extrabold">نبض بازار</h2><p className="mt-1 text-[11px] text-gray-400">بر اساس خودروهای اخیر شبکه</p></div>
              <Link href="/market-analysis" prefetch={false} className="text-[11px] font-bold text-red-600">تحلیل کامل ←</Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gray-50 p-4"><p className="text-[10px] text-gray-400">بیشترین شهر در نمونه اخیر</p><p className="mt-1 font-extrabold">{localInsights.topCity?.[0] ?? "—"}</p><p className="mt-1 text-[10px] text-gray-400">{formatNumber(localInsights.topCity?.[1] ?? 0)} خودرو</p></div>
              <div className="rounded-2xl bg-gray-50 p-4"><p className="text-[10px] text-gray-400">پرتکرارترین برند</p><p className="mt-1 font-extrabold">{localInsights.topBrand?.[0] ?? "—"}</p><p className="mt-1 text-[10px] text-gray-400">{formatNumber(localInsights.topBrand?.[1] ?? 0)} خودرو</p></div>
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <div><h2 className="font-extrabold">آخرین خودروها</h2><p className="mt-1 text-[11px] text-gray-400">جدیدترین آگهی‌های شبکه</p></div>
            <Link href="/vehicles" prefetch={false} className="rounded-xl bg-white px-3 py-2 text-[10px] font-bold text-gray-600 shadow-sm">مشاهده همه</Link>
          </div>
          {error && <div className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{error}</div>}
          {recentVehicles.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl">🚘</div><h3 className="mt-4 font-extrabold">هنوز خودرویی ثبت نشده است</h3><Link href="/vehicles/new" prefetch={false} className="mt-4 inline-flex rounded-2xl bg-gray-950 px-5 py-3 text-xs font-bold text-white">ثبت اولین خودرو</Link></div>
          ) : (
            <div className="space-y-3">
              {recentVehicles.map((vehicle) => {
                const favorite = favoriteIds.has(vehicle.id);
                return (
                  <div key={vehicle.id} className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                    <Link href={`/vehicles/${vehicle.id}`} prefetch={false} className="flex min-h-[128px] flex-row-reverse overflow-hidden">
                      <div className="relative w-[36%] shrink-0 bg-gray-100">{vehicle.image_url ? <img src={vehicle.image_url} alt={`${vehicle.brand} ${vehicle.model}`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl">🚘</div>}<span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[9px] font-bold text-white">{statusLabel(vehicle.status)}</span></div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5"><div className="pl-8"><h3 className="truncate text-sm font-extrabold">{vehicle.brand} {vehicle.model}{vehicle.trim ? ` ${vehicle.trim}` : ""}</h3><div className="mt-2 flex flex-wrap gap-2 text-[10px] font-medium text-gray-500">{vehicle.model_year && <span>مدل {formatYear(vehicle.model_year)}</span>}{vehicle.mileage !== null && <span>{formatNumber(vehicle.mileage)} کیلومتر</span>}{vehicle.color && <span>{vehicle.color}</span>}</div></div><div className="mt-2 flex items-end justify-between gap-2"><div className="min-w-0"><p className="truncate text-[10px] text-gray-400">{vehicle.city_name || vehicle.province_name || "ایران"} · {relativeTime(vehicle.created_at)}</p><p className="mt-0.5 truncate text-xs font-extrabold">{formatPrice(vehicle.price)}</p></div><span className="text-gray-400">←</span></div></div>
                    </Link>
                    <button type="button" onClick={(event) => toggleFavorite(event, vehicle.id)} aria-label={favorite ? "حذف از نشان‌شده‌ها" : "افزودن به نشان‌شده‌ها"} className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur ${favorite ? "bg-white text-red-500 shadow-sm" : "bg-black/45 text-white"}`}><span className="text-lg leading-none">{favorite ? "♥" : "♡"}</span></button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </MobileAppShell>
  );
}
