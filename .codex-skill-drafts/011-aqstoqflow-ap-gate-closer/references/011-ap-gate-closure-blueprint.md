# 011 AP Gate Closure Blueprint

## Current State

The backend AP kernel exists. It added tenant-scoped AP models, service functions, business-event evidence, notification outbox messages, audit logs, supplier subledger updates, duplicate invoice checks, receipt quantity checks, bank maker-checker, and explicit ledger blockers.

The remaining 011 blockers are:

- server actions and RBAC/fresh-auth wrappers
- AP workbench UI and state handling
- balanced SYSCOHADA AP posting recipes
- outbound supplier payment reconciliation integration
- tests covering action, UI, ledger, and reconciliation gates

## Recommended Option

Use Option 2: vertical gate closure in four thin slices.

Reason: it is the safest path to enterprise quality because each slice closes a real gate and leaves the system releasable or visibly blocked.

## Three Viable Options

### Option 1: Backend-First Hardening

Finish all accounting and reconciliation backend integration before UI.

Advantages:

- strongest ledger correctness early
- fewer UI rewrites
- best for audit-heavy teams

Tradeoffs:

- product stakeholders cannot inspect the AP workflow quickly
- can stall on chart-of-account and country-pack questions
- RBAC/UI gates remain open longer

Use only if accounting posting recipes are the highest risk.

### Option 2: Vertical Gate Closure

Close AP in four thin vertical slices:

1. server actions and RBAC
2. AP workbench UI
3. balanced AP posting recipes
4. outbound reconciliation integration

Advantages:

- smallest blast radius
- visible progress after each slice
- easy to test and stop safely
- best match for the suite gate model

Tradeoffs:

- requires discipline not to drift into unrelated purchasing redesign
- ledger blockers remain until slice 3

Default to this option.

### Option 3: Full 011 Feature Freeze

Freeze all other suite work and complete every 011 surface in one large integrated push.

Advantages:

- one comprehensive acceptance pass
- fewer intermediate partial states

Tradeoffs:

- largest merge and regression risk
- harder to isolate failures
- slower feedback loop

Use only if a dedicated team owns the whole 011 boundary during the same sprint.

## Implementation Architecture

### Action Layer

Canonical files:

- `actions/purchasing/ap-control.actions.ts`
- action tests under `actions/purchasing/__tests__`

Action contract:

```ts
type ActionResult<T> =
  | { ok: true; data: T; notification?: SafeNotification }
  | { ok: false; error: SafeActionError; notification?: SafeNotification }
```

Action responsibilities:

- authenticate user
- derive tenant from session
- enforce module gate
- enforce permission
- enforce fresh auth for sensitive actions
- call AP service
- map domain errors to safe action errors
- emit safe notifications
- revalidate affected dashboard paths when needed

The action layer must never:

- trust client-supplied `organizationId`
- recompute AP totals
- mutate Prisma directly for finalized AP facts
- swallow service errors as success

### Permission Model

Recommended permission names:

- `purchasing.ap.invoice.post`
- `purchasing.ap.invoice.view`
- `purchasing.ap.match.review`
- `purchasing.supplier.bank.request`
- `purchasing.supplier.bank.approve`
- `purchasing.ap.payment.request`
- `purchasing.ap.payment.approve`
- `purchasing.ap.payment.release`
- `accounting.ap.posting.review`
- `payments.outbound.reconcile`

Sensitive actions:

- supplier bank approval
- supplier payment approval
- supplier payment release
- overriding a match exception

### UI Workbench

Canonical files:

- `components/purchasing/APControlWorkbench.tsx`
- `components/purchasing/SupplierInvoicePostingPanel.tsx`
- `components/purchasing/ThreeWayMatchQueue.tsx`
- `components/purchasing/SupplierBankChangeQueue.tsx`
- `components/purchasing/SupplierPaymentReleaseQueue.tsx`
- `app/[locale]/(dashboard)/dashboard/purchases/payables/page.tsx`

UI principles:

- operational, dense, scan-friendly
- no marketing hero
- no nested cards
- no direct Prisma imports
- server-derived totals only
- show blocker counts and source links
- make unsafe actions impossible when permissions, fresh auth, bank approval, or ledger readiness is missing

Required tabs:

- Invoices
- Match Exceptions
- Bank Changes
- Payments
- Blockers

### Ledger Posting

Supplier invoice recipe:

- Debit purchase or inventory clearing
- Debit input VAT where country pack allows
- Credit supplier AP liability

Supplier payment recipe:

- Debit supplier AP liability
- Credit bank/mobile/cash clearing
- Optional debit fees or withholding only through country-pack controlled rules

Ledger completion criteria:

- every posted AP event has a posted batch or explicit failed blocker
- every posted batch has a balanced journal entry
- every journal has source link and audit event
- period close sees unresolved AP blockers
- tests prove unbalanced or missing mapping fails closed

### Reconciliation

Supplier payment release must create or enqueue outbound evidence tied to:

- `SupplierPayment.id`
- payment method
- provider/bank/mobile reference when available
- source accounting batch
- source business event

Acceptable final states:

- reconciled match record exists
- suspense item exists and blocks close
- explicit reconciliation blocker exists

Unacceptable final state:

- payment marked final with no reconciliation evidence and no visible blocker

## Verification Checklist

Run, adjusted to the actual repo scripts:

```powershell
npm run prisma:validate
npm run prisma:generate
npm test -- services/purchasing --runInBand
npm test -- actions/purchasing --runInBand
npm test -- services/accounting --runInBand
npm test -- services/reconciliation --runInBand
npm run typecheck
npm run inventory:boundary:fail
```

Minimum new test cases:

- AP action rejects cross-tenant attempts
- AP action rejects missing permission
- AP action rejects stale auth on bank/payment approvals
- AP action rejects maker-checker violation
- AP action returns safe typed duplicate invoice error
- AP workbench renders empty, loading, permission denied, degraded ledger, and retry states
- supplier invoice posting creates balanced AP journal when rules exist
- supplier invoice posting creates explicit blocker when rules are missing
- supplier payment release creates outbound reconciliation evidence or blocker

## Advancement Rule

Advance to `012-aqstoqflow-payroll-presence-engine` only when:

- action/RBAC gate passes
- UI gate passes
- ledger gate passes or explicit blockers remain by design and are visible in close controls
- reconciliation gate passes
- verification gates pass
- release report says 011 is complete enough to advance
