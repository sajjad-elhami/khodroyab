"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminUser } from "./AdminUserContext";

const menuItems = [
  {
    label: "داشبورد",
    href: "/dashboard",
    icon: "⌂",
  },
  {
    label: "خودروها",
    href: "/vehicles",
    icon: "🚘",
  },
  {
    label: "نمایشگاه‌ها",
    href: "/dealerships",
    icon: "▦",
  },
  {
    label: "تحلیل بازار",
    href: "/market-analysis",
    icon: "📊",
  },
  {
    label: "کارشناسی",
    href: "#",
    icon: "✓",
  },
  {
    label: "کاربران",
    href: "/users",
    icon: "♙",
  },
  {
    label: "گزارش‌ها",
    href: "#",
    icon: "▤",
  },
  {
    label: "تنظیمات",
    href: "#",
    icon: "⚙",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { fullName } = useAdminUser();

  return (
    <aside className="hidden w-64 shrink-0 border-l border-gray-200 bg-white md:block">
      <div className="sticky top-0 flex h-screen flex-col">
        {/* Brand */}
        <div className="border-b border-gray-100 px-6 py-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="group w-full text-right"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-lg text-white shadow-sm transition group-hover:scale-105">
                🚘
              </div>

              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-gray-950">
                  خودرو‌یاب
                </h2>

                <p className="mt-0.5 text-xs text-gray-400">
                  مدیریت هوشمند خودرو
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-3 text-[11px] font-bold tracking-wider text-gray-400">
            منوی اصلی
          </p>

          <div className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive =
                item.href !== "#" &&
                (pathname === item.href ||
                  pathname.startsWith(`${item.href}/`));

              const isDisabled = item.href === "#";

              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (!isDisabled) {
                      router.push(item.href);
                    }
                  }}
                  className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right text-sm font-semibold transition ${
                    isActive
                      ? "bg-gray-950 text-white shadow-sm"
                      : isDisabled
                        ? "cursor-not-allowed text-gray-300"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base transition ${
                      isActive
                        ? "bg-white/10"
                        : isDisabled
                          ? "bg-gray-50"
                          : "bg-gray-100 group-hover:bg-gray-200"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span className="flex-1">
                    {item.label}
                  </span>

                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}

                  {isDisabled && (
                    <span className="text-[10px] text-gray-300">
                      به‌زودی
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Account */}
        <div className="border-t border-gray-100 p-4">
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-[11px] font-medium text-gray-400">
              حساب کاربری
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-sm font-bold text-white">
                {fullName.trim().charAt(0) || "م"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">
                  {fullName}
                </p>

                <p className="mt-0.5 text-[11px] text-gray-400">
                  حساب فعال
                </p>
              </div>
            </div>

            <form
              action="/auth/signout"
              method="POST"
              className="mt-3"
            >
              <button
                type="submit"
                className="w-full rounded-xl px-3 py-2.5 text-right text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                خروج از حساب
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
