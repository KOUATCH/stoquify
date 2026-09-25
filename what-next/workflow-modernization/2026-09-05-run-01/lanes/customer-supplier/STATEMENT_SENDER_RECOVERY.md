# Customer statement sender recovery

This is a bounded correction within the active platform workflow review. The statement source lifecycle, retained sender history and delivery worker remain separately incomplete. Final verification passed: 36 focused tests, six real PostgreSQL checks, both EN/FR browser journeys, typecheck and changed-file lint. The published receipt binds the final source, outcomes and limitations.

## Correction and business effect

An interrupted response previously caused the sender screen to create a new request key, correlation reference and consent timestamp on every retry. That could create another statement or delivery even though the original had committed. The screen now retains one exact command before submission, prevents overlapping submissions and freezes its reviewed fields until its outcome is confirmed. Reloading the tab restores request details; only the guarded server action establishes the result.

The existing services own organization scope, current authority, statement sources, immutable evidence, delivery tokens and atomic outbox writes. No provider is invoked by queue submission. An accepted queue request does not establish delivery, recipient access, payment or approval.

Local recovery is scoped to the organization, signed-in actor and customer. It retains the recipient and command metadata in this tab's session storage. It does not store a password, raw statement-access token or cached business result. Closing the tab, clearing storage or unreadable metadata still requires a controlled history/recovery facility; that engineering gap is not an external approval requirement.

## What users need and where to find it

| Situation | What to do | Required information and source |
| --- | --- | --- |
| Open a statement | Open `/en/dashboard/customers/<customer-id>/statement` or the French equivalent through the customer record. | Customer record from the existing customer list; current organization; `customers.read`, `accounting.exports.create` and eligible Accounting export access. The workspace administrator manages authority. |
| Generate a statement | Choose the reporting period, review the organization currency and confirm your own current password. | Dates from the business request; currency from organization settings. Never provide your password to an operator or put it in an approval document. |
| Queue delivery | Choose the channel and recipient, confirm consent for this exact statement, review allowed recipient actions and authenticate. | Recipient contact from the customer or their authorized request; explicit consent from the customer. A checked box records the operator's attestation, not independent signature verification. |
| Response interrupted | Use **Retry existing statement request** or **Retry existing delivery request**. After reload, confirm the existing statement first, then retry its delivery. | The tab retains the original command, consent time and recipient. Re-enter your current password. No new approval or reference needs to be invented. |
| Correct a known rejected input | Correct the editable input after a definitive first-attempt validation rejection. | The error and actual customer contact or requested period. An uncertain outcome remains locked for exact replay. |
| Request another delivery | Wait for confirmation of the current request, choose **Prepare another delivery**, review details and explicitly confirm consent again. | The new intended channel/contact/consent. This is a separate request that may create another delivery. |
| Storage cannot save | Check browser session-storage restrictions and retry after resolving them. The first request is not submitted when its recovery command cannot be saved. | Browser settings, with local support if needed. Do not clear uncertain metadata to force a new request. |
| Tab closed or recovery unreadable | Ask an authorized operator to inspect the customer's statement, delivery, token and outbox records before another request. | Organization, customer, approximate time, period and destination supplied by the operator. Retain only necessary details; do not expose token envelopes or credentials. A complete in-app history/recovery action remains required engineering work. |
| Delivery remains queued or fails | Inspect the delivery worker and actual provider evidence using the authorized operational process. | Delivery/outbox references from the controlled records. A sender retry only confirms/reuses the same queue request; it does not restart or certify provider delivery. |

## Rollout and recovery

There is no schema migration or provider activation in this correction. Deploy only through the existing authorized release process after remaining verification. Preserve the exact-command retry behavior during recovery; reverting to a fresh request on every click reintroduces duplicate risk. Keep local recovery metadata until the recorded outcome has been resolved. Do not reset customer records, financial data or idempotency history.

Verification uses an owned local application and synthetic PostgreSQL database with external network delivery disabled. Temporary permission grants are restored and created sessions removed. Empty-customer checks establish snapshot/queue behavior for actual empty sources, not populated ledger correctness. Financial and role hashes are compared before and after.

## Engineering review responsibilities

| Responsibility | Assessment and remaining limit |
| --- | --- |
| Enterprise/platform architecture | Existing route, shell, scoped actions and domain services reused. Tab recovery supplements server truth; durable sender history remains open. |
| Backend/API/distributed systems | Exact command replay uses the existing server payload hash and unique idempotency scope. Concurrent and lost-response database checks are required; provider processing is separate. |
| Database/data integrity/migration | Snapshot, delivery, token, attribution, event and audit effects remain service-owned. No schema change. Audit/encryption failures must leave no partial queue effects. |
| Security/IAM/privacy/fraud | Current permissions, tenant/object scope and fresh authentication retained. Recipient metadata stays in tab storage; no password or access token is persisted there. Tab-close recovery and complete privacy review remain open. |
| Frontend/design system | Dashboard tokens and inherited navigation reused. Reviewed fields distinguish pending requests from confirmed results. No duplicate shell. |
| Workflow/accessibility/localization/content | EN/FR recovery, explicit new-request actions and accessible labeling are in scope. Actual browser/reflow checks required; native assistive technology and native zoom remain unverified. |
| Product/business process | Reduces repeated entry and duplicate queue risk. Explicit consent is preserved through retry and required for a separate new delivery. No new approval system is invented. |
| Finance/accounting/reconciliation/internal controls | Existing immutable receivable snapshot retained. Queue success is not payment, reconciliation or delivered proof. Populated financial source calculation and period invariants remain separate verification. |
| OHADA/SYSCOHADA/country rules | Not applicable to this correction: no statutory calculation, country setup, retention rule or expert sign-off changes. |
| Audit/records/data governance/analytics | Existing durable identifiers/evidence remain authoritative. Client metadata is retry input, not authenticated approval or outcome evidence. Sender history still needs completion. |
| Quality/release assurance | Focused unit, real database and EN/FR browser evidence must bind final source. Failed attempts retained; no platform completion or release certification. |
| SRE/DevSecOps/observability/performance/cost | Local route timing is a development observation. Provider keys and network fences are test-only. No production capacity/performance claim. |
| Integrations/events/provider boundaries | Existing outbox queue reused; no email or WhatsApp sent by verification. Worker outcome, lease, dead-letter and unknown-provider recovery remain open. |
| POS/offline/inventory/purchasing/AP/HRIS/payroll | Not applicable to this bounded patch: no domain records or replay contracts changed. Their workflow reviews continue. |
| AI/agents/human approval governance | Not applicable: no AI execution, signer authority, professional certification or X1 clearance changed. |
| SaaS packaging/billing/growth/customer success | Existing entitlement and referral references preserved. No pricing, subscription, provider purchase or commercial activation. |
| Operations/rollout/support | Explains inputs, ownership, safe retries and limitations. Missing in-app history remains an engineering action, not a request for fabricated approval. |


## Published evidence

Final source-bound verification: [statement-recovery-receipt.json](../../evidence/statement-recovery-receipt.json). Final browser: `lanes/environment/statement-recovery-browser-20159ffb-e8f.json`; six PostgreSQL checks, 36 tests/five suites and 28 actual screenshots. Tool results are retained in the receipt. The limitations above remain active.
