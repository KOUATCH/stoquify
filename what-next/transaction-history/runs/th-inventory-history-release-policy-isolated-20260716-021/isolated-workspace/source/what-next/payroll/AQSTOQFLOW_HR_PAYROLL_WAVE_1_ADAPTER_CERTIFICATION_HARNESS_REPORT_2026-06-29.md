# AqStoqFlow HR/Payroll Wave 1 Adapter Certification Harness Report - 2026-06-29

## Decision

CONTROLLED PILOT SCOPE ADVANCED. This slice adds a service-owned certification harness for payroll authority adapters and payment provider adapters. It strengthens the previous adapter registry gate so `SUPPORTED_CERTIFIED` automation now requires a harness certificate hash, not only shallow mapping and credential references.

This is still not unrestricted full-production approval. It blocks overclaiming until real authority/provider evidence, reviewed mappings, credential controls, replay proof, outage proof, dead-letter triage, and close-impact proof exist.

## Implemented

- Added `services/payroll/payroll-adapter-certification-harness.service.ts`.
- Added `services/payroll/__tests__/payroll-adapter-certification-harness.service.test.ts`.
- Strengthened `services/payroll/payroll-adapter-registry.service.ts`:
  - Authority production readiness now requires `certificationHarnessHash`.
  - Payment provider production readiness now requires `providerCertificationHarnessHash`.
- Propagated `authorityCertificationHarnessHash` through declaration lifecycle evidence, authority execution queue metadata, and authority adapter worker accept/reject lifecycle evidence.
- Propagated `providerCertificationHarnessHash` through payroll payment adapter proof metadata and ledger posting metadata.
- Updated payroll operations runbook with adapter certification harness procedures and stop conditions.

## Harness Coverage

Authority adapter certification now checks proof hashes for:

- payload mapping;
- response mapping;
- rejection mapping;
- amendment mapping;
- credential proof;
- credential rotation;
- least-privilege credential scope;
- request and receipt hashes;
- idempotency key;
- idempotent replay fixture;
- duplicate authority response fixture;
- outage runbook;
- retry policy fixture;
- dead-letter triage runbook;
- audit trail fixture;
- redaction fixture;
- close-impact rule proof;
- legal or regulator review proof.

Payment provider certification now checks proof hashes for:

- disbursement file where required;
- provider credential proof;
- provider credential rotation;
- least-privilege provider credential scope;
- payload mapping;
- response/settlement mapping;
- reversal mapping;
- request and response hashes;
- settlement receipt hash;
- idempotency key;
- replay and duplicate-response fixtures;
- outage runbook;
- retry policy fixture;
- dead-letter triage runbook;
- audit trail fixture;
- redaction fixture;
- close-impact rule proof.

## Safety Properties

- The harness stores proof hashes, ids, statuses, and review metadata only.
- It does not store raw salary, employee identity, authority payloads, provider payloads, payment destinations, or credential secrets.
- The registry remains the release gate: without the harness certificate hash, `SUPPORTED_CERTIFIED` falls back to blocked certification proof.
- Manual evidence and review-blocked adapter paths continue to work without pretending automation is production-ready.
- Authority worker lifecycle evidence now carries the harness hash from queued submission proof through acceptance or rejection evidence.

## Verification

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-adapter-certification-harness.service.test.ts services/payroll/__tests__/payroll-adapter-registry.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/authority-adapter-worker.service.test.ts --runInBand`
  - 5 suites passed, 33 tests passed.
- `npm run typecheck`
  - Passed.
- `npm run prisma:validate`
  - Passed.
- `npm run lint`
  - Passed with 5 existing unrelated warnings.
- `npm run policy:gates`
  - Passed.

## Remaining Production Blockers

- Real authority/provider adapter implementations still need official or expert-reviewed technical mappings.
- Credentials must be provisioned and rotated outside code/metadata with least-privilege proof.
- Live provider/authority response samples and rejection/amendment/reversal payloads must be reviewed.
- Scheduled worker operations, monitoring, provider health cards, and dead-letter operator UI still need completion.
- One controlled pilot payroll cycle must reconcile cleanly across register, declarations, payments, ledger, close, and data-trust.

## Next Recommended Slice

Build provider health and dead-letter operator readiness: surface harness status, queued/retry/dead-letter authority executions, provider outage states, duplicate response risks, and reconciliation exceptions in the service-owned payroll operations workbench without exposing raw payroll or provider data.