# Posting identity and suspense correction prerequisite — v96

## Delivered behavior

The shared `createLedgerPostingBatch` service previously used one `findFirst` with a request-key OR source-identity condition. It returned the result without validating its financial identity. The owned PostgreSQL reproduction supplied a different source ID, source type, posting purpose and source version and received the original batch each time. An OR query could also conceal a conflicting key when a separate canonical source match existed.

The service now checks the tenant-scoped request key first, then the canonical source identity if the key is absent. A retained batch must match organization, source type, source ID, purpose and effective version. Historical null/omitted versions still mean version one. Two specified, different accounting periods conflict. A caller omitting the period can still recover a period-bound source batch; attaching an initially unbound period remains the domain service's responsibility. Positive PostgreSQL integer source versions are required before database access.

Conflicts produce the existing `IDEMPOTENCY_CONFLICT` error without altering the batch. Existing source deduplication is preserved when the same source is retried with another key. This function establishes identity only: domain services must continue checking amounts, payload hashes, source links, current authority, period state and actual journal truth. It is not an authorization or full payload verifier.

No financial schema, posting rule, journal, user-facing form or permission was changed. Existing concurrent uniqueness/serialization failures remain retryable through the caller's existing recovery process; the helper does not swallow transaction failures or claim every concurrent caller succeeded.

## How to handle a conflict

1. Open the source workflow and retained posting evidence. For suspense, use `/en/dashboard/finance/reconciliation` or its `/fr/` equivalent, then inspect the suspense item and journal. Confirm the actual route in the application navigation if customized.
2. Record the source ID, journal number, batch ID, requested operation and the business reason. Obtain these from retained application records, not an invented approval reference.
3. Ask the domain/finance owner to compare the intended source, version and accounting period with the original. A conflict is a review requirement; it is not a successful new posting. Do not change IDs or database statuses merely to bypass it.
4. Retry the original unchanged operation when recovering an unknown outcome. A genuinely new financial correction needs the dedicated source workflow and its independent approval.

No additional information is needed from the user to finish the engineering prerequisite. For an eventual live correction, the authorized finance owner must provide the item/journal references, reason, source evidence and intended correction date; the organization supplies the actual reviewer and authority. Implementation does not manufacture those approvals.

## Confirmed obstacle to repeated suspense correction

`LedgerPostingBatch` has a database unique constraint on `(organizationId, sourceType, sourceId, postingPurpose)`. `sourceVersion` is stored and included in generated request keys but is not part of that constraint. The initial suspense gateway hardcodes version one. The initial approval also uses one fixed inbox receipt key and one approval metadata slot.

Consequently, merely incrementing a key or version cannot implement a second posting for the same suspense item. Widening the shared constraint without auditing source callers could allow duplicate effects in inventory, AP, payroll, POS and customer settlements. Returning the first batch as though it satisfied version two was the demonstrated defect fixed here.

## Next implementation sequence — required engineering, not completed

1. Define and implement an explicit suspense posting-cycle identity, with backward compatibility for existing source IDs, version-one batches and source links. Prepare a migration that preserves single-effect uniqueness for every unaffected domain. Verify first-post, correction, subsequent-post and multiple-correction constraints on the owned database before exposing the command. Do not use synthetic source IDs merely to evade current uniqueness.
2. Add durable correction proposal/decision records bound to the original journal, original approval, correction reason/date and current evidence revision. Preserve earlier proposals and decisions instead of overwriting the fixed initial receipt.
3. Implement source-owned compensation under the item and period lock protocols: current permissions, verified fresh authentication, independent reviewer, exact balanced reversal, original and correction-period close invalidation, reconciliation evidence invalidation and explicit remaining obligations. Keep the generic suspense reversal guard.
4. Permit later corrected posting only after verifying the prior compensation chain. Bind every approval and retry to its cycle. Preserve original journals and source evidence; reject stale approvals without replaying a different cycle.
5. Add EN/FR proposal, review, authentication recovery, history and correction status in the existing workbench. Verify browser/keyboard/mobile behavior together with persisted ledger effects and continued obligations.

PR-13 remains incomplete. The current patch closes an identity defect in its dependency; it does not resolve or reverse suspense, implement a correction migration, or permit activation through fabricated evidence.

## Rollout and recovery

No migration or backfill is needed for this patch. Review downstream `IDEMPOTENCY_CONFLICT` results through normal error handling. Investigate inconsistent retained identities; do not rewrite historical batches automatically. Restoring the earlier helper reintroduces silent aliasing. No production deployment, live payment, external message, approval-system mutation or X1 clearance occurred.

The v94 automatic approval-review hold on alert-trigger removal remains in force. No trigger or schedule was changed here.

## Review responsibilities

| Responsibility | Review and limits |
| --- | --- |
| Architecture/backend/API | One shared helper; key lookup is deliberately ordered before source lookup. Existing business callers remain responsible for payload and operation semantics. |
| Database/financial integrity | Existing unique indexes preserved. Owned PostgreSQL checks cover collisions, tenant scope, canonical retries and concurrent uniqueness. Repeated correction requires further schema/service work. |
| Security/IAM/privacy | No new access path or permission. Error text discloses no conflicting source identifiers. Auth and separation of duties remain with existing protected/domain commands. |
| Finance, audit, ledger/close | A different source/version/period cannot be reported as a replay of an existing batch. No original evidence rewritten. Full correction and close invalidation remain outstanding. |
| Inventory/AP/payroll/POS/customer settlements | Direct callers inspected; relevant regression suites run. This is not complete lifecycle verification of those domains. |
| Product/operations/support | Conflict means inspect the original evidence. Required operator inputs and where to obtain them are listed above. |
| Quality/release/SRE | Unit and real database evidence distinguished; no production performance certification or deployment. Cold/new-source lookup adds a second bounded indexed query; existing-key retries retain one lookup. |
| Frontend/design/localization/accessibility | Not applicable to UI changes: no interface changed. Existing error/recovery behavior remains; no new browser certification claimed. |
| Statutory/country rules | Not applicable to calculation changes: no rates, account rules or country treatment changed; no statutory approval supplied. |
| SaaS packaging/billing | Not applicable: no entitlements, packages or charges changed. |
| Provider/offline transport and AI/agent behavior | Not applicable: no provider delivery, offline protocol or agent command changed. POS ledger caller regressions are included separately. |
| Analytics/data governance | Retained identities are protected; no aggregate, report or export contract changed. |

The whole workflow-modernization assignment remains active, with its full scope and outstanding coverage preserved.
