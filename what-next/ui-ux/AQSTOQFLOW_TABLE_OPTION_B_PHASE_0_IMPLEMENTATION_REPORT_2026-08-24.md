# Stoquify Table Option B — Phase 0 Evidence Gate Report

Date: 2026-08-24

Decision: **BLOCK — authenticated primary-route preflight passed; full evidence environment remains incomplete**

## Outcome

The approved in-app browser failed before creating a browser session. The first attempt reported:

`windows sandbox failed: orchestrator_helper_report_read_failed: setup helper exited with status Some(1); failed to read setup_error.json`

The identified diagnostic file was subsequently readable and valid JSON:

```json
{
  "code": "helper_unknown_error",
  "message": "setup refresh had errors"
}
```

A single controlled retry also exited before browser setup completed. No localhost route opened and no screenshot, keyboard, responsive, localization, or accessibility evidence was produced.

The execution prompt requires a hard stop when the approved browser bridge is unavailable. Phase 1 was not started.

The bridge was subsequently repaired and the approved browser successfully reached the Stoquify login callback. After the Prisma runtime repair and server restart, a fresh controlled navigation to the protected supplier route completed normally and again redirected to the login callback. A transient diagnostic screenshot confirmed the login page rendered; it is not counted as target-route table evidence. A follow-up blocker audit established that the running auth endpoint is healthy, but the controlled evidence browser has no session and the current database contains no ready identity that combines the five highlighted route permissions with payroll and purchasing module access. The known payroll, supplier, and supplier-PO fixtures are absent, route-specific, and cannot safely be run against the current nonlocal database without separate authorization and Prisma fixture-path repair.

## Ownership matrix

All existing application changes remain user-owned. Dirty files are excluded pending hunk-level isolation after Phase 0 passes.

| Candidate file | State | Classification | Action |
| --- | --- | --- | --- |
| app/globals.css | Modified | Excluded pending isolation | Not edited |
| components/DataTableComponents/DataTable.tsx | Modified | Excluded pending isolation | Not edited |
| components/DataTableComponents/DataTablePagination.tsx | Modified | Excluded pending isolation | Not edited |
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

## Verification status

| Check | Result |
| --- | --- |
| Browser attempts on 2026-08-24 | 2 failed before repair; 1 succeeded after repair |
| Browser sessions created | 1 after repair |
| Routes opened | 1 after repair; redirected to login |
| Auth endpoint | HTTP 200; unauthenticated session is `null` |
| Known fixture organizations/users | 0 / 0 |
| Eligible five-route evidence identities | 0 |
| Diagnostic login screenshots observed | 1 transient; contains no protected table data |
| Target-route evidence screenshots captured | 0 |
| Keyboard/accessibility smoke | Not run |
| Application files changed | No |
| Database records changed | No |
| Phase 1 authorized | No |

## 2026-08-25 authenticated desktop preflight

The approved in-app browser session reached each of the five highlighted routes without a login redirect or an access-denied state. Each route rendered a table after the local development build completed. Only non-sensitive route, heading, and control-presence signals were retained.

| Route | Result |
| --- | --- |
| `/en/dashboard/purchases/suppliers` | Pass — supplier table present |
| `/en/dashboard/payroll/compensation` | Pass — compensation table present |
| `/en/dashboard/payroll/employees` | Pass — employee-source table present |
| `/en/dashboard/people` | Pass — people table present |
| `/en/dashboard/purchase-orders` | Pass — purchase-order table present |

This resolves the prior browser-session uncertainty for the five highlighted routes. It does not establish that the remaining inventory, accounting, POS, and evidence/audit routes are authorized, nor that displayed records are redaction-safe. No screenshots of table data, keyboard checks, viewport checks, localization checks, or accessibility checks have yet been retained.

The two existing focused structural contract suites passed: 2 suites and 5 tests. Typecheck and lint were not run because no application code was changed and the prerequisite browser gate did not complete. The passing structural tests do not substitute for browser, keyboard, responsive, localization, or accessibility evidence.

## Recovery requirement

The Codex Windows sandbox helper was repaired without changing Stoquify application code. The root cause was the repository `.git` directory being owned by `BUILTIN\Administrators` with a protected ACL. The unelevated Codex refresh could not add its protective deny ACE and returned Windows error 5.

The minimal repair changed only the `.git` directory owner to `KOUATCHOUA\J COMPUTER`. Existing protected ACL behavior and repository contents were preserved. After the repair:

- the approved in-app browser created a session successfully;
- the supplier route opened through the browser;
- Stoquify redirected to `/en/login?callbackUrl=%2Fen%2Fdashboard%2Fpurchases%2Fsuppliers`, proving browser navigation works but authenticated Phase 0 evidence is still pending.
- the same protected-route redirect was reproduced after the Prisma repair and server restart, so the active gate is browser authentication/authorization rather than sandbox startup, Prisma query execution, or route compilation.

Do not rerun the full capture immediately after sign-in. First provision or identify a redaction-safe non-production evidence identity, verify its permissions and module entitlements, select a concrete evidence/audit route, and confirm representative synthetic data. Then sign in through the approved in-app browser and perform a desktop route-access preflight before the full EN/FR and 375px, 768px, 1280px, and 1536px matrix. Do not substitute an unapproved browser runner.

The consolidated blocker analysis is recorded in [AQSTOQFLOW_TABLE_OPTION_B_PHASE_0_BLOCKER_REGISTER_2026-08-24.md](./AQSTOQFLOW_TABLE_OPTION_B_PHASE_0_BLOCKER_REGISTER_2026-08-24.md). Exact hashes for overlapping user-owned files are recorded in [ownership-baseline.json](./table-presentation-option-b-evidence/2026-08-24/ownership-baseline.json).

## Gate decision

**BLOCK — sandbox repaired, but the authenticated, authorized, redaction-safe Phase 0 environment does not yet exist. Stop before Phase 1.**
