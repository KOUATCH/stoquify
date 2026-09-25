# v98 correction design and review responsibilities

Current source, 9 September 2026. Graph discovery previously located `finance_paymentreconciliationworkbench_tsx`; the integration is verified against `PaymentReconciliationWorkbench`, `PaymentSuspenseQueue`, the protected reconciliation actions and current source services. Historical graphs are discovery aids, not evidence that the new path is operational.

## Interaction and token mapping

The correction panel lives inside the existing authenticated reconciliation queue. It reuses its organization/actor context and permission snapshot. A second zero-stale-time permissions observer caused a demonstrated refetch/unmount loop and was removed from the new child; authorization remains enforced by each server action.

Existing `Button`, `Input` and `Textarea` primitives and inherited dashboard surfaces are reused. `--dash-surface`, `--dash-border-subtle` and soft text preserve the shell. Gold marks a proposal/review consequence, brand marks keyboard focus, and danger marks failed/denied outcomes. A selected or proposed correction is never displayed as an approved reversal. Confirmation text names the reversal and reopening; history labels distinguish proposal, rejection and approval.

The panel is an inline named region, not a modal. It receives focus on entry; Escape closes it and returns focus after the originating button becomes enabled. No focus trap is appropriate for this region. Mobile action labels wrap instead of overflowing; exact source amounts remain decimal strings in previews. Labels are separate from textarea contents so restored text cannot change their accessible names.

Unsubmitted drafts and exact submitted requests persist only in actor/organization/item-scoped session storage. Passwords and server authority never enter this record. Storage failure prevents submission; a successful mutation followed by a failed refresh is not presented as current-state proof. Returned action scope must match the current panel before data is displayed.

## Engineering review matrix

| Responsibility | Finding, implementation or limit |
| --- | --- |
| Platform architecture | Dedicated source service owns compensation and lifecycle. Existing shell, ledger, audit and close invalidation are reused. |
| Backend/API/distributed behavior | Strict public schemas; server identity; serialized item writes; stale revision checks; immutable request/decision identities; retained response recovery. No provider call is introduced. |
| Database/integrity/migrations | Exact compensating journal and source changes commit together. Existing v97 cycle migration is a prerequisite; later cycles require verified earlier compensation. No new v98 migration or production apply. |
| Security/IAM/privacy | Current tenant/module/operation permissions, active actor, independent reviewer and verified fresh authentication. Browser draft scope is not authority. Private certificate details remain in service-owned receipts, not history summaries. |
| Frontend/design system | Existing primitives and dashboard tokens; no duplicate shell/theme. Browser testing found and corrected the permission observer loop and restored-label defect. |
| UX/accessibility/localization | EN/FR intent, consequence, denial, stale, auth, retry and history text. Keyboard entry/return, mobile reflow and restored drafts need actual browser evidence; no full accessibility certification. |
| Product/workflow | Removes the dead end after an incorrect posting while retaining independent review and the obligation. Reopening does not mean settlement. |
| Finance/accounting/reconciliation | Original and exact counter-journal retain source/cycle linkage, original approval and trial-balance effect. New posting gets a new approval. Open-period restrictions remain. |
| Statutory/country rules | Existing accounting/date controls retained; no new statutory mapping or expert certification. Fixture posting rules and certificate states are explicitly synthetic. |
| Audit/records | Append-only correction receipts with original proposal/approval hashes; prior certificate preserved when current sign-off is invalidated. Export/retention policy completeness remains open. |
| Quality/release | Focused contract/action/UI checks, real owned PostgreSQL effects, failed attempts preserved, current-source EN/FR verification required. No platform or production release pass. |
| SRE/operations/performance/cost | No new worker/provider dependency. Notification receipts use existing delivery infrastructure. Cold development route timings are observations, not approved performance budgets. The earlier alert cutover hold remains. |
| Packaging/module access | Reuse payment-reconciliation read/write gates and existing operation permissions. No prices, entitlement grant, live tenant activation or billing provider change. |
| Analytics/data governance | Current state is distinct from historical decision outcomes. Correction invalidates affected evidence; full aggregate/report consumption remains in the broader register. |
| Integrations/events/rollout/support | Existing transactional close events and correction notifications; isolated local verification and forward recovery instructions. No external messages sent by this assignment. |
| POS/offline | Not applicable to this batch: no POS replay or offline contract changes. |
| Purchasing/AP | Not applicable to behavior changes: AP is only a synthetic fixture setup dependency. |
| HRIS/payroll | Not applicable: no payroll source, calculation or employee record changes. |
| AI/agents/fraud | No autonomous approval or agent tool added. Independent authority and immutable financial lineage address this correction boundary; no platform-wide fraud/security certification. |

## Tradeoffs and remaining boundaries

Cycle history verification adds reads proportional to earlier corrections. It deliberately fails closed on incomplete financial lineage; no optimization or performance certification is inferred without measurement. Correction may require a different reviewer than the original journal approver. This preserves both existing separation-of-duties policies.

Full resolution/write-off, controlled exports, pre-existing inconsistent data reconciliation, broader journal localization/precision, production rollout and all remaining workflow families stay open. The correction service rejects a voided run instead of silently undoing its lifecycle. Genuine organizational accounting-date choices and role assignment remain with authorized people; engineering defects are not relabeled as missing approvals.
