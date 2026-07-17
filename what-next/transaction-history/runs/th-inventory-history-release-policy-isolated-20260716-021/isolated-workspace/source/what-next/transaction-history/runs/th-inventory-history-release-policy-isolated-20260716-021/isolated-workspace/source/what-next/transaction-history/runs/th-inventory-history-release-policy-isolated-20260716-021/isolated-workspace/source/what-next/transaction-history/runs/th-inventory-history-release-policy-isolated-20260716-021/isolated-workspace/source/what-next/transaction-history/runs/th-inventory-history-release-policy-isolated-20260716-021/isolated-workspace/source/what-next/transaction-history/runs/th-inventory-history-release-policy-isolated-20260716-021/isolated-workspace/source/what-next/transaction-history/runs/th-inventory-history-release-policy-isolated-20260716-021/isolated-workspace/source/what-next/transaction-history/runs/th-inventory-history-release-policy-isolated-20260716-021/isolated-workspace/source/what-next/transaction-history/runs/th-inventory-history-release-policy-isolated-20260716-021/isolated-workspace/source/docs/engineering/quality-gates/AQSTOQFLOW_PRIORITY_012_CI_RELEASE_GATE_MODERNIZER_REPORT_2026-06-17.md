# AqStoqFlow Priority 012 / Exam 015 CI Release Gate Modernizer Report

Date: 2026-06-17

## Skills Run

- `exam-015-aqstoqflow-ci-release-gate-modernizer`
- `priority-012-ci-release-gate-modernizer`

## Objective

Modernize the AqStoqFlow release gate so CI and local verification no longer rely on deprecated lint commands, lint-skipped production builds, or disconnected policy scans. The release path now has a single canonical command that validates Prisma schema, TypeScript, policy ratchets, lint, build, and Jest regression tests.

## Files Changed

- `package.json`
- `.github/workflows/ci.yml`
- `what-next/AQSTOQFLOW_PRIORITY_012_CI_RELEASE_GATE_MODERNIZER_REPORT_2026-06-17.md`

## Release Gate Changes

- Replaced the deprecated `next lint` script with a supported ESLint CLI command over the application source directories.
- Removed the lint-skipped production build path from the default `build` command.
- Added a split build structure:
  - `build` delegates to `build:linted`.
  - `build:linted` runs lint before the application build.
  - `build:app` runs `next build`.
- Added `policy:gates` as the release policy aggregate for:
  - inventory boundary fail gate
  - service-boundary ratchet
  - raw-error boundary fail gate
  - demo/report trust fail gate
- Expanded `verify:repo` into the canonical release verification command:
  - Prisma schema validation
  - TypeScript typecheck
  - policy gates
  - linted production build
  - full Jest suite in band
- Added `verify:release` as an alias to `verify:repo`.
- Added `.github/workflows/ci.yml` so pull requests and pushes to `main`, `master`, and `develop` run the canonical gate on Node 20 with `npm ci`.

## Design Notes

- `build:app` intentionally does not run `prisma generate`. Prisma generation remains explicit through `npm run prisma:generate` and existing install workflows, while the release gate validates Prisma schema through `npm run prisma:validate`. This avoids Windows query-engine file lock failures that appeared when Prisma generation was repeated late in the verification chain.
- The service-boundary gate remains a ratchet rather than a hard fail for all existing findings. This keeps the release gate practical while still preventing new boundary debt.
- No application services, actions, hooks, UI, Prisma schema, or migrations were refactored in this slice.

## Verification Run

- `npm run lint`
  - Passed with 0 errors.
  - Existing warnings remain:
    - `components/auth/EmailVerificationForm.tsx`: React hook dependency warning.
    - `components/dashboard/items/ModernItemFormForEditing.tsx`: `next/no-img-element`.
    - `components/frontend/custom-carousel.tsx`: `next/no-img-element`.
    - `components/ui/groups/inventory/ItemManagement.tsx`: `next/no-img-element`.
    - `config/permissions.ts`: anonymous default export warning.
- `npm run inventory:boundary:fail`
  - Passed with 0 active violations and 22 allowed kernel/test findings.
- `npm run service:boundary:ratchet`
  - Passed. Active service-boundary debt is below the tracked baseline and no new findings were introduced.
- `npm run error:boundary:fail`
  - Passed with 0 active unsafe raw-error findings and 35 allowed findings.
- `npm run demo:trust:fail`
  - Passed with 0 active production trust findings.
- `npm test -- scripts/__tests__/service-boundary-gate.test.js scripts/__tests__/raw-error-boundary-gate.test.js scripts/__tests__/hard-delete-gate.test.js scripts/__tests__/demo-report-trust-gate.test.js --runInBand`
  - Passed: 4 suites, 21 tests.
- `node scripts/service-boundary-gate.js --mode report`
  - Passed: 164 active service-boundary findings, 4 allowed findings, 168 callsites scanned.
- `npm run verify:repo`
  - Passed.
  - Included Prisma validation, typecheck, policy gates, linted Next.js build, and full Jest suite.
  - Full Jest result: 76 suites passed, 338 tests passed.

## Remaining Release Risks

- Existing service-boundary debt remains at 164 active report-mode findings. The ratchet prevents regression, but the codebase is not yet boundary-clean.
- Existing lint warnings remain non-fatal. A future hardening slice should either fix them or intentionally ratchet warnings before enabling `--max-warnings=0`.
- Prisma emits the existing Prisma 7 deprecation warning for package-level Prisma configuration. A future slice should move this to `prisma.config.ts`.
- The GitHub Actions workflow uses a placeholder CI `DATABASE_URL` and no database service container. This is sufficient for the current validation/test shape, but DB-backed integration tests will require a service container or managed CI database.

## Completion Status

Priority 012 / Exam 015 is complete for this implementation slice. AqStoqFlow now has a canonical local and CI release gate that connects lint, build, typecheck, Prisma validation, policy ratchets, and Jest tests.
