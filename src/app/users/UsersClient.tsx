"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateUserProfileAction } from "./actions";
import AdminLayout from "@/components/admin/AdminLayout";
import type { UsersPageData } from "@/lib/data/users/types";

type Profile = UsersPageData["profiles"][number];
type Dealership = UsersPageData["dealerships"][number];
type UserEmail = UsersPageData["emails"][number];

export default function UsersClient({
  initialData,
}: {
  initialData: UsersPageData;
}) {
  const supabase = createClient();

  const [profiles, setProfiles] = useState<Profile[]>(
    initialData.profiles
  );
  const [dealerships] = useState<Dealership[]>(initialData.dealerships);

  const [emails] = useState<Record<string, string>>(() => {
    const emailMap: Record<string, string> = {};

    initialData.emails.forEach((user) => {
      if (user.email) {
        emailMap[user.id] = user.email;
      }
    });

    return emailMap;
  });

  const [currentUserId] = useState<string | null>(
    initialData.currentUserId
  );

  const adminUserFullName =
    initialData.profiles.find(
      (profile) => profile.id === initialData.currentUserId
    )?.full_name?.trim() || "مدیر سیستم";

  const [loading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function updateProfile(
    profileId: string,
    dealershipId: string | null,
    role: "admin" | "dealership_user"
  ) {
    setSavingId(profileId);
    setError("");
    setSuccess("");

    if (profileId === currentUserId && role !== "admin") {
      setError(
        "برای امنیت سیستم، مدیر فعلی نمی‌تواند دسترسی Admin خودش را حذف کند."
      );
      setSavingId(null);
      return;
    }

    const result = await updateUserProfileAction(
      profileId,
      dealershipId,
      role
    );

    if (!result.ok) {
      setError(
        "ذخیره تغییرات انجام نشد: " + result.error
      );
      setSavingId(null);
      return;
    }

    setProfiles((current) =>
      current.map((profile) =>
        profile.id === profileId
          ? {
              ...profile,
              dealership_id: dealershipId,
              role,
            }
          : profile
      )
    );

    setSuccess("تغییرات کاربر با موفقیت ذخیره شد.");
    setSavingId(null);
  }

  if (loading) {
    return (
      <AdminLayout
        title="مدیریت کاربران"
        description="مدیریت کاربران، نقش‌ها و اتصال آن‌ها به نمایشگاه‌ها"
        adminUserFullName={adminUserFullName}
      >
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          در حال بارگذاری کاربران...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="مدیریت کاربران"
      description="مدیریت کاربران، نقش‌ها و اتصال آن‌ها به نمایشگاه‌ها"
      adminUserFullName={adminUserFullName}
    >
      {(error || success) && (
        <div className="mb-6 space-y-3">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 font-bold">
                !
              </div>

              <div className="pt-1">
                <p className="font-bold">خطا در انجام عملیات</p>
                <p className="mt-1 text-red-600/80">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 font-bold">
                ✓
              </div>

              <div className="pt-1">
                <p className="font-bold">عملیات با موفقیت انجام شد</p>
                <p className="mt-1 text-emerald-600/80">{success}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            مدیریت دسترسی
          </p>

          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-gray-950">
            کاربران خودرو‌یاب
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            نقش و نمایشگاه هر کاربر را از همین بخش مدیریت کنید.
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl">
          👥
        </div>
      </div>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="group rounded-3xl bg-gray-950 p-6 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">تعداد کاربران</p>
              <p className="mt-3 text-4xl font-extrabold tracking-tight">
                {profiles.length.toLocaleString("fa-IR")}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 text-xl">
              👥
            </div>
          </div>

          <p className="mt-5 text-xs text-gray-500">
            تمام حساب‌های ثبت‌شده در خودرو‌یاب
          </p>
        </div>

        <div className="group rounded-3xl border border-blue-100 bg-blue-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">
                مدیران سیستم
              </p>

              <p className="mt-3 text-4xl font-extrabold tracking-tight text-gray-950">
                {profiles
                  .filter((profile) => profile.role === "admin")
                  .length.toLocaleString("fa-IR")}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-sm">
              ♙
            </div>
          </div>

          <p className="mt-5 text-xs text-blue-600/70">
            کاربران دارای دسترسی مدیریت
          </p>
        </div>

        <div className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">
                کاربران نمایشگاه
              </p>

              <p className="mt-3 text-4xl font-extrabold tracking-tight text-gray-950">
                {profiles
                  .filter(
                    (profile) => profile.role === "dealership_user"
                  )
                  .length.toLocaleString("fa-IR")}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
              🏢
            </div>
          </div>

          <p className="mt-5 text-xs text-gray-400">
            کاربران متصل به نمایشگاه‌ها
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        {profiles.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-gray-900">
              هنوز کاربری ثبت نشده است.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              کاربران پس از ثبت‌نام در این بخش نمایش داده می‌شوند.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-right">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500">
                    کاربر
                  </th>

                  <th className="px-6 py-4 text-xs font-bold text-gray-500">
                    ایمیل
                  </th>

                  <th className="px-6 py-4 text-xs font-bold text-gray-500">
                    شماره تماس
                  </th>

                  <th className="px-6 py-4 text-xs font-bold text-gray-500">
                    نمایشگاه
                  </th>

                  <th className="px-6 py-4 text-xs font-bold text-gray-500">
                    نقش
                  </th>

                  <th className="px-6 py-4 text-xs font-bold text-gray-500">
                    عملیات
                  </th>
                </tr>
              </thead>

              <tbody>
                {profiles.map((profile) => (
                  <UserRow
                    key={profile.id}
                    profile={profile}
                    email={emails[profile.id] ?? null}
                    dealerships={dealerships}
                    currentUserId={currentUserId}
                    saving={savingId === profile.id}
                    onSave={updateProfile}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

type UserRowProps = {
  profile: Profile;
  email: string | null;
  dealerships: Dealership[];
  currentUserId: string | null;
  saving: boolean;
  onSave: (
    profileId: string,
    dealershipId: string | null,
    role: "admin" | "dealership_user"
  ) => void;
};

function UserRow({
  profile,
  email,
  dealerships,
  currentUserId,
  saving,
  onSave,
}: UserRowProps) {
  const [dealershipId, setDealershipId] = useState(
    profile.dealership_id ?? ""
  );

  const [role, setRole] = useState<
    "admin" | "dealership_user"
  >(profile.role);

  const isCurrentUser = profile.id === currentUserId;

  return (
    <tr className="border-b border-gray-100 last:border-b-0 hover:bg-blue-50/30">
      <td className="px-6 py-5">
        <div className="font-medium text-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
              {(profile.full_name || "ک").trim().charAt(0)}
            </div>

            <div className="min-w-0">
              <div className="font-bold text-gray-900">
                {profile.full_name || "بدون نام"}

                {isCurrentUser && (
                  <span className="mr-2 rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">
                    شما
                  </span>
                )}
              </div>

              <div className="mt-1 text-xs text-gray-400">
                {profile.id.slice(0, 8)}...
              </div>
            </div>
          </div>
        </div>

        <div className="mt-1 text-xs text-gray-400">
          {profile.id.slice(0, 8)}...
        </div>
      </td>

      <td className="px-6 py-5">
        <div className="text-sm font-medium text-gray-800">
          {email || "—"}
        </div>

        {email && (
          <div className="mt-1 text-[11px] text-gray-400">
            ایمیل حساب کاربری
          </div>
        )}
      </td>

      <td className="px-6 py-5">
        <div className="text-sm font-medium text-gray-800">
          {profile.phone || "—"}
        </div>

        {profile.phone && (
          <div className="mt-1 text-[11px] text-gray-400">
            شماره تماس ثبت‌شده
          </div>
        )}
      </td>

      <td className="px-6 py-5">
        <select
          value={dealershipId}
          onChange={(event) =>
            setDealershipId(event.target.value)
          }
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        >
          <option value="">بدون نمایشگاه</option>

          {dealerships.map((dealership) => (
            <option
              key={dealership.id}
              value={dealership.id}
              disabled={!dealership.is_active}
            >
              {dealership.name}
              {!dealership.is_active ? " (غیرفعال)" : ""}
            </option>
          ))}
        </select>
      </td>

      <td className="px-6 py-5">
        <div className="mb-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
              role === "admin"
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {role === "admin" ? "مدیر سیستم" : "کاربر نمایشگاه"}
          </span>
        </div>

        <select
          value={role}
          disabled={isCurrentUser}
          onChange={(event) =>
            setRole(
              event.target.value as
                | "admin"
                | "dealership_user"
            )
          }
          className={`rounded-xl border px-3 py-2.5 text-sm outline-none transition ${
            isCurrentUser
              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500"
              : role === "admin"
                ? "border-blue-200 bg-blue-50/50 text-blue-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                : "border-gray-200 bg-white text-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          }`}
        >
          <option value="dealership_user">
            کاربر نمایشگاه
          </option>

          <option value="admin">
            مدیر سیستم
          </option>
        </select>

        {isCurrentUser && (
          <p className="mt-1.5 text-xs text-gray-400">
            مدیر فعلی قابل تغییر نیست
          </p>
        )}
      </td>

      <td className="px-6 py-5">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            onSave(
              profile.id,
              dealershipId || null,
              role
            )
          }
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "در حال ذخیره..." : "ذخیره"}
        </button>
      </td>
    </tr>
  );
}
