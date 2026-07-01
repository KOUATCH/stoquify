# AqStoqFlow HR/Payroll Wave 1 Authority Adapter Certificate Hash Binding Report - 2026-07-01

## Scope

This wave continues the full HR/payroll production-roadmap execution under the declaration compliance slice. It targets the authority declaration adapter proof trail, specifically the boundary between a certified authority adapter harness certificate and the fixture runner that can emit authority outcomes for accepted, rejected, payment-due, amendment-required, retryable, and failed scenarios.

The objective is narrow: prevent a tampered or drifted certificate object from being used with a previously approved certification harness hash.

## Production Claim Protected

AqStoqFlow must not claim authority adapter automation or certified declaration behavior unless the outcome is tied to the exact reviewed certificate proof. A certificate hash is only useful if the runtime fixture runner proves the supplied certificate still hashes to that same proof.

## Change Made

### Service guard

File: `services/payroll/payroll-authority-adapter-fixture-runner.service.ts`

`assertCertifiedFixtureCertificate` now recomputes `prefixedHash(certificate)` and requires it to equal the supplied `certificationHarnessHash` before fixture execution can continue.

If the certificate object has been changed after certification, the runner fails closed with:

`Payroll authority adapter fixture certificate hash does not match the supplied certification harness hash.`

This check runs before the runner emits any authority outcome, receipt hash, response hash, rejection reason, amendment reason, payment-due proof, retry outcome, or redacted response summary.

### Regression test

File: `services/payroll/__tests__/payroll-authority-adapter-fixture-runner.service.test.ts`

Added coverage for a tampered certificate proof. The test mutates `amendmentMappingHash` while keeping the old harness hash and forces the mocked hash recomputation to diverge. The fixture runner must reject the execution before producing an accepted outcome.

## Why This Matters

Before this slice, the fixture runner validated certificate shape, blocker status, country-pack alignment, adapter key alignment, and several execution proof fields. That was useful but incomplete: it did not independently bind the certificate contents back to the harness hash supplied by the certified execution.

This hardening prevents these fail-open paths:

- A certificate proof field changes after review while the old approved hash is reused.
- A fixture represents amendment, rejection, payment-due, or duplicate-response coverage from a certificate object that is no longer the certified artifact.
- Redacted fixture outcomes become evidence for declaration lifecycle transitions without proving the certificate is the exact reviewed certificate.

## Gates Run

- `npx jest services/payroll/__tests__/payroll-authority-adapter-fixture-runner.service.test.ts --runInBand`
  - Passed: 1 suite, 5 tests.
- `npx jest services/payroll/__tests__/payroll-adapter-certification-harness.service.test.ts services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/payroll-authority-adapter-fixture-runner.service.test.ts --runInBand`
  - Passed: 3 suites, 20 tests.
- `npm run typecheck`
  - Passed.
- `npm run service:boundary:fail`
  - Passed. Active service-boundary violations: 0.
- `npm run policy:gates`
  - Passed.
  - Inventory boundary: 0 active violations.
  - Service boundary: 0 active violations.
  - Workflow assurance runtime: ready, 0 blockers.
  - Payroll immutability runtime: ready, required triggers 9/9, forbidden mutation checks blocked 14/14, allowed lifecycle checks passed 3/3, blockers 0.
  - Hard-delete gate: 0 active unsafe findings.
  - Regulatory hardcode gate: pass, 0 active findings.
  - Demo/report trust gate: 0 active findings.
  - Raw error boundary gate: 0 active unsafe findings.

## Current Readiness Impact

This closes one authority-adapter evidence integrity gap. It does not make automated filing production-ready by itself.

Full declaration/payment adapter production readiness still requires:

- Real authority-specific payload mappings reviewed against country-pack declaration metadata.
- Real authority response/status/rejection/amendment/payment-due mappings reviewed by jurisdiction.
- Credential proof, credential rotation, least-privilege scope, idempotency, retry, duplicate response, outage, dead-letter, audit, redaction, close-impact, and legal/regulator proof for each authority channel.
- Live or regulator-approved adapter behavior evidence before unrestricted automated filing is claimed.
- Provider settlement proof and reconciliation for payment automation.
- Operator declaration routes that expose proof drawers, denied states, fresh-auth actions, and redacted evidence without client-computed payroll truth.

## Follow-Up Recommendation

Next authority-adapter hardening slice should make the execution proof carry or verify the full certification proof envelope, not only the minimal runtime fields. In particular, runtime certified evidence should keep rejection, amendment, payment-due, status-code, credential-rotation/scope, replay, duplicate-terminal, outage, retry, dead-letter, audit, redaction, close-impact, and legal-review proof hashes tied to the same certificate hash.

That would further reduce the distance between a certified harness and the execution metadata consumed by declarations, close assurance, and finance/data-trust gates.