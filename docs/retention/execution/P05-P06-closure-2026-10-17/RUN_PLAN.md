# P05/P06 verification closure — 17 October 2026

Authorized scope: close the missing P05 verification, then exercise P06 integrated recovery with a disposable database. No P07–P24 execution, deployment, existing database access, provider operations or customer contact.

Baseline: `BASELINE.json` records HEAD `b044764248f1ac47705371c235c2ba273dd973a7` and 202 selected source/prior retention hashes. A whole-tree Python hash attempt was interrupted without output before any existing-file edits; the narrower Node capture completed. Prior reports are historical, not current release certificates.

Owned files: this dated run directory, `services/pos/__tests__/retention-recovery.browser-fixture.test.ts`, inserted cases/imports in `services/pos/__tests__/pos-full-commit.postgres.test.ts`, and eventual dated links/status updates for P05 and P06 only. The full-commit pre-edit bytes are saved as `pos-full-commit.before.ts.txt`. Production behavior is not changed by the verification fixtures.

The installed ECC verification-loop skill is adapted to the repository's verification lanes. Broad build/lint/coverage commands are not used as a shortcut. The current workflow runner, package hooks, command registry, test setup/imports and database guards were inspected first. `npm run agent:workflow:check` passed with 196 unclassified scripts.

## Target and evidence boundaries

- PostgreSQL 17.5, newly initialized cluster under `.codex-tmp/retention-p05p06-77f88e5fa9`, loopback port 60815. Database `stoquify_pos_audit_20261017_77f88e5fa9`. No existing cluster or data was cloned or queried.
- Current Prisma datamodel was copied to the owned temporary directory, transformed to SQL with the installed CLI, and applied to the empty database. This is not migration-history/custom-trigger validation. Schema hashes and exact commands are saved separately.
- Lifecycle suite owns and removes `codex_pos_lifecycle_20260920`; full-commit fixtures use fresh synthetic tenants in public. Failure triggers/functions/sequences are scoped and cleaned by their tests. Synthetic zero-tax mappings are not statutory accounting certification.
- Actual Next application: `http://127.0.0.1:3187`, synthetic verified cashier with explicit POS permissions. Launcher blocks ambient environment values and uses isolated output/tsconfig. No production replay flag is enabled.
- Chromium 149.0.7827.55; application viewport 1366 × 768. Browser requests to external hosts are blocked. A dropped response must follow an independently observed committed result, retaining the same original request ID.
- The P06 integrated browser/DB test uses production queue and services through a fixed-scope **test-only HTTP adapter**. It cannot certify the authenticated Next offline flow, device enrollment UI, or a queue that has never reached the server.

## Sequence and checks

1. Revalidate source and run current lifecycle/full-commit suites; retain failures and reruns.
2. Add only missing concurrent offline replay, post-ingestion revocation, expired-policy ingestion, and persisted close-readiness assertions.
3. Exercise actual cashier recovery in English/French with lost response, reload, original identity, independent financial counts and keyboard use.
4. Exercise real browser queue → real PostgreSQL ingestion/replay with lost HTTP responses. Distinguish ingestion acknowledgement from economic completion.
5. Compare selected source/prior evidence hashes and exact owned test diff; save per-class results and blockers. Stop owned application/database processes while retaining the owned database directory and evidence. Do not claim P05/P06 complete when required behavior remains absent or a mandatory check fails.

Existing graph refresh is dated 9 August 2026. Navigation nodes include `pos_pos_service_commitpossale` and `pos_offline_sync_service_ts` (service community 20); current source and runtime checks determine behavior. No graph regeneration or missing graphify skill invocation is claimed.
