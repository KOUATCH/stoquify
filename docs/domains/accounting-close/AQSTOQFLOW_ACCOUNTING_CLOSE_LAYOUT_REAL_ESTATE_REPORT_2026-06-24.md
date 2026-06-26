# Accounting Close Layout Real Estate Report - 2026-06-24

## Scope

Reorganized the `/en/dashboard/accounting/close` Close & Assurance Center layout so the Close Readiness Checklist, Certification Controls, and Close Pack Export use dashboard space more efficiently without changing close readiness, certification, export, audit, RBAC, evidence, or proof-trail semantics.

## Diagnosis

The route `app/[locale]/(dashboard)/dashboard/accounting/close/page.tsx` is a thin accounting-authority wrapper that delegates the actual dashboard UI to `components/accounting/CloseAssuranceCenter.tsx`.

The real estate issue was inside `CloseAssuranceCenter`:

- The readiness area used a two-column grid: checklist on the left and a vertical controls/export stack on the right.
- The checklist was a single tall list, so it kept extending downward while the right column finished early.
- Certification Controls and Close Pack Export were separate stacked blocks with their own panel overhead, which made the right column feel sparse instead of action-dense.

The business architecture is sound, so this was a surgical layout repair, not a rebuild.

## Remedy Chosen

Chosen remedy: surgical layout repair.

I preserved the existing component boundaries and dashboard semantic classes, then changed only the composition and row density:

- Added a `close-readiness-workspace` responsive grid that gives the checklist primary space and keeps the certification/export rail compact.
- Changed the checklist from a single divided vertical list into a denser responsive two-column grid on wider screens.
- Changed Certification Controls into a compact responsive facts grid so controls use horizontal space before collapsing back to one column on very wide command layouts.
- Kept Close Pack Export in the same action rail, preserving draft/certified export gates, disabled reasons, watermark/hash display, and statutory limitation copy.

## Files Changed

- `components/accounting/CloseAssuranceCenter.tsx`
- `components/accounting/__tests__/CloseAssuranceCenter.test.tsx`

## Verification

Passed:

- `npm test -- --runTestsByPath components/accounting/__tests__/CloseAssuranceCenter.test.tsx --runInBand`
- `npx eslint components/accounting/CloseAssuranceCenter.tsx components/accounting/__tests__/CloseAssuranceCenter.test.tsx`
- `npm run typecheck`

Browser/screenshot verification was not run because Playwright is not installed in this workspace and no local browser screenshot tool was available from the current tool surface.

## Remaining Risks

- The exact visual balance should still be checked in a real authenticated browser session because the live page depends on tenant data volume and current close-run state.
- If tenants have unusually verbose checklist details or source-table lists, a future pass may add progressive disclosure for details instead of further widening the layout.

## Next Hardening

- Add a real browser smoke/screenshot step once a local authenticated session or browser automation tool is available.
- Consider extracting repeated accounting dashboard panel primitives if more accounting subpages need similar real-estate tuning.