"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCitiesByProvince } from "@/lib/data/catalog/clientCatalog";
import AdminLayout from "@/components/admin/AdminLayout";
import type { DealershipPageData } from "@/lib/data/dealerships/getDealershipPageData";
import {
  getDealershipsByCityAction,
  createDealershipAction,
  updateDealershipAction,
  toggleDealershipAction,
} from "./actions";

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
  phone: string | null;
  address: string | null;
  province_id: string | null;
  city_id: string | null;
  is_active: boolean;
  vehicle_count: number;
};

type FormState = {
  name: string;
  phone: string;
  address: string;
  provinceId: string;
  cityId: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  phone: "",
  address: "",
  provinceId: "",
  cityId: "",
  isActive: true,
};

function formatNumber(value: number) {
  return value.toLocaleString("fa-IR");
}

export default function DealershipsClient({
  initialData,
}: {
  initialData: DealershipPageData;
}) {
  const router = useRouter();

  const [provinces, setProvinces] = useState<Province[]>(
    initialData.provinces,
  );
  const [cities, setCities] = useState<City[]>([]);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);

  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDealerships, setLoadingDealerships] = useState(false);

  const [isAdmin, setIsAdmin] = useState(initialData.isAdmin);
  const [checkingUser, setCheckingUser] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingDealership, setEditingDealership] =
    useState<Dealership | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [formCities, setFormCities] = useState<City[]>([]);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadCities(selectedProvinceId: string) {
    if (!selectedProvinceId) {
      setFormCities([]);
      return;
    }

    setLoadingCities(true);

    try {
      const supabase = createClient();
      const cities = await getCitiesByProvince(
        supabase,
        selectedProvinceId,
      );

      setFormCities(cities);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "خطا در دریافت شهرها",
      );
      setFormCities([]);
    } finally {
      setLoadingCities(false);
    }
  }

  async function loadDealerships(selectedCityId: string) {
    if (!selectedCityId) {
      setDealerships([]);
      return;
    }

    setLoadingDealerships(true);
    setError("");

    try {
      const data = await getDealershipsByCityAction(selectedCityId);
      setDealerships(data);
    } catch (error) {
      setDealerships([]);
      setError(
        error instanceof Error
          ? error.message
          : "خطا در دریافت نمایشگاه‌ها",
      );
    } finally {
      setLoadingDealerships(false);
    }
  }

  async function handleProvinceChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const selectedProvinceId = event.target.value;

    setProvinceId(selectedProvinceId);
    setCityId("");
    setCities([]);
    setDealerships([]);
    setError("");
    setSuccess("");

    if (!selectedProvinceId) {
      return;
    }

    setLoadingCities(true);

    try {
      const supabase = createClient();
      const cities = await getCitiesByProvince(
        supabase,
        selectedProvinceId,
      );

      setCities(cities);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "خطا در دریافت شهرها",
      );
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }

  async function handleCityChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const selectedCityId = event.target.value;

    setCityId(selectedCityId);
    setError("");
    setSuccess("");

    await loadDealerships(selectedCityId);
  }

  function openCreateForm() {
    setEditingDealership(null);
    setForm(emptyForm);
    setFormCities([]);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  async function openEditForm(dealership: Dealership) {
    setEditingDealership(dealership);

    setForm({
      name: dealership.name,
      phone: dealership.phone ?? "",
      address: dealership.address ?? "",
      provinceId: dealership.province_id ?? "",
      cityId: dealership.city_id ?? "",
      isActive: dealership.is_active,
    });

    setShowForm(true);
    setError("");
    setSuccess("");

    if (dealership.province_id) {
      await loadCities(dealership.province_id);
    }
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingDealership(null);
    setForm(emptyForm);
    setFormCities([]);
  }

  async function handleFormProvinceChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const selectedProvinceId = event.target.value;

    setForm((current) => ({
      ...current,
      provinceId: selectedProvinceId,
      cityId: "",
    }));

    await loadCities(selectedProvinceId);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("نام نمایشگاه را وارد کنید.");
      return;
    }

    if (!form.provinceId) {
      setError("استان را انتخاب کنید.");
      return;
    }

    if (!form.cityId) {
      setError("شهر را انتخاب کنید.");
      return;
    }

    setSaving(true);

    const supabase = createClient();

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      province_id: form.provinceId,
      city_id: form.cityId,
      is_active: form.isActive,
    };

    if (editingDealership) {
      const result = await updateDealershipAction(
        editingDealership.id,
        {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          provinceId: form.provinceId,
          cityId: form.cityId,
          isActive: form.isActive,
        }
      );

      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }

      setSuccess("نمایشگاه با موفقیت ویرایش شد.");
    } else {
      const result = await createDealershipAction({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        provinceId: form.provinceId,
        cityId: form.cityId,
        isActive: form.isActive,
      });

      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }

      setSuccess("نمایشگاه با موفقیت ثبت شد.");
    }

    setSaving(false);
    closeForm();

    if (cityId) {
      await loadDealerships(cityId);
    }
  }

  async function toggleDealership(dealership: Dealership) {
    setError("");
    setSuccess("");

    const supabase = createClient();

    const result = await toggleDealershipAction(
      dealership.id,
      !dealership.is_active
    );

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(
      dealership.is_active
        ? "نمایشگاه غیرفعال شد."
        : "نمایشگاه فعال شد."
    );

    if (cityId) {
      await loadDealerships(cityId);
    }
  }

  function openInventory(dealershipId: string) {
    router.push(`/dealerships/${dealershipId}`);
  }

  return (
    <AdminLayout
      title="نمایشگاه‌ها"
      description="نمایشگاه‌ها را بر اساس موقعیت پیدا کنید و موجودی خودروهای آن‌ها را ببینید."
      actionLabel={isAdmin ? "+ افزودن نمایشگاه" : undefined}
      onAction={isAdmin ? openCreateForm : undefined}
    >
      <div className="mx-auto max-w-7xl space-y-8">
        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            <div className="font-bold">خطایی رخ داد</div>
            <div className="mt-1">{error}</div>
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        <section className="overflow-hidden rounded-3xl bg-gray-950 px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-gray-300">
                شبکه نمایشگاه‌های خودرو‌یاب
              </div>

              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                نمایشگاه موردنظرت را پیدا کن
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">
                ابتدا استان و سپس شهر را انتخاب کنید تا نمایشگاه‌های فعال
                و موجودی خودروهای آن‌ها را ببینید.
              </p>
            </div>

            {cityId && (
              <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                <p className="text-[11px] font-medium text-gray-500">
                  موقعیت انتخاب‌شده
                </p>

                <p className="mt-1 text-sm font-bold text-white">
                  {provinces.find((province) => province.id === provinceId)?.name}
                  {" ← "}
                  {cities.find((city) => city.id === cityId)?.name}
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                استان
              </label>

              <select
                value={provinceId}
                onChange={handleProvinceChange}
                disabled={loadingProvinces}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-sm text-white outline-none transition focus:border-white/30 focus:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="" className="text-gray-900">
                  {loadingProvinces
                    ? "در حال دریافت استان‌ها..."
                    : "استان را انتخاب کنید"}
                </option>

                {provinces.map((province) => (
                  <option
                    key={province.id}
                    value={province.id}
                    className="text-gray-900"
                  >
                    {province.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                شهر
              </label>

              <select
                value={cityId}
                onChange={handleCityChange}
                disabled={!provinceId || loadingCities}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-sm text-white outline-none transition focus:border-white/30 focus:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="" className="text-gray-900">
                  {!provinceId
                    ? "ابتدا استان را انتخاب کنید"
                    : loadingCities
                      ? "در حال دریافت شهرها..."
                      : "شهر را انتخاب کنید"}
                </option>

                {cities.map((city) => (
                  <option
                    key={city.id}
                    value={city.id}
                    className="text-gray-900"
                  >
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {cityId && (
          <section>
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Dealerships
                </p>

                <h2 className="mt-1 text-2xl font-bold text-gray-950">
                  نمایشگاه‌های شهر انتخاب‌شده
                </h2>
              </div>

              {!loadingDealerships && (
                <div className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600">
                  {formatNumber(dealerships.length)} نمایشگاه
                </div>
              )}
            </div>

            {loadingDealerships ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
                  >
                    <div className="h-5 w-2/3 rounded-lg bg-gray-100" />
                    <div className="mt-4 h-4 w-1/2 rounded-lg bg-gray-100" />
                    <div className="mt-3 h-4 w-full rounded-lg bg-gray-100" />
                    <div className="mt-8 h-12 rounded-2xl bg-gray-100" />
                  </div>
                ))}
              </div>
            ) : dealerships.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
                  🏢
                </div>

                <h3 className="mt-5 text-lg font-bold text-gray-900">
                  نمایشگاهی پیدا نشد
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                  برای این شهر هنوز نمایشگاه فعالی ثبت نشده است.
                </p>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="mt-6 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
                  >
                    + ثبت نمایشگاه جدید
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {dealerships.map((dealership) => (
                  <article
                    key={dealership.id}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl"
                  >
                    <button
                      type="button"
                      onClick={() => openInventory(dealership.id)}
                      className="flex flex-1 flex-col text-right"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-xl text-white">
                              🏢
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-lg font-bold text-gray-950">
                                {dealership.name}
                              </h3>

                              <p className="mt-1 text-xs text-gray-400">
                                نمایشگاه خودرو
                              </p>
                            </div>
                          </div>

                          {isAdmin && (
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                dealership.is_active
                                  ? "bg-green-50 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {dealership.is_active
                                ? "فعال"
                                : "غیرفعال"}
                            </span>
                          )}
                        </div>

                        <div className="mt-6 rounded-2xl bg-gray-950 p-4 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-400">
                                موجودی خودرو
                              </p>

                              <p className="mt-1 text-3xl font-extrabold tracking-tight">
                                {formatNumber(
                                  dealership.vehicle_count
                                )}
                              </p>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg">
                              🚗
                            </div>
                          </div>

                          <p className="mt-3 text-[11px] text-gray-500">
                            خودرو در این نمایشگاه
                          </p>
                        </div>

                        <div className="mt-5 space-y-3">
                          {dealership.address && (
                            <div className="flex gap-3">
                              <span className="mt-0.5 text-sm">
                                📍
                              </span>

                              <p className="text-sm leading-6 text-gray-600">
                                {dealership.address}
                              </p>
                            </div>
                          )}

                          {dealership.phone && (
                            <div className="flex gap-3">
                              <span className="mt-0.5 text-sm">
                                ☎
                              </span>

                              <p
                                dir="ltr"
                                className="text-sm font-medium text-gray-700"
                              >
                                {dealership.phone}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-auto border-t border-gray-100 px-6 py-4">
                        <div className="flex items-center justify-between text-sm font-bold text-gray-900">
                          <span>
                            مشاهده موجودی نمایشگاه
                          </span>

                          <span className="transition-transform duration-200 group-hover:-translate-x-1">
                            ←
                          </span>
                        </div>
                      </div>
                    </button>

                    {isAdmin && (
                      <div className="grid grid-cols-2 gap-2 border-t border-gray-100 bg-gray-50/70 p-4">
                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(dealership)
                          }
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                        >
                          ویرایش
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleDealership(dealership)
                          }
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                        >
                          {dealership.is_active
                            ? "غیرفعال کردن"
                            : "فعال کردن"}
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!cityId && !loadingProvinces && (
          <section className="rounded-3xl border border-gray-100 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-950 text-2xl text-white">
              📍
            </div>

            <h2 className="mt-5 text-xl font-bold text-gray-950">
              از موقعیت شروع کنید
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-gray-500">
              استان و شهر موردنظر را انتخاب کنید تا نمایشگاه‌های همان
              منطقه و تعداد خودروهای موجود در هرکدام نمایش داده شود.
            </p>
          </section>
        )}

        {showForm && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4 backdrop-blur-sm">
            <div className="my-8 w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6 sm:p-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Dealership Management
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-gray-950">
                    {editingDealership
                      ? "ویرایش نمایشگاه"
                      : "افزودن نمایشگاه جدید"}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    اطلاعات نمایشگاه را وارد کنید.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  aria-label="بستن"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 sm:p-8">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      نام نمایشگاه
                    </label>

                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="مثلاً اتو گالری ستاره شهر"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      شماره تماس
                    </label>

                    <input
                      value={form.phone}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      dir="ltr"
                      placeholder="09120000000"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-right text-sm outline-none transition focus:border-gray-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      استان
                    </label>

                    <select
                      value={form.provinceId}
                      onChange={handleFormProvinceChange}
                      disabled={loadingProvinces || saving}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-gray-400 focus:bg-white disabled:bg-gray-100"
                    >
                      <option value="">
                        {loadingProvinces
                          ? "در حال دریافت استان‌ها..."
                          : "استان را انتخاب کنید"}
                      </option>

                      {provinces.map((province) => (
                        <option
                          key={province.id}
                          value={province.id}
                        >
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      شهر
                    </label>

                    <select
                      value={form.cityId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          cityId: event.target.value,
                        }))
                      }
                      disabled={
                        !form.provinceId ||
                        loadingCities ||
                        saving
                      }
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-gray-400 focus:bg-white disabled:bg-gray-100"
                    >
                      <option value="">
                        {!form.provinceId
                          ? "ابتدا استان را انتخاب کنید"
                          : loadingCities
                            ? "در حال دریافت شهرها..."
                            : "شهر را انتخاب کنید"}
                      </option>

                      {formCities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    آدرس
                  </label>

                  <textarea
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="آدرس کامل نمایشگاه"
                    className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
                  />
                </div>

                <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl bg-gray-50 p-4">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm font-bold text-gray-700">
                    نمایشگاه فعال باشد
                  </span>
                </label>

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-2xl border border-gray-200 px-6 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    انصراف
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-gray-950 px-7 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "در حال ذخیره..."
                      : editingDealership
                        ? "ذخیره تغییرات"
                        : "ثبت نمایشگاه"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {checkingUser === false && !isAdmin && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-700">
            <span className="font-bold">حالت مشاهده:</span>{" "}
            شما می‌توانید نمایشگاه‌ها و موجودی خودروها را مشاهده کنید.
            مدیریت نمایشگاه‌ها فقط برای مدیر سیستم فعال است.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
