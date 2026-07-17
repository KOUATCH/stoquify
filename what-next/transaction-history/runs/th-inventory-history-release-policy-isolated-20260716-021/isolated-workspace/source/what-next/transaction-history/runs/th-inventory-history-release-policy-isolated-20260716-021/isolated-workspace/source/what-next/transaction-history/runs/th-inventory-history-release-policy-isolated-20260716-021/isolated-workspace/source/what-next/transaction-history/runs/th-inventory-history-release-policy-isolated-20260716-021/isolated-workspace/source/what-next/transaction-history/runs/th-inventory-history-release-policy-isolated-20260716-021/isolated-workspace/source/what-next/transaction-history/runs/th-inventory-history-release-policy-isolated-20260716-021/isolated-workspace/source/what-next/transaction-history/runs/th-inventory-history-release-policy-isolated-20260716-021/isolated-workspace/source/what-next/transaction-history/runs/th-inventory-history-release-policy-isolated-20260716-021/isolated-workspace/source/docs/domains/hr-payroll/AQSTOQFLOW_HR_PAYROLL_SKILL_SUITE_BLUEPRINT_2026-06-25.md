# AqStoqFlow HR/Payroll Skill Suite Blueprint

Date: 2026-06-25

Source artifact: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SKILL_CREATION_PREP_PACK_2026-06-25.md`

Purpose: extract every executable HR/payroll integration point from the prep pack and shape it into skill-ready implementation briefs.

## Refined Prompt

You are working in `E:\ohada saas\newStockFlow\aqstoqflow`.

From `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SKILL_CREATION_PREP_PACK_2026-06-25.md`, create an implementation-ready skill suite blueprint for fully integrating HR/payroll into AqStoqFlow.

Identify all executable points, prerequisites, steps, gates, source files, companion skills, and handoff rules needed to implement the HR/payroll project safely. Organize them into future Codex skills that can eventually own the implementation of each major payroll/HR project stream.

The output must:

- preserve the hybrid reconstruction decision,
- preserve the existing payroll kernel, country-pack provenance, ledger source links, business events, audit, stale-evidence, close invalidation, and certified export semantics,
- order implementation so safety, immutability, tenant isolation, privacy, and ledger/close correctness come before UI breadth,
- define one master orchestration skill and focused implementation skills,
- give each future skill a purpose, trigger metadata, prerequisites, execution steps, verification gates, outputs, and handoff conditions,
- make the skill suite easy to install later under `C:\Users\J COMPUTER\.codex\skills`,
- avoid broad overlapping skills unless a clear phase boundary exists,
- and save the result under `what-next/payroll/`.

Do not implement code yet. This is a skill-transformation blueprint for the complete HR/payroll integration program.

## Skill Suite Strategy

Use one master orchestrator plus focused implementation skills.

The orchestrator decides which slice is safe to execute, loads the right references, confirms prerequisites, and enforces stop conditions. The focused skills own implementation streams with clear boundaries.

Create the orchestrator first. Create focused skills only when implementation work is ready to begin or repeat.

Recommended install root:

```text
C:\Users\J COMPUTER\.codex\skills
```

Recommended shared source folder inside the repo:

```text
E:\ohada saas\newStockFlow\aqstoqflow\what-next\payroll
```

## Shared Non-Negotiables

Every skill in this suite must enforce these rules:

- Inspect actual repo surfaces before making assumptions.
- Keep changes surgical and aligned to current service/action/hook/component patterns.
- Preserve payroll run posting close invalidation semantics.
- Preserve stale-evidence metadata, audit, business-event, outbox, and certified export behavior.
- Do not hardcode statutory payroll values in application logic.
- Do not present expert-review-only country-pack outputs as production legal truth.
- Do not mutate posted payroll runs, emitted payslips, released payment batches, submitted declarations, or archived evidence in place.
- Use correction workflows for post-approval changes.
- Require tenant scoping on every read/write/query/export.
- Require RBAC, fresh auth, maker-checker, audit, and redaction for sensitive payroll actions.
- Do not post payroll without balanced SYSCOHADA source-linked entries.
- Do not release payroll payments without approved payment destination evidence.
- Do not let employee self-service access another employee's data.
- Add focused tests and targeted verification for each slice.
- Save a concise run report under `what-next/` or `what-next/payroll/`.

## Shared Required Context

Every implementation skill should know to inspect these when present:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SKILL_CREATION_PREP_PACK_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PLATFORM_ROADMAP_AND_HYBRID_RECONSTRUCTION_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ENTERPRISE_READINESS_ASSESSMENT_2026-06-24.md`
- `what-next/payroll/AQSTOQFLOW_PAYROLL_CLOSE_INVALIDATION_RUN_REPORT_2026-06-25.md`
- `graphify-out/GRAPH_REPORT.md`
- `prisma/schema.prisma`
- `prisma/migrations/`
- `services/payroll/`
- `actions/payroll/`
- `hooks/payroll/`
- `components/payroll/`
- `app/[locale]/(dashboard)/dashboard/payroll/`
- `services/accounting/`
- `services/payments/`
- `services/reconciliation/`
- country-pack resolver and regulatory services
- RBAC/protect/fresh-auth helpers
- audit, business-event, outbox, close-assurance, and module-control services
- payroll-related tests

## Shared Verification Menu

Each skill should select only the commands relevant to the touched slice:

```powershell
npm run prisma:validate
npm run prisma:generate
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand
npm test -- --runTestsByPath services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand
npm run service:boundary:fail
npm run policy:gates
npm run typecheck
```

Windows fallback when Prisma query engine is locked:

```powershell
npx prisma generate --no-engine
```

## Skill 1: Master Orchestrator

Skill name: `aqstoqflow-hr-payroll-hybrid-reconstructor`

Purpose: choose the safest next HR/payroll implementation slice and coordinate the focused skills.

Trigger description:

```yaml
description: Safely orchestrate AqStoqFlow HR/payroll hybrid reconstruction. Use when sequencing, implementing, reviewing, or gate-checking HR, employee, contract, attendance, payroll run, payslip, payment, declaration, accounting, close-invalidation, privacy, RBAC, assurance, or command-center work from the HR/Payroll roadmap.
```

Default prompt:

```text
Continue AqStoqFlow HR/payroll hybrid reconstruction. Inspect current repo state, classify the requested work, choose the safest next executable slice, preserve payroll kernel semantics, implement surgically with tests, and save a run report under what-next/payroll.
```

Required references:

- `references/source-map.md`
- `references/execution-order.md`
- `references/stop-conditions.md`
- `references/handoff-matrix.md`

Execution steps:

1. Classify the request as discovery, hardening, HR source data, command center, statutory, payslip/self-service, declarations, payments, accounting/close, SMB OS integration, assurance, or review.
2. Inspect current repo surfaces and latest payroll reports.
3. Confirm prerequisites for the requested phase.
4. Select the focused skill that should own the implementation.
5. If no focused skill exists yet, execute the slice directly using the prep pack.
6. Stop if critical prerequisites are missing.
7. Preserve all kernel, event, audit, close, ledger, and export semantics.
8. Require focused tests and targeted verification.
9. Save or update a run report.

Outputs:

- selected phase and focused skill,
- repo state summary,
- files touched,
- gates passed,
- gates blocked,
- verification results,
- next safest slice.

Handoff rule:

- Handoff to a focused skill only when the slice maps cleanly to one phase and prerequisites are satisfied.

## Skill 2: Payroll Kernel Hardener

Skill name: `aqstoqflow-payroll-kernel-hardener`

Owns phases: Phase 0.

Purpose: make the current payroll kernel safe enough to productize.

Trigger description:

```yaml
description: Harden the AqStoqFlow payroll kernel. Use for payroll immutability, correction-only mutation rules, tenant-escape tests, salary-read audit, privacy/redaction, module identity, hardcode gates, and certified-close invalidation source expansion.
```

Prerequisites:

- Current schema/migrations inspected.
- Current payroll service/action tests inspected.
- Close invalidation report inspected.
- RBAC/protect/fresh-auth helpers located.
- Audit/business-event/close-assurance services located.

Executable steps:

1. Inventory active payroll state.
2. Confirm graph and platform spines.
3. Preserve payroll run close invalidation.
4. Restore or prove DB-level immutability.
5. Add correction-only mutation rules.
6. Add statutory hardcode gate.
7. Add tenant-escape tests.
8. Add salary-read audit and privacy policy.
9. Normalize payroll module identity.
10. Evaluate payroll payment/declaration/correction close invalidation sources.
11. Save a Phase 0 run report.

Verification gates:

- Posted/emitted/released/submitted artifacts cannot be mutated in place.
- Corrections create new evidence.
- Payroll run close invalidation still marks certified close evidence stale.
- Statutory constants are not hardcoded in payroll engines.
- Tenant escape tests pass.
- Sensitive salary reads are audited.
- Payroll module disablement blocks payroll surfaces/actions.

Handoff rule:

- Do not hand off to broad UI/product skills until immutability, tenant isolation, privacy, and close invalidation gates are stable or explicitly documented as blockers.

## Skill 3: HR Source Data Builder

Skill name: `aqstoqflow-hr-source-data-builder`

Owns phases: Phase 1.

Purpose: build professional employee, contract, compensation, document, payment destination, leave, and attendance source-data workflows.

Trigger description:

```yaml
description: Build AqStoqFlow HR source-data workflows for payroll. Use for employee profiles, contracts, compensation/rubriques, salary changes, payment destination approvals, HR documents, leave, attendance, manager scope, and employee self-service profile subsets.
```

Prerequisites:

- Phase 0 tenant/RBAC/privacy controls exist or blockers are accepted.
- Payroll employee/contract schema inspected.
- Employee-user mapping inspected.
- Module and redaction policy inspected.

Executable steps:

1. Build employee profile workflow.
2. Add employee identity and duplicate-risk signals.
3. Build contract lifecycle workflow.
4. Add compensation and rubrique catalog.
5. Add salary-change request and approval.
6. Add payment destination change workflow.
7. Add HR document/evidence references.
8. Build leave and attendance source workflows.
9. Add employee self-service profile subset.

Verification gates:

- Employee, contract, compensation, and payment data are tenant-scoped.
- Payroll cannot calculate without active contract and approved required inputs.
- Salary and payment destination changes require maker-checker/fresh auth.
- Duplicate-risk signals do not expose raw sensitive values.
- Employees cannot access another employee profile.

Handoff rule:

- Handoff to command center only when payroll readiness can be computed from real HR source data.

## Skill 4: Payroll Command Center Builder

Skill name: `aqstoqflow-payroll-command-center`

Owns phases: Phase 2.

Purpose: replace the thin payroll workbench with a guided lifecycle and role-specific command center.

Trigger description:

```yaml
description: Build the AqStoqFlow Payroll Command Center. Use for payroll command read models, action boards, run wizard, line-level review, blockers, proof drawers, correction workflow, role-specific payroll UX, and lifecycle navigation from readiness to close evidence.
```

Prerequisites:

- Phase 0 safety gates are stable or documented.
- Enough Phase 1 HR source data exists to compute readiness.
- Current payroll workbench, hook, and actions inspected.
- UI design system and dashboard patterns inspected.

Executable steps:

1. Build payroll command read model.
2. Recompose first viewport action board.
3. Build run wizard.
4. Add line-level payroll review.
5. Add blocker/anomaly/proof drawer.
6. Add correction workflow.

Verification gates:

- Read model is tenant-scoped and role-redacted.
- UI does not compute authoritative payroll totals.
- Steps cannot be skipped when prerequisites fail.
- Proof drawer shows evidence, actor chain, hashes, source links, and close status.
- Corrections preserve original evidence.

Handoff rule:

- Handoff to statutory/payslip/payment skills when command center can show their blockers and links without faking completed workflows.

## Skill 5: Payroll Country-Pack Engine

Skill name: `aqstoqflow-payroll-country-pack-engine`

Owns phases: Phase 3.

Purpose: expand payroll calculation from narrow logic into country-pack-driven statutory payroll.

Trigger description:

```yaml
description: Build AqStoqFlow payroll country-pack calculation capability. Use for payroll rule resolver boundaries, country-pack payroll schema, rubriques, taxable/social bases, IRPP/income tax, CNPS/social contributions, allowances, benefits, loans, advances, garnishments, overtime, leave effects, YTD totals, corrections, and statutory provenance UI.
```

Prerequisites:

- Current payroll calculation tests pass.
- Country-pack resolver/factory inspected.
- Hardcode gate exists or is added in the slice.
- Expert-reviewed statutory inputs are available for any production formula.

Executable steps:

1. Extract payroll rules boundary.
2. Expand country-pack payroll schema.
3. Add rubriques and bases.
4. Add statutory calculation breadth.
5. Add YTD totals and corrections.
6. Add statutory provenance UI.

Verification gates:

- No legal values are hardcoded in application logic.
- Run, line, payslip, and declaration evidence pins country code, pack version, schema version, capability, and resolution hash.
- Unsupported/expert-review-only country packs block production legal certainty.
- Fixture tests match expert-reviewed expected results.

Handoff rule:

- Handoff to declaration and payslip skills when calculation trace and provenance are stable.

## Skill 6: Payslip And Self-Service Builder

Skill name: `aqstoqflow-payslip-self-service`

Owns phases: Phase 4.

Purpose: make payslips, employee self-service, exports, and payroll register real products.

Trigger description:

```yaml
description: Build AqStoqFlow payslip and payroll self-service product surfaces. Use for immutable payslip viewer, PDF/archive, bilingual labels, employee payslip self-service, payroll exports, salary-read audit, and payroll register/livre de paie tie-out.
```

Prerequisites:

- Payslip immutability proven.
- Redaction and salary-read audit policy exists.
- Employee-user mapping exists.
- Run, payslip, ledger, payment, declaration evidence inspected.

Executable steps:

1. Build immutable payslip viewer.
2. Add PDF/archive.
3. Add bilingual payslip labels.
4. Build employee payslip self-service.
5. Build payroll exports.
6. Build payroll register/livre de paie.

Verification gates:

- Payslips display stored artifact data, not mutable current employee state.
- Employee can only access own payslips.
- Exports require permission, fresh auth, redaction, audit, and evidence hashes.
- Payroll register ties runs, payslips, ledger liabilities, payments, declarations, and close evidence.

Handoff rule:

- Handoff to accounting/close and assurance skills after register tie-out is reliable.

## Skill 7: Payroll Declaration Compliance Builder

Skill name: `aqstoqflow-payroll-declaration-compliance`

Owns phases: Phase 5.

Purpose: turn declaration preparation into full statutory compliance evidence.

Trigger description:

```yaml
description: Build AqStoqFlow payroll declaration and statutory compliance workflows. Use for declaration adapters, submission evidence, acceptance/rejection lifecycle, statutory payment workflow, declaration reconciliation, authority proof trails, and expert-review fallback preservation.
```

Prerequisites:

- Country-pack declaration metadata exists or fallback is explicit.
- Current `preparePayrollDeclarations` behavior inspected.
- Compliance center and payment/accounting paths inspected.
- Declaration immutability rule exists or is added.

Executable steps:

1. Build declaration adapters.
2. Add declaration submission evidence.
3. Add acceptance/rejection lifecycle.
4. Add statutory payment workflow.
5. Add declaration reconciliation.

Verification gates:

- Unsupported declaration adapters keep honest expert-review fallback.
- Submitted declarations are immutable except via correction workflow.
- Rejected declarations cannot count as accepted proof.
- Statutory payments post balanced and source-linked.
- Unreconciled material statutory payments block close.

Handoff rule:

- Handoff to accounting/close skill when declaration lifecycle creates close-impacting evidence.

## Skill 8: Payroll Payment Reconciliation Builder

Skill name: `aqstoqflow-payroll-payment-recon`

Owns phases: Phase 6.

Purpose: make payroll payment operations certifiable and reconcilable.

Trigger description:

```yaml
description: Build AqStoqFlow payroll payment and reconciliation workflows. Use for payroll payment batch details, bank/mobile-money file evidence, payment release proof, provider/statement matching, retry and settlement states, payroll payment exceptions, and treasurer dashboards.
```

Prerequisites:

- `releasePayrollPaymentBatch` controls inspected.
- Approved destination evidence workflow exists.
- Payment reconciliation services inspected.
- Posting rules for payroll payment exist or blockers are visible.

Executable steps:

1. Build payment batch detail screens.
2. Add bank/mobile-money file evidence.
3. Add provider/statement matching.
4. Add retry and settlement states.
5. Add treasurer dashboard.

Verification gates:

- Duplicate allocation and overpayment remain impossible.
- Release requires payment destination evidence.
- Payment evidence requirement follows payment method policy.
- Mismatches create exception/suspense.
- Retries do not double-pay or double-post.
- Treasurer views do not leak unauthorized salary detail.

Handoff rule:

- Handoff to accounting/close once payment status can drive close blockers and stale evidence.

## Skill 9: Payroll Accounting And Close Builder

Skill name: `aqstoqflow-payroll-accounting-close`

Owns phases: Phase 7.

Purpose: connect payroll to accounting truth, close assurance, stale certified exports, and auditor evidence.

Trigger description:

```yaml
description: Build AqStoqFlow payroll accounting and close-assurance integration. Use for payroll posting rule management, source-link drillthrough, payroll close blockers, certified-close invalidation for payment/declaration/correction events, stale evidence, certified exports, and auditor proof packs.
```

Prerequisites:

- Payroll run posting source links exist.
- Close assurance invalidation helper inspected.
- Payment/declaration close-impacting writes evaluated.
- Payroll register or equivalent tie-out data exists.

Executable steps:

1. Build payroll posting rule management.
2. Add source-link drillthrough.
3. Add payroll close blockers.
4. Extend certified close invalidation mesh.
5. Add auditor proof pack.

Verification gates:

- Missing/inactive/non-leaf/unbalanced accounts block posting visibly.
- Source links resolve only within tenant.
- Close readiness detects payroll blockers.
- Invalidation preserves stale metadata, audit, stale evidence, business event, and export/outbox semantics.
- Auditor pack is redacted and evidence-backed.

Handoff rule:

- Handoff to SMB OS integration and assurance once close blockers and invalidation are stable.

## Skill 10: SMB Operations Integration Builder

Skill name: `aqstoqflow-payroll-smb-ops`

Owns phases: Phase 8.

Purpose: bake payroll signals into the broader SMB operating platform.

Trigger description:

```yaml
description: Integrate AqStoqFlow payroll into SMB operating surfaces. Use for owner payroll/cash/compliance signals, manager action center payroll inputs, payroll cash forecast, profitability analytics, compliance radar, close readiness, BI, and cross-module operational signals.
```

Prerequisites:

- Command read models exist.
- Payroll register/payment/declaration evidence exists.
- Manager scope and redaction policies exist.
- Cash forecast, BI, owner brief, manager action, compliance, or close surfaces inspected.

Executable steps:

1. Add owner payroll/cash/compliance signals.
2. Add manager action center payroll inputs.
3. Add cash forecast payroll obligations.
4. Add profitability analytics.
5. Add compliance radar and close readiness.

Verification gates:

- Signals link to source evidence.
- Manager scope is location/team limited.
- Forecast reconciles to liabilities and payment status.
- Analytics use ledger/register truth, not UI totals.
- Compliance and close risk update from events.

Handoff rule:

- Handoff to assurance skill for monitoring, chaos, and release gates.

## Skill 11: Payroll Assurance And Chaos Builder

Skill name: `aqstoqflow-payroll-assurance-chaos`

Owns phases: Phase 9.

Purpose: make the completed HR/payroll system battle-tested.

Trigger description:

```yaml
description: Build AqStoqFlow payroll assurance, chaos, browser smoke, and release gates. Use for payroll assurance checks, attendance drift, duplicate run/posting/payment, missing archive, declaration due risk, unusual salary changes, payment destination changes, correction abuse, closed-period posting, concurrency, rollback, tenant escape, export bypass, and release decision reports.
```

Prerequisites:

- Core payroll workflows exist.
- Service tests and transaction boundaries exist.
- Command center/self-service routes exist for browser smoke.
- Critical/high blockers from previous phases are known.

Executable steps:

1. Add payroll assurance checks.
2. Add payroll chaos tests.
3. Add browser smoke gates.
4. Add release decision report.

Verification gates:

- Every assurance check has pass/fail fixtures.
- Double-submit/concurrent flows do not duplicate evidence.
- Rollback leaves no partial irreversible mutation.
- Browser smoke covers loading, empty, permission denied, degraded, and normal states.
- Release decision is not `APPROVED_FOR_013` while critical/high blockers remain.

Handoff rule:

- Handoff to the next numbered platform phase only when release decision is `APPROVED_FOR_013`.

## Skill Creation Order

Create skills in this order:

1. `aqstoqflow-hr-payroll-hybrid-reconstructor`
2. `aqstoqflow-payroll-kernel-hardener`
3. `aqstoqflow-hr-source-data-builder`
4. `aqstoqflow-payroll-command-center`
5. `aqstoqflow-payroll-country-pack-engine`
6. `aqstoqflow-payslip-self-service`
7. `aqstoqflow-payroll-declaration-compliance`
8. `aqstoqflow-payroll-payment-recon`
9. `aqstoqflow-payroll-accounting-close`
10. `aqstoqflow-payroll-smb-ops`
11. `aqstoqflow-payroll-assurance-chaos`

If time is limited, create only the orchestrator and kernel hardener first. Those two provide the safety rail for everything else.

## Shared Skill Folder Shape

Each skill should use:

```text
skill-name/
  SKILL.md
  agents/openai.yaml
  references/
    source-map.md
    execution-steps.md
    gates-and-verification.md
```

Only add more reference files when the skill would otherwise become too large.

Do not add:

- `README.md`
- `CHANGELOG.md`
- `INSTALLATION_GUIDE.md`
- broad duplicated reports
- placeholder examples that are not used

## Shared SKILL.md Body Template

Each focused skill can use this compact body shape:

```markdown
# Skill Title

Use this skill for the named HR/payroll implementation stream inside AqStoqFlow.

## Required Context

Read `references/source-map.md`, then inspect the current repo surfaces before editing.

## Workflow

1. Classify the slice.
2. Confirm prerequisites.
3. Stop on critical blockers.
4. Implement the smallest safe slice.
5. Preserve payroll kernel, audit, event, ledger, close, and export semantics.
6. Add focused tests.
7. Run targeted verification.
8. Save a run report under `what-next/payroll/`.

## Non-Negotiables

- No tenant bypass.
- No unaudited salary reads.
- No hardcoded statutory values.
- No mutable approved payroll evidence.
- No unbalanced/source-unlinked payroll posting.
- No fresh-auth or maker-checker bypass for sensitive actions.
- No false legal certainty for expert-review-only country-pack rules.

## Reference Routing

- `references/execution-steps.md`: ordered tasks for this skill.
- `references/gates-and-verification.md`: tests, commands, stop conditions.
- `references/source-map.md`: repo files, reports, companion skills, handoff rules.
```

## Shared OpenAI Metadata Template

Each skill should include `agents/openai.yaml` with these fields:

```yaml
display_name: <Human readable skill name>
short_description: <25-64 character description>
default_prompt: <One-sentence command that starts the skill on the safest next slice>
```

## Skill Creation Command Pattern

Use the skill creator scaffold, adjusting the skill name and metadata:

```powershell
python "C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\init_skill.py" <skill-name> --path "C:\Users\J COMPUTER\.codex\skills" --resources references --interface display_name="<display name>" --interface short_description="<short description>" --interface default_prompt="<default prompt>"
```

If validation fails because `PyYAML` is unavailable, manually validate:

- folder name matches skill name,
- `SKILL.md` frontmatter has only `name` and `description`,
- description contains trigger contexts,
- `agents/openai.yaml` exists and matches purpose,
- references have no placeholders,
- no unnecessary auxiliary docs exist.

## Complete Integration Sequence

The complete HR/payroll integration must execute in this order:

1. Inventory and classify the current payroll state.
2. Preserve payroll run close invalidation.
3. Prove immutability and correction-only mutation rules.
4. Add hardcode, tenant, salary-read, privacy, and module-control gates.
5. Evaluate and add payment/declaration/correction close invalidation where real.
6. Build employee profiles.
7. Build duplicate-risk signals.
8. Build contracts.
9. Build compensation/rubrique catalog.
10. Build salary-change approvals.
11. Build payment-destination approvals.
12. Build HR document evidence.
13. Build leave/attendance workflows.
14. Build employee self-service profile subset.
15. Build payroll command read model.
16. Build payroll action board.
17. Build payroll run wizard.
18. Build line-level review.
19. Build proof drawer.
20. Build correction workflow.
21. Extract payroll rules boundary.
22. Expand country-pack payroll schema.
23. Add rubriques and bases.
24. Add statutory calculation breadth.
25. Add YTD and statutory provenance.
26. Build payslip viewer.
27. Add PDF/archive.
28. Add bilingual labels.
29. Add employee payslip self-service.
30. Add payroll exports.
31. Build payroll register.
32. Build declaration adapters.
33. Add submission evidence.
34. Add acceptance/rejection lifecycle.
35. Add statutory payment workflow.
36. Add declaration reconciliation.
37. Build payment batch details.
38. Add bank/mobile-money file evidence.
39. Add provider/statement matching.
40. Add retry and settlement states.
41. Add treasurer dashboard.
42. Build payroll posting rule management.
43. Add source-link drillthrough.
44. Add payroll close blockers.
45. Extend certified close invalidation mesh.
46. Add auditor proof pack.
47. Add owner payroll/cash/compliance signals.
48. Add manager action center payroll inputs.
49. Add payroll cash forecast.
50. Add payroll profitability analytics.
51. Add compliance radar and close readiness.
52. Add payroll assurance checks.
53. Add chaos tests.
54. Add browser smoke gates.
55. Save release decision report.

## Final Acceptance Criteria

The HR/payroll system can be considered fully baked into AqStoqFlow only when:

- HR source data is complete enough to run payroll without external spreadsheets.
- Payroll calculations are country-pack-driven and provenance-backed.
- Payslips are immutable, archived, exportable, and available through self-service.
- Payroll payments are evidence-backed, released with SoD, and reconcilable.
- Declarations move from preparation to submission, acceptance/rejection, payment, reconciliation, and archive.
- Payroll posts balanced SYSCOHADA entries with source links.
- Certified close evidence becomes stale when payroll facts change.
- Salary/person data is redacted and audited.
- Payroll signals feed owner, manager, cash, compliance, BI, and close surfaces.
- Assurance, chaos, browser smoke, typecheck, policy, and service-boundary gates pass.

