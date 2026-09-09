"use client";

import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { AdminUserProvider } from "./AdminUserContext";

type AdminLayoutProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  fullScreen?: boolean;
  adminUserFullName?: string;
};

export default function AdminLayout({
  children,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  fullScreen = false,
  adminUserFullName = "مدیر سیستم",
}: AdminLayoutProps) {
  if (fullScreen) {
    return (
      <main dir="rtl" className="min-h-screen w-full bg-white text-gray-900">
        {children}
      </main>
    );
  }

  return (
    <AdminUserProvider fullName={adminUserFullName}>
      <main dir="rtl" className="min-h-screen bg-gray-100 text-gray-900">
        <div className="flex min-h-screen">
          <AdminSidebar />

          <section className="flex-1">
            <AdminHeader
              title={title}
              description={description}
              actionLabel={actionLabel}
              actionHref={actionHref}
              onAction={onAction}
            />

            <div className="p-6">
              {children}
            </div>
          </section>
        </div>
      </main>
    </AdminUserProvider>
  );
}
