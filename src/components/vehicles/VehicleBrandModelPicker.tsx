"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getVehicleCatalog } from "@/lib/data/catalog/clientCatalog";
import type { CatalogBrand, CatalogModel } from "@/lib/data/catalog/types";

type Props = {
  brand: string;
  model: string;
  onChange: (brand: string, model: string) => void;
};

export default function VehicleBrandModelPicker({
  brand,
  model,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [brands, setBrands] = useState<CatalogBrand[]>([]);
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || brands.length > 0) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    getVehicleCatalog(createClient())
      .then((catalog) => {
        if (cancelled) return;
        setBrands(catalog.brands);
        setModels(catalog.models);
      })
      .catch(() => {
        if (!cancelled) setError("دریافت برند و مدل خودرو ناموفق بود.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, brands.length]);

  const selectedBrand = useMemo(
    () => brands.find((item) => item.name_fa === brand),
    [brands, brand],
  );

  const visibleBrands = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return brands;
    return brands.filter((item) =>
      `${item.name_fa} ${item.name_en ?? ""}`.toLocaleLowerCase().includes(normalized),
    );
  }, [brands, query]);

  const visibleModels = useMemo(() => {
    if (!selectedBrandId) return [];
    const normalized = query.trim().toLocaleLowerCase();
    return models
      .filter((item) => item.brand_id === selectedBrandId)
      .filter((item) => {
        if (!normalized) return true;
        return `${item.name_fa} ${item.name_en ?? ""}`
          .toLocaleLowerCase()
          .includes(normalized);
      });
  }, [models, selectedBrandId, query]);

  function openPicker() {
    setQuery("");
    setSelectedBrandId(selectedBrand?.id ?? "");
    setOpen(true);
  }

  function chooseBrand(item: CatalogBrand) {
    setSelectedBrandId(item.id);
    onChange(item.name_fa, "");
    setQuery("");
  }

  function chooseModel(item: CatalogModel) {
    const owner = brands.find((brandItem) => brandItem.id === item.brand_id);
    onChange(owner?.name_fa ?? brand, item.name_fa);
    setOpen(false);
    setQuery("");
  }

  const displayValue = brand && model ? `${brand} ${model}` : brand || "";

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 text-right text-base"
      >
        <span className={displayValue ? "font-semibold text-gray-900" : "text-gray-400"}>
          {displayValue || "برند و مدل"}
        </span>
        <span className="text-gray-400">‹</span>
      </button>

      {open && (
        <div dir="rtl" className="fixed inset-0 z-[120] flex flex-col bg-gray-50">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-bold text-gray-600"
            >
              بستن
            </button>
            <h2 className="text-[17px] font-extrabold text-gray-950">
              برند و مدل
            </h2>
            <span className="w-10" />
          </div>

          <div className="border-b border-gray-200 bg-white p-3">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={selectedBrandId ? "جستجوی مدل" : "جستجوی برند"}
              className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3 pb-8">
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                در حال دریافت برندها و مدل‌ها...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-100 bg-white p-6 text-center text-sm text-red-600">
                {error}
              </div>
            ) : selectedBrandId ? (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBrandId("");
                    setQuery("");
                  }}
                  className="flex min-h-14 w-full items-center justify-between border-b border-gray-100 px-4 text-right text-sm font-bold text-red-600"
                >
                  <span>{selectedBrand?.name_fa ?? brand}</span>
                  <span>تغییر برند</span>
                </button>

                {visibleModels.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">
                    مدلی پیدا نشد.
                  </div>
                ) : (
                  visibleModels.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => chooseModel(item)}
                      className={`flex min-h-14 w-full items-center justify-between border-b border-gray-100 px-4 text-right text-base last:border-0 ${
                        item.name_fa === model ? "bg-red-50 font-extrabold text-red-700" : ""
                      }`}
                    >
                      <span>{item.name_fa}</span>
                      {item.name_fa === model && <span>✓</span>}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {visibleBrands.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">
                    برندی پیدا نشد.
                  </div>
                ) : (
                  visibleBrands.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => chooseBrand(item)}
                      className="flex min-h-14 w-full items-center justify-between border-b border-gray-100 px-4 text-right text-base last:border-0"
                    >
                      <span>{item.name_fa}</span>
                      {item.name_fa === brand && <span className="text-red-600">✓</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
