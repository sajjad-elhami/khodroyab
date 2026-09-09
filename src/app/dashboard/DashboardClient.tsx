"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

    if (isFavorite) {
      const { error } = await supabase
        .from("vehicle_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("vehicle_id", vehicleId);

      if (error) {
        setFavoriteIds((current) => {
          const next = new Set(current);
          next.add(vehicleId);
          return next;
        });
      }
    } else {
      const { error } = await supabase
        .from("vehicle_favorites")
        .insert({
          user_id: userId,
          vehicle_id: vehicleId,
        });

      if (error) {
        setFavoriteIds((current) => {
          const next = new Set(current);
          next.delete(vehicleId);
          return next;
        });
      }
    }
  };

  return (
    <MobileAppShell>
      <section className="mb-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-400">
              خودرو‌یاب
            </p>

            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
              آخرین خودروهای ثبت شده
            </h1>
          </div>

          <Link
            href="/vehicles"
            prefetch={false}
            className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600"
          >
            مشاهده همه
          </Link>
        </div>

        <p className="mt-2 text-sm text-gray-500">
          جدیدترین خودروهای نمایشگاه‌ها
        </p>
      </section>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-[132px] animate-pulse rounded-3xl bg-white"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-100 bg-white p-5">
          <p className="font-bold text-red-600">
            دریافت خودروها ناموفق بود
          </p>

          <p className="mt-2 text-xs leading-6 text-gray-500">
            {error}
          </p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
            🚘
          </div>

          <h2 className="mt-4 font-extrabold">
            هنوز خودرویی ثبت نشده است
          </h2>

          <Link
            href="/vehicles/new"
            prefetch={false}
            className="mt-5 inline-flex rounded-2xl bg-gray-950 px-5 py-3 text-sm font-bold text-white"
          >
            ثبت اولین خودرو
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((vehicle) => {
            const isFavorite = favoriteIds.has(vehicle.id);

            return (
              <div
                key={vehicle.id}
                className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
              >
                <Link
                  href={`/vehicles/${vehicle.id}`}
                  prefetch={false}
                  className="group flex min-h-[132px] flex-row-reverse overflow-hidden transition active:scale-[0.99]"
                >
                  <div className="relative w-[38%] shrink-0 bg-gray-100">
                    {vehicle.image_url ? (
                      <img
                        src={vehicle.image_url}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">
                        🚘
                      </div>
                    )}

                    <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">
                      {vehicle.status === "available"
                        ? "موجود"
                        : vehicle.status === "sold"
                        ? "فروخته شده"
                        : vehicle.status}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5">
                    <div className="pl-8">
                      <h2 className="truncate text-[15px] font-bold text-gray-950">
                        {vehicle.brand} {vehicle.model}
                        {vehicle.trim
                          ? ` ${vehicle.trim}`
                          : ""}
                      </h2>

                      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] font-medium text-gray-500">
                        {vehicle.model_year && (
                          <span>
                            مدل {formatYear(vehicle.model_year)}
                          </span>
                        )}

                        {vehicle.mileage !== null && (
                          <span>
                            {formatNumber(vehicle.mileage)} کیلومتر
                          </span>
                        )}

                        {vehicle.color && (
                          <span>{vehicle.color}</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] text-gray-400">
                          {vehicle.city_name ||
                            vehicle.province_name ||
                            "ایران"}
                        </p>

                        <p className="mt-0.5 truncate text-xs font-semibold text-gray-900">
                          {formatPrice(vehicle.price)}
                        </p>
                      </div>

                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400">
                        ←
                      </span>
                    </div>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={(event) =>
                    toggleFavorite(event, vehicle.id)
                  }
                  aria-label={
                    isFavorite
                      ? "حذف از نشان‌شده‌ها"
                      : "افزودن به نشان‌شده‌ها"
                  }
                  className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90 ${
                    isFavorite
                      ? "bg-white text-red-500 shadow-sm"
                      : "bg-black/45 text-white"
                  }`}
                >
                  <span className="text-xl leading-none">
                    {isFavorite ? "♥" : "♡"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </MobileAppShell>
  );
}
