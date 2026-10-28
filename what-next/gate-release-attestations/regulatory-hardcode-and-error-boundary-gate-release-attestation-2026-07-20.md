# Regulatory Hardcode And Error Boundary Gate Release Attestation - 2026-07-20

Created: 2026-07-20 04:41:43 +01:00
Selected skill: `017-aqstoqflow-enterprise-release-gate`
Decision: `APPROVED FOR THESE TWO LOCAL GATES ONLY`

## Scope

This attestation releases the local evidence blockers for:

- `regulatory:hardcode:fail`
- `error:boundary:fail`

It does not assert statutory correctness, legal approval, production country-pack approval, deployment secret provisioning, or full production release readiness. Those require their own evidence and, where applicable, external expert validation.

## Gate Results

| Gate | Result | Evidence |
| --- | --- | --- |
| `regulatory:hardcode:fail` | Pass | `what-next/gate-release-attestations/regulatory-hardcode-readiness-2026-07-20.md`: generated `2026-07-20T03:23:14.732Z`, status `pass`, active findings `0`. |
| `error:boundary:fail` | Pass | `what-next/gate-release-attestations/raw-error-boundary-readiness-2026-07-20.md`: generated `2026-07-20T03:23:16.443Z`, active unsafe raw-error findings `0`, allowed classified findings `76`, total raw-error callsites scanned `76`. |

## Fix Applied

A remaining raw-error finding in `services/assurance/assurance-incident.service.ts` was corrected by preserving typed `ApplicationError` rethrows and converting unknown transaction failures/retry exhaustion to safe `BusinessRuleError` messages.

Focused tests were added in `services/assurance/__tests__/assurance-incident.service.test.ts` for:

- unknown transaction errors returning `Workflow assurance incident could not be recorded safely.`
- repeated retryable serialization/unique races returning `Workflow assurance incident could not converge on one logical identity.`

## Files Changed For This Gate Release

- `services/assurance/assurance-incident.service.ts`
- `services/assurance/__tests__/assurance-incident.service.test.ts`
- `what-next/gate-release-attestations/regulatory-hardcode-readiness-2026-07-20.md`
- `what-next/gate-release-attestations/regulatory-hardcode-readiness-2026-07-20.json`
- `what-next/gate-release-attestations/raw-error-boundary-readiness-2026-07-20.md`
- `what-next/gate-release-attestations/raw-error-boundary-readiness-2026-07-20.json`

## Verification

- `npx jest --runTestsByPath "services/assurance/__tests__/assurance-incident.service.test.ts" --runInBand`: passed, 1 suite, 14 tests.
- `node scripts/regulatory-hardcode-gate.js --mode fail --out "what-next/gate-release-attestations/regulatory-hardcode-readiness-2026-07-20.md" --json-out "what-next/gate-release-attestations/regulatory-hardcode-readiness-2026-07-20.json"`: passed, 0 active findings.
- `node scripts/raw-error-boundary-gate.js --mode fail --out "what-next/gate-release-attestations/raw-error-boundary-readiness-2026-07-20.md" --json-out "what-next/gate-release-attestations/raw-error-boundary-readiness-2026-07-20.json"`: passed, 0 active unsafe findings.
- `npx jest --runTestsByPath "scripts/__tests__/raw-error-boundary-gate.test.js" "scripts/__tests__/regulatory-hardcode-gate.test.js" --runInBand`: passed, 2 suites, 9 tests.
- `npm run typecheck`: passed with `tsc --noEmit --pretty false`.

## Gates Still Blocked Outside This Attestation

- External statutory/country-pack production approval remains blocked unless source artifact hash verification and expert approval are provided by a qualified reviewer.
- Production release-token/secret provisioning remains blocked until deployment secrets are configured in the target environment.
- This attestation does not create, imply, or substitute legal, tax, fiscal-device, payroll, or authority-submission approval.

## Release Note

The two local policy gates named above may now be treated as released for the current workspace state, based on the generated evidence artifacts and focused tests. Full production promotion must continue to honor the external blockers listed above.

## Next Recommended Numbered Skill

`018-aqstoqflow-close-assurance-audit`, after external statutory evidence and production secret provisioning are available.