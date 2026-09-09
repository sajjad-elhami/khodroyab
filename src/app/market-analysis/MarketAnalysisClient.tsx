"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import VehicleCatalogSearch from "@/components/admin/VehicleCatalogSearch";
import type { MarketAnalysisPageData } from "@/lib/data/market-analysis/types";

type Province = MarketAnalysisPageData["provinces"][number];
type Analysis = MarketAnalysisPageData["analysis"];

const money = (value: number | null) =>
  value === null ? "—" : `${Math.round(value).toLocaleString("fa-IR")} تومان`;
const number = (value: number | null) =>
  value === null ? "—" : Math.round(value).toLocaleString("fa-IR");

export default function MarketAnalysisClient({
  initialData,
}: {
  initialData: MarketAnalysisPageData;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [provinces] = useState(initialData.provinces);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [status, setStatus] = useState("available");

  const [analysis, setAnalysis] = useState<Analysis>(initialData.analysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const firstRender = useRef(true);

  const loadAnalysis = async () => {
    setLoading(true);
    setError("");

    const { data, error: analysisError } = await supabase.rpc(
      "get_market_analysis",
      {
        p_brand: brand || null,
        p_model: model || null,
        p_province_id: provinceId || null,
        p_status: status || null,
      }
    );

    if (analysisError) {
      setError(analysisError.message);
    } else {
      setAnalysis(data as Analysis);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    void loadAnalysis();

    // Filters are intentionally the only dependencies:
    // this is the page's query boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, model, provinceId, status]);

  const selectedProvince = provinces.find(
    (p) => p.id === provinceId
  )?.name;
 const title = `${brand || "همه برندها"}${model ? ` ${model}` : ""}`;
  const hasPriceData = (analysis?.priced_count ?? 0) >= 3;
  const rangeMin = analysis?.min_price ?? 0;
  const rangeMax = analysis?.max_price ?? 0;
  const rangeWidth = Math.max(rangeMax - rangeMin, 1);
  const rangePoint = (value: number | null) =>
    value === null ? 0 : Math.min(100, Math.max(0, ((value - rangeMin) / rangeWidth) * 100));

  return (
    <div dir="rtl" className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-slate-800 px-6 py-7 text-white sm:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
                تحلیل بازار خودرو
              </div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">تحلیل قیمت {title}</h1>
              <p className="mt-2 text-sm text-slate-300">
                تصویر آماری قیمت، کارکرد و پراکندگی بازار بر اساس خودروهای ثبت‌شده در خودرو‌یاب
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur">
              {selectedProvince || "کل کشور"}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <VehicleCatalogSearch
              label="جستجوی خودرو"
              placeholder="مثلاً پژو 207 MC، Toyota Corolla..."
              onSelect={(selection) => {
                setBrand(selection.brandName);
                setModel(selection.modelName ?? "");
              }}
            />
          </div>

          <label className="text-sm font-bold text-slate-700">
            استان
            <select value={provinceId} onChange={(e) => setProvinceId(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium outline-none focus:border-slate-500">
              <option value="">کل کشور</option>
              {provinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>

          <label className="text-sm font-bold text-slate-700">
            وضعیت
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium outline-none focus:border-slate-500">
              <option value="available">موجود در بازار</option>
              <option value="">همه وضعیت‌ها</option>
            </select>
          </label>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm font-bold text-slate-500">در حال تحلیل بازار...</div>
      ) : analysis ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["تعداد خودرو", number(analysis.vehicle_count), "نمونه ثبت‌شده"],
              ["میانگین قیمت", money(analysis.avg_price), "بر اساس خودروهای دارای قیمت"],
              ["میانگین کارکرد", analysis.avg_mileage === null ? "—" : `${number(analysis.avg_mileage)} کیلومتر`, "نمونه‌های دارای کارکرد"],
              ["قیمت میانه", money(analysis.median_price), "نقطه میانی بازار"],
            ].map(([label, value, hint]) => (
              <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-slate-500">{label}</p>
                <p className="mt-3 text-xl font-extrabold text-slate-950">{value}</p>
                <p className="mt-1 text-xs text-slate-400">{hint}</p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">بازه قیمت بازار</h2>
                <p className="mt-1 text-sm text-slate-500">پراکندگی قیمت از ارزان‌ترین تا گران‌ترین آگهی</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{number(analysis.priced_count)} خودرو دارای قیمت</div>
            </div>

            {!hasPriceData ? (
              <div className="mt-8 rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">برای این فیلتر هنوز داده قیمت کافی ثبت نشده است.</div>
            ) : (
              <div className="mt-10">
                <div className="relative h-3 rounded-full bg-slate-100">
                  <div className="absolute inset-y-0 right-0 rounded-full bg-slate-900" style={{ width: "100%" }} />
                  {[['q1_price','چارک اول'],['median_price','میانه'],['q3_price','چارک سوم']].map(([key,label]) => {
                    const value = analysis[key as keyof Analysis] as number | null;
                    return <div key={key} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ right: `${100 - rangePoint(value)}%` }}><div className="h-6 w-6 rounded-full border-4 border-white bg-slate-950 shadow" /><span className="absolute right-1/2 top-8 w-20 translate-x-1/2 text-center text-[10px] font-bold text-slate-500">{label}</span></div>;
                  })}
                </div>
                <div className="mt-14 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
                  {[["ارزان‌ترین",analysis.min_price],["چارک اول",analysis.q1_price],["میانه",analysis.median_price],["چارک سوم",analysis.q3_price],["گران‌ترین",analysis.max_price]].map(([label,value]) => <div key={label as string} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{money(value as number | null)}</p></div>)}
                </div>
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-extrabold text-slate-950">میانگین قیمت بر اساس سال</h2>
              <div className="mt-5 space-y-4">
                {analysis.year_stats.length === 0 ? <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">داده کافی برای این بخش وجود ندارد.</p> : analysis.year_stats.map((row) => {
                  const max = Math.max(...analysis.year_stats.map((x) => x.avg_price ?? 0), 1);
                  return <div key={row.year}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-extrabold">مدل {row.year.toLocaleString("fa-IR")}</span><span className="font-bold text-slate-500">{money(row.avg_price)} · {number(row.count)} خودرو</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: `${((row.avg_price ?? 0) / max) * 100}%` }} /></div></div>;
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-extrabold text-slate-950">مقایسه تیپ‌ها</h2>
              <div className="mt-5 space-y-3">
                {analysis.trim_stats.length === 0 ? <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">داده تیپ و قیمت ثبت نشده است.</p> : analysis.trim_stats.map((row) => <div key={row.trim} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4"><div><p className="font-extrabold">{row.trim}</p><p className="mt-1 text-xs text-slate-400">{number(row.count)} خودرو</p></div><p className="font-extrabold text-slate-800">{money(row.avg_price)}</p></div>)}
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="text-xl font-extrabold text-slate-950">مقایسه استان‌ها</h2><p className="mt-1 text-sm text-slate-500">برای همین برند و مدل، بازار هر استان را کنار هم ببینید.</p></div></div>
            <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-right text-sm"><thead><tr className="border-b border-slate-100 text-xs text-slate-400"><th className="px-3 py-3 font-bold">استان</th><th className="px-3 py-3 font-bold">تعداد</th><th className="px-3 py-3 font-bold">میانگین</th><th className="px-3 py-3 font-bold">کمترین</th><th className="px-3 py-3 font-bold">بیشترین</th></tr></thead><tbody>{analysis.province_stats.map((row) => <tr key={row.province_id} className="border-b border-slate-50"><td className="px-3 py-4 font-extrabold">{row.province ?? "نامشخص"}</td><td className="px-3 py-4">{number(row.count)}</td><td className="px-3 py-4 font-bold">{money(row.avg_price)}</td><td className="px-3 py-4">{money(row.min_price)}</td><td className="px-3 py-4">{money(row.max_price)}</td></tr>)}</tbody></table>{analysis.province_stats.length === 0 && <p className="py-8 text-center text-sm text-slate-500">برای مقایسه استانی داده قیمت کافی وجود ندارد.</p>}</div>
          </section>
        </>
      ) : null}
    </div>
  );
}
