# Stoquify Payment Reconciliation Cash Truth Moat Implementation

Date: 2026-07-11

Mode: narrow implementation and verification

Primary skill: `stoquify-payment-recon-cash-truth-moat`

Supporting skills:

- `stoquify-ohada-leadership-orchestrator`
- `stoquify-release-evidence-ratchet`

## Scope

Trace provider accounts, payment transactions, provider events, imported statements, statement lines, match records, reconciliation exceptions, suspense items, signed reconciliation certificates, export evidence, and scheduled assurance into one deterministic cash-truth chain.

Selected implementation boundary:

- provider-account readiness before reconciliation run creation and signoff;
- deterministic, redacted source-evidence manifests;
- certificate binding to underlying reconciliation evidence;
- export-time and scheduled-assurance evidence drift detection;
- durable close invalidation when signed evidence drifts.

Provider onboarding, credential management, real external statement channels, cash-drawer operations, statutory certification, and production data backfill were not broadened into this slice.

## Audit Findings

Reconciliation runs previously loaded only a provider account identifier, rail, and currency. They could be created for an inactive account, an inactive payment rail, an account without settlement or suspense ledger mappings, or an account without an approved effective settlement account.

Signed certificates protected their saved payload and aggregate counts with a hash, but did not bind the certificate to a deterministic hash of the underlying payment, provider-event, statement, match, exception, and suspense evidence. A material source record could therefore change while the saved certificate payload remained self-consistent.

The export drift branch recorded close invalidation inside the export transaction and then threw from that transaction. In a real database, the throw would roll back the invalidation along with the export work. Test mocks had hidden this commit-semantics defect.

The scheduled `payment_reconciliation.certificate_source_hash.current` check verified only the certificate payload's self-hash. It did not compare the signed source-evidence hash with current live reconciliation evidence.

## Implementation

### Provider Readiness Boundary

Added a shared readiness contract in `services/reconciliation/payment-reconciliation-evidence.service.ts`. A provider account is ready only when:

- the provider account is active;
- its payment rail is active;
- settlement and suspense ledger accounts are mapped;
- at least one approved settlement account is effective at the control time.

`runPaymentReconciliation` now enforces this contract before duplicate lookup and run creation. Reconciliation signoff reloads and rechecks the same current provider state before producing a certificate.

### Deterministic Evidence Manifest

The new evidence service constructs a stable, sorted manifest from material reconciliation evidence:

- payment transaction state, amount, currency, payload hash, ledger batch, and occurrence time;
- provider-event payload hash, signature result, status, amount, currency, and provider timestamps;
- statement file hash, import status, period, and line count;
- statement-line fingerprint, direction, amount, currency, date, and match status;
- match records, exceptions, suspense state, resolution state, and ledger evidence.

The manifest excludes provider credentials and raw provider payloads. It returns a manifest version, SHA-256 source hash, and counts rather than exposing the material rows to the certificate caller.

### Certificate and Export Truth

Signoff now blocks unresolved material exceptions and suspense as before, rechecks provider readiness, builds the live evidence manifest, consistency-checks source counts, and stores the manifest version, source hash, and counts inside the signed certificate payload.

Export still validates the certificate payload hash, and now also recomputes current source evidence. A missing or changed signed source hash records `PAYMENT_RECONCILIATION_CERTIFICATE_HASH_DRIFT`, marks overlapping close evidence stale, and refuses the export.

The drift path now returns a controlled transaction result. The close invalidation commits first, and the service throws the user-facing export error only after the transaction completes. Focused tests prove transaction completion and prove that no export inbox record is created on drift.

### Scheduled Assurance

The scheduled certificate-source-hash check now verifies both layers:

- certificate payload self-integrity;
- current live source evidence against the source hash signed into the certificate.

Missing source hashes and source drift fail closed. This intentionally makes older signed runs without the new source evidence binding ineligible for trusted export until they are rerun and resigned.

## Evidence Ratchet

Added `scripts/payment-cash-truth-gate.js` with negative fixture tests. The gate verifies:

- provider readiness and pre-creation enforcement;
- redacted material manifest inputs and deterministic hashing;
- signoff readiness revalidation and source binding;
- export-time live recomputation;
- commit-before-error close invalidation;
- scheduled live-evidence assurance;
- package policy-gate wiring.

Package command:

- `npm run payment:cash-truth:gate`

The command is now part of `npm run policy:gates`.

## Generated Evidence

- `what-next/payment-cash-truth-readiness.md`
- `what-next/payment-cash-truth-readiness.json`

Latest result: 10/10 checks ready and 0 blockers.

## Verification

Passed:

- Focused Jest bundle: 5 suites, 59 tests.
- Focused ESLint across reconciliation, assurance, gate, and test files.
- `npm run typecheck` with no diagnostics.
- `npm run payment:cash-truth:gate`: 10/10 ready, 0 blockers.
- `npm run policy:gates`: complete chain passed.
- Workflow Assurance release gate: 37/37 checks ready, 0 blockers.
- Payroll immutability runtime check: 14/14 forbidden mutations blocked and 3/3 allowed lifecycle checks passed.
- Scoped Git whitespace validation.

The full policy chain retained existing local warnings that production public-receipt and public-identity hashing secrets are not configured. No secret value was printed.

## Non-Claims and Residual Risk

- This slice verifies Stoquify's internal evidence controls; it does not certify an external provider, bank, mobile-money operator, card processor, or statutory filing.
- It does not apply or require a production database migration.
- Existing signed reconciliation runs without a source manifest hash fail closed and require an explicit rerun and resigning process.
- Before tenant rollout, existing provider accounts must be inventoried for active rails, ledger mappings, and approved effective settlement accounts.
- The live evidence recomputation adds work to certificate export and scheduled assurance. Tenant-volume observation, pagination, and query-performance evidence remain production-readiness requirements.
- The manifest reflects current material database state. A later material correction intentionally invalidates the signed evidence and overlapping close state rather than silently preserving an obsolete certificate.
- Static gate success proves required code seams. Focused tests prove control behavior, while live provider ingestion, scheduler health, reconciliation volumes, and operator follow-through require environment evidence.

## Completion Decision

The selected payment-reconciliation evidence gap is closed and protected by a fail-mode repository ratchet. Reconciliation runs and signoff now require provider readiness, certificates are bound to underlying source evidence, and material evidence drift can no longer produce a trusted export while silently leaving certified close truth current.

## Next Recommended Skill Slice

Run `stoquify-purchasing-ap-consolidator` next, following the leadership blueprint order. Trace purchase request, purchase order approval, goods receipt, stock movement, supplier invoice, three-way match, payable posting, payment evidence, close invalidation, and audit proof; then implement the highest-risk missing ownership or evidence boundary and add its fail-mode ratchet.
