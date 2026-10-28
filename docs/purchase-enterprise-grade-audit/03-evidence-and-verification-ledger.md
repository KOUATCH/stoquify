# Purchase Enterprise-Grade Audit — Evidence and Verification Ledger

**Audit date:** 2026-08-17  
**Workspace:** `E:\ohada saas\Focused projects\stoquify`  
**Purpose:** Reproducible inventory of evidence used by `02-purchase-enterprise-grade-audit-report.md`  
**Interpretation rule:** A passing static or unit test verifies its stated contract; it does not certify the rendered page, legal compliance, security, accessibility, or release readiness.

## 1. Evidence status summary

| Evidence class | Status | Result |
| --- | --- | --- |
| Source and route inspection | **Passed** | Canonical and shadow routes, components, actions, services, permissions, schema, and tests were inspected. |
| Architecture graph inspection | **Passed** | Purchase, AP, component, action, and hook communities were identified in all required graph families. |
| Focused purchase UI tests | **Passed with product caveat** | 7 suites / 18 tests passed. One test explicitly treats the broken overview `notFound()` outcome as expected behavior. |
| Focused service/control tests | **Passed** | 6 suites / 336 tests passed, including purchase service, receipt batch, analytics, purchasing/AP consolidation, AP fraud control, and report-trust export gates. |
| Protected-route redirect | **Passed** | Unauthenticated `/en/dashboard/purchases` returned 307 to login with callback URL. |
| Unauthenticated browser render | **Passed** | Secure workspace login page rendered; screenshot captured. |
| Authenticated purchase browser render | **Blocked** | No authenticated browser session existed; entering local test credentials required user confirmation. |
| Purchase desktop/tablet/mobile visual review | **Blocked** | Depends on authenticated access. No purchase viewport was claimed as verified. |
| Interactive purchase workflows | **Blocked** | No mutations or seed/reset operations were authorized. |
| Accessibility automation/manual keyboard | **Blocked** | Requires authenticated purchase surface and a safe test state. |
| Performance measurement | **Skipped** | No representative 10k purchase dataset or authorization to seed/reset; source review identified confirmed unbounded/duplicate requests. |
| Repository-wide typecheck/build/lint | **Skipped** | Audit-only scope and heavily dirty worktree; focused tests were chosen to avoid conflating unrelated changes. |

## 2. Runtime and screenshot evidence

| Item | Evidence | Status |
| --- | --- | --- |
| Existing local server | Port 3000 already occupied by a responding Stoquify instance; second dev-server attempt returned `EADDRINUSE`. | Existing runtime used |
| Protected boundary | `Invoke-WebRequest http://localhost:3000/en/dashboard/purchases` returned 307 and callback to the same localized route. | Confirmed |
| Login DOM | In-app browser semantic snapshot exposed Email address, Password, Remember me, and Enter workspace controls. | Confirmed |
| Login screenshot | `evidence/unauthenticated-login-boundary-desktop.png`, 1264 × 1254 full page. | Captured |
| Authenticated overview | `/en/dashboard/purchases` after login. | Blocked |
| Authenticated register | `/en/dashboard/purchase-orders`. | Blocked |
| Authenticated detail | `/en/dashboard/purchase-orders/[id]`. | Blocked |
| French render | `/fr/dashboard/purchase-orders`. | Blocked |

The screenshot verifies only the authentication boundary and public first impression. It is not evidence of purchase-page responsiveness or workflow behavior.

## 3. Focused test commands and results

### Purchase routes and register component

```powershell
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath `
  "app/[locale]/(dashboard)/dashboard/purchases/__tests__/page.test.tsx" `
  "app/[locale]/(dashboard)/dashboard/purchases/__tests__/route-audit.test.ts" `
  "app/[locale]/(dashboard)/dashboard/purchase-orders/__tests__/page.test.tsx" `
  "app/[locale]/(dashboard)/dashboard/purchase-orders/__tests__/route-audit.test.ts" `
  "app/[locale]/(dashboard)/dashboard/purchase-orders/new/__tests__/page.test.tsx" `
  "app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/__tests__/page.test.tsx" `
  "components/ui/groups/purchase-orders/__tests__/PurchaseOrderManagement.test.tsx"
```

Result: **PASS — 7 suites, 18 tests, 0 snapshots, 19.555 seconds.**

Important caveat: `purchases/__tests__/page.test.tsx:230-233` names the root route “legacy overview” and expects `NEXT_NOT_FOUND`. This proves code/test agreement, not acceptable product behavior.

### Purchase services and control gates

```powershell
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath `
  "services/purchase-order/__tests__/purchase-order.service.test.ts" `
  "services/purchase-order/__tests__/purchase-order-receive-batch.service.test.ts" `
  "services/purchase-order/__tests__/purchase-order-analytics.service.test.ts" `
  "scripts/__tests__/purchasing-ap-consolidation-gate.test.js" `
  "scripts/__tests__/ap-fraud-control-readiness.test.js" `
  "scripts/__tests__/report-trust-export-gate.test.js"
```

Result: **PASS — 6 suites, 336 tests, 0 snapshots, 139.412 seconds.**

## 4. Dated static/runtime gate evidence

The following read-only evidence files are included under `evidence/` for review. Their assertions are narrower than the purchase UI audit.

| Gate | Dated result | Interpretation |
| --- | --- | --- |
| Purchasing/AP consolidation | **Ready — 11/11, 0 blockers** | Confirms control seams including maker-checker and atomic goods receipt; explicitly not supplier, bank, tax, or statutory certification. |
| Service boundary | **Pass — 0 active violations** | Confirms no active direct Prisma/action-owned mutation violations in the scanned app/action/component/hook runtime boundaries. |
| AP fraud control | **Ready — 9/9, 0 critical gaps** | Confirms supplier bank/payment approval/release boundary checks; adjacent to, not proof of, the purchase UI. |
| Workflow assurance runtime tables | **Ready — 7/7 tables, 3/3 migration rows** | Confirms runtime persistence structures; not proof the purchase page emits complete lifecycle events. |
| Inventory boundary | **Fail — 1 active violation** | `scripts/supplier-po-ack-e2e-fixture.js:195` directly creates an inventory level. It is a test-fixture boundary defect, not evidence that canonical goods receipt bypasses inventory controls. It remains unresolved and must not be hidden. |

Included files:

- `evidence/purchasing-ap-consolidation-readiness.md` and `.json`
- `evidence/service-boundary-readiness.md` and `.json`
- `evidence/ap-fraud-control-readiness.md` and `.json`
- `evidence/workflow-assurance-runtime-readiness.md` and `.json`
- `evidence/inventory-boundary-readiness.md` and `.json`

## 5. Source evidence map

| Concern | Primary evidence |
| --- | --- |
| Broken overview | `purchases/page.tsx:186-214`; test `:230-233`; sidebar `:265`; dashboard links |
| Shadow detail/ghost actions | `purchases/page.tsx:69-93`; `purchases/[id]/page.tsx:67-91` |
| Currency mismatch | register `:130,159,178`; management `:860-863`; organization schema `:248`; analytics service `:1265,1530` |
| Action permission mismatch | route read permission; status-only component actions; server action permissions `purchaseOrderSystemAction.ts:139-230` |
| Receive deep link | management `:777-779`; detail state `:192-196` |
| Invalid Force Complete | detail `:945-975`; transition map service `:67-78` |
| Unbounded/duplicate data | service `:34-61,470-477`; server page `:97-99`; management `:648-661`; unused form-option props |
| Export control | management `:824-852`; server action `:319-322`; service export `:1637-1656` |
| Lifecycle evidence | service transition/cancel `:707-809`; status history `:1611-1634`; detail history `:1620-1658` |
| Archive wording | management `:806`; action `:172-183` |
| Localization | hard-coded strings across management/detail/create; fixed formatters |
| Work-queue gaps | management search/column menu `:520-565`; selection-only count `:568-572`; empty state `:626` |
| Accessibility markup | management `:317-339,750-761` |
| Error/concurrency | legacy detail catch/notFound `:206-214`; ID-only updates in service; no record-version conflict contract found |
| AP navigation permission | sidebar `:278`; purchase payables route access contract |
| Ignored PO number | create form requires/submits `poNumber`; new page server action omits it |

## 6. Architecture evidence map

| Graph | Community/node evidence | Relevance |
| --- | --- | --- |
| `graph_app.json` | Register 143; canonical detail 225; root purchases 46; shadow detail 48; AP workbench/history 145/146 | Confirms multiple independently owned route clusters. |
| `graph_components.json` | Management 58; modern detail 135; AP workbench 25; AP history 7 | Confirms register/detail and AP presentation are separate component communities. |
| `graph_actions.json` | PO system actions 2; goods receipt/summary 68; AP action 26 | Confirms a substantial service/action foundation exists below fragmented pages. |
| `graph_hooks.json` | Recent PO queries/actions 0 | Highlights a central client mutation/query dependency and potential blast radius. |
| `GRAPH_REPORT_actions.md` | PO action community contains 26 nodes | Supports targeted, not wholesale, action-contract remediation. |
| `GRAPH_REPORT_hooks.md` | `usePurchaseOrderActions()` has 11 edges | Permission/error/transition changes require focused hook regression coverage. |

## 7. Required follow-up evidence before implementation can be called complete

1. Obtain explicit authorization to use a safe local authenticated fixture or have the user provide an already authenticated session.
2. Capture overview/register/detail at 1440 × 900, 834 × 1112, and 412 × 915 in EN and FR.
3. Exercise read-only status/action visibility for buyer, approver, receiver, and read-only roles.
4. Use isolated test data to exercise create, submit, approve, partial receipt, receipt, complete, cancel, archive, failure, and concurrency paths.
5. Run keyboard, semantic, contrast, zoom/reflow, reduced-motion, and automated accessibility checks.
6. Establish a representative large-tenant dataset and record query plans, counts, payload, and latency without resetting shared data.
7. Repeat focused tests plus typecheck/lint/build on a controlled implementation branch, separating pre-existing dirty-worktree failures.

## 8. Audit safety record

- No production code, schema, configuration, dependencies, or application data were changed.
- No destructive database operation, migration, reset, reseed, purchase mutation, external message, or export was executed.
- Existing unrelated worktree changes were not reverted or rewritten.
- New files are confined to `docs/purchase-enterprise-grade-audit/`.
- Findings distinguish confirmed source/test evidence from runtime-blocked or inferred behavior.
