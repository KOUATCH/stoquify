# Aqstoqflow HR/Payroll Prompt 16 Rerun After Unblock Dossier

Date: 2026-06-26

Skill: `aqstoqflow-hrpayroll-16-declaration-lifecycle`

Related dossier: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_DECLARATION_LIFECYCLE_UNBLOCK_DOSSIER_2026-06-26.md`

## Decision

Prompt 16 was rerun at the prerequisite-gate level after creating the declaration lifecycle unblock dossier.

Result: still blocked for production authority adapter implementation.

Reason: the architecture blockers are now defined, but expert-reviewed or regulator-confirmed production payroll declaration submission mappings are still unavailable.

## What Changed

The unblock dossier now defines:

- manual authority evidence adapter boundary;
- canonical declaration payload boundary;
- required manual evidence fields;
- declaration lifecycle transition matrix;
- blocked transitions;
- close-impact decision table;
- amendment/correction evidence model;
- recommended safe rerun scope.

This resolves the previous ambiguity around close-impact and amendment rules at the architecture level.

## What Remains Missing

The system still lacks reviewed authority inputs for production submission:

- exact CNPS or target-authority payload field map;
- exact authority response/receipt schema;
- rejection/correction schema;
- official or expert-reviewed production API/portal submission contract;
- production adapter capability approval;
- golden fixtures for submitted/accepted/rejected authority payloads.

## Allowed Next Implementation Scope

Prompt 16 can proceed only if explicitly scoped to a manual-evidence lifecycle:

- no production API submission;
- no portal automation;
- no legal acceptance claim unless captured from authority evidence;
- no client-computed declaration truth;
- no in-place mutation of submitted payloads.

Recommended implementation slice:

1. Add service-owned declaration transition functions for manual evidence.
2. Add immutable declaration evidence capture.
3. Add maker-checker, fresh-auth, RBAC, module-entitlement, tenant isolation, and audit controls.
4. Add close invalidation only for transitions implemented with immutable evidence.
5. Expose read-model states as `MANUAL_EVIDENCE_REQUIRED`, `AUTOMATION_BLOCKED`, or `REQUIRES_EXPERT_REVIEW` where appropriate.

## Still Blocked Scope

The following remains blocked:

- production authority submission adapter;
- automated CNPS or tax authority integration;
- exact statutory payload generation for authority upload;
- unsupported IRPP or non-CNPS payroll declaration automation;
- final legal certification based only on platform-prepared data.

## Validation Run

- `npm run prisma:validate` - passed.
- `npm run regulatory:hardcode:fail` - passed with 0 active findings.
- `npm run payroll:immutability:runtime` - passed:
  - 7/7 required triggers present;
  - 9/9 forbidden mutation checks blocked;
  - 3/3 allowed lifecycle checks passed;
  - blockers: 0.

Focused Jest, typecheck, lint, and route checks were not rerun because no production code was changed in this unblock attempt.

## Source-Of-Truth Decision

The single-source-of-truth rule remains preserved:

- country packs may document reviewed public authority metadata;
- services must own declaration truth;
- dashboards may render only server-provided declaration state;
- authority evidence must be immutable and hashed;
- production authority behavior must remain blocked until reviewed authority mappings exist.

## Handoff

Next safe action:

- obtain expert-reviewed or regulator-confirmed production payroll declaration submission mappings; or
- explicitly approve a Prompt 16 manual-evidence-only implementation slice.

Until one of those happens, the skill must continue to stop before production declaration adapter implementation.
