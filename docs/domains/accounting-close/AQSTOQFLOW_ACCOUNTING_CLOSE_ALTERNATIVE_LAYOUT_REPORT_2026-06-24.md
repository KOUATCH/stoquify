# Accounting Close Alternative Layout Report - 2026-06-24

## Scope

Tried a different layout for only the affected `/en/dashboard/accounting/close` sections: Close Readiness Checklist, Certification Controls, and Close Pack Export.

## Starting Point

The previous pre-adjustment layout placed the checklist beside a right column where Certification Controls and Close Pack Export were stacked. That stranded the right column after those shorter panels ended, while the checklist kept extending downward.

The first repair made a denser checklist/rail composition, but this pass intentionally moved closer to the original page structure and only rearranged the concerned sections.

## Alternative Layout Tried

Chosen arrangement:

- Close Readiness Checklist is restored as the original full-width divided scan list.
- Certification Controls and Close Pack Export are moved into a paired command row below the checklist.
- The rest of the page remains unchanged.

This keeps the checklist easy to scan, avoids a sparse right rail, and lets certification/export sit together as the action area for the readiness state.

## Files Changed

- `components/accounting/CloseAssuranceCenter.tsx`
- `components/accounting/__tests__/CloseAssuranceCenter.test.tsx`

## Verification

Passed:

- `npm test -- --runTestsByPath components/accounting/__tests__/CloseAssuranceCenter.test.tsx --runInBand`
- `npx eslint components/accounting/CloseAssuranceCenter.tsx components/accounting/__tests__/CloseAssuranceCenter.test.tsx`
- `npm run typecheck`

Browser/screenshot verification was not run because Playwright is not installed in this workspace (`playwright_not_found`) and no browser screenshot tool was available from the current tool surface.

## Remaining Visual Risks

- Real authenticated browser review is still needed to judge exact vertical balance with production tenant data.
- Very long source table or disabled-reason text may still benefit from a future disclosure pattern, but no copy or business semantics were changed in this pass.