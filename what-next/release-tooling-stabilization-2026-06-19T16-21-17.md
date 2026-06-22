# AqStoqFlow Release Tooling Stabilization

Timestamp: 2026-06-19T16:21:17 Europe/Paris

## Scope

Stabilized the release tooling before the next service-boundary slice.

- Moved the Prisma seed configuration out of `package.json#prisma` and into `prisma.config.ts`.
- Preserved the existing seed command exactly as resolved by Prisma config:
  `ts-node -r tsconfig-paths/register --compiler-options {"module":"CommonJS","moduleResolution":"node"} prisma/comprehensive-seed.ts`
- Tightened `verify:repo` so it is the single release-gate command:
  `prisma:validate`, `typecheck`, `lint`, `policy:gates`, `build:app`, then the full Jest suite.
- Added the missing hard-delete gate to `policy:gates`.
- Refreshed the service-boundary ratchet baseline under `what-next/service-boundary-ratchet-baseline-current.json`.
- Applied one narrow type fix in `components/finance/FinanceSpecializedLedgerSurfaces.tsx` so the release gate can pass: normalize `useLocale()` to the existing `Locale` union before calling `localizePath`.

Existing seed files were not modified by this task.

## Validation Results

| Command | Result | Summary |
| --- | --- | --- |
| `npm run prisma:validate` | PASS | Prisma loaded `prisma.config.ts`; schema is valid; the old `package.json#prisma` deprecation warning is gone. |
| Prisma config seed check via `loadConfigFromFile` | PASS | Resolved seed command matches the previous package-json seed command. |
| `node scripts/service-boundary-gate.js --mode report --json-out what-next/service-boundary-ratchet-baseline-current.json --out what-next/service-boundary-ratchet-baseline-current.md` | PASS | Current service-boundary baseline saved with 76 active findings, 3 allowed findings, 79 scanned callsites. |
| `npm run policy:gates` | PASS | Inventory boundary 0 active; service-boundary ratchet 76 baseline / 76 current; hard-delete 0 active; demo-trust 0 active; raw-error 0 active. |
| `npm run typecheck` | PASS | TypeScript completed with 0 errors after the narrow Locale annotation fix. |
| `npm run verify:repo` | PASS | Full release gate completed: Prisma validation, typecheck, lint, policy gates, Next build, and Jest. |

## Final Gate Detail

`npm run verify:repo` passed.

- Lint: 0 errors, 5 existing warnings.
- Policy gates:
  - Inventory boundary: 0 active violations.
  - Service boundary: 76 active findings, baseline delta 0, ratchet passed.
  - Hard-delete: 0 active unsafe findings.
  - Demo/report trust: 0 active findings.
  - Raw-error boundary: 0 active unsafe findings.
- Build: `next build` completed successfully.
- Tests: 82 suites passed, 372 tests passed.

## Residual Risks

- The service-boundary gate is still in ratchet mode, not zero-violation mode: 76 active findings remain as the accepted current baseline.
- Lint still reports 5 warnings that predate this tooling stabilization.
- The worktree was dirty during this run; unrelated existing changes were left in place.
- Several commands had to run outside the managed sandbox because the Windows sandbox helper failed during setup before command execution.
