# Payment Truth Pilot Sprint 2 - Provider Event Proof Trail - 2026-07-09

## Decision

The next logical step was to promote provider events as the next first-class proof subject. Provider events are the best next evidence target because they carry external-origin proof, signature state, payload hashes, provider account context, match links, and exception blockers.

## Slice Executed

- Added `provider.event` to the shared proof-trail subject contract.
- Mapped provider-event proof to `payments.reconciliation.read`.
- Added protected server-action dispatch for provider-event proof trails.
- Built a service-owned provider-event proof trail from `provider_events`, related provider account, match records, and payment exceptions.
- Kept raw provider payloads out of the proof result; exposed hashes and signature state only.
- Redacted provider account internals and provider references in the returned proof graph.
- Added blocker states for tampered, replayed, rejected, failed, unsigned, or exception-blocked provider events.
- Wired selected run-detail rows to open provider-event proof when no payment transaction proof is the better supported subject.
- Generalized unavailable proof copy so rows are not described as payment-only.

## Prerequisites Confirmed

- Provider events already exist as durable reconciliation records.
- Provider events already carry tenant scope, provider account scope, hashes, signature state, and match/exception relationships.
- The existing proof drawer already handles loading, redaction, errors, unavailable states, and proof graph rendering.
- No new dashboard shell, route, explorer, or mutation workflow was needed.

## Verification

- `npm test -- --runTestsByPath services/evidence/__tests__/evidence-grade.service.test.ts services/evidence/__tests__/proof-trail.service.test.ts actions/evidence/__tests__/proof-trail.actions.test.ts components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx --runInBand`
- `npm test -- --runTestsByPath services/evidence/__tests__/evidence-grade.service.test.ts services/evidence/__tests__/proof-trail.service.test.ts actions/evidence/__tests__/proof-trail.actions.test.ts components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts actions/payments/__tests__/reconciliation.actions.test.ts services/reconciliation/__tests__/payment-reconciliation-dashboard.service.test.ts components/dashboard/primitives/__tests__/command-center-primitives.test.tsx components/dashboard/__tests__/todays-operating-truth.test.ts services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/reconciliation/__tests__/payment-truth-pilot-fixture.test.ts services/snapshots/__tests__/payment-truth-snapshot.service.test.ts --runInBand`
- `npm run typecheck`

## Result

The reconciliation proof path now covers payment transactions, reconciliation runs, and provider events. Operators can open provider-event proof from selected run-detail rows when that row has concrete provider evidence, while unsupported subjects still render honestly unavailable.

## Next Logical Step

Promote statement lines as the next proof subject. Keep the same route: add service-owned `statement.line` proof from `statement_lines` and `statement_files`, expose file hash and line fingerprint, redact counterparty/provider references, then wire it into the existing run-detail picker after provider events. Do not add new dashboard surfaces before statement-line proof has tests.
