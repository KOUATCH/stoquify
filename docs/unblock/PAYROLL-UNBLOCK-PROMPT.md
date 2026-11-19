# Payroll unblock — full refined execution prompt

Saved 2026-10-29. This is the full refined prompt approved for execution in this chat. The separate report records the outcome; instructions below are not claims of completion.

Work in:
`E:\ohada saas\Focused projects\stoquify`

## Objective

Read docs/database-seed/PAYROLL-UNBLOCK.md, docs/database-seed/README.md,
and all associated references relevant to their blockers. Produce a
comprehensive, evidence-backed inventory of every required entry, artifact,
decision and engineering dependency needed to continue development and
eventually complete the disposable payroll and historical AP scenarios.

Then systematically populate all information that can legitimately be
established from available evidence. Complete the documentation as far as
the evidence permits, and make every remaining dependency actionable.

Use the existing Next.js/TypeScript/Prisma/PostgreSQL architecture.
This is an execution request: inspect, prepare the inventory, make justified
documentation changes, and verify them.

## 1. Follow project controls

Read applicable AGENTS.md instructions, docs/ecc/WORKFLOW.md and
docs/ecc/skill-routing.md. Inspect current working-tree changes and preserve
unrelated work.

Discover relevant ECC search-first and verification-loop capabilities.
Start with a scoped plan, using /plan only if available in this harness.
Proceed with authorized work after planning.

Before verification commands, inspect their definitions, lifecycle hooks,
helpers and docs/ecc/command-registry.json. Start executable verification
with npm run agent:workflow:check after that inspection.

## 2. Establish the complete evidence scope

Start with the two database-seed documents and recursively follow relevant
links and named references, including:

- docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/
- Its review-package directory, README, FIELD_MAPPING.md,
  POST_SIGNATURE_RUNBOOK.md and SIGNATURE_VERIFICATION_PROCEDURE.md.
- Review-decision, fixture-workbook, source-integrity,
  reviewer-qualification and maker/checker templates and completed returns,
  wherever they actually exist.
- Manifests, qualified-review intake/dispatch records and retained evidence.
- Dataset verification, replay, scenario and HR-structure references.
- Current country-pack, review-intake, production-admission, payroll tax,
  payroll-control and purchasing/AP services and relevant tests.

Resolve incorrect relative paths by searching the repository. Record each
reference as found, missing, stale, conflicting or inaccessible. Never treat
a template or a historical success report as proof of a completed review.

Use existing graphify-out evidence when analyzing code relationships, and
verify behavioral claims against current source. Do not rely on old line
numbers or regenerate graphs implicitly.

## 3. Produce a field-level completion register

Create:

- docs/database-seed/PAYROLL-UNBLOCK-REGISTER.md
- docs/database-seed/payroll-unblock-register.json

Reuse an equivalent existing register if one already exists.

For each required entry or dependency, record:

- Stable ID and requirement category.
- Exact destination file plus JSON path, document section or code symbol.
- Required type, format, allowed values and validation rule.
- Current value/status and evidence supporting that assessment.
- Business purpose and the specific workflow it blocks.
- Country-pack version, organization and effective dates where relevant.
- Proposed value, if evidence supports one.
- Evidence location and provenance.
- Whether it can be filled automatically, needs factual research,
  requires an authentic human decision, or requires engineering work.
- Dependencies, responsible role and precise next action.
- Verification method and completion status.

Distinguish mandatory gaps from optional fields and valid null values.
Do not describe every empty field or unpopulated table as a blocker.

## 4. Cover the full documented blocker scope

Explicitly map:

### A. Country-pack coverage

All 13 parameter paths listed in PAYROLL-UNBLOCK.md, the 11 required
statutory scenario families, and coverage for each intended pay date.
Keep these distinct from the existing four-family CNPS review packet.
Verify 2025 and 2026 applicability; do not backdate CM-2026.1 by assumption.

### B. Review evidence

Source authority, official URL, retrieval date, legal reference, effective
window, retained source bytes/hashes, reviewer qualifications and
independence, independent expected results, review topics, review dates,
signed decision, checker evidence and artifact binding.

### C. Admission and publication

The separate payroll.productionAdmission envelope, including:

- status: APPROVED
- calculatorContract: stoquify-payroll-calculator.v1
- scope: CM_PRIVATE_SME_MONTHLY_SINGLE_EMPLOYER
- obligationCatalogueHash and releaseEvidenceHash

Treat these as requirements to substantiate, not values to set merely to
make a gate pass. Distinguish review-intake approval, legal-owner approval,
pack publication and runtime authority transition.

### D. Payroll engineering

Recheck the documented missing YTD/adjustment inputs in calculatePayrollRun.
Record the required reviewed calculation contract: cumulative versus
annualized behavior, tax-year basis, historical taxable-base and withholding
identities, history completeness, same-day/off-cycle ordering, concurrency,
corrections/reversals, adjustments and refund/zero-floor treatment.
Identify service-level cross-month fixtures and tests needed for acceptance.

### E. Dataset workflow

The intended 36 organization/month periods, compensation and lifecycle
readiness, certified attendance, frozen snapshots, calculations, independent
run approvals, payslips, accounting, synthetic payments/declarations and
ledger/close reconciliation.

Preserve deliberate negative test personas and distinguish synthetic HRIS
reference fixtures from tested authoring/approval workflows.

### F. Historical AP

Effective-dated 2025 VAT coverage for AP_SUPPLIER_INVOICE_INPUT_VAT and
AP_SUPPLIER_PAYMENT_INPUT_VAT. Recheck the documented 18 pending invoices.
Distinguish the immediate VAT blocker from withholding marked NOT_CONFIGURED.

## 5. Fill what the evidence supports

Automatically populate factual metadata, valid references, source inventories,
deterministic derivations and draft material where supported by available
evidence. Record the source and method for every populated value.

Research missing statutory facts using official primary sources when needed.
Retain provenance and effective-date uncertainty. Official publication is
source evidence, not approval of Stoquify's interpretation or implementation.

Recompute hashes from retained bytes when appropriate, but never represent
an automated computation as a named reviewer's independent attestation.
Generate gated fixture tie-out hashes only when their required independent
workbook and review prerequisites are actually satisfied.

Keep candidate calculations separate from independently reviewed expected
results. Preserve signed artifacts and reusable blank templates. Use clearly
identified working copies where necessary.

Do not invent identities, qualifications, signatures, review dates,
independence declarations, approval decisions or legal-owner authorization.
Do not promote verification statuses, production flags or runtime authority
merely to remove a blocker.

Use existing schema-compatible pending values in machine-consumed files.
Put explanations and ownership in the register rather than inserting
arbitrary placeholder text into typed fields.

For genuinely human-owned gaps, produce one consolidated completion packet
listing exact fields, required evidence, responsible roles and return formats.
Search available evidence before asking the user for information.

## 6. Separate documentation completion from execution

Update PAYROLL-UNBLOCK.md and the dataset README with:

- What was completed and its evidence.
- Remaining external inputs.
- Remaining engineering work.
- The ordered continuation steps and prerequisites.

Prepare concrete engineering tasks and acceptance tests for unresolved code
gaps. Do not expand document completion into speculative payroll-engine
changes before the required calculation contract is available.

Execute remaining dataset operations only when their prerequisites are
actually satisfied, using existing guarded workflows and a confirmed target:
stoquify_replay_dataset_20261028_01 on localhost:5432/public.

Do not modify the application database, .env or credentials; weaken gates;
reset the dataset; send reviewer correspondence; initiate real payments;
submit declarations; deploy; commit; or create a PR as part of this task.

Continue independent work when one dependency is blocked.

## 7. Verify and report

Validate document links, JSON structure, required fields, evidence references,
effective-date coverage and any hashes calculated during this task.
Inspect commands before running scoped checks.

Report separately:

- Source/document inspection.
- Static or mocked/unit checks.
- Real PostgreSQL checks.
- Rendered/browser checks.
- Authentic human review and external evidence.

Mark each as passed, failed, blocked or not run. Do not reuse historical
results as current execution proof.

## Acceptance criteria

- Every relevant reference is resolved or explicitly accounted for.
- Every required field and non-document dependency is in the register.
- Every automatically populated value has traceable evidence.
- Human-owned attestations remain pending unless authentic evidence exists.
- The four-family CNPS packet is not presented as full payroll admission.
- The YTD/adjustment gap is not presented as solved through documentation.
- No unrelated changes or environment mutations occur.
- The final handoff gives exact remaining inputs and ordered next actions.

Finish with changed-file links, counts of completed and outstanding register
items by category, validation results, and separate conclusions for:
documentation completeness, development continuation, disposable scenario
readiness and production readiness.

Do not claim the system is unblocked unless the applicable gates and
engineering acceptance evidence actually support that conclusion.
