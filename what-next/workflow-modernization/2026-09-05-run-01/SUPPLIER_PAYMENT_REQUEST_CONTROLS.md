# Authenticated supplier payment requests — v80

This is an implemented and locally verified backend boundary. PA-022 and PA-023 remain partially implemented; no payment-request browser interface has been delivered in this batch. The complete platform workflow review remains active.

## Problem and correction

The previous controlled approval accepted a caller-provided `requestedById`. Naming another user did not prove that user had requested payment. The new public approval contract accepts only an existing request ID, the reviewed revision and an idempotency key. Existing permission and fresh-auth checks remain in place.

A request now creates one `SupplierPayment` in DRAFT with its invoice allocations and a mandatory applied business event and audit record. Requester identity comes from the authenticated session, with active organization, current database roles, module access and password assurance revalidated inside the transaction. An independent approver reviews current source balances and destinations, then updates that same payment to APPROVED. Separate retained approval evidence binds the requester event, reviewer, reviewed revision and actual approval timestamp.

Request and approval previews do not reserve funds or establish approval. Changes to invoices, credits or destination evidence invalidate a reviewed revision. Submission and approval use serializable transactions and stable payment/source locks. Exact retries return the existing payment and its current state, including a later RELEASED state; they do not create another payment.

Controlled release requires verified request and approval records. It rejects changed payment dates, notes, document hashes and evidence hashes. A release remains a local financial record; it does not prove external bank settlement. The existing reconciliation and suspense workflow remains necessary.

## Inputs, owners and sources

| Input | Who supplies it | Where to obtain it |
| --- | --- | --- |
| Supplier and approved destination | Authorized payment requester | Existing organization supplier and approved bank-account records. A pending bank change must first complete its independent approval process. |
| Invoices and allocated amounts | Authorized payment requester | Eligible posted or payment-pending supplier invoices. The service subtracts posted net credits and existing paid amounts; each payment uses one currency. |
| Payment method and date | Authorized payment requester | The agreed payment instruction and finance operating schedule. |
| Supporting-document URI and SHA-256 | Authorized payment requester | The retained, reviewer-accessible payment instruction; hash the exact retained file. The link and hash do not independently authenticate its author or signify approval. |
| Optional notes | Authorized payment requester | Context needed by the independent reviewer; these become reviewed terms. |
| Requester, approver and signing-session context | Server | Current authenticated identity and current organization role membership. These cannot be selected in the submission payload. |
| Request ID | Server | Successful request submission; the same ID persists through approval and release. |
| Reviewed revision | Server | The latest request or approval preview. It must be copied unchanged into its corresponding confirmation command. |
| Idempotency key | Calling interface | Generate once per reviewed submission and retain through uncertain outcomes and exact retries. Never generate a new key merely because a response was lost. |

No new external decision is required to implement the pending interface. Role assignment, destination approval, retained source documents and any live payment authorization remain organization responsibilities. This engineering batch grants none of those approvals.

## Calling contracts and recovery

`actions/purchasing/payment-request.actions.ts` provides request preview/submission and independent approval preview/confirmation. The existing `approveSupplierPaymentAction` name is retained, but its payload now uses `paymentRequestId`, `expectedRevision` and `idempotencyKey`. Repository search found no production component, hook or route caller of the previous approval/release mutations. Internal raw domain functions remain available for existing trusted service consumers; their tests are not evidence of authenticated browser activity.

If sources change, obtain a new preview and deliberately review it before confirmation. If authority or the session is revoked, restore appropriate access through the administrator or sign-in flow. Expired password assurance requires current password verification. If a response is lost, retry the exact command and key; the returned current state may reflect subsequent processing. Do not treat a failed query as an empty queue or discard an uncertain command.

Legacy approved payments without retained authenticated request and independent approval evidence cannot use the new controlled release path. Do not fabricate events or backfill an approver identity to pass that gate. A controlled legacy-review/recovery workflow is still required. No production backfill or migration has been run.

## Verification and limits

See `evidence/payment-request-controls-v80.json` for final commands and source bindings. The owned local PostgreSQL verifier uses actual requester/checker sessions and role records. It checks strict identity input, changed previews, expired assurance, concurrent identical requests, self-approval, foreign organization scope, revoked approval permission, concurrent approval, legacy request-origin rejection, altered release terms, altered approval timestamps and exact retries after release. Non-fixture records remain unchanged.

The release portion invokes the existing domain controls with a synthetic trusted control context; it does not verify a release action through a real browser session or execute an external payment rail. Its fixture destination is an explicitly prepared prerequisite, not evidence of the full bank-change workflow. Browser EN/FR, keyboard, mobile and end-user recovery verification are not complete for payment requests. No accessibility, accounting, statutory, security or release certification is asserted.

## Remaining work and rollout

Implement tenant/actor-scoped source pickers, request and approval queues, durable history read models, and EN/FR interfaces in the established AP shell. Preserve drafts and exact retry commands, hide stale private data on identity changes, and verify real maker/checker journeys before rollout. Then complete authorized release UI, legacy approval recovery, rejection/withdrawal of requests, credit-aware invoice status and downstream suspense resolution.

No schema migration is required: existing payment, allocation, event and audit records are reused. Treat the old approval payload rejection and legacy release evidence requirement as intentional contract changes. Review callers and retained approvals before enabling the new workflow for a cohort. On failure, stop new submissions and retain requests/events for diagnosis; reverting to the former caller-selected requester would reopen the demonstrated control defect. Do not delete financial records or clear X1 as a recovery action.

Permanent reviews: architecture/backend/data, IAM/privacy, financial integrity, audit/events, quality/release and operational recovery apply to this batch. Product/UX/localization reviews identify the still-missing interface. New statutory calculations, POS/offline behavior, HR/payroll, AI tools, billing/provider integration and analytics behavior are not applicable because this batch changes none of them. Existing country and ledger controls remain authoritative.

Selected skill: `011-aqstoqflow-purchasing-ap-controls`. The next numbered skill is `012-aqstoqflow-payroll-presence-engine`; do not advance solely because these bounded AP checks pass.
