# P05/P06 verification closure — 17 October 2026

**P05: PASS for the bounded checkout recovery contract. P06: integrated verification slice PASS; overall prompt remains PARTIAL.** No later prompt ran. This is local synthetic evidence, not a release, production-offline, customer-retention or accounting certification.

The final checks passed **40 mocked component tests and 25 real PostgreSQL tests**: 9 lifecycle cases plus 16 full-commit cases. One of the 16 also runs real Chromium against the production queue helper and actual ingestion/replay services. The actual authenticated POS application separately passed four recovery steps, including response loss after independently confirmed commit, same-tab reconnect/reload and original-effect preservation. French presentation was checked by restoring the exact captured pending bytes; it is not proof of every French operator interaction.

## Change and evidence

The actual browser reproduced a misleading “Sale failed” notification after a sale had already committed. The [bounded component fix](../../../../components/pos/ProfessionalPOSSystem.tsx#L1222) now uses the existing English/French uncertainty warning: the result cannot be verified, the request is retained, and the operator should check again. It changes no financial, authorization, storage or retry controls. The [new regression](../../../../components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx#L414) failed before the fix and passes afterward. All 39 pre-existing cases in that component file also pass.

The [database test additions](../../../../services/pos/__tests__/pos-full-commit.postgres.test.ts#L175) cover foreign-scope denial, concurrent offline replay, revocation after ingestion, expiry at ingestion, persisted close blockers, and browser queue/HTTP response-loss integration. The browser case requires `RUN_RETENTION_OFFLINE_BROWSER=1`; evidence output additionally requires an explicit `RETENTION_VERIFICATION_EVIDENCE_DIR`. Ordinary test invocation does not silently require this browser scenario or overwrite this historical packet.

Owned source files are the POS component, its existing component test, the existing full-commit PostgreSQL test, and the new synthetic `retention-recovery.browser-fixture.test.ts`. Owned harnesses/evidence are in this directory. Only P05/P06 RESULT notices and their two execution-register rows are updated. Original contents and precise patches are retained in this packet.

## Verification by evidence class

| Class | Actual result | Evidence and boundary |
|---|---|---|
| S — source/control | Current prompt contracts, workflow, registry, lifecycle hooks, runner/imports, POS ownership/recovery paths, design contracts and existing graph evidence inspected. Workflow contract exit 0; 196 unclassified scripts. | [Run plan](RUN_PLAN.md), [baseline](BASELINE.json). Graph refresh: 9 August 2026; navigation nodes `pos_pos_service_commitpossale` and `pos_offline_sync_service_ts`, service community 20. Current source controls behavior. |
| M — regression before fix | 1 failed, 39 filtered; expected missing uncertainty warning. | [RED result](ui-red.results.json), [log](ui-red.log). Filtered tests are not passes. |
| M — final component suite | **40 passed, 0 failed, 0 skipped**, exit 0. | [GREEN result](ui-green.results.json), [command/exit](ui-green.execution.json). Mocked hooks, storage and collaborators; not database proof. |
| D — lifecycle | **9 passed, 0 failed, 0 skipped**, exit 0. | [Lifecycle result](lifecycle.results.json), [command/exit](lifecycle.execution.json). Lease ownership, concurrency, expiry, retained intent, shift fencing, rollback and foreign tenant/cashier denial. Isolated copied tables do not certify all public-schema FKs. |
| D — final full commit | **16 passed, 0 failed, 0 skipped**, exit 0. | [Full result](full-commit.results.json), [command/exit](full-commit.execution.json), [log](full-commit.log). Real transaction, stock, cash, receivable, journal/posting, event, receipt and durable-result paths; controlled receipt/SQL fault probes. |
| D/B — integrated offline | PASS; included in the 16, not counted again. | [Queue/HTTP/DB evidence](offline-browser-1792232555173.json). Real IndexedDB, signed ingestion, interrupted acknowledgements, duplicate transport requests, reconnect/reload, real replay and unchanged financial snapshots. Test-only HTTP adapter, fixed synthetic server scope; not the authenticated offline application flow. |
| B — actual application | PASS, four steps; Chromium **149.0.7827.55**, 1366×768. | [Post-fix run](POSTFIX_BROWSER_RECOVERY.json), [uncertainty](POSTFIX_P05_EN_UNCERTAIN.png), [English recovery](POSTFIX_P05_EN_RECOVERED.png), [French message](POSTFIX_P05_FR_RECOVERED.png). Screenshots inspected. Keyboard starts the original retry; no screen-reader, device-fleet or general accessibility certification. |
| Fixture setup | Final setup passed; excluded from business-outcome totals. | [Fixture result](browser-fixture.results.json), [current synthetic identity](BROWSER_FIXTURE.json), [pre-fix identity](PRE_FIX_BROWSER_FIXTURE.json). |
| P/C/E/O | NOT_RUN. | No provider settlement/delivery, customer outcomes, qualified expert review, deployed restore/load or operational readiness proof. |

Prior P05's 109 mocked tests and P06's 58 mocked / 19 isolated browser checks remain dated historical evidence. They were not silently added to this run's totals. No broad build, lint, typecheck, test suite, installation, graph regeneration, deployment or production-data query was performed.

## What the passing checks establish

For P05, identical retries preserve one original result; substituted retained IDs and changed intent are rejected. Actual foreign organization, cashier, location, terminal and shift service inputs return non-disclosing `NOT_FOUND` for evidence reads and reject commit retries. Monetary/stock effects remain unchanged; expected rejection audit growth is tracked separately. This is a trusted-service test, not a deployed role/entitlement matrix.

The actual post-fix sale was independently confirmed at **10:15:45.223 UTC** before suppressing its response: one commit result, one stock movement, two payment records, two journals, two posting batches and one customer-ledger entry. Stock changed from 5 to 4, cash was 6, and the receivable was 4 on a total of 10. The original request remained in sessionStorage. English reconnect and French presentation retained exactly that financial snapshot. The whole-connection outage still presents the existing read-failure screen; it now truthfully warns that the sale outcome is unverified and offers recovery instead of asserting failure. French evidence restores the captured bytes after English reconciliation consumes its one-time notice; its screenshot includes a further lookup in progress, so it is not a completed French acknowledgement-flow claim.

For P06, accepted ingestion alone leaves the financial registry empty. Lost ingestion responses retain the original local identity as uncertain; reconnect resends that same signed event and receives a duplicate acknowledgement. Lost replay responses and concurrent original-event replay converge on one financial effect set and one server acknowledgement. Changed payload remains a conflict. Revoked devices retain blocked evidence; expired-at-ingestion policy retains quarantined evidence. Persisted pending/blocked/quarantined work prevents checkout readiness, and successful replay clears the tested server blocker.

## P06 limits that remain open

1. Browser-local work never sent to the server is still invisible to server-only close counts. This test does not close that missing integration.
2. The actual authenticated offline capture/flush/operator-reconciliation journey is not established by the test adapter. Production replay remains disabled; no flag enabling it was changed.
3. Revocation after ingestion and expiry at ingestion were tested. Every policy/device change interleaving during financial commit and acknowledgement, a reviewed renewal/correction path, and numeric reference-age policy remain unproved or undefined.
4. Integrated persistent-profile restart, power loss, eviction, other engines/devices and complete shift/period operator journeys were not run here. Earlier isolated persistence results remain separate.

P06 therefore remains PARTIAL. Its next continuation is to define and verify the bounded authenticated operator path and local-only pending-work visibility while preserving the original signed evidence. Do not treat these missing features as satisfied by the passing fixture, enable deployed replay, or advance later prompts through this report. P04's unrelated runtime/deployed prerequisites and release gates remain open.

## Environment, failures and preservation

The target was a newly initialized PostgreSQL **17.5** cluster, loopback port **60815**, database `stoquify_pos_audit_20261017_77f88e5fa9`. No existing customer data was copied. Schema bootstrap and a separately reviewed additive alignment were applied only to this owned target. [Environment details](ENVIRONMENT_AND_LIMITS.md), [initial schema provenance](SCHEMA_PROVENANCE.json), [alignment provenance](SCHEMA_DRIFT_PROVENANCE.json) and [alignment exit](schema-drift-apply.execution.json) distinguish datamodel preparation from migration-history/custom-trigger certification. Zero-tax fixtures are not statutory/tax evidence.

All failed attempts are retained: cold navigation/authentication deadlines, transient connection/transaction failures, the original browser notification defect, an invalid broad-selector continuation, and test-harness assumptions about automatic HTTP retries and audit counts. The invalid selector's embedded PASS is expressly disqualified in [continuation review](CONTINUATION_REVIEW.md). A later green run does not erase those failures. [Application excerpts](APPLICATION_OUTPUT_EXCERPTS.log) are incomplete local diagnostics, not performance benchmarks.

The 202-file baseline and [final validation](VALIDATION.json) distinguish owned changes from concurrent `prisma/schema.prisma` edits. The concurrent client regeneration caused a recorded missing-column fixture failure; the reviewed additive schema difference was then applied only to the disposable database. No unrelated source was reverted. `ownedPreservationPassed` verifies the original test content and that the POS component differs only by the intended notification change. The overall unchanged-baseline flag remains false because the concurrent schema drift is real; it is not hidden. [Owned UI patch](OWNED_UI.patch), [UI-test patch](OWNED_UI_TEST.patch), [database-test patch](OWNED_DATABASE_TEST.patch) and [final source record](FINAL_SOURCE.json) make ownership reviewable.

The application was intentionally stopped after browser completion. The owned PostgreSQL cluster was stopped with exit 0; [cleanup evidence](CLEANUP.json) verifies both listener ports are closed. Its directory and isolated Next output are retained for review. No customer queues, unrelated processes or working-tree edits were deleted. No staging or commit occurred.
