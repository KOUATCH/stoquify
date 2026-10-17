# Delegated Close work continuity and publication evidence

Evidence date: 2026-10-04; branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Shared working changes preserved. FA-CASH-COMMAND stays primary, FA-CLOSE-PACK supporting. This delivers corrections within those workflows; neither is closed.

## Findings and corrections

1. **Valid reassigned requests disappeared from delegated pending work.** The accountant desk compared the finding owner with the original request's immutable recipient field. A legitimate replacement therefore looked inconsistent. Pending projection now resolves the retained assignment chain inside a Repeatable Read transaction and compares its current recipient with the finding owner. The original request, author and deadline remain unchanged.
2. **Approved history recovery was ignored.** The pending reader counted raw comments and rejected duplicates even after an independent, source-bound exclusion had restored a valid processing chain. It now uses the existing validated recovery reader. Excluded originals stay stored. Invalid decisions and inconsistent assignments remain incomplete; database errors propagate. Accepted-response records are included in the consistency check, so a contradictory acceptance cannot masquerade as unanswered work.
3. **Reassignment could borrow the original request's notification success.** The validated assignment resolver now supplies the current change's correlation reference. Pending work uses that exact replacement event key. A queued or failed replacement no longer appears delivered because the original request was processed.
4. **Outbox status alone did not prove publication.** The desk now reads the durable publication relation and verifies its tenant, period, finding, request, response, event and payload-hash binding. Publication and outbox processing status are separate fields. A retained publication remains visible after acknowledgement loss; historical SENT rows without a matching destination remain explicitly unverified. Inconsistent publication evidence marks the client incomplete.

Current home-account, role, accounting module, client mandate and Close module checks remain before/after the delegated read. The existing bounded client/request/review continuation contracts are preserved. The minimal projection exposes publication time, not private response bodies, assignment reasons or employee identifiers. Client requests still belong to the current client recipient; submitted responses belong to the authorized reviewer team.

## User and operator guide

Open `/en/dashboard/accounting/accountant-portfolio` or `/fr/dashboard/accounting/accountant-portfolio`, then the evidence review desk. An active reviewer/preparer client mandate and the existing home/client permissions are required.

- “Request notification” follows the current assignment's notification. “Response review notification” follows the submitted response's event.
- “Published in the app (UTC)” means the source-matching durable record exists. It is not a personal read receipt or evidence approval. Outbox acknowledgement can still require retry.
- “No verified in-app publication” means the read found no matching destination evidence. It does not turn a failed database query into a successful empty read, nor prove the event was never processed elsewhere.
- After a client replaces an unavailable recipient or independently authorizes evidence-history recovery, refresh the desk. Recovered work remains under the original deadline. Use the existing review action when a response is submitted.
- If the desk reports incomplete evidence, ask the authorized client Close reviewer to investigate retained source history through the existing controlled recovery form. Recovery needs the actual retained records, proposal revision, explicit exclusions/reasons and a different authorized approver. No automatic selection, deletion or fabricated approval is performed here.
- When a mandate is revoked, client work and publication metadata disappear on refresh. Restore access through the existing organization mandate process, then refresh; do not substitute a client ID from another organization.

The previous [notification delivery guide](CLOSE_NOTIFICATION_DELIVERY_2026-10-04.md) supplies worker operation, retry and migration instructions. This milestone adds no migration, scheduler or external transport.

## Verification

The existing source-bound runner was used sequentially for focused Jest, the repository's no-emit TypeScript check, and changed-scope lint. No default build/migration/seed hook was invoked.

| Check | Result |
|---|---|
| Focused regression | 692 passed in 27 suites; no failed/skipped tests. [Receipt](evidence/close-evidence-recovery-jest-a725b95a-9384-451a-a45c-d015a5ad9a84.json) |
| No-emit TypeScript | Passed. [Receipt](evidence/close-evidence-recovery-typecheck-8fdceb67-c349-485d-8007-9fbc1fcf469e.json) |
| Lint | No errors; existing unrelated investigation-panel warning retained. [Receipt](evidence/close-evidence-recovery-lint-65968bfa-e293-4873-ab57-eca577274478.json) |
| Owned PostgreSQL | Seven scenarios passed. [Receipt](lanes/environment/close-delegated-notification-71478dda-5328-450c-bc92-8a8005b17c36.json) |

Runtime scenarios cover actual request publication, reassignment/new-event targeting, response publication after requester departure, explicit ambiguity before recovery, actual proposal/independent authorization restoring pending work, mandate revocation, and retained publication alongside an injected failed acknowledgement. The recovery uses real domain services with synthetic identities and scope evidence, not a professional or customer approval. Original conflicting comments remain unchanged. Financial and observed outside-fixture fingerprints match. The sampled two-item client desk read took 110ms; this is not a representative capacity or production performance result.

Actual authenticated [EN/FR browser verification](lanes/environment/close-delegated-notification-browser-1c85046f-9cc2-41d0-8a0e-7684dcb786dc.json) passed at 1440/768/320px with reduced motion, keyboard refresh, visible publication alongside failed acknowledgement, recovered pending work, actual fixture-mandate revocation clearing metadata and restoration recovering it. Browser reads preserved comments, inbox and outbox rows. The [French mobile publication view](lanes/environment/close-delegated-notification-browser-1c85046f-9cc2-41d0-8a0e-7684dcb786dc-fr-320.png) was visually inspected. Six screenshots and source/build hashes are retained in the receipt. Final ready times were EN 1.613s and FR 1.516s; the first cold EN visit was 31.508s. No production budget or performance improvement is inferred.

The first browser receipt `close-delegated-notification-browser-cbc27b97-6cd5-49ed-9145-f42a6daa25a5.json` passed interactions, but its narrow screenshot emphasized the long client heading while the new publication detail sat below the viewport. The final run anchors the actual publication text. No application correction was needed for that capture adjustment. Test, TypeScript, lint and database checks passed without a failed implementation attempt in this milestone.

## Rollout, recovery and remaining scope

Deploy only through separately authorized application controls against a target that already has the additive Close notification migration and matching Prisma client. No target beyond the established owned loopback database was used. For application rollback, revert the delegated read/UI changes while retaining source requests, assignment audits, recovery approvals and durable notifications. Reverting the old pending reader reintroduces its known inability to show reassigned/recovered requests, so a forward correction is preferable. Do not modify original authorship or erase duplicates to make the old reader accept them.

This is the **open-work delegated projection**, not a complete historical delegated inbox. Accepted/closed notification history, controlled scheduling/dead-letter repair, older SENT-without-publication reconciliation, wider authority interleavings, capacity and full accessibility/zoom remain. No workflow completion count changes. Original Cash/Close producers, multi-period/interrupt/recovery requirements and all other workflow families stay in scope.

Reviews: architecture/backend/data and audit—reuse established assignment/recovery contracts and retained publication; IAM/privacy—current mandate and tenant-scoped minimal output; finance—no journal/payment changes, measured fixture fingerprints unchanged; frontend/UX/localization—separate historical publication from processing and approval; QA/SRE—failure propagation, current source bindings and bounded reads; packaging—existing module controls unchanged. Statutory/country calculation, payroll/POS/offline providers and AI behavior are not applicable to this read projection. These are engineering reviews, not certification.
