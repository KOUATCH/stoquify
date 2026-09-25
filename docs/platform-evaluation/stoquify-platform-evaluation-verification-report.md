# Stoquify platform evaluation — verification report

Assessment date: 2026-09-24. This publication archives results from the completed assessment; it does not rerun the application checks.

Repository HEAD observed during assessment: a05a41ef66cd5d98fd69ae3df18225795f912232. The assessment covered a dirty working tree, including existing uncommitted changes. The complete findings and limitations are preserved in stoquify-engineering-approach-review.md.

## Results

| Check | Recorded result | Scope |
| --- | --- | --- |
| Focused tests | 123/123 tests; 6/6 suites passed | Mocked services, actions and browser hooks |
| TypeScript | Exit 0 | Existing configuration; npm did not forward the additional incremental flag |
| Service-boundary scan | 0 active violations; 17 allowed findings | Configured app/actions/components/hooks scan |
| Compiler program inspection | 1775 roots; 4726 effective files including dependencies | Targeted membership inspection |

## Test suites

| Source | Tests | Result |
| --- | ---: | --- |
| services/pos/__tests__/pos.service.test.ts | 52 | passed |
| hooks/__tests__/useCashPaymentHistoryWorkbench.scope.test.tsx | 8 | passed |
| services/pos/__tests__/offline-sync.service.test.ts | 34 | passed |
| actions/pos/__tests__/sync.actions.test.ts | 9 | passed |
| services/pos/__tests__/cash-payment-history.service.test.ts | 10 | passed |
| actions/pos/__tests__/tender.actions.test.ts | 10 | passed |

## Commands and execution notes

The successful direct Jest command is recorded verbatim in the main assessment. It used the installed Jest executable with --runInBand, --watch=false, --coverage=false, --runTestsByPath and --json. Jest reported 21.384 seconds and exited cleanly. The first npm-mediated run passed the same 123 tests but omitted requested flags and emitted a worker shutdown warning; the direct run resolved that verification ambiguity.

TypeScript's effective command was tsc --noEmit --pretty false. Incremental-cache suppression was not established. The boundary scanner ran in fail mode and saved a JSON report. Initial sandbox-denied log writes happened before the checks started and are not counted as executed checks.

## Evidence archive

The evidence/ subfolder contains byte-preserved copies of focused-tests-direct.json, focused-tests-direct.log, focused-tests.log, service-boundary.json, service-boundary.log, source-snapshot.json and typecheck.log. The source snapshot records source fingerprints and assessment measurements. Publication checks are recorded separately in evidence/publication-manifest.json after PDF generation.

## Limits

No build, database integration, provider integration, authenticated browser, accessibility, production-capacity or release-certification check was performed for this assessment. Existing release blockers remain separate from these local verification results. Application code, dependencies, database schema and infrastructure were not intentionally changed by the assessment or this publication.
