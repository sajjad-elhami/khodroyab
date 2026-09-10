"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import { loadMyDealershipInventoryAction, markInventoryVehicleSoldAction, updateInventoryVehicleAction } from "./myInventoryActions";
import type { MyDealershipPageData, MyDealershipVehicle } from "@/lib/data/dealerships/getMyDealershipPageData";

const PAGE_SIZE = 30;
function formatNumber(value: number | null) { return value === null ? "—" : value.toLocaleString("fa-IR"); }
function formatPrice(value: number | null) { return value === null ? "توافقی" : `${value.toLocaleString("fa-IR")} تومان`; }
function formatYear(value: number | null) { return value === null ? "—" : value.toLocaleString("fa-IR", { useGrouping: false }); }

function VehicleCard({ vehicle }: { vehicle: MyDealershipVehicle }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"update" | "sold" | null>(null);
  const [actionError, setActionError] = useState("");
  async function confirmInventory() { if (busy) return; setBusy("update"); setActionError(""); const result = await updateInventoryVehicleAction(vehicle.id); if (!result.ok) { setActionError(result.error); setBusy(null); return; } setBusy(null); router.refresh(); }
  async function markSold() { if (busy || vehicle.status === "sold") return; if (!window.confirm("این خودرو فروخته شده است؟")) return; setBusy("sold"); setActionError(""); const result = await markInventoryVehicleSoldAction(vehicle.id); if (!result.ok) { setActionError(result.error); setBusy(null); return; } setBusy(null); router.refresh(); }
  return <article className="overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-[0_3px_18px_rgba(15,23,42,0.045)]">
    <div className="flex min-h-[132px] gap-3 p-3" dir="ltr"><div className="h-[108px] w-[126px] shrink-0 overflow-hidden rounded-[17px] bg-gray-100">{vehicle.image_url ? <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${vehicle.image_url})` }} /> : <div className="flex h-full items-center justify-center text-xs font-medium text-gray-400">بدون تصویر</div>}</div><div className="min-w-0 flex-1 py-0.5" dir="rtl"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-[15px] font-extrabold text-gray-950">{vehicle.brand} {vehicle.model}</h3>{vehicle.trim && <p className="mt-0.5 truncate text-xs text-gray-500">{vehicle.trim}</p>}</div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${vehicle.status === "available" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{vehicle.status === "available" ? "موجود" : "فروخته شده"}</span></div><div className="mt-3 flex items-center gap-2 text-xs text-gray-500"><span>{formatYear(vehicle.model_year)}</span><span className="text-gray-300">•</span><span>{formatNumber(vehicle.mileage)} کیلومتر</span></div><p className="mt-2 truncate text-sm font-extrabold text-gray-900">{formatPrice(vehicle.price)}</p></div></div>
    {actionError && <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{actionError}</div>}
    <div className="grid grid-cols-3 border-t border-gray-100" dir="rtl"><button type="button" onClick={confirmInventory} disabled={busy !== null} className="py-2.5 text-center text-xs font-extrabold text-emerald-700 active:bg-emerald-50 disabled:opacity-50">{busy === "update" ? "در حال بروزرسانی..." : "بروزرسانی"}</button><button type="button" onClick={markSold} disabled={busy !== null || vehicle.status === "sold"} className="border-x border-gray-100 py-2.5 text-center text-xs font-extrabold text-red-600 active:bg-red-50 disabled:opacity-40">{busy === "sold" ? "در حال ثبت..." : "فروخته شد"}</button><Link href={`/vehicles/${vehicle.id}/edit`} className="py-2.5 text-center text-xs font-extrabold text-gray-800 active:bg-gray-50">ویرایش</Link></div>
  </article>;
}

export default function MyDealershipClient({ initialData }: { initialData: MyDealershipPageData }) {
  const [vehicles, setVehicles] = useState(initialData.vehicles); const [totalCount, setTotalCount] = useState(initialData.totalCount); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState("");
  const isAdmin = initialData.role === "admin"; const hasMore = vehicles.length < totalCount; const isActive = isAdmin ? true : initialData.dealershipIsActive !== false; const title = isAdmin ? "کل موجودی خودرو‌یاب" : initialData.dealershipName ?? "نمایشگاه من";
  async function loadMore() { if (loadingMore || !hasMore) return; setLoadingMore(true); setError(""); const result = await loadMyDealershipInventoryAction(vehicles.length, PAGE_SIZE); if (!result.ok) { setError(result.error); setLoadingMore(false); return; } setVehicles((current) => [...current, ...result.data.vehicles]); setTotalCount(result.data.totalCount); setLoadingMore(false); }
  return <MobileAppShell><div dir="rtl" className="mx-auto w-full max-w-xl px-4 pb-32 pt-[68px]"><header className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-xl"><div className="mx-auto flex h-[68px] w-full max-w-xl items-center justify-between gap-3 px-4"><h1 className="min-w-0 flex-1 truncate text-right text-[21px] font-black tracking-tight text-gray-950">{title}</h1><span className={`shrink-0 text-sm font-extrabold ${isActive ? "text-emerald-600" : "text-red-600"}`}>{isActive ? "🟢 فعال" : "🔴 غیرفعال"}</span></div></header>
    <Link href="/vehicles/new" className="mb-5 flex h-14 w-full items-center justify-center gap-2 rounded-[19px] bg-emerald-600 text-[15px] font-extrabold text-white shadow-[0_8px_24px_rgba(16,185,129,0.18)] active:scale-[0.99]"><span className="text-xl leading-none">＋</span>ثبت خودروی جدید</Link>
    {!isAdmin && !isActive && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">این نمایشگاه در حال حاضر غیرفعال است.</div>}
    <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-black text-gray-950">خودروهای نمایشگاه</h2><span className="text-xs font-bold text-gray-400">{totalCount.toLocaleString("fa-IR")} خودرو</span></div>
    {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {vehicles.length === 0 ? <div className="rounded-[24px] border border-dashed border-gray-200 bg-white px-6 py-14 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-2xl">🚗</div><h2 className="mt-4 text-base font-extrabold text-gray-900">هنوز خودرویی ثبت نکرده‌اید</h2><p className="mt-2 text-sm leading-6 text-gray-500">اولین خودرو را برای نمایشگاه ثبت کنید.</p></div> : <div className="space-y-3">{vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}{hasMore && <button type="button" onClick={loadMore} disabled={loadingMore} className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-800 shadow-sm disabled:cursor-wait disabled:opacity-60">{loadingMore ? "در حال دریافت..." : "نمایش خودروهای بیشتر"}</button>}</div>}
  </div></MobileAppShell>;
}
