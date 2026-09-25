# Historical exception-link repair — v109

Implementation started 2026-09-09; verification resumed 2026-09-12. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232` plus preserved working-tree changes. Full workflow review remains active.

## What changed

The v108 producer fix prevents new missing backlinks. This slice adds an explicit review and repair for existing automatically generated exception/suspense pairs. The service checks the original exception ID, matching original evidence, same organization/provider/run/payment/correlation, available source records and unique linkage. It refuses absent, conflicting, ambiguous or voided provenance; it never guesses from matching amounts or labels.

Read previews expose record identifiers, state and a revision, without raw private source/certificate payloads. Confirmation requires current reconciliation read/run authority, an active same-organization actor, verified password assurance no older than five minutes, the reviewed revision, a reason and an idempotency key. The action derives identity and assurance from the server.

One serializable transaction restores only the relation, retains before/after evidence and the prior run certificate privately, removes current run sign-off, marks the run NEEDS_REVIEW, invalidates affected close evidence, records audit and publishes an in-app notification. Existing exception decisions, ownership and ledger amounts do not change. An uncertain retry uses the exact saved request and receipt after rechecking current authority and provenance. A late failure rolls back the repair and its connected effects.

Close exports retain `isCertified` as a historical issuance fact. Their current invalidation appears in `metadata.staleState.status = EVIDENCE_STALE`; affected certified close runs become BLOCKED. This follows the existing close service and must not be described as deleting historical certification.

## Operator procedure and required inputs

1. Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation` in the authorized organization. In the suspense queue, choose **Review exception link / Examiner le lien de l’exception**.
2. Review the identifiers and source state. These are supplied by the application. An already linked item needs no repair. Missing or ambiguous provenance requires investigation of the original records; an unavailable preview is not permission to guess a link.
3. Enter a factual reason describing why the original relationship is being restored. Obtain the supporting facts from the original reconciliation records and retained evidence, not a fabricated approval document.
4. Select **Repair link and require review**. If requested, verify your own account password through the existing authentication form, then explicitly retry the saved request. Passwords are not stored with the draft.
5. After interruption or reload, retry the saved request. It preserves the original revision and request ID. Record the server-issued receipt; the application does not treat the local draft as completed work.
6. Refresh after a source conflict. Resetting a local request first checks authoritative state. Unreadable storage blocks submission and is preserved if that check fails.
7. Continue the actual exception and run review. Repair does not resolve the exception, approve a financial treatment or sign the run. Those complete handoffs remain separate implementation work.

The organization administrator supplies reconciliation run/read permissions through existing role management. The operator supplies the reason and their own password when prompted. Record IDs, revisions, affected run references and receipt IDs come from the server. No new external approval system, provider credentials, price decision or user input is needed to implement this repair.

## Verification

- Final focused regression receipt: `evidence/exception-link-repair-v109-tests-final.json`, 76 tests / six suites, command receipt `bc6a96`. Covers services, protected action scope, UI recovery, inherited queue, notifications and close service.
- Owned PostgreSQL receipt: `lanes/environment/exception-link-repair-v109-59fe5256-f8c.json`, nine check groups, command receipt `603eaa`. Covers missing write permission, stale authentication, foreign actor/organization, exact replay, stale review, retained synthetic certificate and current run/close invalidation, late audit rollback and ambiguous duplicate refusal. Source stable; other organizations and monitored ledger/source-link rows unchanged.
- Synthetic SIGNED/CERTIFIED fixture labels exercise invalidation/retention only. They are not genuine provider sign-off or professional approval evidence. The actual browser repair journey uses no synthetic SIGNED state.
- The first database attempt `exception-link-repair-v109-753e21c5-511.json` failed because its verifier incorrectly expected historical `isCertified` to become false. Source inspection established the actual stale-state contract; the revised verifier requires BLOCKED and exact stale source identity. The failing receipt is retained.
- The first six-suite attempt retained 53 passing tests and one queue-suite load failure caused by the newly imported server action. The queue test now mocks that action boundary; separate action and panel suites verify it directly. No production auth behavior was changed to accommodate Jest.
- Initial creation of the browser verifier was rejected by automatic approval review because the account usage limit was reached. No workaround was used. On 2026-09-12, the read-only account tool showed the limit had cleared; the same normal patch path was then approved.
- Actual browser, final typecheck/lint and source bindings are appended with their completed receipts. Until then this document does not claim those checks passed.

## Rollout, recovery and remaining work

The browser attempt `lanes/environment/exception-link-repair-v109-browser-60ec49d7-477.json` completed both functional journeys but exited 1 because EN/FR message hashes changed during execution. Its eight screenshots and successful repair/replay observations are retained, but it is not a stable-source verification pass. A subsequent run is required against unchanged source. Each locale also recorded one development CSS-preload warning.

No schema change, migration, production deployment, live payment or bulk backfill was performed. Repairs are per-record, reviewed and authorized. Keep repair receipts and original certificates; never undo a repair by clearing links or deleting evidence. Monitor rejected provenance, stale-review conflicts and failed transactions. A post-commit refresh error must say the repair was recorded and provide its receipt, rather than imply failure of the completed transaction.

Missing or conflicting original evidence is intentionally refused and requires source investigation. Wider legacy variants, true two-client races, full screen-reader/contrast/native zoom evidence and complete genuine exception review → run preparation → independent sign-off/export → reopening remain open. The full platform inventory is not complete.

## Review responsibility and design mapping

Architecture/backend/data: existing records, strict contracts and transactional read/write services; no duplicate ledger. Security/IAM/privacy: server scope, read/run authority, recent password assurance, redacted preview and private retained evidence. Finance/audit/close: financial state preserved; current sign-off/close evidence invalidated through existing facilities. UI/localization: inherited dashboard surface/border/brand/warning/danger tokens, neutral linked state, real status text, EN/FR copy, keyboard focus, retained request and explicit recovery. QA/SRE: focused service/action/UI tests and owned runtime receipts; no performance certification. Product/operations: source review is an operator task; no commercial package change. Statutory rules, payroll, inventory, POS/offline, AI and provider protocols: not applicable to this relation-repair implementation; none of their rules changed.

Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. Core changed files: `payment-exception-link.service.ts`, its contracts, `exception-link.actions.ts`, `PaymentExceptionLinkPanel.tsx`, queue integration, close invalidation source registry, notification type and EN/FR messages, with focused tests. Passed/open gates are limited to the evidence above. Next numbered skill after the reconciliation boundary: `010-aqstoqflow-inventory-valuation-kernel`.


## Final verification binding

- Baseline: evidence/source-baseline-v109.json; 2026-09-12T19:04:52.634Z.
- Final tests: evidence/exception-link-repair-v109-tests-copy.json, 77 tests/six suites. This supersedes the intermediate 76-test receipt after repair-specific authentication copy and its regression test.
- Typecheck failed: 6dfdb9; TS2322 components/inventory/transfers/TransferWorkflowPage.tsx:68: string | undefined is not assignable to string. Full configured typecheck failed outside the reconciliation changes; the existing untracked inventory component was preserved. This is an engineering failure, not an external decision. The earlier attempt failed with TS6053 when dev compilation removed a generated route type; it was rerun after browser compilation settled.
- Final eleven-file lint completed successfully: d8ccb0.
- Browser: lanes/environment/exception-link-repair-v109-browser-569ba115-c3f.json; eight screenshots in evidence/exception-link-repair-v109-files. Both locales passed repair/replay, denied users, keyboard focus and narrow/tablet/desktop checks. Financial rows unchanged.
- Console observations: en: 2 warnings/errors; 0 page exceptions; fr: 2 warnings/errors; 0 page exceptions. See raw receipt for details.
- Local route-to-queue milliseconds: en: 8618/7800; fr: 11907/11426. Earlier cold-compile English observation was 120303 ms in browser-c4fa032b-149; these are unbudgeted development observations.
- Aggregate: evidence/exception-link-repair-v109.json. No whole-workflow completion is claimed.
