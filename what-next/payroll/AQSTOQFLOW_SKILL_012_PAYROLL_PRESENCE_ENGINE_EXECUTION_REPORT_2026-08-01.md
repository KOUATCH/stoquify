# AqStoqFlow Skill 012 Payroll Presence Engine Execution Report

Date: 2026-08-01
Selected skill: `012-aqstoqflow-payroll-presence-engine`
Status: payroll slice ready; full policy suite blocked earlier at payment cash-truth gate

## Scope

This pass hardened the existing payroll presence readiness surface without expanding statutory behavior or making production legal/payroll claims. It focused on keeping the payroll presence control spine visible in the release policy path and making its generated reports use the same durable writer now used by adjacent gates.

## Files inspected

- `C:\Users\J COMPUTER\.codex\skills\012-aqstoqflow-payroll-presence-engine\SKILL.md`
- `scripts/payroll-presence-readiness-gate.js`
- `scripts/__tests__/payroll-presence-readiness-gate.test.js`
- `scripts/__tests__/policy-gates.test.js`
- `scripts/__tests__/run-policy-gates-integration.test.js`
- `scripts/policy-gates-integration-contract.json`
- `scripts/generated-report-writer.js`
- `package.json`
- `what-next/payroll/payroll-presence-readiness.md`
- `what-next/payroll/payroll-immutability-runtime-check.md`

## Changes implemented

- `scripts/payroll-presence-readiness-gate.js`
  - Reused `writeGeneratedReportFile` for markdown and JSON report output.
  - Added a `policy_gate_wiring` readiness check proving `payroll:presence:gate` is present and ordered before `payroll:immutability:runtime` in the release policy path.
  - Increased the payroll presence readiness gate from 12 to 13 checks.

- `scripts/__tests__/payroll-presence-readiness-gate.test.js`
  - Added package policy wiring to the ready fixture.
  - Updated the ready expectation to `13/13`.
  - Added a focused negative test that blocks when payroll presence is missing from the release policy path.

- `scripts/__tests__/policy-gates.test.js`
  - Added focused coverage that `payroll:presence:gate` exists and runs before `payroll:immutability:runtime`.

- `what-next/payroll/payroll-presence-readiness.md`
- `what-next/payroll/payroll-presence-readiness.json`
  - Refreshed through the durable generated-report writer.

- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`
  - Refreshed by the direct payroll immutability runtime proof.

## Verification passed

- `node -c scripts/payroll-presence-readiness-gate.js`
  - Passed.

- `npm test -- scripts/__tests__/payroll-presence-readiness-gate.test.js --runInBand`
  - Passed: 1 suite, 4 tests.

- `npm test -- scripts/__tests__/policy-gates.test.js --runInBand`
  - Passed: 1 suite, 11 tests.

- `npm test -- scripts/__tests__/run-policy-gates-integration.test.js --runInBand`
  - Passed on rerun: 1 suite, 4 tests.
  - Note: an earlier parallel run timed out before producing a result; the isolated rerun passed.

- `npm run payroll:presence:gate`
  - Passed.
  - Report status: ready.
  - Checks ready: 13/13.
  - Blockers: 0.

- `npm run payroll:immutability:runtime`
  - Passed.
  - Report status: ready.
  - Required triggers present: 9/9.
  - Forbidden mutation checks blocked: 14/14.
  - Allowed lifecycle checks passed: 3/3.
  - Blockers: 0.

- `git diff --check -- scripts/payroll-presence-readiness-gate.js scripts/__tests__/payroll-presence-readiness-gate.test.js scripts/__tests__/policy-gates.test.js what-next/payroll/payroll-presence-readiness.md what-next/payroll/payroll-presence-readiness.json what-next/payroll/payroll-immutability-runtime-check.md what-next/payroll/payroll-immutability-runtime-check.json`
  - Passed with no whitespace errors.
  - Git emitted line-ending normalization warnings for existing tracked files.

## Full policy suite result

- `npm run policy:gates`
  - Blocked before reaching payroll.
  - Last failing command: `npm run payment:cash-truth:gate`.
  - Exact blocker: `durable_payment_reconciliation_schema_migration`.
  - Payment gate status: blocked.
  - Payment gate summary: 11/12 checks ready, 1 blocker.

Gates confirmed passing before the payment blocker:

- `inventory:boundary:fail`
- `inventory:valuation:truth:gate`
- `service:boundary:fail`
- `regulatory:boundary:fail`
- `api:guard:inventory:fail`
- `public-identity:abuse:gate` with the existing `release_hash_secret` warning
- `ledger:close-truth:gate`

Because the full policy suite stops at `payment:cash-truth:gate`, it does not reach `payroll:presence:gate` in the full path yet. The payroll gates were therefore verified directly.

## Safety and boundaries

- No statutory, tax, social-security, declaration-submission, or authority-production behavior was changed.
- Module entitlement remains report-only; this pass did not add module entitlement enforcement.
- No WhatsApp, POS, or communication-provider behavior was expanded.
- The worktree was already dirty; unrelated changes were not intentionally edited or reverted.

## Remaining blocker

The repository still needs the payment cash-truth blocker resolved:

- `durable_payment_reconciliation_schema_migration`

This should be fixed before relying on a clean end-to-end `npm run policy:gates` result.

## Next recommended numbered skill

Next recommended skill from the sequence: `013-aqstoqflow-data-trust-accountant-portal`.

Practical next move: clear `durable_payment_reconciliation_schema_migration` first, then rerun the full policy suite. After that, continue to Skill 013.