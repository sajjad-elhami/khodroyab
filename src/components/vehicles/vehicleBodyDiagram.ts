export const CONDITIONS = [
  { value: "intact", label: "سالم", short: "سالم" },
  { value: "painted", label: "رنگ‌شده", short: "رنگ" },
  { value: "spot_repair", label: "لکه‌گیری", short: "لکه‌گیری" },
  { value: "putty", label: "بتونه", short: "بتونه" },
  { value: "replaced", label: "تعویض‌شده", short: "تعویض" },
  { value: "damaged", label: "ضربه‌دار", short: "ضربه" },
  { value: "repaired", label: "تعمیرشده", short: "تعمیر" },
  { value: "welded", label: "جوش‌خورده", short: "جوش" },
  { value: "stretched", label: "کشیده‌شده", short: "کشیده" },
  { value: "unknown", label: "نامشخص", short: "نامشخص" },
] as const;

export const CONDITION_LABEL: Record<string, string> =
  Object.fromEntries(
    CONDITIONS.map((item) => [item.value, item.label])
  );

export const CONDITION_FILL: Record<string, string> = {
  intact: "#f8fafc",
  painted: "#facc15",
  spot_repair: "#fb923c",
  putty: "#a78bfa",
  replaced: "#ef4444",
  damaged: "#dc2626",
  repaired: "#3b82f6",
  welded: "#7c3aed",
  stretched: "#f97316",
  unknown: "#94a3b8",
};

export const CONDITION_TEXT: Record<string, string> = {
  intact: "text-emerald-600",
  painted: "text-yellow-700",
  spot_repair: "text-orange-600",
  putty: "text-violet-600",
  replaced: "text-red-600",
  damaged: "text-red-700",
  repaired: "text-blue-600",
  welded: "text-violet-700",
  stretched: "text-orange-700",
  unknown: "text-slate-500",
};

export const BODY_CODES = new Set([
  "front_bumper",
  "hood",
  "roof",
  "trunk_lid",
  "rear_bumper",
  "front_fender_left",
  "front_fender_right",
  "front_door_left",
  "front_door_right",
  "rear_door_left",
  "rear_door_right",
  "rear_quarter_left",
  "rear_quarter_right",
  "windshield",
  "rear_glass",
  "front_glass_left",
  "front_glass_right",
  "rear_glass_left",
  "rear_glass_right",
]);

export const STRUCTURE_CODES = new Set([
  "a_pillar_left",
  "a_pillar_right",
  "b_pillar_left",
  "b_pillar_right",
  "c_pillar_left",
  "c_pillar_right",
  "front_chassis_left",
  "front_chassis_right",
  "rear_chassis_left",
  "rear_chassis_right",
  "front_apron_left",
  "front_apron_right",
  "rear_panel",
  "trunk_floor",
  "rocker_left",
  "rocker_right",
]);

export const DIAGRAM_BODY_CODES = new Set([
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
]);

export const DIAGRAM_STRUCTURE_CODES = new Set([
  "a_pillar_left",
  "a_pillar_right",
  "b_pillar_left",
  "b_pillar_right",
  "c_pillar_left",
  "c_pillar_right",
  "rocker_left",
  "rocker_right",
  "front_chassis_left",
  "front_chassis_right",
  "rear_chassis_left",
  "rear_chassis_right",
]);

export type PartShape =
  | {
      type: "path";
      d: string;
    }
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
    };

export const PART_SHAPES: Record<string, PartShape> = {
  front_bumper: {
    type: "path",
    d: "M252 54 Q300 38 348 54 L342 76 Q300 88 258 76 Z",
  },

  hood: {
    type: "path",
    d: "M246 78 Q300 63 354 78 L341 177 Q300 191 259 177 Z",
  },

  roof: {
    type: "path",
    d: "M261 189 Q300 174 339 189 L350 337 Q300 356 250 337 Z",
  },

  trunk_lid: {
    type: "path",
    d: "M259 348 Q300 363 341 348 L354 426 Q300 444 246 426 Z",
  },

  rear_bumper: {
    type: "path",
    d: "M246 428 Q300 446 354 428 L348 456 Q300 472 252 456 Z",
  },

  front_fender_left: {
    type: "path",
    d: "M235 81 Q211 98 202 143 L208 190 L244 184 L258 81 Z",
  },

  front_fender_right: {
    type: "path",
    d: "M365 81 Q389 98 398 143 L392 190 L356 184 L342 81 Z",
  },

  front_door_left: {
    type: "path",
    d: "M208 190 L248 184 L250 283 L210 290 Z",
  },

  front_door_right: {
    type: "path",
    d: "M392 190 L352 184 L350 283 L390 290 Z",
  },

  rear_door_left: {
    type: "path",
    d: "M210 292 L250 284 L252 344 L214 350 Z",
  },

  rear_door_right: {
    type: "path",
    d: "M390 292 L350 284 L348 344 L386 350 Z",
  },

  rear_quarter_left: {
    type: "path",
    d: "M214 351 L252 344 L260 348 L245 428 L210 414 Z",
  },

  rear_quarter_right: {
    type: "path",
    d: "M386 351 L348 344 L340 348 L355 428 L390 414 Z",
  },

  windshield: {
    type: "path",
    d: "M269 190 Q300 177 331 190 L340 218 Q300 230 260 218 Z",
  },

  rear_glass: {
    type: "path",
    d: "M260 331 Q300 344 340 331 L330 355 Q300 364 270 355 Z",
  },

  front_glass_left: {
    type: "path",
    d: "M255 215 L290 220 L290 279 L255 284 Z",
  },

  front_glass_right: {
    type: "path",
    d: "M345 215 L310 220 L310 279 L345 284 Z",
  },

  rear_glass_left: {
    type: "path",
    d: "M255 290 L290 284 L292 329 L260 337 Z",
  },

  rear_glass_right: {
    type: "path",
    d: "M345 290 L310 284 L308 329 L340 337 Z",
  },

  a_pillar_left: {
    type: "path",
    d: "M248 182 L260 185 L270 205 L254 208 Z",
  },

  a_pillar_right: {
    type: "path",
    d: "M352 182 L340 185 L330 205 L346 208 Z",
  },

  b_pillar_left: {
    type: "rect",
    x: 247,
    y: 205,
    width: 8,
    height: 82,
    rx: 3,
  },

  b_pillar_right: {
    type: "rect",
    x: 345,
    y: 205,
    width: 8,
    height: 82,
    rx: 3,
  },

  c_pillar_left: {
    type: "path",
    d: "M250 287 L260 284 L270 350 L255 345 Z",
  },

  c_pillar_right: {
    type: "path",
    d: "M350 287 L340 284 L330 350 L345 345 Z",
  },

  rocker_left: {
    type: "path",
    d: "M205 345 L218 350 L250 425 L235 420 Z",
  },

  rocker_right: {
    type: "path",
    d: "M395 345 L382 350 L350 425 L365 420 Z",
  },

  front_chassis_left: {
    type: "path",
    d: "M244 80 L258 81 L252 176 L238 180 Z",
  },

  front_chassis_right: {
    type: "path",
    d: "M356 80 L342 81 L348 176 L362 180 Z",
  },

  front_apron_left: {
    type: "path",
    d: "M238 82 L250 77 L245 135 L230 145 Z",
  },

  front_apron_right: {
    type: "path",
    d: "M362 82 L350 77 L355 135 L370 145 Z",
  },

  rear_chassis_left: {
    type: "path",
    d: "M245 389 L258 394 L250 430 L238 420 Z",
  },

  rear_chassis_right: {
    type: "path",
    d: "M355 389 L342 394 L350 430 L362 420 Z",
  },

  rear_panel: {
    type: "path",
    d: "M245 420 Q300 435 355 420 L350 445 Q300 460 250 445 Z",
  },

  trunk_floor: {
    type: "path",
    d: "M260 365 Q300 375 340 365 L350 405 Q300 418 250 405 Z",
  },
};

export function conditionFill(condition: string) {
  return CONDITION_FILL[condition] || CONDITION_FILL.intact;
}
