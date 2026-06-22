# Kontava Assurance Evidence Redaction Run Report - 2026-06-21

## Scope

Executed `kontava-assurance-evidence-redaction` against the current AqStoqFlow/Kontava workspace.

The run focused on connecting Workflow Assurance incidents to evidence proof context while preventing sensitive evidence from leaking through incident DTOs or in-app alert notifications.

## Implemented

- Extended `WorkflowAssuranceIncidentDto` with:
  - `sourceLabel`
  - redacted `sourceLinks`
  - `proofSubject`
  - `proofSummary`
  - `redactions`
- Kept `evidenceGrade` server-owned with the existing grade vocabulary: `raw`, `operational`, `posted`, `reconciled`, `certified`, `blocked`.
- Added proof-subject resolution for supported proof trails:
  - `journal_entries` -> `journal.entry`
  - `reconciliation_runs` -> `reconciliation.run`
  - `close_runs` -> `close.run`
- Added default-safe incident presentation redaction for sensitive workflows and source evidence.
- Protected in-app alert messages for sensitive incidents with a generic evidence-protected message.
- Expanded redaction policy coverage for:
  - fiscal authority payloads
  - compliance submission payloads
  - audit/security context metadata
- Strengthened metadata sanitization for identifiers such as IBAN, SWIFT, routing, authority, and destination fields.

## Sensitive Fields Protected

- Payroll person or destination evidence
- Supplier bank and supplier payment destination evidence
- Payment provider references and reconciliation suspense details
- Fiscal authority response payloads
- Compliance submission payloads
- Audit/security context metadata
- Proof identifiers when redaction policy blocks exposure

## Files Changed

- `services/assurance/assurance-incident-contracts.ts`
- `services/assurance/assurance-incident.service.ts`
- `services/assurance/__tests__/assurance-incident.service.test.ts`
- `services/security/redaction-policy.service.ts`
- `services/security/__tests__/redaction-policy.service.test.ts`

## Verification

- `npm test -- services/assurance/__tests__/assurance-incident.service.test.ts services/security/__tests__/redaction-policy.service.test.ts --runInBand`
  - Passed: 2 suites, 12 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/assurance/assurance-incident.service.ts services/assurance/assurance-incident-contracts.ts services/assurance/__tests__/assurance-incident.service.test.ts services/security/redaction-policy.service.ts services/security/__tests__/redaction-policy.service.test.ts`
  - Passed.

## Notes

- The existing schema already had `sourceLinks`, `sourceHash`, and `evidenceGrade`, so no Prisma migration was needed for this run.
- Stale source evidence behavior already existed through source-hash reopen logic; this run exposes the reopened state as stale proof freshness in the incident DTO.
- The current service returns a default-safe projection because actor permissions are not yet passed into incident DTO reads. Future incident list/detail APIs can pass actor permissions into the projection context to show permitted fields without changing the storage model.
