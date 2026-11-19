# HR21 development 10 — hiring correctness and browser workflow

2026-10-28 — VERIFIED_SCOPED. Independent review: PASS_SCOPED. Overall HR21 remains IMPLEMENTED_PENDING_VERIFICATION.

## Changes

- Document evidence retries now compare the entire normalized scan, signing, retention and hold envelope. Exact retries return the existing request; altered evidence conflicts without writing.
- Onboarding and rehire require exactly one covering active contract with approval/document proof and the current applied payment-destination proof. Payment evidence must contain matching nonempty approval/event references and three distinct actors.
- Missing activation/payment references cannot count as matching proof merely because both values are null.
- Contract creation preserves its committed result when page-cache refresh fails. A genuine creation failure still returns failure. A duplicate native create safely conflicts without adding another contract or event.

Four production files changed; no schema or statutory calculation change. Original source snapshots and a scoped production patch are retained. Unrelated shared working-tree changes remain intact; no commit or staging was performed.

## Verification

| Evidence class | Result |
|---|---|
| Independent source/evidence review | PASS_SCOPED;64 source hashes independently recomputed |
| Mocked/pure unit tests |49/49 across4 suites |
| Real PostgreSQL native-owner cases |33/33, including ONBOARD and REHIRE; original sources fail27/33 |
| Committed-cache regression against original action |1 failure/8 passes; current action passes |
| Actual Next/Chromium/native authentication |13/13 stages; no browser errors |
| Bounded TypeScript |0 diagnostics, rerun after configuration change |
| Negative startup checks |2/2, no database/browser creation |
| Workflow and scoped whitespace checks |Passed |
| Cleanup and shutdown |Verified; owned ports35586/55464 closed |

The browser created the employee, draft contract, document attestation, independently activated contract, three-actor payment destination and approved onboarding through actual application actions. Onboarding replay retained one applied event. Handoff initially blocked missing certified time, then issued one package after declared synthetic time certification; the downloaded manifest exactly matched retained bytes.

Observed final database counts before cleanup: one employee, one contract, one applied destination request, one lifecycle application and one handoff package; zero extra compensation assignments, payroll runs or payment batches. Agreed base salary:150000.00 XAF. The two English desktop screenshots were visually inspected; this is not a full accessibility audit.

Failed harness attempts, interrupted-attempt recovery and safe configuration-drift refusals are retained. The only accepted concurrent configuration changes were named generated-type references; compiler options/exclusions were unchanged. See [verification details](VERIFICATION.md), [independent review](INDEPENDENT-REVIEW.md), [observed outcomes](database-outcome.json), and [sealed evidence](evidence.json).

## Limits and next work

Document and scan references are synthetic manual metadata attestations, not proof of protected original upload or a real scanner. Time is a synthetic reviewed certification prerequisite. Base salary is covered; additional compensation assignment authoring is not. This slice does not newly qualify self-review/revocation/stale-review failure paths, French/mobile behavior, deployment, external providers, statutory calculations or real operators.

Continue with [hiring denial/recovery and protected originals](NEXT.md). Hosting details do not block these development steps. The approved whole-shift local-start-date policy is unchanged. Rollback is a reviewed reversal of the four scoped source changes, using saved originals/patch; there is no migration to reverse and all synthetic records were removed.
