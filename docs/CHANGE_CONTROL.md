# Khodroyab Change Control

## Rule 1 — GitHub `main` is the source of truth
All production UI/code changes must be committed to `main`. Local backup files are never treated as a source to restore over newer code.

## Rule 2 — Never restore a whole component from an old backup
When a requested change touches a file that has newer work, make a targeted patch against the current `main` version. Do not copy an older backup over the current file.

## Rule 3 — Required verification before production
Every code change must pass the repository Quality workflow:
- ESLint
- TypeScript typecheck

GitHub → Vercel Production auto-deploy is the deployment path. A successful local-looking change is not considered complete until the committed source is the source used for deployment.

## Rule 4 — Preserve completed UX decisions
For the vehicle registration flow, the current requirements are cumulative. Future changes must preserve the already completed three-step flow, Persian labels, year/mileage/price formatting, gallery behavior, body inspection behavior, and mobile-first layout unless the user explicitly changes them.

## Rule 5 — Backups are references, not rollback commands
Files such as `*.backup-*` may be kept for forensic/reference purposes. They must never be copied back wholesale after newer changes exist.

## Current registration invariants
- Body inspection action `تأیید و بستن` stays fixed to the bottom of the inspection modal.
- Body hotspots remain transparent; selecting a part does not fill it with a condition color.
- Required registration fields must be validated before submission and missing fields must be visually identifiable.
- `وضعیت شاسی` is split into `شاسی جلو` and `شاسی عقب` and stored together in the existing `chassis_condition` field as structured JSON to avoid an unnecessary schema migration.
- Optional: `نوع گیربکس`, `وضعیت گیربکس`, `مهلت بیمه شخص ثالث`, `وضعیت موتور`.
- Required: `وضعیت شاسی` and `کارشناسی بدنه`.
- If no body part is marked as damaged/painted/etc., the derived overall body condition remains `سالم`.
- The registration back control is a right-facing `→` at the top-right of the three registration stages.
