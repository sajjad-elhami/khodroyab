"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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


type DashboardPayload = DashboardData;

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatYear(value: number | null) {
  if (!value) return "-";

  return value.toLocaleString("fa-IR", {
    useGrouping: false,
  });
}

function formatPrice(value: number | null) {
  if (!value) return "قیمت توافقی";

  return `${formatNumber(Math.round(value / 1000000))} میلیون`;
}

export default function Dashboard({
  initialData,
}: {
  initialData: DashboardData;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    new Set(initialData.favorite_vehicle_ids)
  );
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Hydrate the Client Component from server-loaded Dashboard data.
  // No dashboard RPC is performed in the browser.
  useEffect(() => {
    const supabase = createClient();

    const rows = initialData.vehicles ?? [];
    const firstImageMap = new Map<string, string>();

    for (const image of initialData.images ?? []) {
      if (!firstImageMap.has(image.vehicle_id)) {
        const { data: publicUrlData } = supabase.storage
          .from("vehicle-images")
          .getPublicUrl(image.thumbnail_path || image.storage_path);

        firstImageMap.set(image.vehicle_id, publicUrlData.publicUrl);
      }
    }

    const result: Vehicle[] = rows.map((vehicle) => ({
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
    }));

    setVehicles(result);
    setFavoriteIds(new Set(initialData.favorite_vehicle_ids));
    setError("");
  }, [initialData]);

  // User identity is already included in the Server Component's
  // dashboard payload, so no extra auth round trip is needed here.
  useEffect(() => {
    setUserId(initialData.current_user_id);
  }, [initialData.current_user_id]);

  const toggleFavorite = async (
    event: React.MouseEvent<HTMLButtonElement>,
    vehicleId: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!userId) return;

    const supabase = createClient();
    const isFavorite = favoriteIds.has(vehicleId);

    setFavoriteIds((current) => {
      const next = new Set(current);

      if (isFavorite) {
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

        if (isFavorite) {
          next.add(vehicleId);
        } else {
          next.delete(vehicleId);
        }

        return next;
      });
    }
  };

  return (
    <MobileAppShell>
      <section className="mb-6">
        <p className="text-xs font-semibold text-gray-400">
          خودرو‌یاب
        </p>

        <div className="mt-1 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-950">
              داشبورد
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              مدیریت نمایشگاه و بررسی بازار
            </p>
          </div>

          <Link
            href="/vehicles/new"
            prefetch={false}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-2xl font-light text-white shadow-sm active:scale-95"
            aria-label="ثبت خودرو"
          >
            +
          </Link>
        </div>
      </section>

      <section className="mb-7 grid grid-cols-2 gap-3">
        <Link
          href="/dealerships"
          prefetch={false}
          className="group rounded-3xl border border-gray-100 bg-white p-4 shadow-sm transition active:scale-[0.98]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-xl">
            🏢
          </div>

          <h2 className="mt-3 text-sm font-extrabold text-gray-950">
            نمایشگاه‌ها
          </h2>

          <p className="mt-1 text-[11px] leading-5 text-gray-500">
            مشاهده و مدیریت نمایشگاه‌ها
          </p>

          <div className="mt-3 text-xs font-bold text-gray-400">
            ورود ←
          </div>
        </Link>

        <Link
          href="/market-analysis"
          prefetch={false}
          className="group rounded-3xl border border-gray-100 bg-white p-4 shadow-sm transition active:scale-[0.98]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-xl">
            📊
          </div>

          <h2 className="mt-3 text-sm font-extrabold text-gray-950">
            تحلیل بازار
          </h2>

          <p className="mt-1 text-[11px] leading-5 text-gray-500">
            قیمت، تعداد و وضعیت بازار
          </p>

          <div className="mt-3 text-xs font-bold text-gray-400">
            مشاهده ←
          </div>
        </Link>



        <Link
          href="/users"
          prefetch={false}
          className="group rounded-3xl border border-gray-100 bg-white p-4 shadow-sm transition active:scale-[0.98]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-xl">
            👥
          </div>

          <h2 className="mt-3 text-sm font-extrabold text-gray-950">
            کاربران
          </h2>

          <p className="mt-1 text-[11px] leading-5 text-gray-500">
            مدیریت کاربران و دسترسی‌ها
          </p>

          <div className="mt-3 text-xs font-bold text-gray-400">
            مدیریت ←
          </div>
        </Link>
      </section>

    </MobileAppShell>
  );
}
