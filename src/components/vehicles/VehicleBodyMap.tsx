"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CONDITION_TEXT,
  CONDITION_LABEL,
  conditionFill,
} from "./vehicleBodyDiagram";

export type VehicleBodyMapPart = {
  code: string;
  name_fa: string;
  section: string | null;
  position: string | null;
  display_order: number | null;
  is_active: boolean;
};

export type VehicleBodyMapInspection = {
  part_code: string;
  condition: string;
  paint_thickness_microns: number | null;
  notes: string | null;
};

type Props = {
  parts: VehicleBodyMapPart[];
  value: VehicleBodyMapInspection[];
  onPartClick?: (code: string) => void;
  readOnly?: boolean;
};

const SELECTABLE_CODES = new Set([
  "hood",
  "roof",
  "trunk_lid",
  "front_fender_left",
  "front_fender_right",
  "front_door_left",
  "front_door_right",
  "rear_door_left",
  "rear_door_right",
  "rear_quarter_left",
  "rear_quarter_right",
  "front_chassis_left",
  "front_chassis_right",
  "rear_chassis_left",
  "rear_chassis_right",
  "rocker_left",
  "rocker_right",
]);

const LABELS: Record<string, string> = {
  hood: "کاپوت",
  roof: "سقف",
  trunk_lid: "درب صندوق",

  front_fender_left: "گلگیر جلو سمت چپ",
  front_fender_right: "گلگیر جلو سمت راست",

  front_door_left: "درب جلو سمت چپ",
  front_door_right: "درب جلو سمت راست",

  rear_door_left: "درب عقب سمت چپ",
  rear_door_right: "درب عقب سمت راست",

  rear_quarter_left: "گلگیر عقب سمت چپ",
  rear_quarter_right: "گلگیر عقب سمت راست",

  front_chassis_left: "شاسی جلو سمت چپ",
  front_chassis_right: "شاسی جلو سمت راست",

  rear_chassis_left: "شاسی عقب سمت چپ",
  rear_chassis_right: "شاسی عقب سمت راست",

  rocker_left: "رکاب سمت چپ",
  rocker_right: "رکاب سمت راست",
};

type Hotspot = {
  code: string;
  points: string;
};

/*
 * تصویر OpenClipart سه نمای اصلی دارد:
 *
 * 1) نمای جانبی بالا  -> یک سمت خودرو
 * 2) نمای بالا        -> سقف / کاپوت / صندوق
 * 3) نمای جانبی پایین -> سمت مقابل خودرو
 *
 * شیشه‌ها عمداً داخل polygonهای درها قرار نگرفته‌اند.
 */
const HOTSPOTS: Hotspot[] = [
  // نمای جانبی بالا — بعد از چرخش ۱۸۰ درجه،
  // این نما سمت راست خودرو را نشان می‌دهد.

  {
    code: "front_fender_right",
    points: "2,9 22,9 24,15 23,22 20,28 5,26 3,20",
  },
  {
    code: "front_door_right",
    points: "25,10 51,10 51,28 25,28",
  },
  {
    code: "rear_door_right",
    points: "53,10 77,10 76,28 53,28",
  },
  {
    code: "rear_quarter_right",
    points: "79,9 97,10 98,26 81,28 78,22",
  },

  // نمای بالا

  {
    code: "hood",
    points: "3,37 29,36 31,47 29,59 4,58",
  },
  {
    code: "roof",
    points: "31,36 68,36 72,43 70,58 66,64 34,64 29,58 29,43",
  },
  {
    code: "trunk_lid",
    points: "70,36 96,37 98,58 72,59 69,53 70,43",
  },

  // نمای جانبی پایین — سمت چپ خودرو

  {
    code: "front_fender_left",
    points: "3,74 19,72 21,80 20,91 17,94 4,95 2,87",
  },
  {
    code: "front_door_left",
    points: "23,73 47,73 47,93 22,93",
  },
  {
    code: "rear_door_left",
    points: "49,73 74,73 75,93 49,93",
  },
  {
    code: "rear_quarter_left",
    points: "76,73 97,74 98,91 95,95 79,94 77,87",
  },

  // رکاب‌ها

  {
    code: "rocker_right",
    points: "25,28 79,29 82,33 24,33",
  },
  {
    code: "rocker_left",
    points: "21,94 77,94 80,98 20,98",
  },

  // شاسی عقب

  {
    code: "rear_chassis_right",
    points: "1,57 8,57 12,64 8,68 1,67",
  },
  {
    code: "rear_chassis_left",
    points: "1,65 8,65 12,69 8,72 1,71",
  },

  // شاسی جلو

  {
    code: "front_chassis_right",
    points: "89,57 99,57 99,67 92,68 88,64",
  },
  {
    code: "front_chassis_left",
    points: "89,65 99,65 99,72 92,71 88,68",
  },
];

const getSelectableParts = (parts: VehicleBodyMapPart[]) =>
  parts
    .filter(
      (part) =>
        part.is_active && SELECTABLE_CODES.has(part.code),
    )
    .sort(
      (a, b) =>
        (a.display_order ?? 0) -
        (b.display_order ?? 0),
    );

export default function VehicleBodyMap({
  parts,
  value,
  onPartClick,
  readOnly = false,
}: Props) {
  const [svg, setSvg] = useState("");

  const selectableParts = useMemo(
    () => getSelectableParts(parts),
    [parts],
  );

  const inspectionMap = useMemo(
    () =>
      new Map(
        value.map((item) => [
          item.part_code,
          item,
        ]),
      ),
    [value],
  );

  const availableCodes = useMemo(
    () =>
      new Set(
        selectableParts.map((part) => part.code),
      ),
    [selectableParts],
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/vehicle-inspection/car-body.svg")
      .then((response) => {
        if (!response.ok) {
          throw new Error("SVG load failed");
        }

        return response.text();
      })
      .then((text) => {
        if (!cancelled) {
          setSvg(text);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSvg("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      dir="rtl"
      className="w-full"
    >
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
        <div
          className="relative mx-auto w-full max-w-[820px]"
          style={{
            aspectRatio: "595.2755737 / 841.8897705",
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 w-[105%] origin-center"
            style={{
              aspectRatio:
                "841.8897705 / 595.2755737",
              transform:
                "translate(-50%, -50%) rotate(90deg) scale(1.35)",
            }}
          >
            {svg && (
              <div
                className="absolute inset-0 h-full w-full"
                dangerouslySetInnerHTML={{
                  __html: svg,
                }}
              />
            )}

            <div className="pointer-events-none absolute inset-0 z-20">
              {HOTSPOTS.map((hotspot) => {
                if (
                  !availableCodes.has(
                    hotspot.code,
                  )
                ) {
                  return null;
                }

                const inspection =
                  inspectionMap.get(
                    hotspot.code,
                  );

                const isDamaged =
                  Boolean(
                    inspection &&
                      inspection.condition !==
                        "intact",
                  );

                const fill = isDamaged
                  ? conditionFill(
                      inspection!.condition,
                    )
                  : "transparent";

                return (
                  <button
                    key={hotspot.code}
                    type="button"
                    disabled={readOnly}
                    aria-label={
                      LABELS[hotspot.code] ??
                      hotspot.code
                    }
                    onClick={() =>
                      onPartClick?.(
                        hotspot.code,
                      )
                    }
                    className="pointer-events-auto absolute inset-0 h-full w-full"
                    style={{
                      clipPath: `polygon(${hotspot.points
                        .split(" ")
                        .map((point) => {
                          const [x, y] =
                            point.split(",");
                          return `${x}% ${y}%`;
                        })
                        .join(", ")})`,
                      background: isDamaged
                        ? `${fill}55`
                        : "transparent",
                      border: "none",
                      outline: "none",
                      cursor: readOnly
                        ? "default"
                        : "pointer",
                    }}
                  >
                    <span className="sr-only">
                      {LABELS[
                        hotspot.code
                      ] ?? hotspot.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {value.some(
        (item) =>
          SELECTABLE_CODES.has(
            item.part_code,
          ) &&
          item.condition !== "intact",
      ) && (
        <div className="mt-3 space-y-2">
          {selectableParts
            .filter((part) => {
              const item =
                inspectionMap.get(
                  part.code,
                );

              return (
                item &&
                item.condition !==
                  "intact"
              );
            })
            .map((part) => {
              const item =
                inspectionMap.get(
                  part.code,
                )!;

              return (
                <div
                  key={part.code}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5"
                >
                  <span className="text-sm font-medium text-gray-800">
                    {LABELS[
                      part.code
                    ] ?? part.name_fa}
                  </span>

                  <span
                    className={`text-xs font-semibold ${
                      CONDITION_TEXT[
                        item.condition
                      ] ??
                      "text-gray-600"
                    }`}
                  >
                    {CONDITION_LABEL[
                      item.condition
                    ] ??
                      item.condition}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
