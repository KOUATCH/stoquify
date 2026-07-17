# AqStoqFlow HR/Payroll Skill Creation Prep Pack

Date: 2026-06-25

Source roadmap: `what-next/AQSTOQFLOW_HR_PAYROLL_PLATFORM_ROADMAP_AND_HYBRID_RECONSTRUCTION_2026-06-25.md`

Recommended skill strategy: create one canonical orchestration skill first, then split phase-specific skills only after the execution patterns stabilize.

Recommended skill name: `aqstoqflow-hr-payroll-hybrid-reconstructor`

Recommended install path: `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hr-payroll-hybrid-reconstructor`

## Refined Skill Creation Request

Create and install a Codex skill named `aqstoqflow-hr-payroll-hybrid-reconstructor`.

The skill must help Codex safely build and harden HR/payroll inside `E:\ohada saas\newStockFlow\aqstoqflow` using the hybrid reconstruction decision from the HR/Payroll Platform Roadmap. It must preserve the valuable payroll kernel while reconstructing missing HR source-data workflows, payroll command center surfaces, statutory payroll adapters, payslips, self-service, payments, declarations, accounting/close integration, and assurance gates.

The skill must be execution-oriented, not a generic HR/payroll explanation. It should guide Codex to:

- classify the current payroll state before editing,
- inspect actual repo surfaces before assuming missing or present code,
- choose the safest next executable slice,
- enforce prerequisites before implementation,
- preserve existing invalidation metadata, audit, stale-evidence, business-event, country-pack, source-link, and certified export semantics,
- avoid hardcoded statutory values,
- require tenant scoping, RBAC, fresh auth, maker-checker, redaction, and audit for sensitive payroll work,
- keep approved payroll facts immutable and use corrections instead of rewrites,
- keep payroll ledger postings balanced and source-linked,
- add focused tests and verification for every slice,
- save a concise run report under `what-next/`.

The skill should use progressive disclosure. Keep `SKILL.md` concise and place detailed executable backlog, prerequisites, gates, event/ledger rules, and verification commands in `references/` files.

Use this resource layout:

```text
aqstoqflow-hr-payroll-hybrid-reconstructor/
  SKILL.md
  agents/openai.yaml
  references/
    execution-backlog.md
    prerequisites-and-source-map.md
    gates-and-verification.md
    events-ledger-close.md
    skill-authoring-notes.md
```

Do not create extra README, changelog, or installation files inside the skill.

## Proposed Skill Trigger Metadata

Frontmatter:

```yaml
---
name: aqstoqflow-hr-payroll-hybrid-reconstructor
description: Safely build and harden AqStoqFlow HR/payroll through hybrid reconstruction. Use when implementing, sequencing, reviewing, or gate-checking HR, employee, contract, attendance, payroll run, payslip, payroll payment, declaration, SYSCOHADA ledger, close-invalidation, payroll privacy, RBAC, assurance, or command-center work in `E:\ohada saas\newStockFlow\aqstoqflow`, especially when turning the HR/Payroll Platform Roadmap into executable slices.
---
```

UI metadata:

```yaml
display_name: AqStoqFlow HR/Payroll Reconstructor
short_description: Execute the HR/payroll hybrid reconstruction roadmap with gates.
default_prompt: Continue AqStoqFlow HR/payroll hybrid reconstruction. Inspect the current repo state, choose the safest next executable slice, preserve payroll kernel semantics, implement surgically with tests, and save a run report under what-next.
```

## Skill Operating Contract

Every run of the skill should follow this sequence:

1. Read the user's newest request and classify it as `DISCOVERY`, `HARDENING`, `HR_SOURCE_DATA`, `COMMAND_CENTER`, `STATUTORY`, `PAYSLIP_SELF_SERVICE`, `PAYMENTS_DECLARATIONS`, `ACCOUNTING_CLOSE`, `SMB_OS_INTEGRATION`, `ASSURANCE`, or `REVIEW`.
2. Inspect the current repo surfaces before acting:
   - Prisma schema and migrations,
   - payroll services/actions/hooks/components/routes,
   - accounting posting/source-link services,
   - country-pack resolver and payroll rules,
   - payment/reconciliation services,
   - close-assurance invalidation helpers,
   - RBAC/protect/fresh-auth helpers,
   - redaction/privacy and module-control surfaces,
   - payroll tests and recent `what-next/` reports.
3. Confirm prerequisites for the requested slice.
4. Stop and report blockers if a prerequisite is missing and implementing past it would weaken payroll integrity.
5. Make surgical code changes only inside the selected slice and direct dependencies.
6. Preserve existing payroll run posting invalidation semantics.
7. Add focused tests for the new invariant.
8. Run targeted verification.
9. Save a run report under `what-next/` with files changed, gates passed, gates blocked, verification, and next safest slice.

## Ordered Executable Backlog

The points below are ordered for safe execution. Later phases should not be started until earlier critical gates are satisfied, unless the task is a read-only assessment or deliberately isolated prototype.

### Phase 0: Kernel Safety And Architecture Inventory

Goal: make the existing payroll kernel safe enough to productize.

0.01 Inventory current payroll state.

- Prerequisites: none.
- Inspect: `prisma/schema.prisma`, `prisma/migrations`, `services/payroll`, `actions/payroll`, `hooks/payroll`, `components/payroll`, payroll routes, payroll tests, latest `what-next/` payroll reports.
- Done when: active models, services, UI surfaces, tests, known gaps, and obsolete docs are listed in a run report.

0.02 Confirm graph and platform spines.

- Prerequisites: graph artifacts exist or note absence.
- Inspect: `graphify-out/GRAPH_REPORT.md`, accounting, payments, close assurance, RBAC, country packs.
- Done when: payroll dependencies on ledger, payment reconciliation, close assurance, country-pack, and RBAC surfaces are mapped.

0.03 Preserve payroll run close invalidation.

- Prerequisites: current payroll run posting invalidation report and helper exist.
- Inspect: `services/accounting/close-assurance-pack.service.ts`, `approveAndPostPayrollRun`.
- Done when: tests still prove `PAYROLL_RUN_POSTED` marks certified close evidence stale with current metadata/audit/business-event/export semantics.

0.04 Restore or prove DB-level immutability.

- Prerequisites: current schema/migration inventory.
- Implement: triggers or equivalent DB controls for posted payroll runs, emitted payslips, payslip lines, released payment batches, allocations, submitted declarations, and archived payroll evidence.
- Tests: forbidden mutation fails; allowed correction paths still work.
- Stop if: immutability cannot be enforced without rewriting current kernel.

0.05 Add correction-only mutation rules.

- Prerequisites: immutable artifacts defined.
- Implement: explicit correction run/document/state transitions for post-approval or post-emission changes.
- Tests: corrections create new evidence and do not rewrite original approved facts.

0.06 Add statutory hardcode gate.

- Prerequisites: current payroll calculation and country-pack resolver inspected.
- Implement: static check that blocks non-test hardcoded tax, CNPS/social-security, withholding, legal deadline, threshold, overtime, SMIG, or declaration constants in payroll engines.
- Tests: gate catches sample forbidden literals and ignores fixtures/reference data where explicitly allowed.

0.07 Add tenant-escape tests.

- Prerequisites: services/actions and test factories inspected.
- Tests: payroll employees, contracts, runs, payslips, payment batches, declarations, workbench reads, and exports cannot cross organization boundaries.

0.08 Add salary-read audit and privacy policy.

- Prerequisites: RBAC/protect helpers and existing audit service inspected.
- Implement: audited salary/person-data reads for bulk payroll, payslips, employee profile salary/payment details, exports, and auditor views.
- Tests: unauthorized or unaudited sensitive reads fail.

0.09 Normalize payroll module identity.

- Prerequisites: module-control and permission catalog inspected.
- Implement: one canonical payroll module identity for routes, actions, read models, redaction, entitlements, and audit.
- Tests: disabled payroll module blocks payroll surfaces and actions.

0.10 Evaluate next close invalidation sources.

- Prerequisites: payroll run posting invalidation stable.
- Evaluate: payroll payment release, payroll declaration prepared/submitted/accepted/rejected/paid, payroll correction.
- Implement only if close-impacting write path is real and semantics can be preserved.
- Tests: stale close evidence appears with correct source metadata and business event.

0.11 Save Phase 0 run report.

- Prerequisites: at least one Phase 0 slice completed or blocked.
- Save: `what-next/AQSTOQFLOW_HR_PAYROLL_PHASE_0_*_RUN_REPORT_YYYY-MM-DD.md`.

### Phase 1: HR Source-Data Foundation

Goal: make payroll inputs professional, controlled, and auditable.

1.01 Build employee profile workflow.

- Prerequisites: tenant/RBAC/privacy basics from Phase 0.
- Implement: employee list/detail/create/update service, action, hook, route, form, table, sensitive field masking.
- Tests: tenant scope, validation, redaction, duplicate employee number.

1.02 Add employee identity and duplicate-risk signals.

- Prerequisites: employee profile workflow.
- Implement: duplicate phone/social id/tax id/payment destination hash flags and queues.
- Tests: duplicate signal appears without exposing raw sensitive values.

1.03 Build contract lifecycle workflow.

- Prerequisites: employee workflow.
- Implement: contract create/amend/activate/suspend/end with signed evidence hash and maker-checker for activation/salary changes.
- Tests: payroll cannot calculate for employee without active contract in period.

1.04 Add compensation and rubrique catalog.

- Prerequisites: contract workflow and country-pack conventions inspected.
- Implement: compensation item/rubrique definitions, assignment to employee/contract, effective dating, taxable/social base metadata.
- Tests: assignments are tenant-scoped and effective-date aware.

1.05 Add salary-change request and approval.

- Prerequisites: compensation catalog and maker-checker controls.
- Implement: request, review, approve/reject, evidence hash, effective date, business event.
- Tests: preparer cannot approve own salary change; approved change feeds later payroll inputs.

1.06 Add payment destination change workflow.

- Prerequisites: employee workflow and sensitive-action audit.
- Implement: requested destination, masked display, destination fingerprint, approval, fresh auth, SoD, business event.
- Tests: payroll payment release fails without approved destination evidence.

1.07 Add HR document/evidence references.

- Prerequisites: employee/contract/salary/payment workflows.
- Implement: document hash/archive references for contracts, IDs, payment proof, salary letters, onboarding evidence.
- Tests: evidence references are tenant-scoped and immutable when linked to approved facts.

1.08 Build leave and attendance source workflows.

- Prerequisites: employee and manager scope.
- Implement: leave requests, overtime, attendance exceptions, approval/correction, period impact.
- Tests: leave/overtime affects payroll only through frozen attendance snapshots.

1.09 Add employee self-service profile subset.

- Prerequisites: employee-to-user mapping and privacy policy.
- Implement: own profile, own documents where allowed, own payment change request.
- Tests: employee cannot read another employee profile or salary data.

### Phase 2: Payroll Command Center

Goal: replace the thin workbench with a guided lifecycle.

2.01 Build payroll command read model.

- Prerequisites: Phase 0 safety and enough HR source data to show readiness.
- Implement: period status, readiness blockers, net payable, posting state, payment state, declaration state, close trust state.
- Tests: read model is tenant-scoped and redacted by role.

2.02 Recompose first viewport action board.

- Prerequisites: command read model.
- Implement: due actions, blockers, next step, stale/as-of state, permission-aware actions.
- Browser smoke: loading, empty, permission denied, degraded, and normal states.

2.03 Build run wizard.

- Prerequisites: attendance freeze, calculate, approve/post, payment, declaration actions available or safely stubbed as blocked.
- Implement: readiness -> freeze attendance -> calculate -> review -> approve/post -> payslips -> payment -> declarations -> close evidence.
- Tests: steps cannot be skipped when prerequisites fail.

2.04 Add line-level payroll review.

- Prerequisites: run lines and redaction policy.
- Implement: employee line drilldown with calculation trace, anomaly flags, rule provenance, attendance evidence.
- Tests: unauthorized roles cannot see sensitive line detail.

2.05 Add blocker/anomaly/proof drawer.

- Prerequisites: business events/source links/audit available.
- Implement: source evidence, actor chain, hashes, ledger link, payment/declaration links, close stale status.
- Tests: proof drawer never computes authoritative totals in UI.

2.06 Add correction workflow.

- Prerequisites: immutable correction rules.
- Implement: correction request, corrective run/document creation, approval, posting, payslip replacement/void links.
- Tests: original emitted/posting evidence remains immutable.

### Phase 3: Payroll Calculation Engine And Country Packs

Goal: move from narrow calculation to country-pack-driven statutory payroll.

3.01 Extract payroll rules boundary.

- Prerequisites: current calculation tests passing.
- Implement: rule resolver interface over country-pack data, no hardcoded statutory constants.
- Tests: calculation fails with `REQUIRES_EXPERT_REVIEW` or `COUNTRY_PACK_UNSUPPORTED` when provenance is insufficient.

3.02 Expand country-pack payroll schema.

- Prerequisites: country-pack factory/resolver inspected.
- Implement: rubriques, taxable/social bases, caps, thresholds, deadlines, labels, declaration metadata, capability status, legal references.
- Tests: version/hash pinned on run, line, payslip, and declaration.

3.03 Add rubriques and bases.

- Prerequisites: compensation catalog and country-pack schema.
- Implement: earnings, employee deductions, employer charges, information lines, base formulas.
- Tests: line-level calculation trace explains base and amount.

3.04 Add statutory calculation breadth.

- Prerequisites: expert-reviewed country pack.
- Implement: IRPP/income tax, CNPS/social contributions, allowances, benefits, loans, advances, garnishments, overtime, leave effects.
- Tests: fixture tests with expert-reviewed expected results.

3.05 Add YTD totals and corrections.

- Prerequisites: stable run/payslip history and correction model.
- Implement: YTD accumulators and corrective adjustments.
- Tests: correction affects current evidence without rewriting old payslips.

3.06 Add statutory provenance UI.

- Prerequisites: rule provenance stored.
- Implement: rule version, capability status, expert-review warnings, legal reference display.
- Tests: expert-review-only rules cannot be presented as production legal truth.

### Phase 4: Payslips, Self-Service, And Payroll Register

Goal: make payslips and payroll reporting real products.

4.01 Build immutable payslip viewer.

- Prerequisites: payslip immutability and redaction policy.
- Implement: employee, employer, legal identifiers, line details, totals, hashes, country-pack provenance.
- Tests: emitted payslip displays from stored artifact data, not mutable current employee state.

4.02 Add PDF/archive.

- Prerequisites: payslip viewer and archive storage policy.
- Implement: PDF generation, archive URI, hash verification, audit.
- Tests: generated PDF hash matches stored evidence.

4.03 Add bilingual payslip labels.

- Prerequisites: payslip line categories and country-pack labels.
- Implement: French-first labels and optional English labels.
- Tests: no hardcoded legal label when country-pack provides it.

4.04 Build employee payslip self-service.

- Prerequisites: employee-user mapping and self-service RBAC.
- Implement: own payslip list/detail/download with salary-read audit.
- Tests: tenant/user isolation and export audit.

4.05 Build payroll exports.

- Prerequisites: redaction policy, fresh auth, audit, payslip/register models.
- Implement: role-scoped exports with hashes and outbox/audit evidence.
- Tests: export is blocked without permission/fresh auth; redaction rules apply.

4.06 Build payroll register/livre de paie.

- Prerequisites: run, payslip, ledger, payment, declaration evidence.
- Implement: accountant/auditor tie-out view.
- Tests: register totals tie to run totals, payslips, ledger liabilities, payments, and declarations.

### Phase 5: Statutory Declarations And Compliance Evidence

Goal: turn declaration preparation into a full compliance workflow.

5.01 Build declaration adapters.

- Prerequisites: country-pack declaration metadata and current `preparePayrollDeclarations` fallback.
- Implement: authority-specific adapter interface and payload generation.
- Tests: unsupported adapter keeps honest expert-review fallback.

5.02 Add declaration submission evidence.

- Prerequisites: declaration payloads and compliance center integration plan.
- Implement: package, submission reference, submitted timestamp, actor, document hash.
- Tests: submitted declaration becomes immutable except correction workflow.

5.03 Add acceptance/rejection lifecycle.

- Prerequisites: submission evidence.
- Implement: accepted/rejected states, reason, resubmission/correction path.
- Tests: rejected declaration cannot be treated as accepted proof.

5.04 Add statutory payment workflow.

- Prerequisites: declaration accepted/payment due and posting rules.
- Implement: authority/social payment batch, ledger posting, payment evidence.
- Tests: liability payment posts balanced and source-linked.

5.05 Add declaration reconciliation.

- Prerequisites: statutory payment workflow and payment reconciliation service.
- Implement: match authority payment evidence to declaration liability.
- Tests: unreconciled material declaration payment blocks close.

### Phase 6: Payroll Payments And Reconciliation

Goal: make payroll payment operations certifiable.

6.01 Build payment batch detail screens.

- Prerequisites: `releasePayrollPaymentBatch` controls and read model.
- Implement: allocations, destination evidence, approvals, posting status, reconciliation status.
- Tests: duplicate allocation and overpayment remain impossible.

6.02 Add bank/mobile-money file evidence.

- Prerequisites: approved destinations and payment method policies.
- Implement: generated file or uploaded evidence hash, provider reference, release proof.
- Tests: release requires evidence where payment method policy requires it.

6.03 Add provider/statement matching.

- Prerequisites: payment reconciliation service.
- Implement: match released payroll payments to provider/statement lines.
- Tests: amount/date/reference mismatch creates exception/suspense.

6.04 Add retry and settlement states.

- Prerequisites: exception model and payment batch state machine.
- Implement: failed, partial settlement, retry, settled states.
- Tests: retries do not double-pay or double-post.

6.05 Add treasurer dashboard.

- Prerequisites: payment read model and redaction.
- Implement: pending release, released/unmatched, exceptions, settlement proof.
- Tests: treasurer sees payment evidence without unauthorized salary detail.

### Phase 7: Accounting, Close Assurance, And Certified Exports

Goal: make payroll part of financial truth.

7.01 Build payroll posting rule management.

- Prerequisites: default posting rules and current posting services.
- Implement: payroll run, payroll payment, authority/social payment rule management.
- Tests: missing, inactive, non-leaf, or unbalanced accounts block posting visibly.

7.02 Add source-link drillthrough.

- Prerequisites: accounting source links for payroll run/payment/declaration.
- Implement: ledger-to-payroll proof navigation and read model.
- Tests: source link resolves only within tenant.

7.03 Add payroll close blockers.

- Prerequisites: close assurance services.
- Implement blockers for unposted approved run, payslip/run mismatch, missing declarations, unreconciled payment, unsupported country pack, attendance correction without corrective run.
- Tests: blocker appears in certified close readiness.

7.04 Extend certified close invalidation mesh.

- Prerequisites: Phase 0 evaluation of payment/declaration sources.
- Implement: typed source metadata and invalidation for close-impacting payroll payment/declaration/correction events.
- Tests: preserves stale metadata, audit, stale evidence, business event, export/outbox semantics.

7.05 Add auditor proof pack.

- Prerequisites: register, source links, close blockers, export policy.
- Implement: redacted auditor pack with hashes, actor chain, event trail, ledger/payment/declaration tie-out.
- Tests: pack cannot leak unauthorized salary details.

### Phase 8: SMB Operating System Integration

Goal: make AqStoqFlow a complete management environment.

8.01 Add owner payroll/cash/compliance signals.

- Prerequisites: command read models and cash forecast data.
- Implement: owner morning brief signals for payroll due, net payable, statutory due, blocked payment, close risk.
- Tests: signals link to source evidence.

8.02 Add manager action center payroll inputs.

- Prerequisites: attendance/leave workflows.
- Implement: team attendance exceptions, approvals, missing data, freeze deadlines.
- Tests: manager scope is location/team limited.

8.03 Add cash forecast payroll obligations.

- Prerequisites: payroll runs, payment batches, declarations.
- Implement: payroll net payable and statutory payment forecast.
- Tests: forecast reconciles to posted liabilities and payment status.

8.04 Add profitability analytics.

- Prerequisites: payroll register and cost centers.
- Implement: payroll cost by branch, department, cost center, product line where data supports it.
- Tests: analytics are sourced from ledger/register, not UI totals.

8.05 Add compliance radar and close readiness.

- Prerequisites: declaration lifecycle and close blockers.
- Implement: filing/payment risk, country-pack unsupported warnings, stale certified close signal.
- Tests: risk state updates from events.

### Phase 9: Assurance, Chaos, And Release Gates

Goal: make the system battle-tested.

9.01 Add payroll assurance checks.

- Prerequisites: core workflows and read models.
- Implement checks for attendance drift, duplicate run/posting/payment, missing archive, declaration due risk, unusual salary changes, payment destination changes, correction abuse, closed-period posting.
- Tests: every check has pass/fail fixtures.

9.02 Add payroll chaos tests.

- Prerequisites: service tests and transaction boundaries.
- Implement tests for rollback, double-submit, concurrent calculation, concurrent approval, concurrent payment release, tenant escape, stale country pack, export bypass.
- Tests: no duplicate evidence, no partial irreversible mutation.

9.03 Add browser smoke gates.

- Prerequisites: command center and self-service routes.
- Implement Playwright or equivalent smoke coverage for command center, employee profile, contract, run detail, payment batch, declaration, payslip, self-service.
- Tests: loading, empty, permission denied, degraded, and normal states.

9.04 Add release decision report.

- Prerequisites: all critical/high gates satisfied.
- Save: `what-next/AQSTOQFLOW_HR_PAYROLL_RELEASE_GATE_REPORT_YYYY-MM-DD.md`.
- Decision values: `BLOCKED`, `IN_PROGRESS`, `READY_FOR_REVIEW`, `APPROVED_FOR_013`.
- Do not mark `APPROVED_FOR_013` while immutable payroll evidence, ledger tie-out, payments, declarations, tenant isolation, or legal provenance has critical/high blockers.

## Prerequisites To Bundle Into The Skill

Required source docs:

- `what-next/AQSTOQFLOW_HR_PAYROLL_PLATFORM_ROADMAP_AND_HYBRID_RECONSTRUCTION_2026-06-25.md`
- `what-next/AQSTOQFLOW_HR_PAYROLL_ENTERPRISE_READINESS_ASSESSMENT_2026-06-24.md`
- `what-next/AQSTOQFLOW_PAYROLL_CLOSE_INVALIDATION_RUN_REPORT_2026-06-25.md`
- `graphify-out/GRAPH_REPORT.md`
- `docs/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md` if present
- `what-next/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md` if present

Required current code surfaces:

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
- `services/regulatory/` or country-pack resolver path if renamed
- RBAC/protect/fresh-auth helpers
- audit and business-event/outbox services
- close-assurance services
- payroll-related tests

Required companion skills:

- `012-aqstoqflow-payroll-presence-architect`
- `012-aqstoqflow-payroll-presence-engine`
- `ledger-first-business-events` when events/ledger are modified
- `ohada-payroll-engine` when statutory calculation is modified
- `better-auth-rbac-ohada` when permissions/fresh auth/RBAC are modified
- `payment-reconciliation-moat` when payroll payments/reconciliation are modified
- `build-enterprise-dashboard` when command center UI is modified
- `enterprise-error-handling` when service/action error contracts are modified
- `enterprise-fraud-and-controls` when maker-checker, SoD, audit, or abuse checks are modified

Required verification command candidates:

```powershell
npm run prisma:validate
npm run prisma:generate
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand
npm test -- --runTestsByPath services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand
npm run service:boundary:fail
npm run policy:gates
npm run typecheck
```

Use only commands relevant to the touched slice. If `prisma generate` fails because the Windows query engine is locked, retry with:

```powershell
npx prisma generate --no-engine
```

## Stop Conditions For The Future Skill

The skill must stop or return `BLOCKED` if:

- a payroll slice would bypass tenant scoping,
- sensitive payroll actions can run without RBAC and fresh auth,
- maker-checker is missing for approval, payment release, payment destination, salary change, declaration, or export,
- approved payroll facts can be mutated in place,
- statutory values are hardcoded in application code,
- country-pack capability is unsupported but the UI/service presents legal certainty,
- payroll posting is unbalanced or lacks source links,
- payment release can occur without approved destination evidence,
- employee self-service can access another employee,
- export can bypass redaction/audit,
- close-certified evidence can become stale without stale evidence metadata and audit.

## Suggested Reference File Contents

Use this prep pack to create the skill references as follows:

- `references/execution-backlog.md`: copy the Ordered Executable Backlog section.
- `references/prerequisites-and-source-map.md`: copy prerequisites, source docs, current code surfaces, and companion skills.
- `references/gates-and-verification.md`: copy verification commands, stop conditions, gate checklist, and release report contract.
- `references/events-ledger-close.md`: copy business event, ledger, payment, declaration, and close invalidation rules from this prep pack and the payroll architect reference.
- `references/skill-authoring-notes.md`: copy the refined skill creation request, metadata, operating contract, and file layout.

## First Skill Creation Command Shape

When creating the skill, start with the system skill creator script rather than hand-building the folder:

```powershell
python "C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\init_skill.py" aqstoqflow-hr-payroll-hybrid-reconstructor --path "C:\Users\J COMPUTER\.codex\skills" --resources references --interface display_name="AqStoqFlow HR/Payroll Reconstructor" --interface short_description="Execute the HR/payroll hybrid reconstruction roadmap with gates." --interface default_prompt="Continue AqStoqFlow HR/payroll hybrid reconstruction. Inspect the current repo state, choose the safest next executable slice, preserve payroll kernel semantics, implement surgically with tests, and save a run report under what-next."
```

If the script path differs, search the local `skill-creator` skill folder for `init_skill.py` before running.

## Final Skill Creation Acceptance Checklist

The skill is ready when:

- `SKILL.md` has only `name` and `description` in frontmatter.
- `SKILL.md` stays concise and routes detailed content to references.
- `agents/openai.yaml` exists and matches the skill purpose.
- Reference files contain the execution backlog, prerequisites, gates, and event/ledger/close rules.
- No README/changelog/installation clutter exists inside the skill.
- Trigger description mentions AqStoqFlow, HR/payroll, hybrid reconstruction, close invalidation, payroll kernel preservation, and executable slices.
- Validation has been run with `quick_validate.py` or manual validation documents why the validator could not run.
- A saved skill creation report is written under `what-next/`.

