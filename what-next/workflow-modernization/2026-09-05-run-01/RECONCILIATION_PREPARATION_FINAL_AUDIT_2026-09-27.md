# PR-19 final engineering audit

The implemented reviewed-run preparation workflow is verified in the owned local environment, with the limits below. The full platform assignment remains incomplete. Preparation records reviewed readiness; independent signing, financial treatment and source repair retain their own controls and workflow IDs.

## Delivered outcome and evidence

The preparation service now applies current transaction-bound module admission to discovery, private evidence, preparation and exact replay. Persisted read-only, suspended, expired, future, empty or missing dependency grants cannot create readiness. Denials retain their audit. The interface preserves the pending command and explains unavailable write access.

History and run-list navigation now restore focus to their labeled regions after success or failure. Authentication returns focus to explicit Retry or the review region, without automatically preparing. Rejected passwords and authentication transport failures use the existing EN/FR authentication error, clear and refocus the password, and preserve the reviewed request.

| Closure criterion | Evidence and conclusion |
|---|---|
| Discover and select | Current 22-run PostgreSQL and EN/FR browser receipt verifies stable paging, search, empty results, limited readers and signing handoff. Failed reads retain visibly previous results. |
| Authoritative persistence | Current financial lifecycle plus competing-reviewer receipt verifies reviewed revision, conditional readiness transition, immutable receipt, audit and readiness observation in one transaction. No journal is created by preparation. |
| Actor, tenant, permission, module and authentication | Module matrix, both withdrawal lock orders, current financial denial checks and actual authentication browser pass. Server-derived action context and transaction controls remain effective. |
| Concurrent and duplicate commands | Same-key and different-reviewer transactions produce one winning transition. Stale and borrowed-key commands fail. Exact replay returns its original receipt and current run status. |
| Failure and retry | Late audit/notification failures roll back. Actual committed-response loss, reload and exact retry produce one receipt/audit in both languages. |
| History | 23 genuine preparations, 20/3 paging, cross-tenant/cursor scope, corruption failure, retained signed history and old-replay pointer stability pass. |
| Financial/source handoffs | Actual posting/clearing and exception closure permit preparation, independent signing and export. Reversal reopens the run, retains history and prevents old replay restoring readiness. Callback/statement recovery and missing-evidence refusal remain verified. All 30 legacy final-status cases without independent proof refuse preparation. |
| EN/FR and interaction | Keyboard/focus, accessible names/regions/announcements, mobile/tablet/desktop, reduced motion, controlled enlargement and rendered contrast have evidence. Current auth text minimum measured ratio is 4.69:1; earlier full-history measurements and read-only 13.51:1 copy remain source-bound. |
| Regression and guidance | 96 tests in five suites, changed-file lint and full TypeScript pass. The operating guide covers owners, inputs, prerequisites, retained commands and recovery. Exact reverse patches bind earlier UI evidence to current source. |

Evidence is indexed and hashed by [the immutable closure receipt](evidence/preparation-closure-2026-09-27.json). The three preceding impact receipts retain module, history and authentication changes separately; they also preserve PR-10's existing signing evidence.

## Exact current checks and retained failures

- `run-preparation-module-checks.cjs`: receipt `preparation-module-checks-05b6bb7a-fa34-452b-b3b5-0b100f3f3ef4.json`, all steps exit 0; sources stable.
- `PREPARATION_AUTH_VERIFY=true` with `verify-preparation-module-browser.cjs`: `preparation-module-browser-797651cb-ba3e-4cd3-91e0-9685636ca6c5.json`, both locales pass. Expected injected authentication transport failure and committed-response drop are recovery checks.
- `verify-run-discovery-v119.cjs`: `run-discovery-v119-be499740-2115-4d8b-a1be-5ae19b408bd8.json`, both locales pass; expected injected 503 is visibly failed and recoverable.
- `verify-run-preparation-v114.cjs`: first run `ee7a3132-0fc` printed five passing assertions and unchanged original records but exited 1 on EPERM while creating its receipt. No detailed receipt was retained; this attempt is not counted as passed. The authorized rerun saved `run-preparation-v114-ae8b96b0-19e.json`, exited 0, passed five assertions, preserved original records and source hashes.
- `audit-preparation-auth-impact.cjs`: first audit passed assertions but could not create its output under sandbox filesystem permissions. Authorized rerun saved the immutable receipt successfully. No application code or assertion was weakened.

Earlier BODY-focus reproductions and the empty-textarea contrast-harness failure remain retained and are not counted as successful accessibility verification. Corrections and their current evidence are described in the history report and authentication impact receipt.

## Review accountability and boundaries

Architecture/backend/data: existing protected actions and domain services remain the owning boundaries. Serializable writes, repeatable reads, revision checks and immutable receipts were reviewed; no schema change or migration is required. Security/privacy: active tenant actor, server-derived permissions, module grants, password freshness, private history and idempotency ownership have isolated tests. Frontend/UX/localization: existing dashboard tokens/components, textual status, labeled regions, explicit consequential action and EN/FR recovery are reused. Product/quality/SaaS operations: readiness is distinct from approval, entitlement and delivery; tests and exact source/evidence bindings support the stated outcome. SRE: atomic failure, uncertain response, retry and original-record preservation are verified; local route timings are observations, not production budgets.

Finance/ledger/payments/controls: actual clearing, independent decisions, signing/export and reversal handoffs preserve financial effects and retained obligations. Audit: original records and receipts survive recovery; corrupted evidence fails closed. API/events: the readiness observation commits in the same transaction; no asynchronous delivery is inferred. Rollout/support: use the guide below and current release controls. Statutory/country rules are unchanged; no compliance approval is inferred. POS/offline, purchasing/AP, HRIS/payroll, analytics and AI/agents are not applicable to this bounded change because it adds no behavior or data in those domains.

## Rollout, recovery and limitations

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`, then preparation. Follow [the operating guide](RECONCILIATION_PREPARATION_OPERATING_GUIDE.md). Deploy only through the existing authorized release process. No migration, seed, default migration-bearing build, live activation or external message was performed.

Keep the module-access fix when reverting presentation changes. Retained receipts require no backfill; refresh evidence and retry the same pending command after uncertain outcomes. If source changes invalidate a verified binding, rerun affected checks and reopen the corresponding criterion.

Native screen-reader speech and browser-chrome zoom remain unverified; engineering checks cover semantics, keyboard, responsive reflow, contrast and controlled text enlargement. No full accessibility, security, legal/accounting or production release certification is claimed. Missing legacy repair adapters remain PR-17 engineering requirements; preparation's verified contract refuses unsupported final labels. Live notification scheduling and exhausted-message repair remain separately registered operational requirements. This closure does not claim those workflows complete.
