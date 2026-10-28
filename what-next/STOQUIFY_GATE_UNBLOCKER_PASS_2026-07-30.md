# Stoquify Gate Unblocker Pass - 2026-07-30

## Scope

Request: unblock Windows/Node generated-report overwrite failures under `what-next/`, starting with `what-next/api-route-guard-inventory.json`, compare the API guard generator with the module surface inventory workaround, rerun `npm run policy:gates`, and stop with either a clean gate run or a precise blocker report.

No WhatsApp or POS enforcement was expanded in this pass.

## Diagnosis

The failing pattern was direct overwrite of existing generated reports under `what-next/` using `fs.writeFileSync(target, ...)`.

Observed failure examples:

- `api:guard:inventory:fail` failed opening `what-next/api-route-guard-inventory.json` with Node `UNKNOWN: unknown error`.
- `payment:cash-truth:gate` later exposed the same overwrite failure on `what-next/payment-cash-truth-readiness.json`.
- `purchasing:ap:gate` later exposed the same overwrite failure on `what-next/purchasing-ap-consolidation-readiness.json`.
- `module:surface:inventory` had previously required a manual timestamped-output/copy workaround to refresh `what-next/module-surface-inventory.json`.

The affected files have normal `Archive` attributes, not read-only attributes. The problem is an intermittent Windows/Node overwrite/open behavior against existing generated files, not an intentional permission or policy denial.

## Durable Fix

Added a small generated-report writer:

- `scripts/generated-report-writer.js`

Behavior:

1. Ensure the target directory exists.
2. Write content to a same-directory temporary file.
3. Attempt to replace the target with `renameSync`.
4. Fall back to `copyFileSync` when Windows refuses direct replacement.
5. Clean up temporary files best-effort.

Reused the helper only where the overwrite failure was observed or previously worked around:

- `scripts/api-route-guard-inventory.js`
- `scripts/payment-cash-truth-gate.js`
- `scripts/module-surface-inventory.js`
- `scripts/purchasing-ap-consolidation-gate.js`

Added focused coverage:

- `scripts/__tests__/generated-report-writer.test.js`

## Verification

Focused tests:

- `npm test -- scripts/__tests__/generated-report-writer.test.js scripts/__tests__/api-route-guard-inventory.test.js scripts/__tests__/payment-cash-truth-gate.test.js scripts/__tests__/module-surface-inventory.test.js scripts/__tests__/module-surface-inventory-enforcement.test.js --runInBand`
  - Passed: 5 suites, 37 tests.
- `npm test -- scripts/__tests__/purchasing-ap-consolidation-gate.test.js --runInBand`
  - Passed: 1 suite, 4 tests.

Direct generated-report write checks:

- `npm run module:surface:inventory`
  - Passed: wrote 381 records to `what-next/module-surface-inventory.json`.
- `npm run api:guard:inventory:fail`
  - Passed: wrote 13 records to `what-next/api-route-guard-inventory.json`; no active API route guard issues.
- `npm run purchasing:ap:gate`
  - Passed: 11/11 checks ready, 0 blockers.

## Full Policy Gate Result

Command run:

```powershell
npm run policy:gates
```

Result: not clean, but no longer blocked by generated-report overwrite failures.

The gate chain now passes through these commands before stopping:

- `inventory:boundary:fail`
- `service:boundary:fail`
- `regulatory:boundary:fail`
- `api:guard:inventory:fail`
- `public-identity:abuse:gate`
- `ledger:close-truth:gate`
- `payment:cash-truth:gate`
- `purchasing:ap:gate`
- `offline:pos:replay:gate`
- `country:adapter:pilot:gate`
- `ai:copilot:guardrails:gate`

## Exact Remaining Blocker

Failing command inside `npm run policy:gates`:

```powershell
npm run statutory:country-pack:gate
```

Underlying command:

```powershell
node scripts/statutory-country-pack-production-gate.js --mode fail --out what-next/statutory-country-pack-production-readiness.md --json-out what-next/statutory-country-pack-production-readiness.json
```

Cause: real statutory production evidence blockers, not a generated-report write failure.

Blocked checks:

- `source_artifact_hash_verification`
- `source_artifact_expert_approval`

Gate diagnostics:

- Manifest: `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json`
- Captured artifact hashes verified: `2/2`
- Pack source hashes declared / valid / bound: `7/0/0`
- Approval artifact verified: `false`
- Qualified expert approval complete: `false`
- Runtime CNPS capability status: `SUPPORTED_DRAFT`
- Runtime CNPS verification status: `SOURCE_CHECKED`
- Runtime CNPS authority binding promoted: `false`

Local handoff evidence confirms this must remain blocked until qualified statutory review approval exists and retained artifact hashes are bound to the runtime country pack.

## Outcome

The generated-report write blocker is fixed for the surfaced policy-gate writers and the earlier module-surface inventory workaround path.

`npm run policy:gates` does not pass yet because of the statutory country-pack production evidence blocker above.

No WhatsApp or POS enforcement expansion was performed.
