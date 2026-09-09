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

type AdminHeaderProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

export default function AdminHeader({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const { fullName } = useAdminUser();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function handleAction() {
    if (onAction) {
      onAction();
      return;
    }

    if (actionHref) {
      router.push(actionHref);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur">
        <div className="flex min-h-20 items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          {/* Mobile menu button */}
          <button
            type="button"
            aria-label="باز کردن منو"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl text-gray-800 shadow-sm transition hover:bg-gray-50 md:hidden"
          >
            ☰
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="hidden h-2 w-2 rounded-full bg-gray-950 sm:block" />

              <h1 className="truncate text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">
                {title}
              </h1>
            </div>

            {description && (
              <p className="mt-1 truncate text-xs text-gray-500 sm:text-sm">
                {description}
              </p>
            )}
          </div>

          {actionLabel && (actionHref || onAction) && (
            <button
              type="button"
              onClick={handleAction}
              className="shrink-0 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-md sm:px-5 sm:py-3"
            >
              <span className="sm:hidden">+</span>
              <span className="hidden sm:inline">{actionLabel}</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="بستن منو"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />

          <aside className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/dashboard");
                }}
                className="flex items-center gap-3 text-right"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-lg text-white shadow-sm">
                  🚘
                </div>

                <div>
                  <p className="text-lg font-extrabold tracking-tight text-gray-950">
                    خودرو‌یاب
                  </p>

                  <p className="text-[11px] text-gray-400">
                    مدیریت هوشمند خودرو
                  </p>
                </div>
              </button>

              <button
                type="button"
                aria-label="بستن منو"
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-lg text-gray-600 transition hover:bg-gray-200"
              >
                ×
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
                        if (isDisabled) {
                          return;
                        }

                        setMenuOpen(false);
                        router.push(item.href);
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
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base transition ${
                          isActive
                            ? "bg-white/10"
                            : isDisabled
                              ? "bg-gray-50"
                              : "bg-gray-100"
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
          </aside>
        </div>
      )}
    </>
  );
}
