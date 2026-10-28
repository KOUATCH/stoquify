# AqStoqFlow HRIS–Payroll Orchestrator Report

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-00-orchestrator`  
Decision: **CONDITIONAL GO for Phase 0 and the first ownership-boundary tranche; NO-GO for broad implementation or unrestricted production**

## Scope

Reconcile the July 12–17 HRIS/payroll program evidence with the July 19 architecture decision, establish the next safe dependency-ordered slice, and preserve the current dirty working tree.

## Evidence inspected

- `docs/HR-Payroll/README.md`
- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_NEXT_STEPS_2026-07-12.md`
- `what-next/payroll/STOQUIFY_HRIS_CURRENT_STATE_REGISTER_2026-07-14.md`
- `what-next/payroll/STOQUIFY_HRIS_FINAL_READINESS_2026-07-17.md`
- `docs/HRIS-Payroll/STOQUIFY_HRIS_PAYROLL_ARCHITECTURE_DECISION_2026-07-19.md`
- `docs/HRIS/STOQUIFY_HRIS_PAYROLL_REALIZATION_ORCHESTRATION_PROMPT_2026-07-19.md`
- Current Git status, HRIS/payroll services and actions, schema, permissions, module inventory, and available graph reports

## Reconciliation decision

The July 14–17 People Core work is valid as controlled-local-pilot and compatibility-facade evidence. It does not prove the July 19 target architecture because Payroll-named storage and mutation services remain writable through parallel Payroll actions. The July 19 architecture decision therefore supersedes older claims that the HRIS ownership boundary is complete.

The canonical execution sequence is reset to:

1. Refresh the status register.
2. Freeze the source-of-truth ownership map.
3. Consolidate employee profile and evidence writes behind the HRIS facade.
4. Continue domain-by-domain only after focused gates pass.

## Selected first implementation tranche

Route the existing legacy Payroll employee profile/evidence actions through `services/hris/employee.service.ts`, keeping action names, Payroll permissions, module entitlement, fresh authentication, response compatibility, and current physical storage intact. Add a static ratchet preventing new production imports of the physical Payroll employee writers outside the HRIS facade.

## Current blockers

- Direct Payroll writers remain for employee, contract, compensation, payment destination, and attendance/source workflows.
- Core HRIS workflow state still relies partly on JSON metadata.
- Organization/reporting-line and time/leave source models are incomplete.
- A first-class persisted HRIS-to-Payroll snapshot aggregate is not yet established.
- HRIS/Payroll module packaging and `/dashboard/people/**` entitlement ownership remain ambiguous.
- Full typecheck previously failed by V8 out-of-memory.
- Production provider, authority, database, and accounting-close evidence is absent.
- The worktree is broadly dirty; verification must isolate touched surfaces.

## Data ownership

- HRIS owns employee and employment source truth.
- Payroll employee tables remain compatibility storage during migration.
- Payroll owns calculated run, payslip, payment, and declaration truth.
- Accounting owns ledger truth.
- Assurance owns evidence and release decisions.

## Tenant, RBAC, audit, and redaction decision

The compatibility Payroll actions retain their existing module, Payroll permission, fresh-auth, tenant-derived actor context, and audit boundary. Delegation changes only the canonical service owner. HRIS ownership metadata must be returned. No sensitive payload, salary, destination, document, provider, or authority detail is added to reports.

## Gates

Required for the first tranche:

- Focused Payroll employee action tests
- Focused HRIS employee service/action tests
- Static HRIS writer-boundary ratchet test
- TypeScript checking only if it can be isolated without reproducing the known full-project OOM

## Skipped checks

No schema migration, browser run, provider call, authority filing, production backfill, or broad Payroll calculation change belongs to this tranche.

## Residual risk and handoff

The next active skills are `01-status-register`, `02-source-truth-map`, then the bounded employee-writer portion of `03-employee-identity`. After it passes, reassess before `04-org-structure-manager-scope`; do not automatically broaden.

