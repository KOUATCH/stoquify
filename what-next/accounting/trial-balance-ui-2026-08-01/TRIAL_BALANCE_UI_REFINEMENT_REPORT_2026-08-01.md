# Trial Balance UI Refinement Report

Date: 2026-08-01  
Route: `/[locale]/dashboard/accounting/reports/trial-balance`  
Workspace: `E:\ohada saas\Focused projects\stoquify`

## Refined Professional Prompt

```md
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Project:
Stoquify / AqStoqFlow platform.

Workspace:
`E:\ohada saas\Focused projects\stoquify`

Domain:
Accounting reporting — Trial Balance.

Mission:
Redesign the Trial Balance page so a large chart of accounts no longer creates an unbounded page. Deliver a professional, modern, responsive accounting workbench with client-side pagination, compact row presentation, search, focused filters, sticky table context, and clearly labelled full-report totals. Preserve the canonical tenant-scoped server report, accounting permissions, account order, debit/credit semantics, balance status, error behavior, and zero-balance inclusion.

Domain lens:
Act as a senior enterprise accounting-reporting architecture team:
- Preserve the existing server action and accounting read-model ownership.
- Keep canonical monetary values, totals, and `isBalanced` server-owned.
- Preserve tenant isolation, `accounting.reports.read`, safe action errors, and the existing module boundary.
- Keep debit and credit values separate, right-aligned, and unambiguous.
- Keep full-report totals visible on every page; never present page subtotals as report totals.
- Retain all financial columns on narrow screens through a labelled horizontal scroll region rather than hiding accounting information.

Tasks:
1. Inspect the route, focused tests, accounting UI helpers, report action/service, relevant graph output, and dirty-worktree overlap.
2. Preserve `checkPermission("accounting.reports.read")` before data access and preserve `getTrialBalanceAction({ includeZeroBalance: true })`.
3. Move interactive presentation into a route-local client component without changing the action, service, schema, or database.
4. Add 10/25/50 row pagination, account search, account-type filtering, and a posted-activity filter; reset to page one when controls change.
5. Add a bounded, focusable table region with sticky headers, a sticky Account column, tabular monetary values, accessible headers/caption, intentional empty states, and responsive controls.
6. Display the server-provided full-report totals on every page and state the total account scope explicitly.
7. Correct report copy to disclose both posted and reversed journal entries and label debit/credit balances explicitly.
8. Add focused interaction tests, run TypeScript and scoped lint checks, and capture authenticated desktop/tablet/mobile evidence.
9. Save verification results and unresolved limitations under `what-next/accounting/`.

Success criteria:
- A report with more than ten rows renders only the selected page and has working Previous/Next controls.
- Search and filters update the visible result count and reset pagination safely.
- Full canonical totals stay unchanged and visible across pages and filters.
- Permission ordering, tenant-scoped action behavior, error handling, zero-balance inclusion, and account-code order remain unchanged.
- The table exposes a caption, scoped headers, a keyboard-focusable labelled scroll region, and non-wrapping tabular money columns.
- The route renders successfully at 390px, 1024px, and 1440px widths.
- Focused Jest, scoped ESLint, and project TypeScript checks pass.
```

## Execution Checklist

- [x] Inspected the route, action, service, focused tests, shared accounting UI, graph output, and related table patterns.
- [x] Confirmed the canonical service is tenant scoped and ordered by account code.
- [x] Confirmed totals and `isBalanced` are server-owned.
- [x] Preserved the page permission guard and exact action input.
- [x] Added route-local client pagination and filtering.
- [x] Added accessible bounded table presentation and responsive controls.
- [x] Added focused interaction coverage.
- [x] Ran focused Jest, scoped ESLint, and project TypeScript verification.
- [x] Captured authenticated mobile, tablet, and desktop screenshots.

## Evidence Inspected

- `app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/page.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/__tests__/page.test.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/_components/accounting-ui.tsx`
- `actions/accounting/reports.actions.ts`
- `services/accounting/reports.service.ts`
- `components/ui/table.tsx`
- `graphify-out/graph.json`
- Per-directory app/actions/services graph outputs identified during architecture review.

Graph evidence placed the route, shared accounting UI, protected action, and reporting service in separate communities. That supports a route-local interactive table while leaving action and service ownership unchanged.

## Implemented Artifacts

- Updated `app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/page.tsx`.
- Added `app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/trial-balance-table.tsx`.
- Added `app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/__tests__/trial-balance-table.test.tsx`.
- Added browser evidence:
  - `mobile.png` — 390 × 844 viewport.
  - `tablet.png` — 1024 × 900 viewport.
  - `desktop.png` — 1440 × 1000 viewport.

## Verification Results

| Check | Result |
| --- | --- |
| Focused route + table Jest suites | PASS — 2 suites, 5 tests |
| Scoped ESLint on the three changed source/test files | PASS |
| `npm run typecheck` | PASS |
| Authenticated route smoke at `/en/dashboard/accounting/reports/trial-balance` | PASS |
| Trial Balance heading | PASS — one rendered |
| Table | PASS — one rendered |
| Labelled pagination navigation | PASS — one rendered |
| Keyboard-focusable labelled table region | PASS — one rendered |
| Mobile/tablet/desktop screenshot review | PASS — controls stack or wrap, table remains horizontally reachable, totals remain present |

The authenticated browser dataset contained no trial-balance accounts, so screenshots validate the live shell, controls, empty state, totals, responsive behavior, and accessibility structure. The 12-row Jest fixture validates populated pagination and filter behavior.

## Risk Controls

- Tenant isolation: unchanged; the protected action still supplies `ctx.orgId` to the service.
- RBAC: unchanged; the page guard and protected action both require `accounting.reports.read`.
- Accounting truth: unchanged; rows, totals, and `isBalanced` still come from the canonical service.
- Report scope: every footer is labelled `Report totals` and `All N accounts`, preventing confusion with page subtotals.
- Debit/credit clarity: financial columns remain separate and the balance summary now labels both sides.
- Dirty worktree: only the route-local page, new component/test, and this evidence folder were touched.
- Data integrity: no schema, migration, seed, action, service, export, or database changes were made.

## Non-Goals

- No server-side query pagination or database changes.
- No period/date filter workflow.
- No export-control changes.
- No sortable columns or accounting-order changes.
- No edits to shared table/UI primitives.
- No unrelated lint cleanup or broad accounting refactor.

## Known Limitation

Pagination is intentionally presentation-side: the canonical report is still loaded once and the browser slices the returned chart-of-account rows. This resolves the unbounded page and is appropriate for normal charts of accounts. If tenants later reach thousands of accounts or payload/query measurements show a real bottleneck, server-owned pagination should be designed as a separate reporting-service change with stable global totals and export semantics.
