# Verification commands and boundaries

Run from repository root in PowerShell. `$taskBase` below is `what-next/hris-implementation-2026-10-24/HR-21/development-09`. Every process exit status is checked. Commands were inspected before use; no generic build, schema promotion, seed or production connection ran.

```powershell
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config jest.hris-termination.config.cjs --runInBand
node node_modules/jest/bin/jest.js --config jest.hris-fresh-auth-ui.config.cjs --runInBand --runTestsByPath components/hris/__tests__/HrisPeopleAuthoring.test.tsx
node what-next/hris-implementation-2026-10-24/typecheck.cjs "$taskBase/typecheck.log" services/hris/lifecycle.service.ts services/hris/payroll-handoff-read.service.ts services/payroll/payroll-control.service.ts components/hris/payroll-handoff-copy.ts components/hris/HrisPeopleAuthoring.tsx components/hris/HrisLifecycleTasks.tsx
node "$taskBase/preflight.cjs"
```

The database/browser runners require the exact disposable `HRIS_CORRECTNESS_DATABASE_URL` for `hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public`. They refuse other targets and environment-file reads. PostgreSQL was started only from the previously owned `hris-postgres-20261024` data directory. The isolated copied Next application uses port35585, its own output/configuration, root source junctions with provenance hashes and no root application environment. Credentials are generated in memory; external browser requests are blocked.

```powershell
node "$taskBase/regression.cjs" --baseline # expected exit1: 11 failures of13
node "$taskBase/regression.cjs"            # expected exit0: 21 passes
node "$taskBase/browser.cjs"               # requires prepared owned runtime; 13 stages
```

Runners create synthetic organization-scoped records and verify cleanup. Handoff cleanup validates the exact target and ownership, uses an exclusive table lock and temporarily disables only the two named immutable evidence guards inside its transaction; original guard states are restored and verified before commit. No global trigger disabling or unrelated record deletion.

Owned tracked-file whitespace check covers lifecycle service/test, payroll-control service and scoped changes; untracked owned files are additionally syntax/typechecked and source-hashed. `seal.cjs` reads final results, asserts source/runtime/configuration identity, checks shutdown and reviewer verdict, then writes and reads back the local evidence manifest. It does not execute application or database code.

Original snapshots and previous manifests remain historical evidence. No commit or staging was requested or performed.
