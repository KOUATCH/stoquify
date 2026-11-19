# AF07 statement ingestion and account-coverage operations

20 October 2026 · Synthetic pilot support · No deployment performed

## Rejected format

Use the safe error and correlation ID to identify the failed input. Check [SUPPORTED_FORMATS.md](SUPPORTED_FORMATS.md) before preparing another file. Correct an authorized source export or its reviewed mapping; do not guess date order, monetary separators, negative-sign meaning or provider identity.

Keep the original source in the approved evidence store under existing access controls. Do not put raw counterparty details, credentials or whole client statements in logs, issue trackers or public fixtures. AF07's test files are synthetic.

Files above 5 MiB or 1,000 records are unsupported by this synchronous pilot path. Do not blindly split statements and assume complete period coverage. A reviewed partition must preserve source identity, account, declared period evidence and duplicate behavior. Larger ingestion needs measured work before raising the limit.

## Duplicate or changed source

An exact retained file returns its stored result. A duplicate/changed identity holds the entire new file as a duplicate-provider-reference case. Repeating the same held file returns the existing exception. Inspect both source records through the existing authorized reconciliation workflow.

Do not modify a transaction ID or decimal spelling merely to bypass the duplicate guard. Corrections and reversals belong to approved domain procedures. Do not delete retained statement lines, exceptions, event/outbox records or signatures to manufacture a clean import.

## Provider outage or absent statement

An outage is missing evidence, never zero activity. Review account coverage reasons, uncovered intervals and evidenceDueAt/overdue. Record the external outage/source reference through the existing evidence request workflow; use AF06 to request and track evidence from an authorized client recipient.

Only independently reviewed no-activity evidence can establish a zero-activity result. A newly received transaction or unresolved obligation contradicts that result. Once sources arrive, rerun existing reconciliation/Close assessment rather than marking the old proof current by hand.

## Uncertain response, timeout or connection loss

Retain the existing provider-operation intent and retry the **same account, exact file bytes and operation idempotency key**. Use the existing IMPORT_UNCONFIRMED/review-required recovery result. Do not automatically create a new intent, change the file, sign a run or assume the absence of a response means rollback.

The SQL tests prove one atomic rollback path and concurrent replay behavior. They do not simulate every network partition or a live provider timeout. Database and operation receipts remain the basis for determining what committed.

## Stale signed evidence

`STALE_SIGNOFF` means the stored certificate or its source manifest no longer proves current coverage. Existing missing/partial signoff reasons continue to identify the uncovered window. Review the changed source, rerun reconciliation, prepare and obtain an independently authorized signature through existing services.

The coverage read preserves the historical artifact and does not sign or invalidate financial data itself. New imports retain the existing Close-certification invalidation transaction. Source-read failure means unavailable evidence, not a green account.

## Activation, monitoring and rollback

Activation requires the existing authenticated/authorized import action, correct account mapping, module access/new-work admission and reviewed pilot format samples. No new flag framework, entitlement, role or membership model was introduced. No live provider credential, webhook signature or country rule changed.

Monitor format rejections, duplicate cases, import duration/timeouts, IMPORT_UNCONFIRMED outcomes, stale signoffs and overdue account gaps using existing operational logs and queues. Inspect correlation IDs and persisted outcomes; a log emitted before transaction completion is not a commit receipt.

If new inputs cannot be processed reliably, pause new statement submissions through existing operations/module controls and preserve retained reads and authorized recovery. Keep records and fingerprint versions. Reverting the application change requires review: restoring the permissive parser can accept ambiguous inputs, and restoring the old coverage reader can hide stale proof.

AF07 introduces no schema migration and no data-retention deletion. Production rollout, scale/load qualification, official provider samples and the whole AF01–AF08 release decision remain AF16/pilot gates.

## Repeatable local verification (R9 review)

Use an isolated source candidate with no `.env*` files and its own generated `@prisma/client`. The fixture and PostgreSQL tests require `AF07_POSTGRES_URL` with an explicit `127.0.0.1` port and a `stoquify_local_af07_` database name, plus an absolute `AF07_CLUSTER_DIR`. They compare the server's actual data directory before fixture writes. The fixture refuses an existing database; it does not reset or reuse a historical target.

Set `AF07_EVIDENCE_DIR` to a fresh absolute directory for migration and performance receipts. Tests omit performance-file output when this variable is absent. Existing receipt files are never overwritten. The ordinary Jest and TypeScript configurations use the installed generated client, without a private workspace or temporary client alias. These local checks do not authorize schema promotion or deployment.
