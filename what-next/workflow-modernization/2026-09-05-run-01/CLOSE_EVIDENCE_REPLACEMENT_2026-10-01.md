# Source-bound recovery of missing Close evidence

Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. Previous turn: progress (unique-current publication/certification and EN/FR recovery verified). Both workflows remain in progress; all original families and closure requirements remain.

## Acceptance established before implementation

1. New completed assessments retain a versioned, server-computed collection receipt per supported collector in checklist metadata. It binds the exact persisted checklist and evidence records, including honest successful empty collections. It is an integrity receipt, not a fabricated domain certificate or additional coverage item.
2. An authorized reviewer can preview a replacement for an original missing-evidence finding. The replacement belongs to the same tenant, period and collector contract, from a strictly newer completed, unique-current assessment. Related ownership is validated throughout. Missing, ambiguous, unavailable, voided, invalidated or altered candidates fail closed.
3. Acceptance submits the previewed identity and digest. The service revalidates under publication/invalidation coordination, preserves permission/fresh identity/independent reviewer controls, and atomically records the complete original-obligation/replacement binding with the existing finding decision, audit and event. Changed previews reject; exact retries retain original bindings.
4. The historical unavailable rows, assessments and exports remain unchanged. Older text-only acceptance is retained without being promoted into source proof. Tenant retained-obligation aggregation discounts only specifically bound historical missing records whose durable replacement chain verifies. Current assessment readiness and unresolved findings remain independent.
5. Existing accountant review provides EN/FR explanation, shows the source observation being accepted, preserves notes on recoverable failure and requires deliberate review/retry. No automatic certification.
6. Focused unit/action/component tests, typecheck/lint, actual isolated database effects and relevant browser behavior verify the changed boundary. Preserve failed attempts and distinguish implementation, verification and remaining workflow criteria.

## Baseline source findings

Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Starting register SHA256 `02afd47642018205fde079950fd68266c765d63a7faf45aeeaf72a209d88e511`. Current counts: 270 workflows, 17 families, 191 unmapped entries; 264 queued, two in progress, four historical closures. Discovery/source reconciliation remains incomplete.

At baseline, the acceptance service resolved an in-review finding and recorded response/reviewer/notes, with no replacement ID/hash. Snapshot aggregation correctly continued counting every historical unavailable evidence row. A newer successful assessment alone could not establish reviewed historical recovery. Collector identities differ between failure and success; ledger and several evidence rows have no domain hash, and a successful payment query may return no rows. Matching arbitrary available rows or ignoring historical evidence would misrepresent the source.

Existing action/community 6, Close component/community 4 and hook/community 5 graph locators were checked against current source. Receipt storage reuses checklist metadata and acceptance comment metadata; no schema migration is planned. Unrelated changes are preserved.

## Delivered implementation and decisions

`close-evidence-collection.ts` computes a canonical digest of the exact persisted checklist and its complete evidence set after collection. The existing checklist metadata holds the receipt. This avoids adding synthetic evidence rows or increasing coverage. Domain `sourceHash: null` remains null. A successful empty payment collection receives an empty-set receipt; an exception cannot receive one. Successful collection and passing a business control are separate: a `FAILED` control can recover an unavailable observation while its current failure continues to block readiness.

`close-evidence-replacement.service.ts` selects a strictly newer, unique-current completed assessment of the same tenant, period and collector. It verifies related ownership, the complete collection receipt and source identities. The preview exposes the collector, outcome, observation time and recovered-record count; private binding metadata remains server-side.

Acceptance carries the selected checklist ID and `sha256:` binding digest. It locks the tenant/correlation key, then the shared tenant/period boundary and selected run. Read Committed permits authoritative rereads after waiting for another transaction; a stale Serializable snapshot would not establish this property. The service rechecks active home identity, delegated REVIEW access and authentication age, checks independent reviewer and finding state, then records the binding with the existing finding decision, comment, audit and business event. The database supplies the post-lock acceptance time. Exact replay retains the recorded binding; different input under the same key rejects.

The Close snapshot uses verified request → response → acceptance → collection chains to discount only bound unavailable record IDs. Ordinary later assessments do not erase a valid historical recovery. A voided replacement, reopened finding, modified source or broken chain no longer qualifies. Original runs, unavailable rows, checklist records and exports remain intact; explicitly opening old proof continues to show its original adverse evidence. Old text-only acceptances remain unbound history and are not silently upgraded.

The existing accountant work desk now provides EN/FR source review, an explicit review checkbox, collector/control-outcome text and observation time. A stale submit preserves notes, refreshes the preview and requires a new manual review and submission. Existing dashboard tokens, layout, focus and identity-verification flow are reused. Selection and successful collection do not imply approval or certification.

## Operating guide

1. An authorized operator fixes the source failure and runs a new Close assessment for the same period. Do not edit old evidence or invent its hash.
2. The assigned respondent submits the existing missing-proof response. This response explains the correction; it is not itself replacement evidence.
3. An independently authorized accountant opens `/en/dashboard/accounting/accountant-portfolio` or `/fr/dashboard/accounting/accountant-portfolio`, opens the response and reviews the new collector observation and current control outcome. The accountant needs the existing tenant/client mandate and review permissions; the route also requires accounting audit access.
4. Enter resolution notes, confirm that the displayed replacement was reviewed and select acceptance. Complete identity verification if requested, then deliberately retry. If a new assessment changes the preview, review the refreshed observation before resubmitting; the notes remain available.
5. Inspect the retained decision and refreshed Close/Cash state. Other findings and current failed controls remain actionable. Acceptance does not certify or export a Close pack.

If no replacement is available, the operator must obtain a new successful observation from the corresponding collector. Legacy assessments without collection receipts require a new assessment; no backfill or fabricated attestation is performed. If a real mandate or permission is missing, the organization's authorized access administrator must supply it through existing controls. This local implementation requires no new user-supplied commercial or statutory approval.

## Rollout, recovery and review scope

No schema migration is needed. Receipt and binding metadata are additive. Deploy the services and caller together through the existing release process; old callers cannot create new text-only acceptances. Retain historical metadata on rollback. Rolling back to code that accepts text-only responses would reopen this boundary; suspend new review acceptance until the compatible version is restored. Do not delete acceptance history, overwrite failed observations or rewrite signed/exported artifacts. Collector or review failures are corrected through fresh assessment, refreshed review and explicit retry.

Review covered architecture, transactional integrity, tenant/object scope, IAM, finance controls, audit/history, frontend/localization, quality, operations and recovery. Statutory-country review is not applicable to this internal collection receipt: no legal/accounting rules or expert approvals are changed. Pricing/provider/offline/AI policy changes are not applicable because this milestone introduces none. No independent professional or release certification is claimed.

## Verification and remaining work

Current terminal evidence:

| Check | Result and exact evidence |
|---|---|
| Focused service, action and component tests | 371 passed, nine suites, zero failed or pending; [receipt](evidence/close-replacement-jest-f0c5c700-1971-43e4-8242-765ecca2cec0.json) |
| TypeScript | Passed; [receipt](evidence/close-replacement-typecheck-70d60572-b21c-487d-8f5a-bf4e132c52a6.json) |
| Changed-file lint | Passed, empty diagnostic log; [receipt](evidence/close-replacement-lint-2c16c263-c38b-4288-978e-009b884dc19d.json) |
| Actual PostgreSQL workflow | Four passed checks: unavailable-source and text-only refusal, honest empty collection, independent bound acceptance/concurrent duplicate, tamper rejection and later-assessment/history retention; [receipt](lanes/environment/close-replacement-runtime-11dc9d56-2b7b-469c-bc8c-a2bc032dc10c.json) |
| Actual publication/review race | Two passed checks. Distinct PostgreSQL PIDs and `pg_blocking_pids` establish the period-lock wait. Acceptance rereads the newly committed RUNNING assessment and refuses without finding/comment/audit/event effects. After completion, old selection still refuses and explicit refreshed selection records one decision; [receipt](lanes/environment/close-replacement-order-runtime-c490f9c4-3429-4fe4-b3df-3a990acfc0b0.json) |
| EN desktop / FR mobile | Passed at 1440px/320px; actual password confirmation, focus return, stale-preview conflict, refreshed manual review, preserved notes, one bound acceptance, historical adverse proof, keyboard and reflow; [receipt and eight screenshots](lanes/environment/close-replacement-browser-290991f4-8847-429f-814a-dffac1182c32.json) |

The actual runtime receipts bind current source hashes, outside-fixture records and operation financial records. Fixtures create explicitly synthetic balanced accounting setup first; subsequent review/recovery adds no financial effects. The database target is the guarded owned loopback `stoquify_local_registration_20260906_01`. No migration-bearing build, seed, delivery worker or live customer was used. The test payment collector exception is explicit process-local fault injection, restored in `finally`; no production outage is claimed.

The initial [browser receipt](lanes/environment/close-replacement-browser-e4449231-37fc-47ce-8c01-8bc86bf66257.json) failed in the verifier after actual acceptance, historical proof and database aggregate checks passed. Its response detector wrongly required that the entire streamed response contain no `code` field. Both successful responses contained unrelated code metadata. The corrected verifier parses the successful acceptance envelope and matches its exact identity and replacement selection to persisted evidence. The failed receipt, screenshots and predecessor verifier remain retained. Product source was unchanged by this harness correction.

Visual inspection of the actual desktop review and French mobile conflict/action screenshots confirmed readable source/control text, visible review selection/focus, wrapped copy, preserved notes and reachable controls. Mobile acceptance stays disabled until the refreshed observation is deliberately reviewed. The screenshots show synthetic English fixture content and inherited application surfaces; they do not establish full application localization. Both pages and review regions had no horizontal overflow; neither journey emitted page errors. Local development navigation-to-open-review observations were 8.021s EN and 10.297s FR, including loading and the scripted review-opening interaction. These are recorded observations without an approved performance budget, not production performance certification.

Producer target-discovery races, multi-period ordering, full Cash lifecycle, remaining sources/background delivery, original accessibility requirements and the full modernization register remain open.

An independent source review identified a remaining authority boundary: home-role permissions are supplied by transport before the wait. Post-wait checks reread active identity, delegated access and authentication age, but do not yet reload all home-role permissions, account/organization policy or module entitlement. This is retained as the next scoped Cash/Close authority task, not described as fully verified concurrent revocation safety.

The next correction has existing source precedents: `customer-statement-response.service.ts` reads organization-filtered roles, uses `isUsableAccount`, checks persisted fresh session and transaction-owned module access; `member-history.service.ts` retains authority locks through a Read Committed mutation. Reuse `role-custodian-policy.ts`, `rbac-permissions.ts`, `evaluateModuleAccessInTx` and trusted internal session claims. Establish deterministic organization-first lock order before period/run locks. Home roles supply the accountant's RBAC; the target's REVIEW grant and `close_assurance` write entitlement supply delegated target authority. Do not require target membership for a valid external accountant. Preserve the distinction between work-desk `accounting.audit.read` and domain `accounting.close.accountant.review`. Verify revocation/expiry, foreign-role contamination, locked/unverified identity, inactive organization, read-only/suspended target modules and both acceptance transports with no decision effects on refusal. This is a follow-on implementation scope, not delivered functionality.

Collection verification currently performs per-acceptance reads; representative production-volume latency is unverified. Browser keyboard, narrow reflow and reduced-motion checks do not establish native assistive-technology, true zoom or complete contrast coverage. Synthetic owned-database fixtures establish behavior, not customer mandates, statutory approvals or notification delivery. Both parent workflows remain In progress.
