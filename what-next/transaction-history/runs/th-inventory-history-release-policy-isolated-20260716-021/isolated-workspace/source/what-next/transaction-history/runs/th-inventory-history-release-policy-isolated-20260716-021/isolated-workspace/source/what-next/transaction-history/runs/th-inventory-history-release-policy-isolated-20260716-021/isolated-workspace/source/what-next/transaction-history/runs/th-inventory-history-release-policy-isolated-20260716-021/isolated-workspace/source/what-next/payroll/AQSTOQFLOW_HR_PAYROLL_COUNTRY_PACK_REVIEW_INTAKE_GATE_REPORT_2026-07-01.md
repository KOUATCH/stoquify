# AqStoqFlow HR/Payroll Country-Pack Review Intake Gate Report - 2026-07-01

Selected skill: `aqstoqflow-payroll-country-pack-engine`

Phase/slice: Phase 3 statutory country-pack hardening, focused on a reviewed country-pack intake gate.

## Executive Outcome

This slice adds a service-owned intake certificate for proposed payroll country-pack upgrades. It does not mutate or promote the active country pack. Instead, it proves whether a proposed pack is ready for legal-owner signoff by checking:

- canonical proposed pack hash;
- existing country-pack publish validation;
- executable payroll calculation fixture coverage;
- statutory scenario family readiness;
- required legal review topics inherited from the current base pack;
- reviewed topic evidence with legal reference, source evidence hash, reviewer, and review date;
- redacted certificate output without raw legal documents, employee data, or salary data.

Result: the platform now has a deterministic gate between "expert-reviewed material has arrived" and "operator/promoter may ask for signoff." This keeps statutory payroll truth inside country-pack and payroll services, not POS, BI, UI, or ad hoc scripts.

The slice also adds an audit-backed persistence and legal-owner approval boundary. Intake certificates are recorded as redacted audit entries, while legal-owner approval requires a persisted ready certificate, approval evidence hash, and fresh-auth proof before an approval audit event is appended.

Final-release readiness now consumes the latest legal-owner country-pack review approval as a first-class release gate. Full-production approval is blocked when approved intake evidence, approval hash, source certificate hash, or fresh-auth proof is missing.

## Files Changed

- `services/payroll/payroll-country-pack-review-intake.service.ts`
- `services/payroll/payroll-country-pack-review-intake-persistence.service.ts`
- `services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts`
- `services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts`
- `services/payroll/payroll-final-release-readiness.service.ts`
- `services/payroll/__tests__/payroll-final-release-readiness.service.test.ts`

## Service Contract Added

`buildPayrollCountryPackReviewIntakeCertificate(input)` returns an `AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_CERTIFICATE` with:

- `READY_FOR_LEGAL_OWNER_SIGNOFF` only when all gate evidence is present and executable;
- `BLOCKED` with explicit blocker codes when evidence is missing, invalid, duplicated, stale, or not executable;
- per-family proof for proposed coverage status, capability status, certification status, executable scenario counts, fixture ids, required review topics, covered/missing/invalid topics, and source evidence hashes;
- proposed pack publish-validation summary and redacted certificate hash.

`recordPayrollCountryPackReviewIntakeCertificate(input)` records redacted intake certificates in `AuditLog` with:

- entity type `PayrollCountryPackReviewIntakeCertificate`;
- action `PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_CERTIFICATE_RECORDED`;
- entity id equal to the certificate hash.

`approvePayrollCountryPackReviewIntakeCertificate(input)` appends legal-owner approval evidence with:

- entity type `PayrollCountryPackReviewIntakeApproval`;
- action `PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_LEGAL_OWNER_APPROVED`;
- persisted source-certificate lookup scoped by tenant and certificate hash;
- `FRESH_AUTH_REQUIRED` denial before database lookup/write when fresh auth is stale;
- idempotent return for repeat approvals with the same approval evidence hash;
- conflict when a different approval evidence hash already exists.

`buildPayrollFinalReleaseReadinessPack(input)` now includes the `country_pack_review_intake` release gate with:

- latest `PayrollCountryPackReviewIntakeApproval` audit lookup scoped by tenant;
- approval status, approval hash, certificate hash, proposed pack version, target families, fresh-auth proof, and approval evidence presence;
- blockers for missing approval, approval hash, certificate hash, or fresh-auth proof.

## Blocker Codes Introduced

- `PAYROLL_COUNTRY_PACK_TARGET_FAMILIES_MISSING`
- `PAYROLL_COUNTRY_PACK_COUNTRY_MISMATCH`
- `PAYROLL_COUNTRY_PACK_PROPOSED_HASH_MISMATCH`
- `PAYROLL_COUNTRY_PACK_PROPOSED_VALIDATION_FAILED`
- `PAYROLL_COUNTRY_PACK_FAMILY_MISSING`
- `PAYROLL_COUNTRY_PACK_FAMILY_NOT_READY`
- `PAYROLL_COUNTRY_PACK_REVIEW_TOPIC_EVIDENCE_MISSING`
- `PAYROLL_COUNTRY_PACK_REVIEW_TOPIC_EVIDENCE_INVALID`
- `PAYROLL_COUNTRY_PACK_REVIEW_TOPIC_EVIDENCE_DUPLICATE`

## Validation Completed

- Passed: `npx jest services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts --runInBand`
- Passed: `npx jest services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts --runInBand`
- Passed: `npx jest services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
- Passed: `npx jest services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
- Passed: `npx jest services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand`
- Passed: `npx jest services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
- Passed: `npm run typecheck`
- Passed: `npm run regulatory:hardcode:fail`
- Passed: `npm run service:boundary:fail`
- Passed: `npm run prisma:validate`
- Passed: `npm run policy:gates`

## Evidence Scenarios Covered

- Clean reviewed Cameroon IRPP proposed pack produces `READY_FOR_LEGAL_OWNER_SIGNOFF`.
- Missing required legal review topic evidence blocks intake before signoff.
- Stale proposed country-pack hash blocks intake and surfaces publish-validation failure.
- Redacted intake certificate records append to the audit log.
- Legal-owner approval appends only after a persisted ready certificate, approval evidence hash, and fresh-auth proof.
- Stale fresh auth blocks before loading or writing approval evidence.
- Blocked certificates cannot be legally approved.
- Final-release readiness passes the `country_pack_review_intake` gate when approved intake evidence is present.
- Final-release readiness blocks when country-pack legal-owner approval evidence is missing.

## Important Boundaries

- No production legal values were added to runtime application logic.
- Synthetic legal values remain confined to tests, consistent with existing country-pack fixture tests.
- The active country pack is not mutated.
- This is not an automated pack-promotion workflow yet. It is the proof gate that promotion must consume.
- The audit log is used as the current durable evidence spine; no new Prisma table was added in this slice.
- Country-pack review approval is now a final-release blocker, but pack promotion remains out of scope for this slice.

## Next Recommended Slice

Build the operator-facing country-pack review intake workflow around this service:

- upload/submit proposed pack payload and redacted review-topic evidence;
- show proof drawer with blocker codes and certificate hash;
- require fresh auth and legal-owner signoff before promotion;
- persist immutable intake certificates and approval events;
- connect approved certificates to final release readiness and setup readiness.
