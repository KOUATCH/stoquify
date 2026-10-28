# Stage 02 Security Proof Gate - Cash Payment

Status: PARTIAL
Run: `th-cash-payment-architecture-20260716-023`
Slice: `cash-payment`
Mode: `audit`
Active lanes: `cash`, `payment`

## Verdict

Stage 02 does not pass yet. The current code has important positive controls, but the cash-payment slice is not ready for Stage 04 implementation because mandatory security evidence is incomplete for canonical transaction-history pages, drawers, exports, cursors, and own-versus-manager access.

No product code was edited.

## Permission And Control Matrix

| Surface and entrypoint | Data/service/model | Table permission | Drawer permission | Export permission | Action permission | Module + mode | Fresh-auth rule | Redacted fields | Read audit event | Tenant predicate | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cash drawer dashboard action | `actions/pos/drawer-dashboard.actions.ts:getCashDrawerDashboardAction` -> `services/pos/drawer-dashboard.service.ts:getCashDrawerDashboard` | `finance.cash-drawer.read` or `finance.read` | not separate | none | read only | `observeModuleAccess` with `moduleSlug: pos`, `mode: observe` | none | cashier name/email-derived labels exposed as names | module access audit only when entitlement would block | service scopes by trusted `ctx.orgId`; drawers scoped through location relation | PARTIAL |
| Cashier/POS session page | `app/[locale]/(dashboard)/dashboard/pos/page.tsx` -> POS actions/services | `OPERATE_POS`/`pos.*` action permissions | not a canonical history drawer | none | POS sale/session/refund/void actions use server permissions | mixed; not proven enforced for history | refund/void high-risk permissions exist, freshness not proven here | customer/receipt exposure controlled elsewhere | action audit depends on helper/action | services use trusted organization input passed from action | PARTIAL |
| Payment reconciliation workbench action | `actions/payments/reconciliation-workbench.actions.ts:getPaymentReconciliationWorkbenchAction` -> `services/payments/payment-reconciliation-workbench.service.ts` | `payments.reconciliation.read` | proof drawer subject permission for payment transaction | none | read only | no explicit module gate in action | none | provider references are present in workbench data and must be redacted by role/export context | no specific sensitive read audit proven for workbench read | action derives `ctx.orgId`; service queries `Payment` by organization | PARTIAL |
| Payment reconciliation commands | `actions/payments/reconciliation.actions.ts` -> `services/reconciliation/*` | `payments.reconciliation.read` | proof/certificate actions separate | certificate export permission exists | import/run/match/override/sign/suspense permissions | no explicit module gate proven in action | fresh-auth exists for override and suspense post; certificate export/sign freshness must be verified | raw statement import accepted server-side; no client raw leakage proven | protected actions audit allowed for sensitive commands | services receive `ctx.orgId` | PARTIAL |
| Future cash/payment history export | missing canonical cash-payment history export action | missing | missing | missing | missing | missing | missing | missing | missing | missing | GAP |
| Future signed cursor/page traversal | missing tenant/filter-bound signed cursor for cash-payment canonical history | missing | missing | N/A | missing | N/A | N/A | N/A | N/A | missing | GAP |

## Positive Controls To Preserve

- `services/_shared/protect.ts` supports server-side permission checks, fresh-auth, tenant input checking, and enforced module gates when a module option is supplied.
- `lib/security/rbac.ts` derives `orgId`, `userId`, roles, and permissions from the authenticated session and rejects stale session organization.
- Payment reconciliation sensitive commands use granular permissions such as `payments.reconciliation.import`, `payments.reconciliation.run`, `payments.reconciliation.match`, `payments.reconciliation.override`, and `payments.reconciliation.suspense.post`.
- Some high-risk payment reconciliation actions already request fresh auth, including manual-match approval and suspense posting.
- Proof subject registry includes `payment.transaction` and maps it to `payments.reconciliation.read`.

## Findings

1. `TH02_CASH_MANAGER_SCOPE_GAP` - High: Cash history needs cashier-own-session access distinct from manager/owner cross-cashier access. Current cash drawer dashboard read uses broad finance permissions and exposes cashier names through the dashboard service.
2. `TH02_MODULE_ENFORCEMENT_GAP` - High: Cash drawer dashboard manually calls `observeModuleAccess` in observe mode. The security contract requires enforced module entitlement at the server entrypoint for transaction-history surfaces.
3. `TH02_PAYMENT_WORKBENCH_REDACTION_GAP` - High: Payment workbench rows include provider references and counterparty labels. Stage 04/06 must introduce role-aware redaction and export-context redaction before visible canonical history/export surfaces ship.
4. `TH02_CURSOR_EXPORT_GAP` - High: No cash-payment canonical cursor/export contract exists yet. The next implementation must add signed tenant/filter-bound cursors, stable ordering, export permissions, formula neutralization, row/byte/date limits, and audit events.
5. `TH02_NEGATIVE_TEST_GAP` - High: Mandatory negative tests for missing permission, foreign tenant, module entitlement denial, stale fresh auth, cursor tampering, export abuse, and redaction were not run for the future cash-payment history surfaces because those surfaces do not yet exist.

## Stop Decision

Stage 02 is `PARTIAL`. Do not start Stage 04 for the cash-payment slice yet.

Required remediation before Stage 02 can pass:

- Add/authorize exact implementation allowlist for cash-payment security controls.
- Enforce module entitlement for cash/payment history entrypoints.
- Define own-versus-manager access rules for cashier/session history.
- Add redaction policies for provider references, customer/counterparty labels, and export contexts.
- Add signed cursor and export safety controls for the canonical read model.
- Add focused negative tests for authorization, tenant isolation, module denial, redaction, fresh auth, cursor tampering, and export abuse.

## Commands

- `Get-Content` Stage 02 skill and security-proof contract - PASS.
- `Get-Content services/_shared/protect.ts` - PASS.
- `Get-Content lib/security/rbac.ts` - PASS.
- `Get-Content services/modules/module-entitlement.service.ts` - PASS.
- `Get-Content services/evidence/evidence-contracts.ts` - PASS.
- Targeted route/action/service inspection from Stage 01 - PASS.

No runtime negative tests were executed for the missing canonical history surfaces. That is why this gate remains `PARTIAL`.
