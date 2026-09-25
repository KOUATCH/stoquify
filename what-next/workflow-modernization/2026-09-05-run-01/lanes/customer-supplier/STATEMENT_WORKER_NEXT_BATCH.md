# Next batch: statement worker outcomes and recovery

Current-source inspection on 2026-09-07, after history checkpoint v41. Receipts: `985684`, `7fcb8a`, `08d40e`, `6a5e72`, `4d615e`, `cb87c6`, `ae726c`. This is an active engineering boundary, not a request for live sending or an external approval blocker.

## Confirmed source behavior

- `services/communication/customer-statement-delivery-worker.service.ts` claims due PENDING/FAILED and stale LOCKED requests. DEFERRED has no claim path. `scripts/referral-delivery-worker.ts` requires tenant/worker identity, although the directly exported worker service permits an omitted tenant.
- Processing checks current token status/expiry, sealed envelope and several customer/statement/destination/consent bindings before provider invocation. It does not verify the entire outbox payload against the stored payload hash.
- Successful settlement appends delivery state and audit in the same transaction as outbox settlement. The exception path only changes the outbox; domain history can retain QUEUED alongside failed transport. The new history read model exposes both states rather than hiding this divergence.
- Settlement and catch predicates identify a lease by request and worker ID but omit the attempt generation. A worker ID reused after takeover could allow an earlier operation to settle a later claim. This scenario needs reproduction before correction.
- Provider invocation precedes durable acceptance. A thrown settlement or uncertain provider response enters a retryable failure path. Existing email/WhatsApp provider adapters do not receive a stable dispatch key. A send accepted before a crash or lost response can be repeated.
- `sendCustomerStatementDelivery` uses existing live-send flags. Disabled/missing setup returns DEFERRED. No worker or provider was executed during this inspection.
- The existing user-invitation worker has useful generation/lease predicates and durable first-dispatch metadata. Its provider retry assumptions are specific to that workflow and must not be copied as a guarantee for statement email/WhatsApp.

## Implementation and verification order

1. Reproduce stale-generation settlement, lost acceptance, validation/domain-state divergence and deferred recovery with injected adapters and real owned PostgreSQL records. Do not use the general referral CLI: it also runs accountant invitations and can invoke live adapters.
2. Bind claims, dispatch reservation and settlement to current tenant, event, request and attempt/lease identity. Verify concurrent processors cannot send from the same reservation or overwrite a new generation.
3. Persist dispatch intent before a possible external effect. After uncertainty or a crash, hold for review unless a verified provider contract permits safe replay. Do not claim exactly-once provider delivery from local idempotency alone.
4. Append trustworthy domain/outbox failure evidence atomically where the original delivery is verified. Invalid/missing source evidence must not fabricate a valid domain transition. Losing a lease must not be relabeled as an ordinary send failure.
5. Revalidate token revocation/expiry and source evidence at the appropriate dispatch boundary. Preserve obligations and history; no queued copy should silently regain revoked access.
6. Provide a controlled operator path for genuinely deferred or uncertain work with current authority, reason and evidence. Configuration becoming available is not itself permission to resend an unknown outcome.
7. Extend history copy only for actual supported outcomes. Correct the existing joined EN/FR header fragments in a small associated UI patch. Keep native screen-reader/zoom/full contrast and populated-source calculations explicit until exercised.
8. Run focused worker/provider/history contracts and real database effects. Run browser evidence for any changed operator path and bind a new baseline; retain v41 as the original history integration checkpoint.

## Records and scope

Canonical workflow: `CS-STATEMENT-DELIVERY-WORKER`; notification alias: `NTF-STATEMENT-DELIVER`. Existing findings: NTF-F03 (deferred recovery), NTF-F04 (unknown outcome/duplicate send), NTF-F06 (domain/transport failure divergence). Related retained workflows: CS-STATEMENT-HISTORY, CS-STATEMENT-REVOKE and public recipient access.

Use existing BusinessEventOutbox, BusinessEvent, CustomerStatementDelivery/State and audit facilities where sufficient. Any genuinely necessary durable schema change must follow the migration process and run only in an owned isolated target. Do not change live flags, send messages, simulate approval, reset the database or bypass prior approval-review rejections.

## Acceptance evidence

Required cases: authorized tenant selection; cross-tenant/object source rejection; invalid payload hash; disabled provider; explicit rejection; provider exception/timeout; acceptance followed by database failure; two concurrent processors; stale lease with a reused worker identity; exhausted attempts; revoked/expired tokens; one immutable outcome chain; original financial/role hashes unchanged; actionable operator recovery. Use injected adapters that record calls without network access and retain both failed and corrected attempts.
