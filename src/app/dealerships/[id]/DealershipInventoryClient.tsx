"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateVehicleStatusAction } from "../actions";
import { createClient } from "@/lib/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

type Dealership = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  province_id: string | null;
  city_id: string | null;
  province_name: string | null;
  city_name: string | null;
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
  price: number | null;
  status: string;
  dealership_name: string;
  province_name: string | null;
  city_name: string | null;
};

type Props = {
  dealership: Dealership;
  initialVehicles: Vehicle[];
  initialTotalCount: number;
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

function statusLabel(status: string) {
  if (status === "available") return "موجود";
  if (status === "sold") return "فروخته شده";
  return status;
}

function statusClass(status: string) {
  if (status === "available") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "sold") {
    return "bg-red-50 text-red-700";
  }

  return "bg-gray-100 text-gray-600";
}

export default function DealershipInventoryClient({
  dealership,
  initialVehicles,
  initialTotalCount,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);
  const initialDataConsumed = useRef(false);
  const [error, setError] = useState("");
  const [updatingVehicleId, setUpdatingVehicleId] =
    useState<string | null>(null);

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE)
  );

  useEffect(() => {
    if (
      !initialDataConsumed.current &&
      search === "" &&
      sort === "newest" &&
      page === 1
    ) {
      initialDataConsumed.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      loadVehicles();
    }, search ? 350 : 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [search, sort, page]);

  async function loadVehicles() {
    setLoading(true);
    setError("");

    const { data, error: searchError } =
      await supabase.rpc("search_vehicles", {
        p_search: normalizePersian(search) || null,
        p_brand: null,
        p_model: null,
        p_year_from: null,
        p_year_to: null,
        p_price_from: null,
        p_price_to: null,
        p_mileage_from: null,
        p_mileage_to: null,
        p_color: null,
        p_status: null,
        p_province_id: null,
        p_city_id: null,
        p_dealership_id: dealership.id,
        p_sort: sort,
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
      });

    if (searchError) {
      setError(searchError.message);
      setVehicles([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    const results = (data ?? []) as (Vehicle & {
      total_count: number;
    })[];

    setVehicles(results);
    setTotalCount(results[0]?.total_count ?? 0);
    setLoading(false);
  }

  async function changeVehicleStatus(
    vehicle: Vehicle,
    nextStatus: "available" | "sold"
  ) {
    if (updatingVehicleId) return;

    const message =
      nextStatus === "sold"
        ? `خودروی «${vehicle.brand} ${vehicle.model}» به‌عنوان فروخته‌شده ثبت شود؟`
        : `خودروی «${vehicle.brand} ${vehicle.model}» دوباره به موجودی برگردد؟`;

    if (!window.confirm(message)) return;

    setUpdatingVehicleId(vehicle.id);
    setError("");

    const result = await updateVehicleStatusAction(
      vehicle.id,
      dealership.id,
      nextStatus,
    );

    if (!result.ok) {
      setError(result.error);
      setUpdatingVehicleId(null);
      return;
    }

    setVehicles((current) =>
      current.map((item) =>
        item.id === vehicle.id
          ? { ...item, status: nextStatus }
          : item
      )
    );

    setUpdatingVehicleId(null);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleSortChange(value: string) {
    setSort(value);
    setPage(1);
  }

  return (
    <AdminLayout
      title={dealership.name}
      description="مدیریت موجودی خودروهای این نمایشگاه"
      actionLabel="+ افزودن خودرو"
      actionHref={`/vehicles/new?dealershipId=${dealership.id}`}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl bg-gray-950 p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                  🚘
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    dealership.is_active
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-white/10 text-gray-300"
                  }`}
                >
                  {dealership.is_active ? "فعال" : "غیرفعال"}
                </span>
              </div>

              <h2 className="mt-5 text-2xl font-extrabold tracking-tight md:text-3xl">
                {dealership.name}
              </h2>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-400">
                {dealership.province_name && (
                  <span>
                    استان: {dealership.province_name}
                  </span>
                )}

                {dealership.city_name && (
                  <span>
                    شهر: {dealership.city_name}
                  </span>
                )}

                {dealership.phone && (
                  <span dir="ltr">{dealership.phone}</span>
                )}
              </div>

              {dealership.address && (
                <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
                  {dealership.address}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => router.push("/dealerships")}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-gray-200 transition hover:bg-white/10"
            >
              ← بازگشت به نمایشگاه‌ها
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                موجودی خودروها
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {loading
                  ? "در حال دریافت موجودی..."
                  : `${formatNumber(totalCount)} خودرو در این نمایشگاه`}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) =>
                  handleSearchChange(event.target.value)
                }
                placeholder="جستجوی خودرو..."
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-gray-400 sm:w-72"
              />

              <select
                value={sort}
                onChange={(event) =>
                  handleSortChange(event.target.value)
                }
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none"
              >
                <option value="newest">جدیدترین</option>
                <option value="price_asc">ارزان‌ترین</option>
                <option value="price_desc">گران‌ترین</option>
                <option value="year_desc">جدیدترین مدل</option>
                <option value="year_asc">قدیمی‌ترین مدل</option>
                <option value="mileage_asc">کم‌کارترین</option>
                <option value="mileage_desc">پُرکارترین</option>
              </select>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-72 animate-pulse rounded-3xl bg-white shadow-sm"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold">
              خطا در دریافت موجودی
            </h2>

            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">🚗</div>

            <h2 className="mt-4 text-xl font-bold">
              خودرویی در این نمایشگاه پیدا نشد
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              عبارت جستجو را تغییر دهید یا موجودی نمایشگاه را بررسی کنید.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/vehicles/new?dealershipId=${dealership.id}`
                )
              }
              className="mt-5 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white"
            >
              + افزودن خودرو
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <article
                key={vehicle.id}
                className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex min-h-36 items-end justify-between bg-gray-100 p-5">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(
                      vehicle.status
                    )}`}
                  >
                    {statusLabel(vehicle.status)}
                  </span>

                  <div className="text-4xl">🚘</div>
                </div>

                <div className="p-5">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/vehicles/${vehicle.id}`)
                    }
                    className="w-full text-right"
                  >
                    <h3 className="text-xl font-extrabold text-gray-900">
                      {vehicle.brand} {vehicle.model}
                    </h3>

                    {vehicle.trim && (
                      <p className="mt-1 text-sm text-gray-500">
                        {vehicle.trim}
                      </p>
                    )}
                  </button>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    {vehicle.model_year !== null && (
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">مدل</p>
                        <p className="mt-1 font-bold">
                          {formatYear(vehicle.model_year)}
                        </p>
                      </div>
                    )}

                    {vehicle.mileage !== null && (
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          کارکرد
                        </p>
                        <p className="mt-1 font-bold">
                          {formatNumber(vehicle.mileage)} کیلومتر
                        </p>
                      </div>
                    )}

                    {vehicle.color && (
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">رنگ</p>
                        <p className="mt-1 font-bold">
                          {vehicle.color}
                        </p>
                      </div>
                    )}
                  </div>

                  {vehicle.price !== null && (
                    <div className="mt-5 border-t border-gray-100 pt-4">
                      <p className="text-xs text-gray-500">قیمت</p>

                      <p className="mt-1 text-lg font-extrabold">
                        {formatNumber(vehicle.price)} تومان
                      </p>
                    </div>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/vehicles/${vehicle.id}`)
                      }
                      className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                    >
                      مشاهده
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/vehicles/${vehicle.id}/edit`
                        )
                      }
                      className="rounded-xl bg-gray-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                    >
                      ویرایش
                    </button>
                  </div>

                  <div className="mt-2">
                    {vehicle.status === "sold" ? (
                      <button
                        type="button"
                        disabled={
                          updatingVehicleId === vehicle.id
                        }
                        onClick={() =>
                          changeVehicleStatus(
                            vehicle,
                            "available"
                          )
                        }
                        className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingVehicleId === vehicle.id
                          ? "در حال بروزرسانی..."
                          : "↩ بازگشت به موجودی"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          updatingVehicleId === vehicle.id
                        }
                        onClick={() =>
                          changeVehicleStatus(
                            vehicle,
                            "sold"
                          )
                        }
                        className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingVehicleId === vehicle.id
                          ? "در حال بروزرسانی..."
                          : "✓ ثبت فروش / خروج از موجودی"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              قبلی
            </button>

            <span className="min-w-24 text-center text-sm text-gray-600">
              {formatNumber(page)} / {formatNumber(totalPages)}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1)
                )
              }
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              بعدی
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
