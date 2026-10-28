# Stoquify Statutory Country Pack Production Gate Implementation

Date: 2026-07-11

Mode: narrow implementation and verification

Primary skill: `stoquify-statutory-country-pack-production-gate`

Supporting skills:

- `stoquify-ohada-leadership-orchestrator`
- `stoquify-release-evidence-ratchet`

## Scope

Trace country-pack schema and hashing, legal provenance, effective dating, capability status, publication validation, payroll tax evaluation, e-invoicing metadata, adapter registration, fiscal-document creation, submission enqueue, worker processing, sandbox evidence labels, hardcode detection, and release policy.

Selected implementation boundary:

- direct production compliance-submission enqueue;
- fake sandbox adapter execution and polling environments;
- a fail-mode statutory country-pack production-readiness ratchet.

## Existing Control Spine

The audit confirmed these controls already exist:

- country packs carry canonical hashes, legal references, retrieved and verified dates, reviewers, effective windows, capability matrices, and versioned regulatory envelopes;
- resolution selects published, effective packs and returns legal provenance plus deterministic resolution hashes;
- publication validation requires reviewed evidence, golden fixtures, required parameter coverage, and rejects unsupported production capability claims;
- the Cameroon pack labels IRPP and e-invoicing as `REQUIRES_EXPERT_REVIEW` and sets `productionAutomationAllowed` to false;
- the payroll tax evaluator applies rules only when capability and rule-level production support are both explicit, otherwise returning a blocked expert-review result;
- the adapter registry contains only fake sandbox and Cameroon DGI sandbox adapters;
- fiscal-document creation blocks production certification before persistence;
- compliance-submission processing blocks `PRODUCTION` with `PRODUCTION_ADAPTER_BLOCKED` before adapter selection;
- the Cameroon sandbox adapter refuses non-sandbox execution and marks evidence as sandbox-only with no production certification effect;
- regulatory hardcode detection protects generic runtime services from mutable statutory rates and rules.

## Audit Finding

Two lower-level entry points did not independently enforce the same production posture:

1. `enqueueComplianceSubmission` accepted a caller-supplied `PRODUCTION` environment and persisted a pending authority submission. The worker would later fail it, but the queue and action boundary could temporarily represent unsupported production automation as pending work.
2. `fakeSandboxComplianceAdapter` returned accepted fixture evidence even when called directly with a `PRODUCTION` context. Normal worker processing blocked that path, but the adapter contract itself was not fail-closed.

The fresh-auth compliance retry action exposes direct enqueue, so the first gap was reachable through a protected application boundary rather than being test-only code.

## Implementation

`enqueueComplianceSubmission` now rejects `ComplianceAdapterEnvironment.PRODUCTION` immediately after schema validation and before opening a transaction.

This prevents creation of:

- a compliance submission row;
- fiscal-document queue state changes;
- enqueue audit evidence;
- queued business events;
- authority-submission outbox messages.

`fakeSandboxComplianceAdapter` now permits submit and poll operations only in `FAKE_SANDBOX`. Non-sandbox contexts return a typed `CREDENTIAL_CONFIGURATION_ERROR` with:

- `NONE_FAKE_SANDBOX_ONLY` statutory effect;
- `productionCertification: false`;
- deterministic response evidence;
- no authority acceptance claim.

The existing fiscal-document creation and worker-level production blockers remain in place, producing three independent enforcement layers.

## Evidence Ratchet

Added `scripts/statutory-country-pack-production-gate.js` and negative fixture tests. The gate verifies:

- country-pack provenance schema;
- published and effective-dated resolution;
- publication review and fixture requirements;
- honest Cameroon automation capability status;
- fail-closed payroll tax evaluation;
- sandbox-only adapter registration;
- fiscal-document creation production blocking;
- enqueue-time and worker-time production blocking;
- adapter-level sandbox environment enforcement;
- regulatory hardcode and policy-gate wiring.

Package command:

- `npm run statutory:country-pack:gate`

The command is now part of `npm run policy:gates`.

## Generated Evidence

- `what-next/statutory-country-pack-production-readiness.md`
- `what-next/statutory-country-pack-production-readiness.json`

Latest result: 10/10 checks ready and 0 blockers.

## Verification

Passed:

- Broadened Jest bundle: 12 suites, 84 tests.
- Country-pack validation and golden-fixture tests.
- Compliance metadata, adapter, fiscal-document, outbox, and control-center tests.
- Payroll tax evaluator, country-pack fixture, statutory scenario, and declaration lifecycle tests.
- Regulatory hardcode and statutory gate tests with negative fixtures.
- Focused ESLint across implementation, test, and gate files.
- `npm run typecheck` with no diagnostics.
- `npm run regulatory:hardcode:fail`: 0 active findings.
- `npm run statutory:country-pack:gate`: 10/10 ready, 0 blockers.
- `npm run policy:gates`: complete chain passed.
- Scoped Git whitespace validation.

## Support Decision

Current Cameroon e-invoicing support remains `PRODUCTION_BLOCKED` / `REQUIRES_EXPERT_REVIEW`.

The registered Cameroon adapter is sandbox-only. No official production tax-authority adapter is registered, and no production certification claim is made by this implementation.

## Non-Claims and Residual Risk

- This work is not legal, tax, payroll, fiscal-authority, OHADA, or SYSCOHADA certification.
- Only Cameroon is registered in the current country-pack registry. Other OHADA jurisdictions remain unsupported until versioned, cited, reviewed packs are added.
- Cameroon e-invoicing official technical specifications, production credentials, authority conformance evidence, expert signoff, and operational approval are still absent.
- `FAKE_SANDBOX` remains the schema default for local and deterministic test flows. Production-facing callers should eventually require an explicit adapter selection to remove default ambiguity.
- Manual portal fallback metadata exists in the pack, but a complete fresh-auth, approval, immutable evidence, and operator workflow must be proven before operational support is claimed.
- Regulator-confirmed or expert-reviewed fixtures are engineering evidence, not a substitute for licensed professional advice or official authority acceptance.
- This slice does not apply or require a production database migration.
- Static gate success proves code posture; live authority sandbox, credential vault, retry, outage, rate-limit, conformance, and incident evidence remain release requirements.

## Completion Decision

Unsupported production compliance automation now fails closed at fiscal-document creation, direct submission enqueue, worker processing, and sandbox adapter execution. A sandbox fixture can no longer be represented as a pending or accepted production authority submission through these boundaries.

## Next Recommended Skill Slice

Run `stoquify-report-trust-export-certifier` next, following the leadership blueprint order. Trace every production-visible financial, accounting, tax, inventory, payroll, and management report from service-owned query through provenance, freshness, redaction, export, and certification evidence; then close the highest-risk remaining mock, stale, or uncertified export boundary.
