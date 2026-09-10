"use client";

import Link from "next/link";
import MobileAppShell from "@/components/mobile/MobileAppShell";

export default function DailyInventoryLock() {
  return (
    <MobileAppShell>
      <div dir="rtl" className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-5 pb-28 pt-24">
        <section className="w-full rounded-[28px] border border-gray-100 bg-white px-6 py-8 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">🔄</div>
          <h1 className="mt-5 text-lg font-black text-gray-950">بروزرسانی موجودی نمایشگاه</h1>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            لطفاً ابتدا موجودی نمایشگاه خود را بروزرسانی کنید، سپس این قسمت برای شما فعال می‌شود.
          </p>
          <Link
            href="/dealerships"
            className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 text-sm font-extrabold text-white active:scale-[0.99]"
          >
            بروزرسانی موجودی نمایشگاه
          </Link>
        </section>
      </div>
    </MobileAppShell>
  );
}
