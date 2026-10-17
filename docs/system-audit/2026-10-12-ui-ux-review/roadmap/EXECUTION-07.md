# Delivery 07 — inventory table and payroll evidence follow-up

Date: 2026-10-13. Local implementation; no deployment or whole-roadmap completion.

## Completed changes

- The live French inventory catalogue showed a translated page header but English table controls, columns, stock filters, row menus and dates. Localized these controls, selection/export labels, empty/error states and operation notifications. Search and stock selectors now have explicit accessible labels. Column visibility uses readable column headings while retaining original column IDs and keys.
- Inventory rows now use the existing organization money formatter with the currency already resolved by the server page, matching its summary. French dates and quantities follow the interface locale. The legacy `/dashboard/items` caller retains its prior XAF default; currency propagation to that separate legacy route is not claimed. Item names, SKUs, quantities, value calculations, sorting keys, filter values and exported workbook schemas remain unchanged.
- Payroll payment and employee-balance proof labels now translate in French, including numbered source-link labels. Proof drawers translate known owned labels and preserve evidence values, IDs, unknown labels, record titles and hashes.
- Employee-balance settlement and authority-adapter outcome messages now use French interface copy. Success uses a status announcement and failure uses an alert. Known queued/readiness statuses are translated; queued execution is not described as completed execution. Exact protected server error messages, permission identifiers and correlation IDs remain visible.

Applied the existing UIUX orchestration and project UI/UX Pro Max guidance, design master and inventory page contract. This continues UX02/UX03 destination acceptance and a bounded inventory-workbench copy slice. No new visual system was introduced. Existing tree changes were captured before editing in `evidence/delivery-07-baseline.json`.

## Verification

| Evidence class | Result |
|---|---|
| Workflow contract | Passed; 198 scripts remain unclassified and were not implicitly approved |
| Focused mocked component tests | 10 tests passed: EN/FR inventory, organization currency, search/clear/selection, recoverable read error, payroll success/replay, preserved server failure, unchanged queue payload, denied action and proof integrity |
| Existing mocked payroll regression lane | 39 tests passed in 6 suites |
| Semantic TypeScript | Passed with normal dependency resolution for 21 production entry files from Deliveries 06–07 and their real imports; no declaration stubs, `noResolve`, emission or incremental build files. This closes the earlier scoped semantic-verification gap; it is not a whole-repository check |
| Scoped ESLint | Zero errors; one existing `next/no-img-element` warning in the unchanged inventory image element |
| Financial action source comparison | AST-selected settlement payload and adapter enqueue call unchanged against the task baseline, ignoring line-ending differences |
| Real database tests / financial mutations | Not run |
| Build / migration / seed / deployment | Not run |

An initial new inventory test could not load the ESM next-intl routing helper; the isolated test mock was corrected. The broader regression run caught an over-broad label edit in two Metric helpers; it was removed, stable React keys restored, and the final regression/typecheck passed. A proof tuple type now identifies its label as a non-null string without changing values.

Commands were reviewed against `docs/ecc/command-registry.json` and current definitions. Jest uses installed Next/SWC without application configuration or environment loading, explicit roots and mocked protected actions. TypeScript is invoked directly with `noEmit` and `incremental: false`. ESLint uses the existing Next configuration. Results: `evidence/delivery-07-followup-tests.json`, `delivery-07-destination-tests.json`, `delivery-07-typecheck-result.json`, and `delivery-07-control-comparison.json`. Configurations are stored beside this report.

## Browser evidence and remaining acceptance

| Route / context | Current evidence |
|---|---|
| `/fr/dashboard/inventory/items`, Edge, SUPER ADMIN, Wilkinson - Feeney 001, dark desktop, no viewport override | Before this delivery's edit, AX inspection confirmed French page/summary, 21 catalogue items and English table labels. This reproduced the gap. No business action was submitted. Current-session viewport dimensions were not captured |
| `/fr/dashboard/owner-war-room`, same browser | Navigation ended with `ERR_CONNECTION_RESET`; port 3000 had no listening process at the subsequent read-only check |
| Post-change inventory on temporary loopback port 3001 | Installed Next dev reported ready, but both localhost and the exact 127.0.0.1 address timed out in the browser; one reload after readiness also failed. Not accepted as rendered proof |

Recovery: reviewed `predev`, `dev` and Next configuration. Direct installed Next dev on loopback 3000 failed with OS EACCES both normally and with elevated tool execution. No automatic approval-review rejection occurred. A direct temporary dev server on loopback 3001 reported ready but remained unreachable from Edge. It was stopped through its own execution session. No npm lifecycle hook, Prisma command, migration, seed, firewall change, browser termination or authentication change was performed.

Still open: post-change owner main-action/purchase-order pending feedback; French payroll payments/register/declarations and inventory catalogue/loss rendered acceptance; keyboard and narrow viewports; actual owner/accountant/cashier sessions. Technical evidence and unknown source narratives intentionally remain verbatim. Full program, production performance and actual screen-reader acceptance remain outside this completed slice.

Next executable acceptance step is to restore a reachable application instance and repeat those exact journeys, then continue the roadmap's remaining workbench packages. The code and isolated verification do not depend on a new sign-in request.

Rollback: review and reverse only `evidence/delivery-07-owned.patch` against its recorded baseline. Do not reset files to HEAD. The final manifest records the owned file hashes.
