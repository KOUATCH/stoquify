# Close inventory freshness: stable evidence, current sources

2026-09-30 — `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, preserved dirty shared checkout. Primary workflow **FA-CASH-COMMAND remains In progress**. The close/inventory freshness defect is corrected; successful certified-close and complete Cash workflow acceptance remain open.

## Correction and business benefit

The prior comparison treated a different observation time as changed inventory evidence. An unchanged close assessment could therefore never satisfy its later export freshness check. The baseline receipt is `lanes/environment/close-inventory-freshness-a77cf5b7-7e26-4591-8d82-e002296f20ac.json`.

Inventory reconciliation now returns two distinct hashes:

- `reportHash` retains the original report/observation-cutoff semantics.
- `evidenceHash`, version 1, covers business results, scope/policy and ordered source records independently of the observation clock. New close annexes persist this fingerprint, the observation hash, cutoff and version. Export recomputes at the current cutoff and compares source fingerprints.

The fingerprint walks all pages of the inventory movements, class-3 journal lines and their relevant account/entry fields, stock business events, completed adjustments, posted counts and inventory-level membership used by the report. It includes identities and record values, so matching totals and counts alone cannot hide offsetting corrections or replacement records. Pagination bounds memory to 250 rows per source page; it does not truncate assurance coverage. Raw rows are hashed internally, not added to the exported annex.

Assessment also now uses the tenant currency, matching export. The XOF runtime fixture exposed the previous assessment-default-XAF mismatch. The original observation-time defect and this currency mismatch are both fixed.

An existing `EVIDENCE_STALE` marker remains an explicit certification blocker even if inventory now compares fresh and a run still says READY. A new assessment is required; the patch does not silently reactivate invalidated close evidence. Legacy annexes without version 1 require regeneration rather than being guessed compatible.

## Verified behavior

`evidence/inventory-freshness-checks-4f881e25-dac3-4171-9f86-d433d281b9a1.json`: **5 suites, 146 tests**, changed-file lint and TypeScript pass. Coverage includes unchanged-source/different-time observations, offsetting values, changed ledger identity, records beyond the first page, unavailable fingerprint queries, currency alignment, legacy regeneration, fresh export and preserved invalidation. Existing permission, fresh-auth, separation-of-duties and export tests remain in the focused suite.

`lanes/environment/inventory-close-freshness-ddb3454f-6c05-4dd3-9bc2-6c418ff1ae44.json`: real reconciliation, close assessment and draft-export services against the ownership-guarded disposable database verify seven cases:

1. A new observation hash with an unchanged source fingerprint.
2. Actual XOF assessment → draft export reports FRESH.
3. A later-recorded, backdated net-zero movement pair makes the saved annex STALE despite unchanged inventory/ledger net value.
4. A new assessment restores FRESH comparison.
5. Future-effective records remain outside the earlier period.
6. Recorded invalidation remains visible in proof and in export blockers.
7. Legacy annexes remain MISSING until reassessed.

The inventory rows are explicit adversarial synthetic source fixtures, not proof of an operational transfer/posting lifecycle. The verifier created no journal entries, payments or certified exports. Trust, unresolved-finding and payroll pilot prerequisites remain genuine blockers in the actual export output.

`lanes/environment/inventory-close-browser-47b6d487-f93f-4779-9768-de222eea4d67.json`: actual app checks in EN 1440px and FR 320px used keyboard assessment and draft-export actions, created new persisted assessments and downloaded real JSON. The source fingerprint version is 1, freshness is FRESH, canonical downloaded-content hashes match persisted exports, the certification control remains unavailable to the test role, and inventory/journal/payment records remain unchanged. Two downloads and two full-page screenshots are retained. Full-page FR screenshot inspected; its reduced preview is not a contrast or screen-reader audit.

## Failed attempts and limits

- `inventory-close-freshness-eac9f1c1-3b11-433b-a4d5-3235967fb9e0.json` failed on the XOF/XAF source mismatch. The currency fix and explicit regression resolve it.
- `inventory-freshness-checks-1aeec55b-526f-4be6-baeb-19868bde773e.json` passed tests/lint but failed TypeScript because period-summary typing inherited the added organization relation. Its type now names only the five fields it consumes; the final suite passes.
- Earlier passing checks/runtime before the final currency/invalidation/type adjustments remain historical, not the final verification binding.
- No approval-review rejection occurred. Sandbox-denied writes to existing tests were retried through approved escalation. No migrations, deployment, real payments or external messages occurred.

The browser recorded EN route-ready/assessment/export observations of 113,952 / 4,287 / 10,836 ms; FR 11,090 / 2,913 / 8,383 ms. Export measurements include download assertions and screenshot work. These are development observations on one small synthetic tenant, with network interception disabling HTTP cache. They neither establish production performance nor isolate the cause of the long initial navigation. Additional complete source scans cost work proportional to source volume; production-volume performance remains unverified.

This comparison does not certify transaction-wide consistency under concurrent source mutation; complete certification concurrency/release assurance remains open. No genuine certified-close happy path is claimed. Broader new-error translation, native screen-reader/zoom and existing close-page density/long-table behavior remain part of the outstanding workflow checks.

## Operator steps and rollout

Open `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close`. Select the correct period and use **Run assessment / Lancer l'evaluation** with `accounting.close.run` permission. An authorized operator can export the draft using `accounting.close.export`. The new assessment generates the fingerprint automatically; no user should enter or edit it.

For legacy or invalidated evidence, retain the earlier run/export as history and run a new assessment. Resolve the new assessment's controls before asking an independently authorized certifier to certify. The correction removes false freshness failures; it does not supply payroll pilot, expert-review, statutory authority or other missing approval evidence.

No schema migration or data backfill is needed. Deploy assessment and export code together when an authorized release is approved; use an isolated cohort first. Rollback must preserve retained historical records and revert only this patch against the captured originals. Reverting reintroduces false freshness/currency failures; do not rewrite hashes to make mixed versions agree.

## Review scope

Architecture/backend/data: separate observation and source-revision contracts; stable scope/policy and complete source coverage; no alternate ledger. Finance/audit: current and backdated sources remain visible, historical evidence retained, certification blockers preserved. Security/privacy: tenant-scoped source queries and existing action authority retained; exported content does not expose hashed raw populations. UX/localization: actual existing EN/FR assessment/download actions verified, no new shell or design-system components. Quality/SRE: focused tests, real services, browser downloads and source bindings; performance and concurrency limits explicit. Product/operations: regeneration is automatic through the existing assessment workflow. Statutory/payroll: no claimed professional approval or completed pilot. Billing, external providers, offline/POS execution and AI behavior: not applicable to this comparison correction.

Dependency discovery used the existing graph action node `accounting_close_assurance_actions_ts` (community 6); action → assessment/export → inventory relationships were checked in current source. Next: resolve the remaining close certification prerequisites/applicability, and continue Cash accessibility and recovery criteria without fabricating approval evidence.
