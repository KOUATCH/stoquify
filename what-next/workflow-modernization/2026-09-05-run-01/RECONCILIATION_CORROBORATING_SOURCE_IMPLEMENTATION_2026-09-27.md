# PR-10 — independently review corroborating late sources

Date: 2026-09-27. Branch `codex/migration-control-plane-release-2026-08-29`; HEAD `62a56036a5ac9b37236a20c9b148052199069479`, with unrelated changes preserved. PR-10 remains **In progress**; the full platform goal remains active. This record supersedes the previously reproduced missing nonfinancial decision path for exact corroborating late statements and provider callbacks.

## Delivered behavior

The existing exception panel now distinguishes source review from financial review. For late evidence referring to a retained payment allocation, a proposer can request an independent decision. Approval resolves the unposted investigation and its exception, preserves the original allocation and imported records, and returns the run to review. Fresh preparation and independent signing consume the retained decision evidence. No payment, allocation or journal is created by the decision.

The service verifies tenant/provider ownership, exact provider transaction identity, compatible references, amount, currency and direction, source date/status/signature or statement-file evidence, and one full retained allocation. It rejects ambiguous identities, partial/multiple allocations, conflicting source evidence, other source claims, posted suspense and any retained posting history. The source must be named in the verified recovery receipt that introduced it; later unrelated recoveries do not redefine this provenance.

Existing enforced module, permission, actor and fresh-authentication controls apply. The proposer cannot decide their own request. Approval also excludes the run maker, original matcher and the operator who incorporated this source. Approval requires an open period, uses Serializable transactions and conditional exception/suspense/run updates, and records receipt, audit, notification and close invalidation atomically. Signed evidence cannot be reopened by this new decision path. Exact retry after signing validates the retained decision and reports it without rewriting the run.

The manifest validates both the resolved exception and the corresponding unposted investigation record. A terminal status or metadata pointer alone does not establish coverage. Existing financial closure still requires its financial proof; it is not replaced by this path.

## Implementation boundaries

- `services/reconciliation/payment-corroborating-source-evidence.ts`: source/allocation validation, receipt provenance, independence and retained investigation validation.
- Existing exception closure service/evidence: unified proposal, review, independent approve/reject, history and retry with an explicit nullable financial proof and separate source-review proof.
- Existing reconciliation evidence manifest: verified nonfinancial investigation disposition included in signing coverage.
- Existing `PaymentExceptionClosurePanel.tsx` and EN/FR messages: source evidence, consequences, independence and safe controls within current dashboard surfaces, brand buttons and attention borders. No new shell, route, action authorization mechanism or schema.

## Verification

**177 tests in seven focused suites, changed-file lint and full TypeScript check pass.** [Bound check receipt](evidence/corroborating-checks-9d87f7ee-2609-48dc-9aa5-da7837a5ff09.json). Coverage includes 23 conflicting/unsupported source cases, provenance, review drift, retained-state corruption, financial closure regression, manifest, certification, preparation and protected actions. An intermediate TypeScript run reported nullable evidence fields and mixed manifest-map types; those implementation errors were corrected before this final pass. The earlier focused 81-test run also passed; it is not added to the final count.

**Real PostgreSQL statement and provider-event journeys pass:** [final service receipt](lanes/environment/corroborating-source-947f444b-ba10-4296-b94a-c99eb04806b8.json). Actual source import/capture and recovery lead to independent proposal/approval, fresh preparation, signing and retained certificate export. Missing authority, foreign tenant, stale authentication, stale revision, proposer approval and recovery-operator approval are denied. Competing exact approvals retain one decision. Forced approval-audit failure rolls back all effects. One original payment and original match remain, no journals are created, and history contains the proposal and decision. The earlier [service receipt](lanes/environment/corroborating-source-57bd026d-2c73-4307-9147-b018d4ed7f45.json) predates the exact recovery-receipt refinement and is retained as intermediate evidence.

**Actual EN/FR browser journeys pass:** [browser receipt](lanes/environment/corroborating-browser-browser-a60a83d5-313.json), with 14 screenshots. Both languages verify read-only denial, authenticated proposal, retained-request reload/exact retry, proposer decision denial, independent rejection, revised proposal, independent approval, private history and focus return. Source preview and history reflow pass at 320/768/1440px; 200% root-text enlargement was checked after returning to the workbench, not across every open review panel. EN/FR 320px source-preview screenshots were visually inspected. Original matches and the single payment remain unchanged; no journals are created. No page errors or missing-message warnings occurred; development CSS preload warnings remain recorded.

Entry observations (milliseconds): EN 121780/19086/28636; FR 9459/10215/20650 for successive read-only/proposer/reviewer entries. These are development observations with different cache/compilation conditions, not an improvement comparison or an approved performance budget. Entry-latency diagnosis remains required. Native screen-reader speech and browser-chrome zoom remain unverified.

All verification processes completed. The owned app tree 29724 → 28860 → 27036 was verified and stopped. [Current receipt and screenshot hashes](evidence/corroborating-current-bindings-ebf1fb65-a4d1-4110-b66d-126a1ffc54e8.json).

Commands use the bundled Node executable, from the repository root:

```text
node what-next/workflow-modernization/2026-09-05-run-01/run-corroborating-checks.cjs
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-corroborating-source.cjs
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/supplier-ack-local.cjs
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-corroborating-browser.cjs
```

The inspected application wrapper uses guarded loopback database `stoquify_local_registration_20260906_01`, checks synthetic ownership, starts Next development on port 3110 without migrations/seeds, and disables external fetch. The browser also blocks nonlocal requests. No production deployment, live activation, real payment or external notification occurred.

## User and operator guide

1. Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`. Use additional-source recovery to incorporate genuinely new evidence, then **Review exception cases** / **Examiner les dossiers d’exception**.
2. Open the source-review case. Enter why the late evidence corroborates the existing payment and select **Verify current closure evidence**. The application derives the source, retained match, payment, amount and currency from imported records; users do not supply or invent those identities.
3. Inspect those records and consequences, then submit the proposal. If asked, confirm the signed-in user's password and explicitly retry the retained request. The proposer needs current reconciliation read, accounting read, exception-resolution authority and module write access, assigned by the workspace administrator.
4. An independent authorized reviewer opens the saved proposal, checks the evidence and supplies their own reason. They can reject it for further investigation or approve it. The proposer, run maker, original matcher and source-recovery operator cannot approve this source decision.
5. Approval resolves this unposted source investigation; it does not post money or sign the run. Return to preparation, review the current evidence and have an independent authorized signer complete sign-off. Retained history remains available under **All cases and history**.
6. After an interrupted response, retry the retained request first. After a changed source/revision, refresh history, clear the local request only after checking the saved outcome, and prepare a new proposal if still appropriate. Conflicting or unsupported sources remain in investigation; do not post or write off money merely to bypass that result.

Required user inputs are the proposer/reviewer reasons and their own authentication. Transaction facts come from the actual provider callback/statement and retained payment allocation. Required organizational input is assignment of authorized independent people by the workspace administrator; this code does not fabricate their decisions or grant them authority.

## Rollout, recovery and review

No migration or new commercial/provider dependency is required. Before a live rollout, verify the existing role/module setup and reviewed release controls. Preserve new receipt records and audits. A code rollback must retain compatible readers for nonfinancial decisions: reverting to an older financial-only validator would reject those records. Do not delete, relabel or financially clear them as a rollback tactic. Rejection and exact retry are supported; correction/revocation of an approved nonfinancial decision and signed-source reopening remain explicit further work before whole-workflow closure.

Architecture/backend/data/security/finance/audit reviews: reuse service-owned evidence and existing protected actions; no allocation reuse or monetary write; source mismatch, concurrency, rollback, independence and private ownership verified within the stated scope. Frontend/workflow/localization: existing panel and draft/retry behavior extended and browser-verified in EN/FR within the exact scope above; full review-panel enlargement and remaining sign-review accessibility are not inferred. Quality/SRE: focused regression and actual persisted effects, source hashes and failed attempts retained; development timing is not production certification. SaaS/access: existing entitlement/role boundaries preserved; no packaging or pricing decision.

Statutory/country-rule changes, payroll, purchasing, POS/inventory, AI behavior and new commercial packaging are **not applicable to this milestone**, because those rules and interfaces are unchanged. These are engineering reviews, not professional approvals.

PR-10 still requires the remaining source correction/reopening boundaries, source-volume and exposure-total review, sign-review current-authority/accessibility evidence and entry-latency diagnosis. Live notification-worker scheduling and exhausted-message repair/requeue remain separately unverified operational boundaries. No new workflow ID or completion count is claimed.
