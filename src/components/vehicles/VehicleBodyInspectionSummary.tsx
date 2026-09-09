"use client";

import { useMemo } from "react";
import {
  BODY_CODES,
  CONDITION_LABEL,
  CONDITION_TEXT,
  STRUCTURE_CODES,
  conditionFill,
} from "./vehicleBodyDiagram";
import VehicleBodyMap from "./VehicleBodyMap";

export type BodyPart = {
  code: string;
  name_fa: string;
  section: string | null;
  position: string | null;
  display_order: number | null;
  is_active: boolean;
};

export type Inspection = {
  part_code: string;
  condition: string;
  paint_thickness_microns: number | null;
  notes: string | null;
};

type Props = {
  parts: BodyPart[];
  value: Inspection[];
  legacyBodyCondition?: string | null;
  legacyChassisCondition?: string | null;
  error?: string;
};

function getFill(condition: string) {
  return conditionFill(condition);
}

function getTextClass(condition: string) {
  return CONDITION_TEXT[condition] || CONDITION_TEXT.intact;
}

function formatNumber(value: number) {
  return value.toLocaleString("fa-IR");
}

export default function VehicleBodyInspectionSummary({
  parts,
  value,
  legacyBodyCondition,
  legacyChassisCondition,
  error,
}: Props) {
  const partMap = useMemo(
    () => new Map(parts.map((part) => [part.code, part])),
    [parts]
  );

  const affected = useMemo(
    () =>
      value
        .filter((item) => item.condition && item.condition !== "intact")
        .map((item) => ({
          ...item,
          part: partMap.get(item.part_code),
        }))
        .filter((item) => item.part)
        .sort(
          (a, b) =>
            (a.part?.display_order ?? 9999) -
            (b.part?.display_order ?? 9999)
        ),
    [value, partMap]
  );

  const bodyAffected = affected.filter((item) =>
    BODY_CODES.has(item.part_code)
  );

  const structureAffected = affected.filter((item) =>
    STRUCTURE_CODES.has(item.part_code)
  );

  const conditionCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of affected) {
      counts.set(item.condition, (counts.get(item.condition) ?? 0) + 1);
    }

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [affected]);

  const hasNewInspection = value.length > 0;
  const isAllIntact = affected.length === 0;

  function getPartLabel(code: string) {
    return partMap.get(code)?.name_fa || code;
  }

  return (
    <section className="mb-8 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
      <div className="border-b border-slate-100 bg-gradient-to-l from-slate-950 to-slate-800 px-6 py-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400">
              گزارش کارشناسی
            </p>

            <h2 className="mt-1 text-2xl font-extrabold">
              گزارش کارشناسی بدنه و شاسی
            </h2>

            <p className="mt-2 text-sm text-slate-300">
              وضعیت ثبت‌شده قطعات بدنه، سازه و شاسی خودرو
            </p>
          </div>

          <div
            className={`rounded-2xl px-5 py-3 text-center ${
              isAllIntact
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20"
                : "bg-white/10 text-white ring-1 ring-white/10"
            }`}
          >
            <div className="text-xs opacity-70">وضعیت کلی</div>

            <div className="mt-1 font-extrabold">
              {isAllIntact ? "بدون مورد ثبت‌شده" : "دارای موارد کارشناسی"}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="font-bold">گزارش کارشناسی در دسترس نیست</div>
            <div className="mt-1">{error}</div>
          </div>
        )}

        {!error && !hasNewInspection && (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="font-bold text-blue-900">
              اطلاعات کارشناسی جزئی برای این خودرو ثبت نشده است.
            </div>

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {legacyBodyCondition && (
                <div className="rounded-xl bg-white/80 p-4">
                  <div className="text-xs text-blue-500">
                    وضعیت بدنه قدیمی
                  </div>

                  <div className="mt-1 font-bold text-blue-950">
                    {legacyBodyCondition}
                  </div>
                </div>
              )}

              {legacyChassisCondition && (
                <div className="rounded-xl bg-white/80 p-4">
                  <div className="text-xs text-blue-500">
                    وضعیت شاسی قدیمی
                  </div>

                  <div className="mt-1 font-bold text-blue-950">
                    {legacyChassisCondition}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="قطعات دارای ایراد"
            value={formatNumber(affected.length)}
            tone={affected.length === 0 ? "green" : "slate"}
          />

          <SummaryCard
            label="موارد بدنه"
            value={formatNumber(bodyAffected.length)}
            tone={bodyAffected.length === 0 ? "green" : "yellow"}
          />

          <SummaryCard
            label="موارد سازه و شاسی"
            value={formatNumber(structureAffected.length)}
            tone={structureAffected.length === 0 ? "green" : "red"}
          />

          <SummaryCard
            label="وضعیت شاسی"
            value={
              structureAffected.length === 0 ? "سالم" : "نیازمند بررسی"
            }
            tone={structureAffected.length === 0 ? "green" : "red"}
          />
        </div>

        {conditionCounts.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="text-sm font-bold text-slate-900">
              خلاصه وضعیت ثبت‌شده
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {conditionCounts.map(([condition, count]) => (
                <div
                  key={condition}
                  className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold shadow-sm ring-1 ring-slate-100"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: getFill(condition) }}
                  />

                  <span className={getTextClass(condition)}>
                    {CONDITION_LABEL[condition] || condition}
                  </span>

                  <span className="text-slate-500">
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
          <div className="rounded-[1.75rem] border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-400">
                  نمایش گرافیکی
                </p>

                <h3 className="mt-1 text-lg font-extrabold text-slate-950">
                  نقشه وضعیت خودرو
                </h3>
              </div>

              <div className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-100">
                نمای کارشناسی
              </div>
            </div>

            <div className="mt-4">
              <VehicleBodyMap
                parts={parts}
                value={value}
                readOnly
              />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5">
            <div>
              <p className="text-xs font-semibold text-slate-400">
                جزئیات گزارش
              </p>

              <h3 className="mt-1 text-lg font-extrabold text-slate-950">
                موارد ثبت‌شده
              </h3>
            </div>

            {affected.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl">
                  ✓
                </div>

                <div className="mt-3 font-extrabold text-emerald-900">
                  همه قطعات سالم
                </div>

                <p className="mt-1 text-xs leading-6 text-emerald-700">
                  هیچ مورد غیرسالمی در گزارش کارشناسی ثبت نشده است.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {affected.map((item) => (
                  <div
                    key={item.part_code}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">
                          {getPartLabel(item.part_code)}
                        </div>

                        <div
                          className={`mt-1 text-xs font-bold ${getTextClass(
                            item.condition
                          )}`}
                        >
                          {CONDITION_LABEL[item.condition] ||
                            item.condition}
                        </div>
                      </div>

                      <span
                        className="mt-1 h-4 w-4 shrink-0 rounded-full ring-2 ring-white"
                        style={{
                          backgroundColor: getFill(item.condition),
                        }}
                      />
                    </div>

                    {item.paint_thickness_microns !== null && (
                      <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                        ضخامت رنگ:{" "}
                        <span className="font-extrabold text-slate-900">
                          {formatNumber(item.paint_thickness_microns)}
                        </span>{" "}
                        میکرون
                      </div>
                    )}

                    {item.notes && (
                      <div className="mt-2 rounded-xl bg-white px-3 py-2 text-xs leading-6 text-slate-600">
                        {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <InspectionGroup
            title="بدنه"
            subtitle="قطعات بیرونی و شیشه‌ها"
            items={bodyAffected}
          />

          <InspectionGroup
            title="سازه و شاسی"
            subtitle="ستون‌ها، شاسی و قطعات سازه‌ای"
            items={structureAffected}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-800">
          این گزارش بر اساس اطلاعات ثبت‌شده توسط کارشناس/نمایشگاه در سیستم
          خودرو‌یاب نمایش داده می‌شود. وضعیت «سالم» به معنی نبودن مورد
          غیرسالم ثبت‌شده در سیستم است.
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "yellow" | "red" | "slate";
}) {
  const classes = {
    green: "border-emerald-100 bg-emerald-50 text-emerald-900",
    yellow: "border-yellow-100 bg-yellow-50 text-yellow-900",
    red: "border-red-100 bg-red-50 text-red-900",
    slate: "border-slate-100 bg-slate-50 text-slate-900",
  };

  return (
    <div className={`rounded-2xl border p-5 ${classes[tone]}`}>
      <div className="text-xs font-semibold opacity-60">{label}</div>
      <div className="mt-2 text-xl font-extrabold">{value}</div>
    </div>
  );
}

function InspectionGroup({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{
    part_code: string;
    condition: string;
    part?: BodyPart;
  }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <div>
        <h3 className="font-extrabold text-slate-950">{title}</h3>

        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl bg-white p-4 text-sm font-semibold text-emerald-700">
          ✓ مورد غیرسالمی ثبت نشده است.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.part_code}
              className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-100"
            >
              <span className="text-sm font-bold text-slate-800">
                {item.part?.name_fa || item.part_code}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${getConditionBadge(
                  item.condition
                )}`}
              >
                {CONDITION_LABEL[item.condition] || item.condition}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getConditionBadge(condition: string) {
  switch (condition) {
    case "painted":
      return "bg-yellow-100 text-yellow-800";

    case "spot_repair":
      return "bg-orange-100 text-orange-800";

    case "putty":
      return "bg-violet-100 text-violet-800";

    case "replaced":
      return "bg-red-100 text-red-800";

    case "damaged":
      return "bg-red-100 text-red-800";

    case "repaired":
      return "bg-blue-100 text-blue-800";

    case "welded":
      return "bg-violet-100 text-violet-800";

    case "stretched":
      return "bg-orange-100 text-orange-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}
