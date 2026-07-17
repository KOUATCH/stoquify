# AqStoqFlow HR/Payroll Wave 1 Final Release Readiness Pack Report

Date: 2026-06-30

Status: PASS for this implementation slice. This is not a production approval. It adds a redacted, evidence-backed final release-readiness pack that can say whether the implemented HR/payroll release evidence is ready for full-production approval review.

## Decision

The final release-readiness surface is now service-owned and read-only by default:

- It reads the latest controlled pilot-cycle certification audit evidence.
- It reads the latest proof-backfill reconciliation certificate audit evidence.
- It reads payroll immutability runtime evidence.
- It reads authenticated route-smoke/accessibility/mobile browser evidence.
- It links the pilot payroll run to close assurance and data-trust readiness through the payroll period accounting period.
- It produces a redacted `AQSTOQFLOW_PAYROLL_FINAL_RELEASE_READINESS_PACK` with gates, blockers, release-gate commands, and a pack hash.

The pack only returns `READY_FOR_FULL_PRODUCTION_APPROVAL` when every release gate has no blocker. Current saved browser evidence still contains two safe-error render states, so the real current browser gate remains action-required until that live command-center path is fixed and rerun.

## Files Changed

- `services/payroll/payroll-final-release-readiness.service.ts`
  - Adds `buildPayrollFinalReleaseReadinessPack`.
  - Adds `formatPayrollFinalReleaseReadinessPack`.
  - Enforces `payroll.command.read` and module entitlement before reading release evidence.
  - Optionally persists a redacted audit row as `PayrollFinalReleaseReadinessPack`.
- `services/payroll/__tests__/payroll-final-release-readiness.service.test.ts`
  - Covers fully passing evidence.
  - Covers browser safe-error evidence as action-required.
  - Covers adapter-chaos continuity blockers from pilot and proof-backfill evidence.
  - Covers redaction of identifiers and raw sensitive payload classes.

## Release Gates Modeled

| Gate | Source | Blocks On |
| --- | --- | --- |
| Statutory setup | Proof-backfill setup gate | setup not `READY` |
| Adapter chaos | Pilot and proof-backfill continuity | missing expected chaos hash or mismatched backfill continuity |
| Proof backfill | Reconciliation certificate | not `READY_FOR_CLOSE_RECHECK` or data-trust proof gate not `READY` |
| Pilot cycle | Pilot certification audit | not `CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW` or missing signoffs |
| Close/data trust | CloseRun for payroll accounting period | missing close run, not `READY`/`CERTIFIED`, or critical blockers |
| Browser validation | Authenticated route/accessibility evidence | missing smoke, serious axe violations, mobile overflow, or safe-error states |
| Policy runtime | Payroll immutability runtime check | missing triggers, failed mutation blocks, or non-ready runtime status |

## Guardrails

- No production approval action.
- No release button.
- No statutory formula logic.
- No provider or authority execution.
- No payroll mutation path.
- No client-computed payroll truth.
- No raw employee, salary, bank, provider, authority, or audit-log payload exposure in the pack body.

## Validation

Passed:

```bash
npm test -- --runTestsByPath services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-final-release-readiness.service.test.ts services/payroll/__tests__/payroll-pilot-cycle-certification.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand
npm run typecheck
npm run lint
npm run policy:gates
```

Focused result: final-readiness suite passed 1 suite / 4 tests. Payroll release regression passed 4 suites / 13 tests. Lint passed with four pre-existing unrelated warnings. Policy gates passed and refreshed payroll immutability runtime evidence.

## Evidence Alignment

Current evidence already saved under `what-next/payroll/` aligns with the pack contract:

- `payroll-immutability-runtime-check.json`: ready, 9/9 triggers present, 14/14 blocked mutations, 0 blockers.
- `AQSTOQFLOW_PAYROLL_AUTHENTICATED_ACCESSIBILITY_MOBILE_BROWSER.json`: 12 checks, 0 serious/critical axe violations, 0 mobile overflow, but 2 safe-error render states.
- `AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER.json`: route smoke succeeded for 11 authenticated payroll routes.

## Remaining Limits

This slice closes the final-readiness evidence aggregation gap, not the full HR/payroll production gap. Full unrestricted rollout still requires:

- fixing the live command-center safe-error path and rerunning full payroll E2E;
- real statutory country-pack breadth and reviewed legal provenance;
- live authority/payment adapter mappings, credentials, retries, idempotency, receipts, and settlement proof;
- tenant-by-tenant production migration/backfill signoff;
- final accounting, security/privacy, and operations signoff after a clean controlled pilot payroll cycle.

## Next Recommended Slice

Fix the seeded live payroll command read-model safe-error path that appears in authenticated browser validation, then rerun:

```bash
npm run test:e2e:payroll
npm run policy:gates
```

After that, wire the final release-readiness pack into the payroll command center as a proof drawer/read-only card, still without adding release authority until the signoff workflow is explicitly approved.
