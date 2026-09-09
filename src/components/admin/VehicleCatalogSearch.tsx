"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Brand = {
  id: string;
  name_fa: string;
  name_en: string | null;
};

type Model = {
  id: string;
  brand_id: string;
  name_fa: string;
  name_en: string | null;
};

type Trim = {
  id: string;
  model_id: string;
  name_fa: string;
  name_en: string | null;
};

export type VehicleCatalogSelection = {
  brandId: string;
  modelId: string | null;
  trimId: string | null;
  brandName: string;
  modelName: string | null;
  trimName: string | null;
};

type SearchItem = VehicleCatalogSelection & {
  id: string;
  type: "brand" | "model" | "trim";
  title: string;
  secondary: string;
};

type CatalogData = {
  brands: Brand[];
  models: Model[];
  trims: Trim[];
};

type Props = {
  label?: string;
  placeholder?: string;
  onSelect: (selection: VehicleCatalogSelection) => void;
  disabled?: boolean;
  initialQuery?: string;
  initialCatalog?: CatalogData;
};

function normalize(value: string) {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  const en = "0123456789";

  return value
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (d) => en[fa.indexOf(d)])
    .replace(/[٠-٩]/g, (d) => en[ar.indexOf(d)])
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default function VehicleCatalogSearch({
  label = "جستجوی خودرو",
  placeholder = "مثلاً پژو 207 MC یا Toyota Corolla",
  onSelect,
  disabled = false,
  initialQuery = "",
  initialCatalog,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [brands, setBrands] = useState<Brand[]>(
    initialCatalog?.brands ?? []
  );
  const [models, setModels] = useState<Model[]>(
    initialCatalog?.models ?? []
  );
  const [trims, setTrims] = useState<Trim[]>(
    initialCatalog?.trims ?? []
  );
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const catalogLoadStartedRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialQuery.trim()) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const ensureCatalogLoaded = async () => {
    if (initialCatalog || catalogLoadStartedRef.current) {
      return;
    }

    catalogLoadStartedRef.current = true;
    setLoading(true);
    setError("");

    const [
      { data: brandData, error: brandError },
      { data: modelData, error: modelError },
      { data: trimData, error: trimError },
    ] = await Promise.all([
      supabase
        .from("vehicle_brands")
        .select("id, name_fa, name_en")
        .eq("is_active", true)
        .order("sort_order")
        .order("name_fa"),

      supabase
        .from("vehicle_models")
        .select("id, brand_id, name_fa, name_en")
        .eq("is_active", true)
        .order("sort_order")
        .order("name_fa"),

      supabase
        .from("vehicle_trims")
        .select("id, model_id, name_fa, name_en")
        .eq("is_active", true)
        .order("sort_order")
        .order("name_fa"),
    ]);

    if (brandError || modelError || trimError) {
      catalogLoadStartedRef.current = false;
      setError(
        brandError?.message ??
          modelError?.message ??
          trimError?.message ??
          "خطا در دریافت کاتالوگ خودرو"
      );
      setLoading(false);
      return;
    }

    setBrands(brandData ?? []);
    setModels(modelData ?? []);
    setTrims(trimData ?? []);
    setLoading(false);
  };

  const items = useMemo<SearchItem[]>(() => {
    const brandMap = new Map(brands.map((item) => [item.id, item]));
    const modelMap = new Map(models.map((item) => [item.id, item]));

    const result: SearchItem[] = [];

    for (const brand of brands) {
      result.push({
        id: `brand:${brand.id}`,
        type: "brand",
        brandId: brand.id,
        modelId: null,
        trimId: null,
        brandName: brand.name_fa,
        modelName: null,
        trimName: null,
        title: brand.name_fa,
        secondary: brand.name_en
          ? `برند · ${brand.name_en}`
          : "برند",
      });
    }

    for (const model of models) {
      const brand = brandMap.get(model.brand_id);
      if (!brand) continue;

      result.push({
        id: `model:${model.id}`,
        type: "model",
        brandId: brand.id,
        modelId: model.id,
        trimId: null,
        brandName: brand.name_fa,
        modelName: model.name_fa,
        trimName: null,
        title: `${brand.name_fa} ${model.name_fa}`,
        secondary: model.name_en
          ? `مدل · ${model.name_en}`
          : "مدل",
      });
    }

    for (const trim of trims) {
      const model = modelMap.get(trim.model_id);
      if (!model) continue;

      const brand = brandMap.get(model.brand_id);
      if (!brand) continue;

      result.push({
        id: `trim:${trim.id}`,
        type: "trim",
        brandId: brand.id,
        modelId: model.id,
        trimId: trim.id,
        brandName: brand.name_fa,
        modelName: model.name_fa,
        trimName: trim.name_fa,
        title: `${brand.name_fa} ${model.name_fa} ${trim.name_fa}`,
        secondary: trim.name_en
          ? `تیپ · ${trim.name_en}`
          : "تیپ",
      });
    }

    return result;
  }, [brands, models, trims]);

  const filteredItems = useMemo(() => {
    const q = normalize(query);

    if (!q) {
      return [];
    }

    return items
      .filter((item) => {
        const haystack = [
          item.title,
          item.secondary,
          item.brandName,
          item.modelName ?? "",
          item.trimName ?? "",
        ]
          .map(normalize)
          .join(" ");

        return haystack.includes(q);
      })
      .sort((a, b) => {
        const aExact = normalize(a.title) === q ? 0 : 1;
        const bExact = normalize(b.title) === q ? 0 : 1;

        if (aExact !== bExact) {
          return aExact - bExact;
        }

        const typeOrder = {
          trim: 0,
          model: 1,
          brand: 2,
        };

        return typeOrder[a.type] - typeOrder[b.type];
      })
      .slice(0, 10);
  }, [items, query]);

  const handleSelect = (item: SearchItem) => {
    onSelect({
      brandId: item.brandId,
      modelId: item.modelId,
      trimId: item.trimId,
      brandName: item.brandName,
      modelName: item.modelName,
      trimName: item.trimName,
    });

    setQuery(item.title);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <div className="relative">
        <input
          type="text"
          value={query}
          disabled={disabled || loading}
          placeholder={loading ? "در حال دریافت کاتالوگ..." : placeholder}
          onFocus={() => {
            void ensureCatalogLoaded();
            if (query.trim()) {
              setOpen(true);
            }
          }}
          onChange={(e) => {
            void ensureCatalogLoaded();
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-11 font-medium outline-none transition focus:border-slate-500 disabled:bg-slate-50"
        />

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
          🔍
        </span>

        {query && !loading && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            پاک کردن
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {open && query.trim() && !loading && !error && (
        <div className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {filteredItems.length > 0 ? (
            <div className="space-y-1">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="block w-full rounded-xl px-4 py-3 text-right transition hover:bg-slate-50"
                >
                  <div className="font-bold text-slate-900">
                    {item.title}
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    {item.secondary}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm font-medium text-slate-400">
              نتیجه‌ای پیدا نشد
            </div>
          )}
        </div>
      )}

      {query.trim() && !loading && !error && (
        <p className="mt-2 text-xs text-slate-400">
          {filteredItems.length > 0
            ? `${filteredItems.length.toLocaleString("fa-IR")} نتیجه`
            : "جستجو در کاتالوگ خودرو‌یاب"}
        </p>
      )}
    </div>
  );
}
