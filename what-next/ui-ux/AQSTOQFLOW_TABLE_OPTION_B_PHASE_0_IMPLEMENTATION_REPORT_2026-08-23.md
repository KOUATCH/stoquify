# Stoquify Table Option B — Phase 0 Evidence Gate Report

Date: 2026-08-23

Decision: **BLOCK**

Scope: browser baseline and ownership preflight only. No application implementation was authorized before this gate passed.

## Outcome

The approved in-app browser could not establish a session. Startup failed twice during the initial execution and failed again during the requested rerun before browser documentation or a page binding became available. The rerun diagnostic was `windows sandbox failed: helper_unknown_error: setup refresh had errors`. No localhost route opened, no authentication state was inspected, and no screenshot, keyboard result, zoom/reflow result, or automated accessibility result was produced.

The execution prompt explicitly requires a stop when the approved browser bridge is unavailable. Phase 1 was therefore not started.

This is an evidence-collection failure. It is not evidence that the Stoquify application or any listed route failed at runtime.

## Evidence inspected

- The attached Option B phased execution prompt.
- The required in-app browser control instructions.
- Current git status for all named Phase 1 and Phase 2 candidate files.
- Active route files under app/ for the required supplier, payroll, people, purchase-order, brand, unit, inventory, POS, and trial-balance surfaces.
- Existing benchmark, scorecard, normalization report, and evidence-manifest locations from the prior audit.

## Ownership matrix

All existing changes remain user-owned. Modified or untracked application files are excluded pending a future hunk-level isolation review; this blocked Phase 0 did not need or attempt that review.

| Candidate file | Git state | Phase 0 ownership classification | Action in this run |
| --- | --- | --- | --- |
| app/globals.css | Modified | Excluded pending isolation | Read-only status check |
| components/DataTableComponents/DataTable.tsx | Modified | Excluded pending isolation | Read-only status check |
| components/DataTableComponents/DataTablePagination.tsx | Modified | Excluded pending isolation | Read-only status check |
| components/DataTableComponents/DataTableViewOptions.tsx | Clean | Clean | Not edited |
| components/DataTableColumns/SortableColumn.tsx | Clean | Clean | Not edited |
| components/hr-payroll/HrPayrollTableControls.tsx | Untracked | User-owned; excluded pending isolation | Not edited |
| components/DataTableComponents/__tests__/SystemTablePresentation.contract.test.ts | Untracked | User-owned; excluded pending isolation | Not edited |
| components/DataTableComponents/__tests__/TableDateRangeAdoption.contract.test.ts | Untracked | User-owned; excluded pending isolation | Not edited |
| components/inventory/EnhancedBrandsManagement.tsx | Clean | Clean | Not edited |
| components/units/UnitsManagementDashboard.tsx | Clean | Clean | Not edited |
| components/payroll/PayrollCompensationWorkbench.tsx | Modified | Excluded pending isolation | Not edited |
| components/payroll/PayrollEmployeeSourceWorkbench.tsx | Modified | Excluded pending isolation | Not edited |
| components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx | Modified | Excluded pending isolation | Not edited |

No file above is classified as user-modified but isolatable. That classification requires inspecting the exact implementation hunk after Phase 0 passes and a concrete Phase 1 change is selected.

## Required route matrix

The following routes were mapped but not opened:

- /en/dashboard/purchases/suppliers
- /en/dashboard/payroll/compensation
- /en/dashboard/payroll/employees
- /en/dashboard/people
- /en/dashboard/purchase-orders
- /en/dashboard/inventory/brands
- /en/dashboard/inventory/units
- /en/dashboard/accounting/reports/trial-balance
- /en/dashboard/inventory/movements
- /en/dashboard/pos

An evidence/audit route must be selected from the active close-assurance or compliance route set during the successful rerun. It was not necessary to choose one after the browser failed before navigation.

## Missing evidence

For every route, the following remain unverified:

- 375px, 768px, 1280px, and 1536px screenshots;
- toolbar wrapping and one-row desktop layout;
- essential-column retention and mobile row presentation;
- horizontal overflow and minimum-width behavior;
- accessible naming, captions, sort state, focus order, and keyboard activation;
- search, typed filters, date-range reset, result range, page size, and navigation;
- EN/FR behavior and long translated labels;
- loading, empty, no-match, error, permission, and partial-data states;
- zoom, reflow, screen-reader behavior, and automated accessibility smoke.

## Verification status

| Check | Result |
| --- | --- |
| Browser connection attempt 1 | Failed before session creation |
| Prescribed retry | Failed before session creation |
| Requested rerun | Failed before session creation; Windows sandbox setup refresh error |
| Route navigation | Not run |
| Screenshots | 0 captured |
| Keyboard smoke | Not run |
| Accessibility smoke | Not run |
| Application code changed | No |
| User-owned edits modified | No |
| Phase 1 started | No |

Focused tests, typecheck, and lint were not rerun because this phase changed no application code and could not reach its browser gate. The prior audit's existing focused presentation contracts remain separate evidence and are not a substitute for Phase 0.

## Recovery and rerun

1. Restore the approved in-app browser bridge.
2. Confirm the local app and authenticated test workspace are available without exposing payroll, HR, supplier, or financial values.
3. Rerun Phase 0 from the route matrix at all four target widths.
4. Save redacted screenshots and keyboard/accessibility observations under the dated evidence directory.
5. Only after Phase 0 passes, inspect exact diffs for the dirty candidate files and classify each required Phase 1 hunk as isolatable or overlapping.

Do not substitute standalone Playwright, another browser-control system, or static-code inference for the missing browser evidence.

## Review-lens disposition

Applicable: frontend/design system, workflow UX, accessibility, localization, privacy, QA/release assurance, and ownership/change safety.

Not applicable in this blocked evidence-only run: payroll calculation, accounting policy, OHADA/SYSCOHADA compliance, tax/legal certification, database migration, AI governance, billing, provider integration, and production-performance certification. No related logic or evidence was reached.

## Gate decision

**BLOCK — Phase 0 incomplete. Stop before Phase 1.**
