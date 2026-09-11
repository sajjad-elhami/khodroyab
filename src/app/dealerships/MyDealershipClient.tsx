"use client";

import Link from "next/link";
import { useState } from "react";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import { deleteInventoryVehicleAction, loadMyDealershipInventoryAction, updateInventoryVehicleAction } from "./myInventoryActions";
import type { MyDealershipPageData, MyDealershipVehicle } from "@/lib/data/dealerships/getMyDealershipPageData";

const PAGE_SIZE = 30;
function formatNumber(value: number | null) { return value === null ? "—" : value.toLocaleString("fa-IR"); }
function formatPrice(value: number | null) { if (value === null) return "توافقی"; return `${value.toLocaleString("fa-IR").replace(/٬/g, "/")} تومان`; }
function formatYear(value: number | null) { return value === null ? "—" : value.toLocaleString("fa-IR", { useGrouping: false }); }

function VehicleCard({ vehicle, onDeleted }: { vehicle: MyDealershipVehicle; onDeleted: (vehicleId: string) => void }) {
  const [busy, setBusy] = useState<"update" | "delete" | null>(null);
  const [actionError, setActionError] = useState("");
  async function confirmInventory() {
    if (busy) return; setBusy("update"); setActionError("");
    const result = await updateInventoryVehicleAction(vehicle.id);
    if (!result.ok) { setActionError(result.error); setBusy(null); return; }
    window.location.reload();
  }
  async function deleteSoldVehicle() {
    if (busy || !window.confirm("آیا از حذف خودرو مطمئن هستید؟")) return;
    setBusy("delete"); setActionError("");
    const result = await deleteInventoryVehicleAction(vehicle.id);
    if (!result.ok) { setActionError(result.error); setBusy(null); return; }
    onDeleted(vehicle.id);
  }
  return <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div className="flex h-[175px] flex-row-reverse" dir="rtl">
      <div className="h-full w-[122px] shrink-0 overflow-hidden rounded-2xl bg-gray-100">{vehicle.image_url ? <img src={vehicle.image_url} alt={`${vehicle.model}${vehicle.model_year ? ` مدل ${formatYear(vehicle.model_year)}` : ""}`} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center"><span className="text-3xl">🚘</span></div>}</div>
      <div className="min-w-0 flex-1 px-3 py-2.5"><h2 className="truncate text-[15px] font-bold leading-5 text-gray-950">{vehicle.model}{vehicle.model_year !== null && <span className="mr-1">مدل {formatYear(vehicle.model_year)}</span>}{vehicle.color && <span className="mr-1">/ {vehicle.color}</span>}</h2><p className="mt-1.5 text-[12px] font-medium text-gray-500">{vehicle.mileage !== null ? `${formatNumber(vehicle.mileage)} کیلومتر` : "کارکرد نامشخص"}</p><p className="mt-1 text-[11px] font-medium text-gray-500">{formatPrice(vehicle.price)}</p></div>
    </div>
    {actionError && <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{actionError}</div>}
    <div className="grid grid-cols-3 border-t border-gray-100"><button type="button" onClick={confirmInventory} disabled={busy !== null} className="py-2.5 text-xs font-extrabold text-emerald-700 disabled:opacity-50">{busy === "update" ? "در حال بروزرسانی..." : "بروزرسانی"}</button><button type="button" onClick={deleteSoldVehicle} disabled={busy !== null} className="border-x border-gray-100 py-2.5 text-xs font-extrabold text-red-600 disabled:opacity-40">{busy === "delete" ? "در حال حذف..." : "فروخته شد"}</button><Link href={`/vehicles/${vehicle.id}/edit`} className="py-2.5 text-center text-xs font-extrabold text-gray-800">ویرایش</Link></div>
  </article>;
}

export default function MyDealershipClient({ initialData }: { initialData: MyDealershipPageData }) {
  const [vehicles, setVehicles] = useState(initialData.vehicles); const [totalCount, setTotalCount] = useState(initialData.totalCount); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState("");
  const isAdmin = initialData.role === "admin"; const hasMore = vehicles.length < totalCount; const isActive = isAdmin ? true : initialData.dealershipIsActive !== false; const title = isAdmin ? "کل موجودی خودرو‌یاب" : initialData.dealershipName ?? "نمایشگاه من";
  async function loadMore() { if (loadingMore || !hasMore) return; setLoadingMore(true); const result = await loadMyDealershipInventoryAction(vehicles.length, PAGE_SIZE); if (!result.ok) { setError(result.error); setLoadingMore(false); return; } setVehicles(current => [...current, ...result.data.vehicles]); setTotalCount(result.data.totalCount); setLoadingMore(false); }
  function handleDeleted(vehicleId: string) { setVehicles(current => current.filter(v => v.id !== vehicleId)); setTotalCount(current => Math.max(0, current - 1)); }
  return <MobileAppShell><div dir="rtl" className="mx-auto w-full max-w-xl px-4 pb-32 pt-[128px]"><header className="fixed inset-x-0 top-0 z-[100] mx-auto w-full max-w-xl border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-xl"><div className="flex h-[56px] w-full items-center justify-between gap-3 px-4"><h1 className="min-w-0 flex-1 truncate text-right text-[21px] font-black tracking-tight text-gray-950">{title}</h1><span className={`shrink-0 text-sm font-extrabold ${isActive ? "text-emerald-600" : "text-red-600"}`}>{isActive ? "🟢 فعال" : "🔴 غیرفعال"}</span></div><Link href="/vehicles/new" className="mx-4 mb-2 flex h-14 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-[19px] bg-emerald-600 text-[15px] font-extrabold text-white shadow-[0_8px_24px_rgba(16,185,129,0.18)] active:scale-[0.99]"><span className="text-xl leading-none">＋</span>ثبت خودروی جدید</Link></header>
  {!isAdmin && !isActive && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">این نمایشگاه در حال حاضر غیرفعال است.</div>}
  <div className="mb-3 mt-5 flex items-center justify-between"><h2 className="text-base font-black text-gray-950">خودروهای نمایشگاه</h2><span className="text-xs font-bold text-gray-400">{totalCount.toLocaleString("fa-IR")} خودرو</span></div>{error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
  {vehicles.length === 0 ? <div className="rounded-[24px] border border-dashed border-gray-200 bg-white px-6 py-14 text-center"><div className="text-2xl">🚗</div><h2 className="mt-4 text-base font-extrabold">هنوز خودرویی ثبت نکرده‌اید</h2><p className="mt-2 text-sm text-gray-500">اولین خودرو را برای نمایشگاه ثبت کنید.</p></div> : <div className="space-y-3">{vehicles.map(vehicle => <VehicleCard key={vehicle.id} vehicle={vehicle} onDeleted={handleDeleted} />)}{hasMore && <button type="button" onClick={loadMore} disabled={loadingMore} className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold">{loadingMore ? "در حال دریافت..." : "نمایش خودروهای بیشتر"}</button>}</div>}</div></MobileAppShell>;
}
