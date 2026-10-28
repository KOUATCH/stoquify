# Stoquify Landing Release Gate - 2026-07-19

## Decision

NEEDS WORK for full release certification.

The landing slice is now implementation-tested and browser-smoke tested on the public routes, but full release readiness remains blocked by long-running project-wide gates that timed out locally.

## Server

- Reused existing local listener on `http://127.0.0.1:3001`.
- Listener process observed: `4488`.
- The process was already running before this validation step, so it was not stopped by this run.

## Dependency Restore

- `npm install --no-audit --no-fund`: failed on existing peer dependency conflict between React 19 and `react-day-picker@8.10.1`.
- `npm install --no-audit --no-fund --legacy-peer-deps`: installed Next, but failed during `postinstall` Prisma generation with Windows `EPERM` on the Prisma query-engine DLL rename.
- Verified after partial install:
  - `node_modules/next/dist/bin/next`: present.
  - `npm ls next --depth=0 --legacy-peer-deps`: `next@15.5.18`.

## Passing Checks

- `npm test -- scripts/__tests__/landing-public-content.test.js scripts/__tests__/landing-navigation-localization.test.js --runInBand`
  - 2 suites passed.
  - 12 tests passed.
- Deterministic Node landing contract check passed before browser validation.
- `node --check scripts/landing-navigation-localization-browser-smoke.js`
- `node --check scripts/__tests__/landing-navigation-localization.test.js`
- `node scripts/public-content-browser-smoke.js --base-url http://127.0.0.1:3001`
  - Passed.
  - Evidence: `what-next/ui-ux/public-content-browser-evidence-2026-07-19.json`.
- `node scripts/landing-navigation-localization-browser-smoke.js --base-url http://127.0.0.1:3001`
  - Initially failed because the smoke script still expected the old `Create workspace / Créer un espace` CTA label.
  - Updated the smoke expectation to `Plan rollout / Planifier`.
  - Rerun passed.
  - Evidence: `what-next/ui-ux/landing-navigation-localization-browser-evidence-2026-07-19.json`.
- `node scripts/product-command-screenshot-browser-smoke.js --base-url http://127.0.0.1:3001`
  - Passed.
  - Evidence: `what-next/ui-ux/product-command-screenshot-browser-evidence-2026-07-19.json`.
- `node scripts/ui-route-smoke-gate.js --mode fail --base-url http://127.0.0.1:3001 --route public-home --route public-home-fr --route login --route login-fr --route register --route register-fr --require-screenshots --timeout-ms 60000`
  - Passed.
  - Report: `what-next/ui-ux/ui-route-smoke-2026-07-19.json`.
  - Routes passed: `/en`, `/fr`, `/en/login`, `/fr/login`, `/en/register`, `/fr/register`.

## Timed Out / Blocked

- `npm run typecheck`: timed out after 244 seconds without producing errors.
- `npm run build:app`: timed out after 604 seconds without useful diagnostics.
- `npm run policy:gates`: timed out in the previous run, likely because it scans/runs broad repo gates.
- Full production release certification is blocked until those gates complete successfully or are decomposed into narrower landing-safe checks.

## Notes

- The browser smoke evidence now covers EN/FR public landing and auth routes on desktop/mobile screenshots.
- The public landing CTA contract is now adoption-led, not instant provisioning-led.
- The page should not be called fully 9+ or release-ready until typecheck, production build, and policy gates are resolved.

## Build-Health Update - 2026-07-19 22:06 Europe/Paris

### Decision

NEEDS WORK for full policy release, but the build-health blockers from the landing validation are largely cleared.

### Fixed

- Stopped the local Next dev server on port `3001` that was holding the Prisma Windows query-engine DLL.
- `npx prisma generate` now passes.
- `npm install --no-audit --no-fund --legacy-peer-deps --ignore-scripts` reports `up to date`.
- Fixed the HRIS People page type mismatch by comparing against `LOCATION_RESPONSIBILITY_COMPATIBILITY`, which matches `services/hris/org.service.ts`.
- Updated the focused People page test fixture/assertion to the compatibility authority label.

### Passing Checks Added

- `npm run typecheck`: passed.
- `npm run build:app`: passed.
  - Next compiled successfully.
  - Safe build wrapper status: passed.
  - Existing warnings only: three `@next/next/no-img-element` warnings outside this landing slice.
- `npx jest --runTestsByPath 'app/[locale]/(dashboard)/dashboard/people/__tests__/page.test.tsx' --runInBand`: passed, 2 tests.

### Policy Gate Status

- `npm run policy:gates`: failed at `statutory:country-pack:gate`.
- Passing before failure:
  - `inventory:boundary:fail`
  - `service:boundary:fail`
  - `api:guard:inventory:fail`
  - `public-identity:abuse:gate`
  - `ledger:close-truth:gate`
  - `payment:cash-truth:gate`
  - `purchasing:ap:gate`
  - `offline:pos:replay:gate`
- Blocking check:
  - `statutory:country-pack:gate`
  - Report: `what-next/statutory-country-pack-production-readiness.md`
  - Blockers: `source_artifact_hash_verification`, `source_artifact_expert_approval`.

### Statutory Evidence Finding

The Cameroon evidence folder exists at `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19`, with captured CNPS artifacts and a manifest. The manifest is intentionally marked `PENDING_EXPERT_REVIEW` and `productionUseAllowed: false`. Its own non-claims state that symbolic `sourceEvidenceHash` values must not be replaced until approval evidence is complete.

This is not a safe local code fix. Passing the statutory gate requires qualified reviewer approval, a retained approval artifact, approved fixture families, production-use flags, and real sha256 hashes wired into the country pack.

## Statutory Handoff Update - 2026-07-19 22:13 Europe/Paris

### Decision

NEEDS WORK for full policy release. This is an external statutory review blocker, not a landing implementation blocker.

### Added Evidence

- Verified retained Cameroon CNPS source artifact hashes against `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json`.
- Added machine-readable integrity report: `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/artifact-integrity-2026-07-19.json`.
- Added reviewer-ready handoff: `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/STATUTORY_GATE_UNBLOCK_HANDOFF_2026-07-19.md`.

### Gate Rerun

- `npm run statutory:country-pack:gate`: blocked as expected.
- Checks ready: 10/12.
- Remaining blockers: `source_artifact_hash_verification`, `source_artifact_expert_approval`.

### Required Next Action

A qualified statutory reviewer must approve or reject the Cameroon fixture families, provide a signed approval artifact, and authorize any production-use flags before the country-pack source hashes or manifest readiness can be changed.

## Public Receipt Token Update - 2026-07-19 22:18 Europe/Paris

### Decision

The public receipt lookup implementation is locally ready. Production release is intentionally blocked until the receipt-token signing secret is configured in the deployment environment.

### Verification

- `npm run receipt:token:config-gate`: passed, 4/4 checks ready, 0 blockers, with a local warning that no production secret is configured.
- Focused Jest receipt suite passed: 5 suites, 35 tests.
- `npm run receipt:token:config-gate:release`: blocked as expected with `receipt_token_secret` because no production signing secret is configured locally.

### Evidence

- Report: `what-next/public-receipt-token-release-readiness-2026-07-19.md`.

## Release Secret Provisioning Update - 2026-07-19 22:21 Europe/Paris

### Decision

Production release is blocked on deployment secret provisioning. No secret values were generated, stored, hashed, serialized, or printed.

### Verification

- `npm run release:secrets:preflight`: conditional locally, 2/8 checks ready, 0 blockers, 6 warnings.
- `npm run release:secrets:preflight:release`: blocked as expected, 2/8 checks ready, 6 blockers.
- `node scripts/release-secret-preflight.js --mode fail --release on --out what-next/release-secret-preflight-release.md --json-out what-next/release-secret-preflight-release.json`: saved separate release-mode evidence and exited nonzero as expected.
- `npx jest --runTestsByPath "scripts/__tests__/release-secret-preflight.test.js" --runInBand`: passed, 8 tests.

### Evidence

- Runbook updated: `docs/operations/runbooks/release-secret-provisioning.md`.
- Handoff: `what-next/release-secret-provisioning-handoff-2026-07-19.md`.
- Release-mode report: `what-next/release-secret-preflight-release.md` and `what-next/release-secret-preflight-release.json`.

## Post-Statutory Local Gate Sweep - 2026-07-19 22:40 Europe/Paris

### Decision

All policy/release gates after `statutory:country-pack:gate` now pass locally when run individually. Full `npm run policy:gates` still stops at the external Cameroon statutory evidence gate, but no later local gate failure is currently hidden behind it.

### Fixes

- Regulatory hardcode gate now excludes archived docs and generated evidence folders, so saved landing snapshots do not count as production statutory logic.
- Raw-error boundary gate now has zero active unsafe findings. Four service catch blocks preserve typed `ApplicationError` rethrows and wrap unexpected failures in safe `BusinessRuleError` messages.
- End-of-day close tests now assert safe typed error behavior instead of expecting raw persistence/audit/event error strings to leak.

### Verification

- `node scripts/regulatory-hardcode-gate.js --mode fail --out what-next/regulatory-hardcode-readiness.md --json-out what-next/regulatory-hardcode-readiness.json`: passed, 0 findings.
- `node scripts/raw-error-boundary-gate.js --mode fail --out what-next/raw-error-boundary-readiness.md --json-out what-next/raw-error-boundary-readiness.json`: passed, 0 active unsafe findings.
- Focused Jest bundle passed: 5 suites, 67 tests.
- Post-statutory sweep passed: 16/16 gates.
- `npm run typecheck`: passed.

### Evidence

- Sweep: `what-next/policy-gate-sweeps/post-statutory-policy-gate-sweep-2026-07-19.md` and `.json`.
- Regulatory report: `what-next/regulatory-hardcode-readiness.md` and `.json`.
- Raw-error report: `what-next/raw-error-boundary-readiness.md` and `.json`.
## Gate Release Attestation - 2026-07-20

`regulatory:hardcode:fail` and `error:boundary:fail` are released for the current local workspace state by `what-next/gate-release-attestations/regulatory-hardcode-and-error-boundary-gate-release-attestation-2026-07-20.md`.

Evidence generated on 2026-07-20 shows the regulatory hardcode gate passed with 0 active findings and the raw-error boundary gate passed with 0 active unsafe findings. This note does not release external statutory/country-pack approval or production secret provisioning blockers.