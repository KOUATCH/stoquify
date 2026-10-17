# Execution findings and risks

4 October 2026 | Planning baseline: working files at HEAD 62a56036a5ac9b37236a20c9b148052199069479 plus existing local changes

## Findings register

The first six proposals inherit the detailed source anchors and limitations of the [source UI audit](<E:/ohada saas/Focused projects/stoquify/what-next/ui-use-case-gap-audit.md>). Their underlying foundations are partial: item editing and related views, page search, controlled settlement, source delivery histories, audit storage and grant administration already exist. The missing pieces are the specific user workflows described below.

| Case | Assessment | Evidence / limit |
| --- | --- | --- |
| UC01 | No general item overview route; reading facts currently leads toward edit or fragmented views. | Original audit §1 |
| UC02 | Header matches page destinations, not business records. | Original audit §2 |
| UC03 | Required source-register/evidence hashes remain manual inputs. | Original audit §3 |
| UC04 | Source histories exist without a shared discovery worklist. | Original audit §4 |
| UC05 | Audit storage and entity histories lack a general filtered investigation UI. | Original audit §5 |
| UC06 | Denial advice lacks a durable request and decision handoff. | Original audit §6 |
| UC07 | Create form is held in component/form state; existing edit recovery does not cover new-order authoring. | New, current source inspected |
| UC08 | Durable inbox exists but dashboard omits worker processing diagnostics and guarded recovery. | New, current source inspected |


### Additional proposal UC07 — resumable new PO authoring

[Create form](<E:/ohada saas/Focused projects/stoquify/components/purchase-orders/ModernCreatePurchaseOrderForm.tsx:125>) holds steps/lines/form values in component state; [submission](<E:/ohada saas/Focused projects/stoquify/components/purchase-orders/ModernCreatePurchaseOrderForm.tsx:338>) sends the create request without the observed edit-draft recovery contract. The [new-page wrapper](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/new/page.tsx:12>) and [create action](<E:/ohada saas/Focused projects/stoquify/actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:156>) lead to [transactional create service](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/purchase-order.service.ts:525>), which allocates a document number and creates the order. No stable replay-result lookup was found in this inspected path. This is a bounded finding, not proof that every upstream caller lacks duplication controls.

By contrast, [existing edit form](<E:/ohada saas/Focused projects/stoquify/components/purchase-orders/ModernEditPurchaseOrderForm.tsx:102>) restores scoped session drafts, persists pending requests and handles uncertain outcomes. The additional proposal therefore extends recovery to new authoring. Its value is reduced re-entry and safe resolution of a lost response after commit; incidence and financial impact have not been measured. See UX14/UX15 for durable draft, unique request fencing, payload hash, status lookup, migration and browser verification.

### Additional proposal UC08 — alert processing diagnosis and recovery

The [dashboard queue contract](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-reconciliation-dashboard.service.ts:99>), [inbox query](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-reconciliation-dashboard.service.ts:357>) and [mapping](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-reconciliation-dashboard.service.ts:425>) expose business alert information without the worker lifecycle. [DurableNotificationInbox](<E:/ohada saas/Focused projects/stoquify/components/finance/PaymentReconciliationWorkbench.tsx:1467>) renders recorded alerts without processing attempts, retry timing or a recovery command.

The [existing worker projection](<E:/ohada saas/Focused projects/stoquify/services/payments/payment-reconciliation-inbox-worker.service.ts:269>) already holds status, attempts, nextAttemptAt, safe error and a lease token. A separate redacted operator projection is essential. Value comes from shorter diagnosis and recovery of stalled alerts, with no change to financial settlement. UX16/UX17 reuse durable queue truth, protect active leases and route poison/redaction failures to escalation. This is distinct from UC04 outbound communications.

## Risk and dependency register

| Risk | Impact | Required mitigation / owner | Gate |
| --- | --- | --- | --- |
| R-UI01 protected runtime unavailable | Source-correct design may fail real role/task journeys | QA obtains authorized synthetic fixtures and binds runtime to source revision | G0/G3 |
| R-UI02 already-changing working tree / parent overlap | Duplicate or conflicting implementation | Revalidate each package and link parent R work before editing; platform owner | G0 |
| R-UI03 destination permission mismatch | Search shows unusable links or leaks restricted data | D02 and scope before query/count; IAM/domain owner | G1/G2 |
| R-UI04 stale or client-provided proof | Incorrect payroll settlement or close evidence | Transactional server resolution with replay/version/SoD regressions; payroll owner | G2 |
| R-UI05 status conflation | Users mistake approval/acceptance/recording for completion | Separate decision/grant, delivery certainty and worker lifecycle; UX/domain owners | G1/G3 |
| R-UI06 sensitive audit/inbox payload | Employee/customer/lease secret disclosure | Allowlisted DTOs and negative-field assertions; privacy/security | G2 |
| R-UI07 ambiguous new-PO response | Duplicate orders or lost authoring | Durable draft plus atomic request-result fencing and recovery; purchasing/data | G2/G3 |
| R-UI08 unsafe recovery race | Lease theft, repeated poison processing or duplicate side effects | State eligibility, concurrency fence, idempotency and escalation; SRE | G2/G4 |
| R-UI09 orphaned queues | Requests/exceptions accumulate without business value | Named owner, response expectations and support runbook; product/operations | G0/G5 |
| R-UI10 optimistic capacity/ROI | Unrealistic deadlines or unproven value | Re-estimate after contracts; measure task baselines and cohort outcomes; product | G0/G5 |
| R-UI11 destructive rollback or retention ambiguity | Loss of draft/request history or excess personal data | Additive migrations, retention decisions and data-preserving rollback rehearsal; data owner | G2/G4 |


## Implemented, partial, missing, risky, blocked and deferred

**Implemented foundations:** scoped domain services, source histories, PO edit draft helper, durable reconciliation inbox/worker and shared route-state primitives. **Partial user experiences:** all eight cases build on those foundations. **Missing in inspected scope:** the specific destinations, aggregators, selectors, request lifecycle and operator projections listed above. **Risky:** extending visibility without field-level scope; introducing retries without stable request/lease boundaries. **Blocked verification:** authenticated role/mobile/browser and real-database race/migration evidence. **Deferred:** payroll uploads, audit exports, financial audit event families beyond reviewed scope, receipt delivery adapter until recovery contract exists, sensitive search domains and bulk retries. Deferred extensions are not omissions of the eight accepted outcomes.

## Review perspectives

Architecture preserves domain truth and coordinates parent work. Backend and database reviews own atomicity, replay, schema and bounded queries. Security/privacy own role/entity/location scope and field redaction. Frontend/workflow/localization/accessibility own task completion and robust states. QA/release own evidence and negative paths. SRE owns leases, observability and rollback. Product/adoption own demand, metrics and operational ownership. Inventory, purchasing, payroll, reconciliation, communications, audit and accounting-close lenses preserve their existing controls. Statutory/country-pack rule changes are not applicable because this plan changes no calculation or jurisdictional rule; qualified review is required if scope later changes. AI/model governance is not applicable because no model decisions or agent actions are introduced. SaaS packaging remains unchanged, while module entitlement remains enforced. No perspective is represented as an independent certification.
