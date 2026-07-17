# Aqstoqflow HR/Payroll Declaration Lifecycle Unblock Dossier

Date: 2026-06-26

Purpose: resolve as much of the Prompt 16 blocker as can be resolved safely, without inventing statutory authority behavior.

Related skill: `aqstoqflow-hrpayroll-16-declaration-lifecycle`

Related blocker report: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_16_DECLARATION_LIFECYCLE_BLOCKER_REPORT_2026-06-26.md`

## Decision

This dossier partially unblocks Prompt 16 by defining:

- a payroll declaration lifecycle contract;
- a close-impact decision table;
- a correction/amendment evidence model;
- a manual authority evidence adapter boundary.

It does not fully unblock production authority automation. Public CNPS evidence confirms the employer declaration/payment workflow shape, but it does not expose a reviewed machine-submission payload, API response contract, rejection contract, or production adapter specification. Therefore, production payroll declaration submission must remain blocked until those inputs are obtained from a qualified expert, official technical specification, or regulator-confirmed adapter package.

## Source Evidence Reviewed

Official/regulator sources already used by the Cameroon country-pack expansion:

- CNPS employer rules page: `https://www.cnps.cm/fr/employeurs/regles-generales-pour-les-employeurs1.html`
- CNPS contribution-scale decree PDF: `https://www.cnps.cm/images/documentutile/decret%20fixant%20taux%20de%20cotisations%20sociales%20et%20plafonds%20des%20rmunrations_baremes.pdf`

Local source-of-truth reports reviewed:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_13_COUNTRY_PACK_EXPANSION_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_16_DECLARATION_LIFECYCLE_BLOCKER_REPORT_2026-06-26.md`

Accepted from the official evidence:

- Cameroon CNPS contribution rates and employer-rule inputs already promoted by Prompt 13 remain regulator-confirmed for the narrow CNPS contribution calculation slice.
- A CNPS employer declaration/payment workflow exists and can be represented as a manual authority evidence workflow.
- Declaration/payment evidence can be captured by the platform after a human performs the authority workflow outside the system.

Not accepted from the public evidence:

- No production API endpoint contract.
- No exact portal payload field map.
- No official response schema.
- No official rejection/correction schema.
- No official authority receipt/reference schema beyond evidence captured from the user.
- No automated production adapter approval.

## Adapter Boundary Decision

### Approved Boundary

Prompt 16 may implement a manual authority evidence lifecycle only if it remains explicit that:

- the platform prepares canonical declaration evidence from service-owned payroll/register data;
- the user or approved operator performs any authority portal submission outside the system;
- the platform captures immutable proof of what was submitted and what the authority returned;
- the platform never claims automated submission, legal acceptance, or production certification without reviewed adapter mappings;
- every authority evidence artifact is hashed, audited, permission-controlled, and tenant-scoped.

### Blocked Boundary

Prompt 16 must not implement:

- direct authority API calls;
- portal automation;
- generated authority payloads marked legally final;
- hidden fallback submission states;
- production adapter registration;
- client-side submission truth;
- mutation of submitted declaration payloads in place.

## Proposed Country-Pack Declaration Metadata

The country pack may later add a declaration metadata envelope only if it is explicit about capability:

```ts
{
  authority: "CM_CNPS",
  authorityName: "Caisse Nationale de Prevoyance Sociale",
  declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
  channelType: "MANUAL_PORTAL",
  submissionMode: "MANUAL_AUTHORITY_EVIDENCE_ONLY",
  automationAllowed: false,
  capabilityStatus: "REQUIRES_EXPERT_REVIEW",
  requiredProvenance: "REGULATOR_CONFIRMED_WORKFLOW_PLUS_EXPERT_REVIEWED_MAPPING",
  evidenceRequired: [
    "submittedPayloadHash",
    "submittedAt",
    "submittedBy",
    "approvalActorId",
    "authorityReferenceOrPortalReceiptHash",
    "portalReceiptOrScreenshotHash",
    "authorityStatus",
    "sourceRegisterHash",
    "countryPackResolutionHash"
  ]
}
```

This metadata would support internal preparation and manual evidence capture. It would not satisfy production adapter automation.

## Canonical Declaration Payload Boundary

The platform-owned canonical declaration payload should be derived only by payroll services from trusted payroll/register facts.

Minimum internal canonical fields:

- `organizationId`
- `tenantCountryCode`
- `payrollRunId`
- `payrollPeriodId`
- `periodStart`
- `periodEnd`
- `authority`
- `declarationType`
- `amount`
- `currency`
- `employeeCount`
- `grossAmount`
- `employeeDeductionAmount`
- `employerChargeAmount`
- `statutoryComponentSummary`
- `payrollRegisterHash`
- `payrollRunDocumentHash`
- `countryPackVersion`
- `countryPackSchemaVersion`
- `countryPackResolutionHash`
- `preparedById`
- `preparedAt`

Privacy rule:

- Salary/person-level detail must not be exposed in the declaration read model unless a later reviewed authority payload contract requires it and RBAC/redaction rules approve it.
- If employee-level detail is required later, it must be represented as an authority payload artifact with immutable hash, restricted permissions, and audit logs.

## Manual Authority Evidence Contract

Manual evidence capture should require:

- `declarationId`
- `transition`
- `authority`
- `declarationType`
- `authorityChannel`
- `authorityEnvironment`
- `authorityReference`
- `authorityStatus`
- `submittedAt`
- `submittedById`
- `approvedById`
- `evidenceCapturedById`
- `submittedPayloadHash`
- `authorityResponseHash`
- `portalReceiptHash`
- `supportingFileHash`
- `sourceRegisterHash`
- `countryPackResolutionHash`
- `notes`
- `idempotencyKey`

Controls:

- `submittedById`, `approvedById`, and `evidenceCapturedById` should be auditable.
- Maker-checker should be required for submission and amendment evidence.
- Fresh authentication should be required for submit, accept, reject, pay, reconcile, and amend transitions.
- Evidence files must be immutable after attachment.
- Secrets and portal credentials must never be stored in country packs, metadata, logs, or screenshots.

## Declaration Lifecycle State Machine

Allowed state transitions:

| From | To | Trigger | Required Evidence | Notes |
| --- | --- | --- | --- | --- |
| none | PREPARED | service prepares declaration | payroll register hash, payload hash, country-pack hash | Already partially implemented by `preparePayrollDeclarations`. |
| PREPARED | SUBMITTED | manual authority evidence captured | submitted payload hash, submitter, approval, portal receipt hash | No API automation. |
| SUBMITTED | ACCEPTED | authority acceptance evidence captured | authority reference, response/receipt hash, accepted amount | Must remain evidence-driven. |
| SUBMITTED | REJECTED | authority rejection evidence captured | rejection reference/reason, response hash | Must create action-required state. |
| ACCEPTED | PAYMENT_DUE | accepted liability requires payment | due evidence, accepted amount | Use only when authority response or reviewed rule requires payment. |
| PAYMENT_DUE | PAID | statutory declaration payment recorded | payment evidence, ledger/payment source link | Must tie to payment and ledger evidence. |
| PAID | RECONCILED | statutory payment reconciled | settlement/reconciliation evidence | Handoff to Prompt 17. |
| ACCEPTED | ARCHIVED | close/archive evidence locked | archive manifest hash | Non-impacting if it only packages known evidence. |
| RECONCILED | ARCHIVED | close/archive evidence locked | archive manifest hash | Non-impacting if it only packages known evidence. |
| REJECTED | PREPARED | corrected declaration prepared | new declaration payload hash, parent link | Must create new immutable evidence, not mutate original. |
| any submitted/final state | AMENDED | correction/amendment approved | amendment reason, parent link, new payload hash | Prefer new declaration record with relationship to original. |

Blocked transitions:

- `ACCEPTED` to `PREPARED` in place.
- `SUBMITTED` to `PREPARED` in place.
- `PAID` to `PREPARED` in place.
- `RECONCILED` to any mutable state in place.
- `ARCHIVED` to any mutable state in place.
- Any transition that changes amount, payload, country-pack hash, period, authority, or declaration type in place after submission.

## Close-Impact Decision Table

| Lifecycle Event | Proposed Source Code | Close Impact | Required Action |
| --- | --- | --- | --- |
| Prepared | `PAYROLL_DECLARATION_PREPARED` | close evidence stale | Already implemented. |
| Submitted | `PAYROLL_DECLARATION_SUBMITTED` | close evidence stale | Add only when immutable submission evidence exists. |
| Accepted | `PAYROLL_DECLARATION_ACCEPTED` | close evidence stale | Add when authority acceptance affects statutory liability proof. |
| Rejected | `PAYROLL_DECLARATION_REJECTED` | close evidence stale and data-trust blocker | Add correction-required blocker. |
| Payment due | `PAYROLL_DECLARATION_PAYMENT_DUE` | close evidence stale if due amount/date changes liability | Add only with authority due evidence. |
| Paid | `PAYROLL_DECLARATION_PAID` | close evidence stale | Must tie to payment source link and ledger/cash evidence. |
| Reconciled | `PAYROLL_DECLARATION_RECONCILED` | close evidence stale | Must tie to payment reconciliation evidence. |
| Archived | `PAYROLL_DECLARATION_ARCHIVED` | no stale impact if archive only packages unchanged evidence | If archive creates or supersedes evidence, stale close. |
| Amended | `PAYROLL_DECLARATION_AMENDED` | close evidence stale | Must create new evidence and link to original. |

Implementation guard:

- Do not add close invalidation source codes until each event is emitted by a protected service transition with immutable evidence and tests.

## Amendment And Correction Model

Recommended model:

- Treat submitted declarations as immutable evidence.
- Corrections and amendments create a new declaration or declaration evidence record.
- Link the new record to the original using explicit metadata or dedicated schema fields.
- Preserve the original payload hash, status history, authority reference, and evidence hashes.
- Capture reason codes and approval evidence.

Recommended future fields or evidence table columns:

- `originalDeclarationId`
- `supersedesDeclarationId`
- `amendmentSequence`
- `amendmentReasonCode`
- `authorityCorrectionReference`
- `correctionRequestedById`
- `correctionApprovedById`
- `correctionEvidenceHash`
- `previousPayloadHash`
- `newPayloadHash`

Minimum amendment reason codes:

- `AUTHORITY_REJECTION`
- `PAYROLL_REGISTER_CORRECTION`
- `PERIOD_CLASSIFICATION_ERROR`
- `EMPLOYEE_SOURCE_DATA_CORRECTION`
- `STATUTORY_RATE_PROVENANCE_CHANGE`
- `AUTHORITY_PAYMENT_MISMATCH`
- `MANUAL_EVIDENCE_ERROR`

Hard rule:

- No amendment may overwrite the original submitted declaration payload, amount, period, authority, declaration type, or country-pack provenance.

## Prompt 16 Rerun Gate Decision

After this dossier:

- Statutory hardcode and unsupported-state gates remain satisfied.
- Correction/amendment boundaries are now defined at architecture level.
- Close-impact decisions are now defined at architecture level.
- Expert-reviewed production adapter mappings remain unavailable.

Therefore Prompt 16 may proceed only if the implementation scope is explicitly limited to manual authority evidence lifecycle and blocked adapter states. Full production submission remains blocked.

## Recommended Rerun Scope

Safe rerun scope:

1. Add a payroll declaration lifecycle service for manual evidence transitions only.
2. Add a declaration evidence contract/table or metadata strategy that does not mutate payload truth.
3. Add status transition validation and audit evidence.
4. Add close invalidation only for implemented transitions with tests.
5. Add read-model states that clearly distinguish `REQUIRES_EXPERT_REVIEW`, `MANUAL_EVIDENCE_REQUIRED`, and `AUTOMATION_BLOCKED`.

Still out of scope:

- production authority submission;
- portal/API automation;
- legal acceptance claims without captured authority evidence;
- exact employee-level authority payloads without reviewed mapping;
- IRPP or non-CNPS statutory expansion.

## Validation Needed Before Code

- Review this dossier with legal/accounting owner.
- Decide whether Prompt 16 is allowed to proceed as a manual-evidence lifecycle slice.
- If yes, add tests before or with implementation for:
  - transition matrix;
  - unauthorized transition denial;
  - maker-checker/fresh-auth enforcement;
  - immutable evidence hashing;
  - rejected-to-corrected flow;
  - close invalidation for each implemented transition;
  - data-trust blockers for rejected/prepared/unreconciled declarations;
  - redaction of salary/person fields.

## Residual Blocker

The unresolved blocker is not architectural anymore; it is authority-input provenance:

`Expert-reviewed or regulator-confirmed production submission mapping for payroll declarations is still missing.`

Until that mapping exists, Aqstoqflow should implement declaration lifecycle as a manual authority evidence workflow only.
