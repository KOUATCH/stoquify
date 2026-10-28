# Supplier route-first workflow verification — 2026-08-14

## Result

**PASS WITH CONDITIONS** for the requested route-first scope. English and French list, create, existing-detail, and existing-edit workflows passed in a real authenticated local Chrome session at desktop (1280 px), tablet (834 px), and mobile (412 px).

The conditions are limited to test-runner behavior outside the requested scope: an unrelated mobile archive-menu animation timed out after the route-first checks had passed, and the isolated RBAC runner hung while stopping its dev server after writing PASS evidence.

## Scope and provenance

- Entity key: `SUPPLIER`
- Branch / commit: `codex/service-boundary-burndown` / `4a6cc16`
- Local browser: installed Google Chrome driven by Playwright
- Authenticated fixture: permitted supplier administrator plus denied supplier user
- Locales: `/en` and `/fr`
- Canonical routes: `/dashboard/purchases/suppliers`, `/create`, `/[id]`, `/[id]/edit`
- Evidence boundary: local synthetic tenant only; this is not a production or compliance certification

## Evidence matrix

| Gate | Result | Concise evidence |
|---|---|---|
| G1 — route contract and transitions | PASS | List create link reached `/create`; create submission reached the generated detail URL; detail edit link reached `/[id]/edit`; edit submission returned to detail. |
| G2 — persistence | PASS | EN detail and edited values survived hard reload. FR create, detail, and edit routes survived hard reload with the expected form/data. |
| G3 — locale coverage | PASS | Eight route surfaces per viewport: EN/FR × list/create/detail/edit. |
| G4 — RBAC and isolation | PASS | Eight denied URLs stayed authenticated, rendered the localized access boundary, disclosed no supplier data, and exposed no mutation/export control. The foreign-tenant supplier was absent from the permitted list. |
| G5 — presentation and route-first UI | PASS | 24 route records; 0 dialogs, 0 serious accessibility violations, 0 horizontal overflows, 0 clipped actions, and 0 overlapping actions. Create/edit are forms in page sections, not modal workflows. |
| G6 — cleanup and reproducibility | PASS | Synthetic fixture cleanup returned 0 organizations, 0 users, and 0 suppliers; supplier auth states and temporary Next build directories were removed. |

## Defects fixed

1. French denied supplier routes showed the English layout boundary. The supplier layout now localizes denied and no-active-organization states.
2. Authenticated pages without a user image fetched a remote placeholder and generated local-browser network errors. The navbar now uses the existing initials fallback.
3. The browser evidence harness still assumed modal creation and a fixed, locked evidence directory. It now verifies routed EN/FR pages, accepts an isolated evidence directory and installed Chrome binary, and allows local dev compilation time for URL transitions.

Focused component/page/layout verification: **3 suites, 20 tests passed**.

## Saved artifacts

- `route-first-certification.json` — distilled decision record
- `supplier-authenticated-{desktop,tablet,mobile}.json` — raw viewport records
- `supplier-rbac-negative.json` — denied-user record for eight EN/FR URLs
- `list-en-desktop.png`, `create-page-fr-desktop.png`, `detail-page-en-mobile.png`, `edit-page-fr-mobile.png`, `rbac-denied-desktop.png` — representative screenshots

## Conditions and exclusions

- The raw mobile JSON has an overall `FAIL` because scenario 7 (archive confirmation, outside this request) hit a transient detached menu item. Its eight requested EN/FR route records all passed with clean presentation metrics.
- The isolated RBAC command timed out during dev-server shutdown after the test emitted its pass marker and wrote `supplier-rbac-negative.json` with `status: PASS`.
- Archive uses an `AlertDialog` confirmation by design; it is an action confirmation, not the list/create/detail/edit routed workflow.

## Review boundary

This verification certifies only the local authenticated supplier route-first behavior described above. It does not certify production infrastructure, unrelated supplier history/export/archive flows, or statutory/accounting correctness.
