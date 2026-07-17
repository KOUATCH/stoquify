# Aqstoqflow HR/Payroll Prompt 16 Declaration Lifecycle Blocker Report

Date: 2026-06-26

Skill: `aqstoqflow-hrpayroll-16-declaration-lifecycle`

Source prompt suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

Decision: blocked at the prerequisite gate. No production declaration lifecycle or authority adapter code was implemented in this run.

## Gate Outcome

Prompt 16 requires the declaration lifecycle and adapter foundation to proceed only when:

- statutory fixture and unsupported-state gates pass;
- expert-reviewed adapter inputs exist for production submission;
- correction and amendment boundaries are defined;
- close/data-trust wiring follows approved close-impact decisions.

The first foundation is healthy, but the remaining production-authority prerequisites are not satisfied.

## Passed Foundation Checks

- Prisma schema validation passed.
- Regulatory hardcode gate passed with zero active findings.
- Payroll immutability runtime proof passed against the dedicated local test database.
- Focused regulatory, compliance, payroll, close, data-trust, and immutability tests passed.
- Existing `preparePayrollDeclarations` remains conservative: it prepares declarations only for posted or paid payroll runs, hashes payload evidence, records the `payroll.declaration.prepared` event, and falls back to `INTERNAL_PAYROLL_CONTROL` / `PAYROLL_LIABILITY_REVIEW` when country-pack declaration metadata is absent.
- Existing country-pack expansion supports a narrow, regulator-confirmed Cameroon CNPS contribution slice, not full payroll declaration submission.
- Existing close invalidation covers `PAYROLL_DECLARATION_PREPARED`.
- Existing data-trust checks recognize prepared and rejected payroll declarations as close/data-trust facts.
- Existing immutability controls block finalized payroll declaration payload mutation and deletion while allowing approved lifecycle metadata/status changes.

## Failed Prerequisites

### 1. Expert-reviewed payroll declaration adapter inputs are missing

What is missing:

- Official or expert-reviewed payroll declaration submission mappings for the target authority.
- Authority channel metadata for payroll declarations, separate from fiscal document/e-invoicing adapters.
- Required payload field map, response contract, receipt/reference contract, rejection contract, and evidence artifact expectations.
- Production/sandbox capability matrix for payroll declaration submission.

Evidence:

- `services/regulatory/country-packs/cameroon.ts` contains regulator-confirmed CNPS contribution parameters, but no `payroll.declarations.default` parameter.
- `services/payroll/payroll-control.service.ts` attempts to resolve `payroll.declarations.default` and intentionally falls back to an internal review declaration when the country pack does not provide declaration metadata.
- `services/compliance/*` currently contains fiscal document adapter infrastructure, not payroll declaration authority submission adapters.
- Prior Prompt 13 report explicitly avoided authority adapter automation and declaration submission mappings.

Risk if skipped:

- The system would convert unreviewed legal/authority assumptions into production statutory behavior.
- The dashboard or command center could imply that a declaration was legally submitted or accepted when only an internal platform artifact exists.
- Tenant-specific statutory obligations could be misrepresented.

Status: hard blocker.

### 2. Full declaration lifecycle close-impact decisions are incomplete

What is missing:

- Approved close-impact classification for `submit`, `accept`, `reject`, `pay`, `reconcile`, `archive`, and `amend`.
- Source codes and stale-evidence reasons for every close-impacting declaration transition.
- Decision rules for when a transition affects close certification, data trust, ledger evidence, or only operational workflow.

Evidence:

- `services/accounting/close-assurance-pack.service.ts` currently includes `PAYROLL_DECLARATION_PREPARED`.
- No approved source codes were found for `PAYROLL_DECLARATION_SUBMITTED`, `PAYROLL_DECLARATION_ACCEPTED`, `PAYROLL_DECLARATION_REJECTED`, `PAYROLL_DECLARATION_PAID`, `PAYROLL_DECLARATION_RECONCILED`, `PAYROLL_DECLARATION_ARCHIVED`, or `PAYROLL_DECLARATION_AMENDED`.
- Prompt 05 classified payroll declaration preparation, but not the full Prompt 16 lifecycle.

Risk if skipped:

- Certified close evidence could remain trusted after material declaration changes.
- Non-impacting transitions could wrongly stale certified close packs and create operational noise.
- Data-trust facts could drift from accounting close facts.

Status: hard blocker.

### 3. Correction and amendment boundaries are not fully defined for declarations

What is missing:

- Approved amendment model for payroll declarations.
- Explicit relationship between original declaration, amendment/correction declaration, rejection evidence, and authority evidence.
- Contract deciding which metadata/status fields can change and which changes must create new immutable evidence.

Evidence:

- `PayrollDeclarationStatus` currently supports prepared/submitted/accepted/rejected/payment due/paid/reconciled/archived states.
- The runtime immutability proof protects declaration payload and deletion, but the product-level amendment/correction contract is still not approved.
- Prior immutability reports require corrections, reversals, amendments, and voids to create explicit new evidence or approved lifecycle metadata transitions.

Risk if skipped:

- A later implementation could accidentally mutate submitted declaration truth in place.
- Rejected declarations could lose the audit chain needed for correction proof.
- Close/data-trust reconciliation could become ambiguous.

Status: hard blocker.

## Validation Run

- `npm run prisma:validate` - passed.
- `npm run regulatory:hardcode:fail` - passed; active findings: 0.
- `npm run payroll:immutability:runtime` - passed; 7/7 triggers present, 9/9 forbidden mutation checks blocked, 3/3 allowed lifecycle checks passed.
- `npm test -- --runTestsByPath services\regulatory\__tests__\country-pack.service.test.ts services\compliance\__tests__\country-pack-hooks.test.ts services\payroll\__tests__\payroll-control.service.test.ts services\payroll\__tests__\payroll-register.service.test.ts services\payroll\__tests__\payroll-immutability-migration.test.ts services\accounting\__tests__\close-assurance-pack.service.test.ts services\accounting\__tests__\data-trust.service.test.ts --runInBand` - passed; 7 suites, 50 tests.

Typecheck, lint, route smoke checks, and build were not run because Prompt 16 stopped before production code implementation.

## Files And Systems Inspected

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hrpayroll-16-declaration-lifecycle\SKILL.md`
- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_15_REGISTER_TIEOUT_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_14_PAYSLIP_SELF_SERVICE_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_13_COUNTRY_PACK_EXPANSION_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_05_ACCOUNTING_CLOSE_GATE_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_RUNTIME_IMMUTABILITY_PROOF_REPORT_2026-06-25.md`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-control.schemas.ts`
- `services/payroll/payroll-register.service.ts`
- `services/payroll/command-read-model.service.ts`
- `services/payroll/payslip-self-service.service.ts`
- `services/regulatory/country-packs/cameroon.ts`
- `services/regulatory/country-packs/validation.ts`
- `services/compliance/adapter-contract.ts`
- `services/compliance/certification-outbox.service.ts`
- `services/compliance/adapters/registry.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/accounting/data-trust.service.ts`
- `prisma/schema.prisma`

## Single-Source-Of-Truth Risks Avoided

- No client-computed payroll declaration truth was added.
- No dashboard-specific shadow declaration service was added.
- No statutory production claim was introduced without reviewed country-pack provenance.
- No authority automation was implemented on top of fiscal-document adapters.
- No in-place mutation path for finalized declaration payloads was added.
- No speculative UI or placeholder authority route was introduced.
- No duplicate declaration metrics were added outside the service/read-model flow.

## Required Next Actions Before Rerun

1. Obtain expert-reviewed or regulator-confirmed payroll declaration adapter inputs for the target authority and country.
2. Add country-pack declaration metadata with provenance, capability status, legal references, golden fixtures, and unsupported-state gates.
3. Define the payroll declaration adapter contract, including payload schema, response schema, submission evidence, rejection evidence, manual portal fallback, credential policy, sandbox/production capability states, and source hash requirements.
4. Define the full declaration lifecycle close-impact table for prepare, submit, accept, reject, pay, reconcile, archive, and amend.
5. Define the amendment/correction evidence model so amendments create new immutable evidence instead of mutating submitted payload truth.
6. Add focused tests for country-pack declaration metadata, unsupported adapter states, declaration transition authorization, immutability, audit evidence, close invalidation, and data-trust behavior.
7. Rerun `aqstoqflow-hrpayroll-16-declaration-lifecycle`.

## Safest First Slice After Unblocking

After reviewed adapter inputs and close-impact decisions exist, the safest first implementation slice is:

1. Add country-pack declaration metadata and fixtures only.
2. Add a payroll declaration adapter contract and registry that blocks production by default unless the adapter is reviewed and tenant configuration is active.
3. Add service-level declaration transition functions with RBAC/module-entitlement checks and immutable evidence creation.
4. Add close/data-trust integration only for transitions approved as close-impacting.
5. Add command/read-model exposure after service behavior is tested.

## Current Handoff

Prompt 16 remains the next skill to execute after the blocker prerequisites are resolved. The system should not move to Prompt 17 payment reconciliation until declaration lifecycle authority evidence, close-impact classification, and correction/amendment boundaries are approved or explicitly scoped out.
