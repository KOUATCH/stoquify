# AP payment review and execution contract

Owner: purchasing/AP frontend lead; AP domain owner reviews approval and execution evidence. Reviewed: 2026-10-07. Read [MASTER](../MASTER.md) first; page refinements cannot weaken maker-checker, tenant or evidence requirements.

## Scope and references

Payment request, independent review, execution and reconciliation handoff. Inspect [APControlWorkbench](../../../components/purchasing/APControlWorkbench.tsx), [PaymentRequestWorkbench](../../../components/purchasing/PaymentRequestWorkbench.tsx), [PaymentExecutionWorkbench](../../../components/purchasing/PaymentExecutionWorkbench.tsx), [AP actions](../../../actions/purchasing/ap-control.actions.ts) and [payment release service](../../../services/purchasing/payment-release.service.ts).

## Review layout and context

Use a compact command brief, actionable queue, review summary and evidence detail. Keep organization, supplier/payee, currency, amount, relevant invoices, payment terms, current revision, requester/approver and evidence freshness inspectable before a protected action. Redact sensitive details according to existing server permissions. Use semantic warning/danger/success labels plus text; gold/brand emphasis does not imply approval.

Separate draft/requested, reviewed/approved, executing, executed and reconciled states as supplied by the server. Approval alone is not payment execution; execution alone is not reconciliation. Never synthesize readiness from a disabled/enabled button or a stale client preview.

## State and action contract

| State | Required behavior / illustrative copy |
|---|---|
| Missing proof or blocked request | Identify the permitted next action and affected item without leaking restricted evidence |
| Stale preview / changed terms | “Payment details changed. Review the current request”; require current server review |
| Independent approval required | Preserve actor separation and the authorized review path |
| Executing/uncertain outcome | Display actual execution status; use existing recovery rather than a new payment request |
| Executed | Display current execution evidence; expose authorized reconciliation handoff |
| Denied/session expired | Shared recovery state with sensitive detail redacted |

Mutation controls preserve scoped locking, actor binding, fresh authorization, reviewed payload/revision, duplicate-execution protection and retained evidence. Do not reopen blocked legacy payment writers to bypass a review or recovery step.

## Keyboard and review evidence

Keep the review sequence and primary action clear in tab order. Evidence drawers/dialogs require names, reachable close controls and correct focus restoration. Announce asynchronous status without moving focus; display amounts with currency and consistent numeric alignment. Verify long French labels, narrow-screen review and denied/stale/pending/completed states. Inspect [payment release evidence tests](../../../services/purchasing/__tests__/payment-release-evidence.test.ts) and [request workbench tests](../../../components/purchasing/__tests__/PaymentRequestWorkbench.test.tsx). Browser tests and real database concurrency evidence require isolated authorized fixtures; source review alone does not certify payment safety.
