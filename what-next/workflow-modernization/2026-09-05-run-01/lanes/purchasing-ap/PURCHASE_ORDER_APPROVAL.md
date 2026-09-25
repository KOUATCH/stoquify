# Purchase-order approval and recovery

Evidence date: 2026-09-07 UTC. This is a bounded implementation of PA-004 within the continuing platform workflow review. The final checkpoint receipt records source bindings and verification results. Existing design reports and prior receipts remain historical records.

## What changed

The isolated baseline reproduced approval after permission removal, session revocation, a changed reviewed line and expired password assurance. It also reproduced an exact retry failing to recover an already completed approval. The list confirmation previously closed before the result arrived.

Both the purchase register and order detail now open the same server-backed approval review. The service checks the current tenant, usable account, read/approve permissions, purchasing eligibility and actual live session. The submitted order must have lines and a known requester different from the approver. A hash covers the order, lines, requester and approval fields. Approval compares that revision while holding the order lock. An order changed since review must be reviewed again.

The approval, audit and applied business event commit together. A request reference binds the tenant, order, approver and reviewed revision. An exact retry returns the original receipt without repeating effects. Altered commands cannot reuse it. Current authority is checked during recovery, including after a later cancellation or archive. Recovering an existing approval does not require another password ceremony; a new approval requires password assurance from the same tenant within five minutes.

The register's outer memo wrapper caused its client mount to be replaced after a returned server response in the verified development runtime. Removing that wrapper preserved the same mount and open review in both languages; parent components already remained stable. No global provider, authentication or loading-boundary change was needed. Failed diagnostic hypotheses are retained in the attempts record.

## Approver instructions and inputs

Open `/{locale}/dashboard/purchase-orders`, choose the order's menu and **Review approval**. The same action is available at `/{locale}/dashboard/purchase-orders/{id}`. French labels are provided in the application.

| Information or action | Who supplies it | Where to obtain it |
| --- | --- | --- |
| Submitted purchase order | Buyer/requester | Existing purchase register; complete the draft and submit through the existing workflow. |
| Supplier, receiving location, quantities, prices, delivery date and terms | Buyer, reviewed by approver | Supplier quotation/contract and organization item/location records; inspect the displayed current order and supporting business records. |
| Identity of the requester | Application record | The order's creator. A missing requester requires the responsible buyer/administrator to investigate the source record; do not invent one to pass approval. |
| Approval authority | Organization administrator | Current role assignments granting both purchase-order read and approval permissions; use a different person from the requester. |
| Purchasing eligibility | Organization administrator | Current module configuration/grants. Read-only, expired, suspended or absent managed grants cannot authorize approval. |
| Current password, when requested | Approver | Your own existing sign-in credential. Enter it only in the verification field; it is never saved in the browser recovery record or approval evidence. |
| Reviewed version and request reference | Application | Generated automatically. Users do not type a revision, session token or invented approval identifier. |
| Approval reference and time | Application after confirmation | The receipt displayed after the transaction has committed. Keep the reference with the order number when requesting support. |

Read the displayed order, then select **Approve reviewed order**. A selected button or loading message is not an approval. Wait for **Approval recorded** and its reference. Close the dialog to refresh the current order/register.

If the order changed, use **Review current order** and consider the new version before approving. If access is denied, ask the organization administrator to check your current account, session, role and purchasing eligibility. The application cannot supply organizational authority on your behalf.

If the response is uncertain, choose **Recover previous approval**. The exact request is kept in session storage under your organization and account. Refreshing the same browser tab reopens recovery, including when the order has already progressed. Resolve that pending request before approving a different order. Closing a browser tab, clearing site data or changing browsers can remove this local reference; use authorized support and the retained order/audit records in that case. Do not manually toggle status to simulate recovery.

## Operator procedure

Use authorized tenant-scoped audit access to correlate `APPROVE_PURCHASE_ORDER` with `purchase_order.approved`. The INTERNAL event key starts `purchase-order-approval:`. The audit retains the reviewed order snapshot and links the event. The event holds the original receipt and command hash; its operational source has no invented accounting source type and it creates no posting outbox messages.

For an incident, collect the organization, order number/ID, displayed request reference, approximate UTC time, observed error and whether the browser still offers exact recovery. Obtain these from the affected user's order/receipt and authorized application logs. Never collect their password or session token. Verify the event is applied and the audit/order effects agree before advising recovery. Preserve evidence if verification fails; do not rewrite event hashes or fabricate receipts.

## Rollout and recovery

No migration, seed or production deployment is part of this change. Release the approval service, action, contracts, hook and both interface entry points together after the normal staging and release checks. Older clients without the reviewed revision and request reference fail safely and must reload. Recheck real staging role configurations and any submitted orders lacking a requester before rollout.

Monitor stale-review denials, current-authority denials, failed password assurance, evidence-write failures, receipt conflicts and request duration using private operational records. Development timings are observations, not production performance certification. Retain all approved order, audit and event records when rolling back application code. Returning to older approval code reintroduces the reproduced authority/retry defects and needs an explicit operational decision; prefer a forward repair.

## Review responsibilities

| Responsibility | Bounded review |
| --- | --- |
| Architecture/backend/API/distributed systems | Existing domain service and actions remain authoritative; locked revision comparison and durable command recovery cover both production approval entry points. Bulk approval remains forbidden. |
| Database/integrity/migration | Audit/event/order atomicity, concurrency and exact replay tested in owned PostgreSQL fixtures. No new schema. |
| Security/IAM/privacy/fraud | Server identity, current grants/roles/session, independent approver, fresh password assurance and credential-free retained evidence. No security certification. |
| Frontend/design system | Existing shell and Radix dialog/buttons/forms; dashboard tokens on the portal. Review uses brand/neutral treatment, denial uses attention text, and success appears only after a verified receipt. |
| Workflow/accessibility/localization | Shared EN/FR review, reload recovery, focus return and responsive/reflow checks. Native assistive-technology and native browser zoom assurance remain open. |
| Product/business operations | The approver reviews the actual order once and recovers an uncertain decision without duplicating it. Current requester/authority prerequisites are explained. |
| Finance/reconciliation/ledger/close | Approval does not itself receive goods, pay a supplier or post an invoice. Existing financial services remain unchanged; connected financial lifecycle verification is still required. |
| OHADA/statutory/country packs | No statutory calculation, submission or expert approval changes. Local commercial approval authority must come from the organization; no statutory certification is asserted. |
| Audit/records/data governance | Immutable operational event plus linked audit and original receipt; historical retention/export and broader operator interfaces remain separate unfinished work. |
| Quality/release | Focused service/action/hook/UI and isolated runtime evidence; record failures and exact source bindings. No full release certification. |
| SRE/DevSecOps/performance/cost | Bounded transaction timeout, actionable uncertain outcomes and scoped diagnostic references. Record development route timings; no production SLA claim. |
| SaaS packaging/customer success | Purchasing eligibility remains enforced. No prices, subscription terms or commercial activation changes; recovery guidance reduces support ambiguity. |
| POS/offline | Not applicable to code changes: no POS or offline event processing modified. Browser session recovery is not offline approval. |
| HRIS/payroll | Not applicable: no employee, salary, payroll or declaration behavior changed. |
| Payments/providers/integrations | No external approval provider, message or payment introduced. Internal event metadata is retained without pretending a provider acknowledged anything. |
| Analytics/AI/agents | Not applicable to behavior changes: no model or analytics authority is introduced. Agents do not acquire permission to approve through this implementation. |
| Rollout/support | Coordinated application release, retained evidence and exact recovery; no live rollout performed. |

## Remaining required work

Continue ordinary submission, cancellation, completion and archive authority/command recovery, approval-history traversal and retained obligations. Then address approved-order amendments, fractional supplier quantities versus integer order/receiving inputs, inspection and AP handoffs. Continue every other workflow and unreconciled entry source in the platform register. PA-004 and the platform remain incomplete while broader history, native accessibility, release and connected lifecycle work is open.

Applied skill: `011-aqstoqflow-purchasing-ap-controls`. The checkpoint receipt lists changed files, verified and open gates and exact results. The suite's next numbered recommendation is `012-aqstoqflow-payroll-presence-engine`; it does not replace the remaining purchasing work or the full platform objective.

## Verified checkpoint: source v52

The final checks passed: 115 tests in ten suites, typecheck, changed-file lint without warnings, ten real PostgreSQL groups and both full EN/FR browser journeys. The 24 screenshots cover desktop/tablet/mobile, 200% CSS text reflow, stale review, actual approval, revoked-authority denial, lost response, reload and exact recovery. Original payment, journal and non-fixture role records remained unchanged.

[Source-bound receipt](../../evidence/purchase-approval-receipt.json) · [Retained attempts](../../evidence/purchase-approval-attempts.md) · [Final validation](../../evidence/purchase-approval-final-validation.json).

These checks verify the supported approval slice in the owned local application. They do not establish native assistive-technology conformance, a production performance budget, full purchase-to-pay completion or release approval. The existing register still formats a missing delivery date as January 1970 and retains other English labels in French views; those broader register corrections remain open. The new approval review correctly shows an unspecified delivery date.
