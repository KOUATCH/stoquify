# Applying an accepted supplier change

This checkpoint connects a buyer-accepted supplier proposal to the authoritative purchase order. It is part of the ongoing platform workflow assignment. See [verification evidence](../../evidence/purchase-amendment-receipt.json) for the exact tested source and limitations; an unfinished or absent receipt is not a passing result.

## Process and responsibilities

1. The supplier proposes a delivery-date or quantity change against the shared order snapshot.
2. An authorized buyer reviews the proposal and records acceptance with the actual business reason. The purchase order remains unchanged at this stage.
3. A different authorized approver opens **Review order amendment / Vérifier la modification de commande** from that accepted proposal.
4. The application compares the supplier snapshot, accepted proposal, current order and received/invoiced obligations. The review displays the delivery date, quantities and amounts before and after amendment.
5. The approver verifies their current password when requested and confirms the exact reviewed revision. The order, retained before/after evidence and approval receipt commit together.
6. The current order becomes the basis for further receiving. The workbench shows the recorded amendment to users with current read access. Supplier notification, stock posting, invoices, returns and accounting remain separate controlled workflows.

The approver must differ from both the order requester and the buyer who accepted the change. Buyer acceptance is the amendment's initiating decision, not permission to bypass independent approval. The original proposal and its history remain immutable; amendments keep existing order-line identities and received records.

## Where to open it

- English: `/en/dashboard/purchase-orders/{order-id}/supplier-acknowledgement`
- French: `/fr/dashboard/purchase-orders/{order-id}/supplier-acknowledgement`
- After approval: `/{locale}/dashboard/purchase-orders/{order-id}` for the current order and receiving entry point.

## Required information and its source

| Situation | Information or action | Owner and source |
|---|---|---|
| Supplier requests a change | Proposed quantity and/or delivery date, with explanation | Supplier's existing private order-response link and actual supply commitment |
| Buyer accepts proposed terms | Actual reason for accepting the supplier change | Authorized buyer, purchasing requirement and supplier correspondence |
| Amendment needs approval | An independent person with current order read/approval permission | Organization role administrator; the existing role and permission records |
| Review shows a change | Compare current and proposed quantities, date and totals | Application-owned order, supplier proposal and accepted decision; do not enter a substitute revision hash |
| Password confirmation | The approver's current account password | Their existing account; never send it to support or paste it into evidence |
| Open receipt or held inspection | Resolve receiving/inspection first | Receiving operator and the actual receipt/inspection records |
| Reduction falls below obligations | Preserve received/invoiced goods; use the applicable return/correction procedure | Receiving and AP operators, retained receipts and invoices |
| Contract changed | Obtain and review a proposal for the current order terms | Buyer and supplier; the earlier snapshot is not silently rewritten |
| Uncertain response | Recover the same pending request before starting another | The original browser tab's recovery reference, scoped to the current organization, person and order; the durable decision record remains authoritative |
| Support request | Order ID/number, proposal ID, decision reference, approximate time/timezone and displayed problem | Current order/workbench/review; support correlates scoped event and audit records |

The application issues revision and request references. They are integrity and correlation values, not human signature certificates. No separate commercial signing platform or fabricated approval is needed for this ordinary application decision.

## State, precision and recovery

The last approved order remains effective until amendment approval succeeds. The service rejects revoked or foreign authority, expired sessions, stale reviews, inconsistent proposal evidence, incompatible order status, inactive references, unresolved receiving and quantities below existing received/invoiced obligations.

Quantities use the existing database's three decimal places. The order editor, creation quantity input and receiving input preserve fractional values; excess precision is rejected instead of silently truncated. The amendment uses decimal arithmetic, existing unit costs, tax rates and line discounts. It preserves the current purchase-order tax convention and makes the recalculated total visible for approval; no new statutory tax rule is introduced or certified.

Approval records retain the initiating buyer, independent approver, proposal state, reviewed revision, time, before/after values and request reference. Concurrent identical requests recover one effect. A different request cannot reapply the same proposal. Missing event/audit persistence rolls back the order change. A cache refresh failure does not erase a committed decision.

Closing a tab can lose a local recovery reference. The applied amendment remains visible in the workbench under current read authority. Ask support to correlate the retained decision if the local reference is unavailable; do not manually rewrite order status, proposal history or event payloads.

## Engineering review matrix

| Responsibility | Applied review |
|---|---|
| Architecture/backend/data | Domain-owned amendment; reuse existing supplier evidence, order records, events and audit; no new ledger or schema |
| Security/IAM/privacy | Current tenant/account/session/module/approval checks, independent approval, password assurance and bounded receipt projection |
| Finance/accounting/reconciliation | Quantities cannot undercut received or invoiced obligations; existing financial records and posting controls remain effective |
| Purchasing/operations | Separate accepting supplier terms from changing the order; preserve line identity and current approved state until commit |
| Frontend/design/EN/FR | Existing dashboard shell and themed dialog, before/after review, explicit denial/stale/unknown recovery and non-color success text |
| Quality/release/SRE | Focused regression and database rollback checks, real application verification, source bindings and recorded development timings |
| Audit/events | Immutable supplier proposal and acceptance lineage; atomic internal amendment event and audit; no external message implied |
| Packaging | Existing purchasing eligibility and operation permission; no prices, grants or subscriptions changed |
| OHADA/country rules | Existing accounting and country prerequisites remain; no legal, tax or accounting certification |
| POS/offline, HR/payroll, AI/agents | Not applicable to this checkpoint: no changes to their behavior or data |
| Analytics/providers | No new reporting calculation or provider operation; existing order totals feed downstream consumers and still need connected workflow verification |

## Rollout and remaining work

Release the contracts, service, actions, workbench, review dialog, quantity inputs and translations together through the normal release process. No migration is required. Retain amendment events, audits, original proposals and line identities during rollback. Pause affected controls if needed rather than restore unreviewed edits to approved orders. Use an authorized pilot and current release gates before live deployment.

This checkpoint does not certify receiving/inventory posting, AP matching/posting, payment, reconciliation, supplier notification or the full procurement lifecycle. The receiving browser observation checks fractional input without posting a receipt. Full receiving/inspection authority, exact retry, financial handoffs, broader receiving EN/FR/accessibility, native assistive technology/zoom, comprehensive contrast and the release build remain open. Development latency measurements are observations, not a production performance pass.

Continue the complete platform register after this connected purchasing work. No live customer activation, external message, payment, deployment, X1 clearance or professional certification is claimed.
