# PR-10 — recovery races and signed-event handoff

2026-09-27 UTC, branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, with unrelated changes preserved. The previous goal turn made progress through the recovery interface. This turn makes progress through six additional race/setup checks and correction of a missing notification consumer. **PR-10 remains In progress; the full platform goal is active.**

## Recovery ordering: current evidence

`verify-recovery-races.cjs` uses real PostgreSQL transactions and barriers around the relevant service reads. Provider suspension and a changed reviewed provider revision refuse submission without recovery effects. Closing the accounting period before submission also refuses it. Closing the period after the run read but before the transactional period lock causes a conflict and no recovery effects.

When an earlier signing or preparation transaction is held after reading the run, newly captured sources can be incorporated by another transaction. Releasing the earlier operation cannot overwrite that committed recovery: the run remains `NEEDS_REVIEW`, its amount is 125.25 XAF, two matches are retained, and no signature, preparation audit, signed event or journal is created. A fresh preparation preview remains available.

Evidence: [initial receipt, two provider cases passed](lanes/environment/recovery-races-5b280a77-ddd0-4dfb-bae3-a223537caa9e.json), [four remaining cases passed](lanes/environment/recovery-races-c6e52e7e-94b2-45fb-8ea7-6fcbdef5c709.json). The first run stopped because the verifier assumed initial runs already stored an accounting-period ID. The corrected verifier resolves the owned period by tenant/date; only the four unfinished checks were rerun using `--remaining`. Application source remained unchanged. Direct period-state changes are controlled test interleavings, not proof of the complete period-close workflow.

These checks establish their particular ordering; they do not establish all provider/source/period interleavings, a complete statement-source recovery journey or production-scale behavior.

## Missing handoff corrected

Source tracing found that signing atomically recorded `payment.reconciliation.signed` in `BusinessEventOutbox`, but no consumer dispatched that event. The existing reconciliation alert scan handles different observations; it does not consume this outbox. Graph action community 14 and app node `reconciliation_page_financereconciliationpage` locate the dashboard boundary; current source verified the relationships and the missing consumer.

`reconciliation-sign-notification.worker.ts` now claims only the named event on the `NOTIFICATION` channel for an explicitly supplied organization. It validates the current lease/attempt, both payload hashes, event type/source, tenant, run and certificate linkage, and retained signing audit before publishing to the existing reconciliation inbox. An event-ID deduplication key preserves the original observation on retry. Historical publication does not change the current run, grant access, create a journal or establish present readiness.

The new operator command uses the existing outbox backoff and failure controls. In this consumer, `SENT` means the observation was durably published to the workspace inbox. It does not mean a user read it or an external provider delivered it. No email, SMS or other external channel is used.

EN/FR labels say that a signature was recorded. Visual inspection caught the existing fallback giving severity-free `Information` badges warning styling. The inbox now uses the existing neutral filter-chip treatment for informational observations; recorded warning/critical severities retain their treatments. No new design tokens or shell were added.

## Verification

| Check | Evidence / result |
|---|---|
| Competing workers and retry | [Database receipt](lanes/environment/sign-notification-5ee2ff81-3256-44cb-a32e-17f2f2f20a78.json): two workers publish one observation; unrelated provider outbox and financial/signature records remain unchanged. A forced acknowledgement-audit failure after inbox publication records `FAILED`; early retry claims nothing. After the real backoff, retry reaches `SENT`, retaining the original inbox bytes and one delivered audit. |
| Actual command entry | [CLI receipt](evidence/sign-notification-cli-f9469c6a-4552-4c57-b550-581e9d84217f.json): the command's real main function processes one newly signed synthetic event and exits 0. |
| Focused checks | [Final receipt](evidence/sign-notification-checks-ac7189f6-8b0c-48fd-bb5c-03349d663052.json): 104 tests/six suites, six changed TypeScript files linted, full migration-free TypeScript check passed with stable recorded source. Earlier [failed receipt](evidence/sign-notification-checks-b1c7dce6-440d-40cf-bc3c-1e089af7b4c7.json) records a malformed Jest table row; the empty array was interpreted as a callback. Corrected test input uses explicit argument objects. |
| Initial application check | [EN/FR receipt](lanes/environment/sign-notification-browser-4e9395bf-43a1-414e-82f0-cfa99f640d68.json): actual authentication, signed observation once, retained snapshot description, 1440/768/320 reflow, controlled 200% root text, reload without observation changes and no journals. No page errors. This run exposed the informational badge styling, corrected afterward. |

[Final EN/FR badge verification](lanes/environment/sign-notification-browser-40c48c10-4020-4dee-9610-c57f9f2a2d6b.json) passed with stable source: neutral information badges explicitly checked, three widths and controlled text enlargement, exactly one signed observation after reload, unchanged retained bytes and no journals. The corrected French mobile screenshot was visually inspected. Initial entry times were EN 51,477 ms / FR 6,382 ms; the warm repeat was EN 10,190 ms / FR 5,589 ms. Different cache/compilation conditions prevent attributing this as an implementation speedup. The owned port-3110 server was stopped after verification. Source/receipt checks are scoped evidence, not a professional security, accounting, accessibility or release certification. The full workbench suite's UI controls were regression-tested; native assistive-technology speech and browser-chrome zoom were not exercised.

Commands are `node .../lanes/environment/verify-recovery-races.cjs`, the same with `--remaining`, `node .../lanes/environment/verify-sign-notification.cjs`, `node .../run-sign-notification-checks.cjs`, and `node .../lanes/environment/verify-sign-notification-browser.cjs`, where `...` is `what-next/workflow-modernization/2026-09-05-run-01`. Test receipts retain exact arguments and source hashes.

All runtime checks use the guarded loopback disposable database `stoquify_local_registration_20260906_01`, synthetic signed records and an external-network fence. No migration, reset, production deployment, live approval or external notification occurred. The original dashboard alert trigger is retained; the earlier automatic-review rejection of removing it has not been bypassed.

## Operator and user guide

Users open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation` and inspect the existing reconciliation inbox. Its latest-25 scope and historical-observation explanation remain. Check the current run and retained certificate before acting; an older ready-for-signoff observation can coexist with a later recorded signature.

Operators need an authorized database target from deployment configuration, an organization ID from the tenant registry, a unique worker identity from their job host, and a batch limit from their execution budget (1–100; default 25). The system supplies event, certificate, run and audit references. No signed document or invented reference is needed to run this technical consumer.

The command is `scripts/reconciliation-sign-notification-worker.ts`. Run with the repository's installed TypeScript runtime and existing server-only/alias preload, on the authorized target. For a configured PowerShell host:

```powershell
$env:TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS","moduleResolution":"node"}'
node -r ./scripts/register-server-only-shim.js -r ts-node/register/transpile-only -r tsconfig-paths/register scripts/reconciliation-sign-notification-worker.ts --organization-id <tenant-id> --worker-id <unique-worker-id> --limit 25
```

Exit 0 means this batch/help completed, not that the queue is empty; exit 1 means a failure requires attention. Failed messages retain safe error code/message, attempt count and `availableAt` in `BusinessEventOutbox`. Inspect those fields through authorized operations access, alongside the linked event and signing audit. Retry transient failures after the recorded backoff. Do not alter evidence hashes, invent an inbox row, or mark an event delivered manually. Exhausted or invalid-evidence records require an evidence-backed repair/requeue process; a general operator requeue interface is not supplied by this patch.

No schedule was installed. The platform operator must wire and monitor this command on an authorized host as part of rollout; that is distinct from the verified one-off CLI execution. Keep inbox and event history during rollback. Removing this consumer would leave new signature events pending again, so pause its execution and investigate failures without deleting retained observations or weakening signing controls.

## Remaining work and review responsibilities

Remaining PR-10 criteria include retained-reference manual resolution and statement-source recovery coverage, source-volume review, remaining sign-review contrast/enlargement and direct-authority evidence reconciliation, and entry-latency diagnosis. Reverse race orderings and the separately registered PR-06 caller remain explicit checks. Full notification scheduling, exhausted-message operator recovery and external delivery belong to their operational workflow boundaries; none is silently marked complete by this consumer.

Architecture/backend/data: existing outbox, transaction and inbox reused; no schema changes. Security/IAM/privacy: explicit internal tenant, current lease and immutable evidence validation; existing protected inbox reads reused. Finance/audit: actual signed records and audit linkage; no money movement or new approval. Frontend/UX/localization: existing neutral/information semantics and EN/FR historical wording. Quality/SRE/operations: real races, competing workers, lost acknowledgement/backoff, runnable CLI and source-bound tests; deployment/scheduling unverified. Product/SaaS: recoverable visibility without new package or price. Statutory/country rules: not applicable to the change, as no statutory rule changes. POS/offline, purchasing/AP, HR/payroll, analytics and AI: not applicable to the affected behavior; their workflows remain in the full register.
