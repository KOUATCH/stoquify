# PR-10 — signing module authority inside the transaction

Source: `62a56036a5ac9b37236a20c9b148052199069479`, branch `codex/migration-control-plane-release-2026-08-29`, with preserved working-tree changes. This is a correction to independent reconciliation sign-off; PR-10 remains In progress.

## Reproduced gap and delivered correction

The outer action admitted signing, then a module grant became read-only before the signing service transaction. The service still created a signature. The preview also offered signing while module writes were unavailable. The [reproduction](lanes/environment/sign-module-boundary-2eeac7f8-36fb-4dc4-ac10-8bc3a88cf899.json) records that defect; its `passed` field means reproduction succeeded, not that the behavior was acceptable.

Signing and concurrent-sign recovery now use the existing transaction-aware module evaluator before loading the run. It locks current organization, configuration and grants and enforces reconciliation write access and its finance/accounting dependencies. Denials retain a security audit without creating a certificate, signature event or financial posting. The preview separately evaluates read and write admission; authorized readers get an explicit EN/FR explanation when signing is unavailable. Pending requests remain stored, but Retry is disabled while the preview reports read-only access.

A real withdrawal-first PostgreSQL race exposed a second defect: the locking query can report serialization failure as Prisma `P2010` with SQLSTATE `40001`. Recovery now recognizes that exact pair and rechecks current authority. Other raw SQL errors are not treated as replay. The certificate payload, amount calculations, domain approvals and financial effects are unchanged.

## Current verification

- [98 tests across four focused suites, changed-file lint and full TypeScript passed](evidence/sign-module-checks-ec515a6e-74f6-4e6a-aac9-d4b469c6fa4f.json). Tests cover transaction denial, preview read/write differences, recovery, exact raw-error classification and pending Retry behavior.
- [Eleven persisted module scenarios passed](lanes/environment/sign-module-boundary-b7f296a3-c567-4e7c-a8c1-45d0dd41d3db.json): withdrawal after admitted action, read-only flag, suspension, expired status/interval, future grants, suspended finance, read-only accounting, explicit empty grants, denied signed replay and restored exact replay. One signature and no journal remain after restoration.
- [Both real lock orderings passed](lanes/environment/sign-module-ordering-9f711f29-9cc2-44fe-aeb5-e8ac0b99553f.json), with observed PostgreSQL transaction-lock waits. Withdrawal first prevents signing. Signing already holding the authority locks completes before withdrawal; subsequent signing replay is denied. The earlier receipts `915f9428` and `0208a5cd` retain the generic-error failure and its exact SQLSTATE diagnosis.
- [Four same/other-signer transaction races passed](lanes/environment/signoff-request-order-20cdb246-bf04-42de-aecb-a48cb3ad94bd.json), covering later-start winners and concurrent Serializable submissions, with one certificate/event and no journal.

Commands: `node .../run-sign-module-checks.cjs`, `node .../lanes/environment/verify-sign-module-boundary.cjs`, `verify-sign-module-ordering.cjs`, `verify-signoff-request-order.cjs` and `verify-sign-module-browser.cjs`. Browser uses the inspected loopback `supplier-ack-local.cjs` wrapper. All database fixtures are restricted to owned `stoquify_local_registration_20260906_01`; external access is fenced. No migration, seed, live activation or external message was performed.

## Browser result and evidence binding

[Both actual EN/FR journeys passed](lanes/environment/sign-module-browser-5b024f4d-92fc-4ea7-a6b5-2734cdee56e5.json), with stable source hashes and no page errors or missing translations. Each starts with a read-only preview, restores writes, confirms the password, suspends access before the pending action, observes full module denial with no signature, restores read-only access with Retry disabled, restores writes and signs the exact retained revision once. The resulting certificate downloads under read-only access; actual downloaded bytes match the persisted receipt and certificate hash. Closing export returns focus to its opener. Both journeys have one signature audit/event and no journal.

Read-only review and module-locked route scans have zero selected axe A/AA violations. Each language has nine rendered review contrast records (including disabled-control exemptions) and four module-locked records; all applicable measured nodes pass. Both languages have actual 320/768/1440 screenshots and controlled 200% root-font enlargement without horizontal overflow. The English and French 320px screenshots were visually inspected. This is not native screen-reader speech or browser-chrome zoom certification.

Entry to the initial read-only review measured 89,775 ms EN and 18,716 ms FR in this freshly started developer application. This run does not separate compilation, server and browser phases, and is not a like-for-like warm performance comparison. Keep these slower observations alongside the earlier warm baseline; they do not demonstrate a performance improvement. Profiling remains necessary.

[Current binding](evidence/sign-module-current-bindings.json) verifies all five passed receipts against current source. Prior amount/certificate algorithms are unchanged; earlier ready/signed contrast remains bounded historical evidence because this change adds the module-blocked branch without altering that styling/layout. General error/authentication contrast remains open.

## Operator guidance and recovery

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`. An independent signer needs current read/sign permissions, an active account, fresh authentication and write access to reconciliation and required finance/accounting capabilities. Read-only access permits authorized viewing; it does not permit signing.

If writes are unavailable, the organization's module administrator should inspect the actual grants, validity dates and required dependencies. Restore access only through the existing authorized configuration process. Refresh the review and explicitly retry the retained command. An uncertain command is not permission to bypass a current denial. Existing certificate export has separate read/export authority and retained-record checks.

No schema migration is required. Roll out through existing release controls. Keep pending identities, certificates and security audits during recovery. Reverting this guard would restore the reproduced authorization gap.

## Review responsibility and remaining work

Architecture/backend: canonical service and shared transaction evaluator. Security/IAM/privacy: current tenant module authority, denied replay and audit retention. Data/finance: transaction ordering, one certificate/event, no duplicate financial effects. Product/UX/localization: explicit read-only explanation and retained request recovery. QA/SRE: actual lock observation and focused regression evidence. Packaging: existing grants and dependencies, no pricing or commercial-policy changes. Statutory/country rules, payroll, inventory/POS/offline and AI are not applicable: their policies and records are unchanged. No professional or release certification is claimed.

This demonstrated signing-authority defect took priority over warm-entry optimization without changing the primary workflow. Remaining work is the complete PR-10 evidence reconciliation, outstanding error/authentication accessibility checks and attribution of the previously measured roughly eight-second warm entry. Live worker scheduling and general exhausted-message repair/requeue remain separate operational boundaries.

The owned loopback verification application was stopped after the successful browser run. The workflow register and CURRENT_PROGRESS.md were recalculated; no additional workflow closure was claimed.
