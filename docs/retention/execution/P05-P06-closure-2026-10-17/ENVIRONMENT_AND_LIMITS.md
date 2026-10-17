# P05/P06 verification environment and claim boundaries

17 October 2026. This packet executes only the requested P05 verification continuation and P06 integrated checks. It does not execute P07 or later prompts.

## Owned environment

The recorded target in `DATABASE_TARGET.json` is a new PostgreSQL 17.5 cluster on loopback port 60815, database `stoquify_pos_audit_20261017_77f88e5fa9`, synthetic role `retention_fixture`. It contains no copied customer data. `database.cjs` constructs the connection string from this record, clears ambient application environment values, and validates the target name/path before each operation. Local trust authentication belongs only to this disposable loopback cluster; shutting it down is part of cleanup.

The schema was generated from a copied repository Prisma datamodel, then applied to the empty owned database. This is not migration-history validation or proof of custom migration-only constraints/triggers. `SCHEMA_PROVENANCE.json` records the exact source and SQL hashes. The lifecycle suite creates and drops its own schema; its copied tables do not reproduce all public-schema foreign keys. The full-commit suite uses the real public-schema relations and actual inventory, cash, customer-ledger, posting, event and commit-result collaborators. Controlled receipt/trigger fault injection is identified in each case.

`APPLICATION_TARGET.json` records the actual Next development application, origin, PID and isolated output directory. The startup harness uses the existing safe-development helper, blocks ambient `.env` values, and supplies only the owned database and synthetic application origin. Authentication uses the real credential flow and an explicitly created verified cashier with bounded POS permissions. No production replay flag is enabled in this application.

The synthetic sale uses stock quantity 5, cost 4, sale amount 10, cash 6 and customer credit 4. Zero-tax accounting mappings exercise kernels; they certify neither a country pack nor OHADA/tax/accounting correctness. The browser fixture grants explicit permissions; it is not a role-bypass cookie or production account. Provider calls and external browser origins are blocked.

## Two different browser claims

1. `browser-recovery.cjs` drives the actual authenticated POS application. It may claim post-commit response loss only after an independent database snapshot confirms the original sale and commit identity. Its final JSON and screenshots determine the outcome. A loading screen, HTTP 200, source inspection or successful sign-in does not constitute a recovery pass.
2. The added P06 test serves the production IndexedDB queue helper to real Chromium and connects it to actual ingestion/replay services using a **test-only HTTP adapter** with fixed synthetic server-owned scope. It tests transport interruption, immutable queue identity, reconnect/reload, database effects and server readiness. It is not the authenticated Next offline checkout UI, a browser key-enrollment implementation or proof of deployed offline availability. Chromium may retry a closed socket automatically, so the adapter suppresses responses until the test explicitly restores acknowledgement delivery.

## Remaining scope boundaries

- Server-persisted pending/quarantined/blocked offline work can be checked against checkout readiness. A browser-local event never sent to the server is not thereby visible to the server. Full shift/period UI visibility of that local-only work remains a separate gap.
- Replay remains gated to test mode plus the explicit test flag. These tests do not enable or certify production replay.
- Expired-policy coverage here is expiry **at ingestion**. Revocation coverage is revocation **after ingestion and before replay**. Neither proves every authority-change interleaving during financial commit/acknowledgement.
- Existing P06 browser-profile restart, storage failure and mocked policy/reference tests remain historical, separately classified evidence. They are not silently counted as rerun here.
- No customer adoption, provider settlement, qualified expert review, deployed restore, load, screen-reader, other-browser or power-loss evidence is produced.
- Local cold compilation and database timeouts are diagnostic observations, not customer performance measurements. Failed attempts are retained; later passing attempts do not erase them.

## Concurrent working-tree drift

The selected baseline captured 202 source/prior-retention hashes before owned edits. A later check found an unrelated addition to `prisma/schema.prisma`: `AccountingPeriod.controlVersion`, `lastControlEventId`, its `controlEvents` relation, and `PeriodControlEvent`. This run did not author or revert those changes. A concurrently regenerated Prisma client then caused a fixture failure on the missing `controlVersion` column. The additive difference was generated, inspected, and separately applied only to the owned disposable database; see `SCHEMA_DRIFT_PROVENANCE.json`, `schema-drift-diff.log`, and `schema-drift-apply.execution.json`. Evidence applies to these explicitly hashed schema states, not an unspecified deployment. `VALIDATION.json` records observed drift and original-content preservation; it must not be described as an entirely unchanged checkout.

The owned existing-test change adds cases/imports to `pos-full-commit.postgres.test.ts`. Its before-content is retained, and validation checks that all original lines remain in order. The actual browser reproduced misleading failure certainty after response loss, so this run also owns the bounded notification change in `ProfessionalPOSSystem.tsx` and its regression in `ProfessionalPOSSystem.shift-close.test.tsx`. Existing English/French uncertainty messages are reused. All other code changes in the checkout belong to the existing/concurrent work unless explicitly listed in the closure result. No staging, commit, broad reset or cleanup is performed.
