# Stage 01 Architecture Gate - Cash Payment

Status: PASS  
Run: `th-cash-payment-architecture-20260716-023`  
Slice: `cash-payment`  
Mode: `audit`  
Active lanes: `cash`, `payment`  
Report path: `what-next/transaction-history/runs/th-cash-payment-architecture-20260716-023/slices/cash-payment/01-architecture-gate.md`

## Verdict

Stage 01 passes for architecture progression to Stage 02 Security Proof Gate and Stage 03 Accounting Control Gate. This is not a product-completion verdict. It means the current cash and payment surfaces have enough mapped route, action, service, persistence, permission, and test boundaries to let the next gates inspect security and accounting correctness.

No product code was edited.

## Scope And Inputs

- Foundation prerequisite: PASS, from `what-next/transaction-history/runs/th-inventory-history-release-policy-isolated-20260716-021/slices/foundation-inventory/07-release-review.json`.
- Cash lane contract: opening float, cash sales, refunds, cash-in/out, counted cash, variance, reason, approval, lock state, cashier, terminal, drawer, session, shift.
- Payment lane contract: payment, provider event, statement line, match decision, suspense/exception, posting, reconciliation run, certificate.
- Proposal input: `docs/new ideas/STOQUIFY_TRANSACTION_HISTORY_ANALYTICS_AND_SECURITY_PROPOSAL_2026-07-14.md`.

## Worktree State

The repository is already dirty with many unrelated existing changes, including prior transaction-history foundation files, payroll files, module reports, permissions files, and generated evidence. Stage 01 wrote only the new cash-payment run artifacts under `what-next/transaction-history/runs/th-cash-payment-architecture-20260716-023/`.

Product edit allowlist for this stage:

- `what-next/transaction-history/runs/th-cash-payment-architecture-20260716-023/slices/cash-payment/01-architecture-gate.md`
- `what-next/transaction-history/runs/th-cash-payment-architecture-20260716-023/slices/cash-payment/01-architecture-gate.json`

## Dependency Mapping

| surface | route/page | component | hook/action | service owner/function | Prisma model/query | permission/tenant source | audit/evidence source | tests/gates | truth class | status | evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cash drawer dashboard | `app/[locale]/(dashboard)/dashboard/finance/cash-drawer/page.tsx` | `components/pos/CashDrawerManagementDashboard.tsx` | `actions/pos/drawer-dashboard.actions.ts:getCashDrawerDashboardAction` via `useCashDrawerDashboard` | `services/pos/drawer-dashboard.service.ts:getCashDrawerDashboard` | `CashDrawer`, `CashDrawerTransaction`, `POSSession` | `FinanceRouteAccess` with `finance.cash-drawer.read`/`finance.read`; action uses `requireAnyPermission` and trusted `ctx.orgId` | module access observe audit in action | `actions/pos/__tests__/drawer-dashboard.actions.test.ts` | `DERIVED_PARTIAL` | mapped, downstream gaps | route lines 5-11; action lines 15-33; service lines 244-304, 429-557 |
| POS cashier/session operating surface | `app/[locale]/(dashboard)/dashboard/pos/page.tsx` | `components/pos/ProfessionalPOSSystem.tsx` | `actions/pos/session.actions.ts`, `actions/pos/tender.actions.ts`, `actions/pos/cart.actions.ts` | `services/pos/pos.service.ts` | `POSSession`, `CashDrawer`, `CashDrawerTransaction`, `SalesOrder`, `Payment` | page checks `OPERATE_POS`; actions use `requirePermission` with org/user context | POS service and receipt token evidence; no canonical history evidence yet | `services/pos/__tests__/pos.service.test.ts` | `SYSTEM_OF_RECORD` for writes, no canonical history read model yet | mapped, history surface missing | route lines 4-7; service exported functions around lines 630, 696, 792, 1195, 2038 |
| Finance payments surface | `app/[locale]/(dashboard)/dashboard/finance/payments/page.tsx` | `components/finance/FinanceSpecializedLedgerSurfaces.tsx:FinancePaymentsSurface` | N/A - dashboard component surface | Existing finance/dashboard services, not a cash-payment canonical timeline | `Payment` and finance projections | `FinanceRouteAccess` with `financeViewPermissions("payments")` | N/A for canonical cash-payment timeline | finance component tests | `DERIVED_PARTIAL` | mapped, canonical history missing | route lines 10-16; sidebar route line 173 |
| Payment reconciliation workbench | `app/[locale]/(dashboard)/dashboard/finance/reconciliation/page.tsx` | `components/finance/PaymentReconciliationWorkbench.tsx` | `actions/payments/reconciliation-workbench.actions.ts:getPaymentReconciliationWorkbenchAction`; `actions/payments/reconciliation.actions.ts` commands | `services/payments/payment-reconciliation-workbench.service.ts`; `services/reconciliation/*` for durable runs, suspense, certification | `Payment`, `PaymentTransaction`, `ReconciliationRun`, `PaymentException`, `PaymentReconciliationInboxItem` | `FinanceRouteAccess` with `payments.reconciliation.read`; protected actions derive `ctx.orgId` and `ctx.userId` | proof drawer for payment transaction subjects; reconciliation certificate services | `components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx`, `actions/payments/__tests__/reconciliation.actions.test.ts`, `services/payments/__tests__/payment-reconciliation-workbench.service.test.ts`, `services/reconciliation/__tests__/*` | `DERIVED_PARTIAL` for capture workbench; `DURABLE_EVIDENCE` for signed reconciliation runs | mapped, certification/history distinction required downstream | route lines 5-11; workbench action lines 1-22; service lines 147-148, 403-442, 539-540; dashboard service lines 271-350 |

## Verified Findings

1. `CASH_HISTORY_NEEDS_STABLE_PAGINATION`: The current cash drawer dashboard caps sessions at 120, cash drawer transactions at 250, and journal rows at 80. This is useful operational visibility but not yet a canonical stable transaction-history timeline.
2. `CASH_ACCESS_MANAGER_SCOPE_REQUIRED`: Current cash drawer reads are finance-level. Stage 02 must distinguish cashier own-session access from manager/owner cross-cashier access before Stage 06 exposes cashier history pages.
3. `PAYMENT_CAPTURE_IS_NOT_CERTIFIED_RECONCILIATION`: The payment workbench explicitly declares `source.mode: PAYMENT_CAPTURE_READ_MODEL`, `persistentRunsAvailable: false`, and `providerStatementPersistenceAvailable: false`. Stage 05/06 must visually separate capture readiness from certified reconciliation truth.
4. `PAYMENT_DURABLE_EVIDENCE_EXISTS_BUT_IS_SPLIT`: Durable reconciliation run, suspense, exception, certificate, provider event, and statement line data exists in reconciliation/payment services, but Stage 04 needs a unified history read model with stable pagination and redaction.
5. `NO_VISIBLE_CASH_PAYMENT_HISTORY_PAGE_YET`: Existing surfaces are dashboards/workbenches. The target product needs visible cashier/session/payment/cash history pages built after Stages 02-05 pass.

## Architecture Gate Decision

PASS for Stage 01.

Reasons:

- Routes are thin and perform access delegation.
- Cash and payment lanes have identifiable service owners.
- Prisma persistence models exist for sessions, drawers, drawer transactions, payments, payment transactions, reconciliation runs, exceptions, and inbox items.
- Known gaps are downstream implementation/control gaps, not Stage 01 ownership blockers.

## Next Eligibility

Eligible now:

- Stage 02 Security Proof Gate for `cash` and `payment`.
- Stage 03 Accounting Control Gate for `cash` and `payment`.

Not eligible yet:

- Stage 04 read-model implementation, until both Stage 02 and Stage 03 pass.
- Stage 05 UX contract, until Stage 04 passes.
- Stage 06 frontend delivery, until Stage 04 and Stage 05 pass.
- Stage 07 release review, until Stages 02-06 pass.

## Proposed Stage 02 Focus

- Cashier own-session versus manager/owner cross-session access.
- `finance.cash-drawer.read`, `finance.read`, `payments.reconciliation.read`, and elevated reconciliation permissions.
- Provider references and raw payload redaction.
- Proof drawer subject permissions and export context.
- Fresh-auth and segregation for manual matches, suspense posting, reconciliation signing, and certificate export.

## Proposed Stage 03 Focus

- Cash expected versus counted math.
- Electronic tender exclusion from physical cash expectation.
- Refund, void, payout, and cash-in/out direction semantics.
- Session close, lock, variance, approval threshold, and close blocker rules.
- Suspense, posting, period, source-link, and reconciliation certificate invariants.

## Commands

- `git status --short` - PASS, captured large dirty worktree.
- `git rev-parse HEAD` - PASS, `8a406e93b0e798ed6f476ca5d81df37a2aaa38be`.
- `Get-Content package.json` - PASS.
- `Get-Content AGENTS.md` - PASS.
- `rg`/`Select-String` mapping commands over POS, finance, payments, reconciliation, Prisma, and permissions - PASS except one broad route `rg` timed out and was replaced with targeted `Select-String`.

## Residual Risk

The current Stage 01 audit used direct code inspection and targeted search, not a full graph refresh. Because the worktree is very dirty, later product stages must use exact allowlists and dirty-overlap checks before editing any product file.
