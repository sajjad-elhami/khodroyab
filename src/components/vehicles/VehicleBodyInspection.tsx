"use client";

import { useMemo, useState } from "react";
import {
  CONDITION_LABEL,
  CONDITION_TEXT,
  CONDITIONS,
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
  onChange: (value: Inspection[]) => void;
};

export default function VehicleBodyInspection({
  parts,
  value,
  onChange,
}: Props) {
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null);

  const activeParts = useMemo(
    () =>
      parts
        .filter((part) => part.is_active)
        .sort(
          (a, b) =>
            (a.display_order ?? 999) - (b.display_order ?? 999)
        ),
    [parts]
  );

  const inspectionMap = useMemo(
    () => new Map(value.map((item) => [item.part_code, item])),
    [value]
  );

  const summary = useMemo(() => {
    const result: Record<string, number> = {};

    value.forEach((item) => {
      if (item.condition !== "intact") {
        result[item.condition] =
          (result[item.condition] || 0) + 1;
      }
    });

    return result;
  }, [value]);

  const selectedInspection = selectedPart
    ? inspectionMap.get(selectedPart.code)
    : null;

  function getPartStatus(code: string) {
    return inspectionMap.get(code)?.condition || "intact";
  }

  function updateInspection(
    partCode: string,
    changes: Partial<Inspection>
  ) {
    const existing = inspectionMap.get(partCode);

    const next: Inspection = {
      part_code: partCode,
      condition: existing?.condition || "intact",
      paint_thickness_microns:
        existing?.paint_thickness_microns ?? null,
      notes: existing?.notes ?? null,
      ...changes,
    };

    const filtered = value.filter(
      (item) => item.part_code !== partCode
    );

    if (
      next.condition === "intact" &&
      !next.paint_thickness_microns &&
      !next.notes?.trim()
    ) {
      onChange(filtered);
      return;
    }

    onChange([...filtered, next]);
  }

  return (
    <section
      dir="rtl"
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold text-blue-600">
            کارشناسی خودرو
          </p>

          <h2 className="mt-1 text-xl font-extrabold text-slate-950">
            کارشناسی بدنه و شاسی
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            روی قسمت موردنظر خودرو کلیک کنید و وضعیت آن را ثبت کنید.
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {CONDITIONS.filter(
            (condition) => (summary[condition.value] || 0) > 0
          ).map((condition) => (
            <div
              key={condition.value}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="text-xl font-extrabold text-slate-900">
                {summary[condition.value]}
              </div>

              <div
                className={`mt-0.5 text-xs font-bold ${
                  CONDITION_TEXT[condition.value]
                }`}
              >
                {condition.label}
              </div>
            </div>
          ))}

          {Object.keys(summary).length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-500">
              وضعیت همه قطعات سالم است
            </div>
          )}
        </div>

        <VehicleBodyMap
          parts={activeParts}
          value={value}
            onPartClick={(code) => setSelectedPart(activeParts.find((part) => part.code === code) ?? null)}
        />

        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
          💡 روی هر بخش خودرو کلیک کنید و نتیجه کارشناسی را ثبت کنید.
        </div>

        {selectedPart && (
          <div
            className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-slate-950/50 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedPart(null);
              }
            }}
          >
            <div className="mx-auto flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl">
              <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-extrabold text-slate-950">
                      {selectedPart.name_fa}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      ثبت نتیجه کارشناسی
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPart(null)}
                    className="rounded-xl px-3 py-2 text-xl text-slate-400 hover:bg-slate-100"
                    aria-label="بستن"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-6">
                <div className="mb-3 text-sm font-bold text-slate-700">
                  وضعیت قطعه
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {CONDITIONS.map((condition) => {
                    const active =
                      getPartStatus(selectedPart.code) ===
                      condition.value;

                    return (
                      <button
                        key={condition.value}
                        type="button"
                        onClick={() =>
                          updateInspection(selectedPart.code, {
                            condition: condition.value,
                          })
                        }
                        className={`flex items-center justify-between rounded-xl border px-3 py-3 text-sm font-bold transition ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <span>{condition.label}</span>

                        {active && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    ضخامت رنگ
                    <span className="mr-1 text-xs font-normal text-slate-400">
                      (میکرون)
                    </span>
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      selectedInspection?.paint_thickness_microns ?? ""
                    }
                    onChange={(event) =>
                      updateInspection(selectedPart.code, {
                        paint_thickness_microns: event.target.value
                          ? Number(event.target.value)
                          : null,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                    placeholder="مثلاً ۲۸۰"
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    توضیحات کارشناس
                  </label>

                  <textarea
                    rows={4}
                    value={selectedInspection?.notes || ""}
                    onChange={(event) =>
                      updateInspection(selectedPart.code, {
                        notes: event.target.value || null,
                      })
                    }
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                    placeholder="مثلاً قسمت پایین گلگیر تعویض شده است..."
                  />
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-xs text-slate-500">
                    وضعیت فعلی
                  </span>

                  <span
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    {CONDITION_LABEL[
                      getPartStatus(selectedPart.code)
                    ] || "سالم"}
                  </span>
                </div>

                <div className="h-4" />
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
                <button
                  type="button"
                  onClick={() => setSelectedPart(null)}
                  className="w-full rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.99]"
                >
                  تأیید و بستن
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
