# Reviewed purchase-order decisions

This implementation covers submission, cancellation, completion, archiving and their retained decision history. It is a bounded purchasing checkpoint within the ongoing whole-platform workflow assignment. The source and final verification references are recorded in `../../evidence/purchase-reviewed-lifecycle-receipt.json`.

## What changed

The existing detail page and register now load a server-owned review before a decision. The request identifies that reviewed revision and has an exact retry reference. Current organization, account, role, purchasing eligibility and session are checked in the service transaction. Order, relevant receipt state, currency and displayed reference labels contribute to the reviewed revision. The transaction records the status change, audit entry and applied decision event together. A retry recovers the original receipt without appending another cancellation reason or repeating the effect.

The baseline reproduced submission, cancellation, completion and archive after role and session revocation. Submission retry failed without recovering its earlier outcome. Archive could implicitly cancel an approved order. These defects are corrected at the service boundary as well as the interface. Old commands without a reviewed request are refused; the batch service also requires a reviewed request for every selected order.

Cancellation preserves the original order notes and records its reason in decision evidence. It stops additional receiving while leaving the order available for existing obligations. Received goods on a cancelled order can still support invoice preparation; existing receipt, supplier, scope and uninvoiced-quantity checks remain effective. Preparing the invoice does not approve or post it.

Completion requires received quantities, resolved inspections and finalized receipt evidence for every ordered line. Archiving is available only for a draft or explicitly cancelled order without linked receiving, supplier-response, financial or return records. Orders with linked records stay available, because hiding them currently cuts off downstream access. This conservative restriction is an implementation boundary, not a missing commercial approval.

## Where to open it

- English register: `/en/dashboard/purchase-orders`
- French register: `/fr/dashboard/purchase-orders`
- Order details: `/{locale}/dashboard/purchase-orders/{order-id}`
- The register's **Decision history / Historique des décisions** button finds recorded decisions by exact order number or order ID, including archived orders.
- The detail page's history tab displays verified decisions from this workflow. Earlier activity and approval records remain in their original audit records; an empty result does not mean the order never had activity.

## What to do and what information you need

| Situation | What you supply | Where to obtain it | What the application supplies |
|---|---|---|---|
| Submit a draft | Confirm the supplier, location, lines, quantities and amount shown | The saved order and the underlying purchasing request or supplier quotation | Current review, revision, submission receipt and approval handoff |
| Cancel remaining work | A meaningful cancellation reason; your current password if requested | The duplicate request, withdrawal or other actual business decision; your existing account credentials | Current authority check, retained reason, cancellation receipt and preserved linked records |
| Complete receiving | Confirm the final receiving outcome | The receiving and inspection records for that order | Quantity and finalized-receipt checks; operational completion receipt |
| Archive | Confirm an unused draft or an explicitly cancelled order | The current order and its linked-record review | Eligibility check, retained order/audit/decision and archive receipt |
| Review an archived decision | Exact order number or order ID | The original register/order document, saved order link or support's retained order record | Current read-authority check and verified decision history |
| Recover an uncertain result | Use **Recover this request** for the existing pending decision | The open review after a failure or reload in the same tab | The original request reference and a matched retained receipt |
| Ask support for help | Order number/ID, decision reference, approximate time/timezone and the displayed failure | The review/receipt and order link | Support correlates the scoped order, event and audit; no password is required in a ticket |

Permissions come from the organization's role administrator: read and update for submission/completion, read and cancellation authority for cancellation, and read and archive authority for archiving. Cancellation/archive require password assurance from the current session within five minutes. Ordinary submission/completion do not add a password ceremony. Approval remains a separate decision by an authorized independent approver.

If a review becomes stale, reload the current review and compare it with the intended decision. A cancellation reason stays in the open form after a recoverable stale failure. If the result is unknown, recover the exact pending request before making a new decision. The pending command is stored in session storage for the same actor and organization; cancellation recovery includes its reason. Passwords, session credentials and the order contents are not stored there. Closing the tab can lose that local request reference; the durable decision remains in history.

If a receipt is held or still a draft, resolve it through receiving first. If ordering is stopped for the organization, ask the module administrator to review its actual configuration. If linked records prevent archive, leave the order available and continue the applicable receiving, supplier-response, AP, return or payment work. Cancellation/completion does not send a supplier message, refund a payment, settle an invoice or establish statutory approval. Supplier invitations and correspondence still require their existing controlled handling.

## Implementation and design choices

The existing authenticated shell, organization context, buttons, Radix dialogs, forms and dashboard tokens are reused. Portals inherit the dashboard theme. Submission/completion use the established primary treatment; cancellation/archive use danger text, border and soft background. Selection or a loaded preview does not indicate approval or success. Only a verified matching receipt confirms the decision. Error and recovery explanations are localized in EN/FR and announced through status/alert roles.

One shared review dialog serves both entry points. It retains an uncertain command across same-tab reload, prevents late responses from a previous account from displaying, and uses current-password verification through the existing security action. The history view has explicit loading, failed, denied, unverified and empty states; failures do not become successful empty history. The latest 100 reviewed decisions are displayed with an explicit older-record notice.

No migration is required. Existing `PurchaseOrder`, `GoodsReceipt`, `BusinessEvent` and `AuditLog` records provide durable state. Events use an internal lifecycle namespace, not an accounting source type. Existing canonical slugs, prices and country configuration are unchanged. A file/payload hash is an integrity check, not proof of a human signature or professional approval.

## Review responsibilities and limits

| Perspective | Applied conclusion |
|---|---|
| Architecture/backend/data | One command owner, server-derived scope, reviewed revision, serialized effects, atomic audit/event and idempotent recovery |
| Security/IAM/privacy | Current account/session/role/module checks; cross-tenant rejection; fresh authentication for cancellation/archive; bounded history projection |
| Product/operations | Submission, stopping remaining work, receiving completion and financial settlement have distinct meanings; archive preserves necessary access |
| Finance/reconciliation/audit | Existing received-goods obligations survive cancellation; invoice preparation remains subject to separate accounting setup, approval and posting controls |
| Frontend/UX/localization | Shared EN/FR review, visible errors, retained reason, focus return, responsive/reflow checks and actual screenshots |
| Quality/release/SRE | Source-bound tests, isolated PostgreSQL and actual application interactions; no production deployment or invented performance budget |
| Packaging/modules | Current purchasing eligibility and stop-new-work policy apply; no change to subscription pricing or commercial grants |
| OHADA/country packs | No statutory rule is changed or certified. Actual accounting-period and country setup remain domain prerequisites |
| External providers/events | Internal decision events only; supplier notification and payment execution are not implied |
| AI/agents, offline/edge, HR/payroll | Not applicable to this bounded change: their behavior and data are unchanged |

Completion browser tests start from explicitly synthetic legacy receiving evidence; they do not certify inventory posting. Native screen-reader operation, native browser zoom, comprehensive contrast, complete receiving/inspection/inventory/AP/ledger/reconciliation journeys and the full release build remain open. Development route timings are observations, not production performance approval. Earlier failed attempts remain in the evidence record.

## Rollout and recovery

Release the contracts, service, actions, hooks, UI and translations together through the existing release process. Older open clients must reload when the reviewed-request protocol is required. Use an authorized pilot tenant and the normal release gates before live use. Do not restore the unguarded mutation implementation as an operational rollback.

If a defect requires pausing the interface, retain orders, audits, events, cancellation reasons and request references. Recover any uncertain committed request under current authority; verify the original record rather than manually changing status or editing evidence. Keep archived records in the database. No schema rollback, data reset, production deployment, external message, payment, X1 clearance or certification is authorized or claimed by this checkpoint.

## Next engineering work

Continue controlled amendments of approved orders and accepted supplier proposals, fractional order/receiving quantities, the complete receiving and inspection lifecycle, inventory/AP posting and remaining supplier communication/retention boundaries. The batch service is protected, but an interactive batch-review journey remains absent. The legacy synthesized status-history action, older approval-history browsing/export, comprehensive accessibility and the broader purchasing register's EN/FR/date presentation remain review work. Continue every other workflow family and the unmapped entry-source inventory; this checkpoint does not complete the whole assignment.
