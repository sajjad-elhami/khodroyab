"use client";

import Link from "next/link";
import { useState } from "react";
import MobileAppShell from "@/components/mobile/MobileAppShell";

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  trim: string | null;
  model_year: number | null;
  mileage: number | null;
  color: string | null;
  price: number | null;
  status: string;
  created_at: string;
  image_url: string | null;
};

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

export default function FavoritesClient({
  initialVehicles,
}: {
  initialVehicles: Vehicle[];
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  return (
    <MobileAppShell>
      <section className="mb-5">
        <p className="text-xs font-semibold text-gray-400">
          خودرو‌یاب
        </p>

        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
          نشان‌شده‌ها
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          خودروهایی که برای بررسی بیشتر ذخیره کرده‌اید
        </p>
      </section>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-[132px] animate-pulse rounded-3xl bg-white"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-100 bg-white p-5">
          <p className="font-bold text-red-600">
            دریافت نشان‌شده‌ها ناموفق بود
          </p>

          <p className="mt-2 text-xs leading-6 text-gray-500">
            {error}
          </p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white px-6 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-3xl">
            ♡
          </div>

          <h2 className="mt-4 text-base font-bold text-gray-900">
            هنوز خودرویی نشان نشده است
          </h2>

          <p className="mt-2 text-xs leading-6 text-gray-400">
            وقتی خودرویی را نشان‌دار کنید، اینجا نمایش داده می‌شود.
          </p>

          <Link
            href="/vehicles"
            className="mt-5 inline-flex rounded-2xl bg-gray-950 px-5 py-3 text-sm font-bold text-white"
          >
            مشاهده خودروها
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={`/vehicles/${vehicle.id}`}
              className="group flex min-h-[132px] flex-row-reverse overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition active:scale-[0.99]"
            >
              <div className="relative w-[38%] shrink-0 bg-gray-100">
                {vehicle.image_url ? (
                  <img
                    src={vehicle.image_url}
                    alt={`${vehicle.brand} ${vehicle.model}`}
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
                <div>
                  <h2 className="truncate text-[15px] font-bold text-gray-950">
                    {vehicle.brand} {vehicle.model}
                    {vehicle.trim ? ` ${vehicle.trim}` : ""}
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

                    {vehicle.color && <span>{vehicle.color}</span>}
                  </div>
                </div>

                <div className="mt-2">
                  <p className="text-xs font-semibold text-gray-900">
                    {formatPrice(vehicle.price)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </MobileAppShell>
  );
}
