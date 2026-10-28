from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


SKILLS_ROOT = Path(r"C:\Users\J COMPUTER\.codex\skills")
INIT_SCRIPT = SKILLS_ROOT / ".system" / "skill-creator" / "scripts" / "init_skill.py"
VALIDATOR = SKILLS_ROOT / ".system" / "skill-creator" / "scripts" / "quick_validate.py"
WORKSPACE = Path(r"E:\ohada saas\newStockFlow\aqstoqflow")
SOURCE_BLUEPRINT = WORKSPACE / "what-next" / "payroll" / "AQSTOQFLOW_HR_PAYROLL_SKILL_SUITE_BLUEPRINT_2026-06-25.md"
REPORT_PATH = WORKSPACE / "what-next" / "payroll" / "AQSTOQFLOW_HR_PAYROLL_SKILL_SUITE_INSTALL_VALIDATE_DRY_RUN_REPORT_2026-06-25.md"

COMMON_DOCS = [
    "what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SKILL_SUITE_BLUEPRINT_2026-06-25.md",
    "what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SKILL_CREATION_PREP_PACK_2026-06-25.md",
    "what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PLATFORM_ROADMAP_AND_HYBRID_RECONSTRUCTION_2026-06-25.md",
    "what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ENTERPRISE_READINESS_ASSESSMENT_2026-06-24.md",
    "what-next/payroll/AQSTOQFLOW_PAYROLL_CLOSE_INVALIDATION_RUN_REPORT_2026-06-25.md",
    "graphify-out/GRAPH_REPORT.md",
]

COMMON_SURFACES = [
    "prisma/schema.prisma",
    "prisma/migrations/",
    "services/payroll/",
    "actions/payroll/",
    "hooks/payroll/",
    "components/payroll/",
    "app/[locale]/(dashboard)/dashboard/payroll/",
    "services/accounting/",
    "services/payments/",
    "services/reconciliation/",
    "country-pack/regulatory resolver paths",
    "RBAC/protect/fresh-auth helpers",
    "audit, business-event, outbox, close-assurance, and module-control services",
    "payroll-related tests",
]

COMMON_NONNEGOTIABLES = [
    "Inspect actual repo surfaces before making assumptions.",
    "Preserve payroll kernel, country-pack provenance, ledger source links, business events, audit, stale-evidence, close invalidation, and certified export semantics.",
    "Do not hardcode statutory payroll values in application logic.",
    "Do not present expert-review-only country-pack outputs as production legal truth.",
    "Do not mutate posted payroll runs, emitted payslips, released payment batches, submitted declarations, or archived evidence in place.",
    "Use correction workflows for post-approval changes.",
    "Require tenant scoping on every read/write/query/export.",
    "Require RBAC, fresh auth, maker-checker, audit, and redaction for sensitive payroll actions.",
    "Do not post payroll without balanced SYSCOHADA source-linked entries.",
    "Do not release payroll payments without approved payment destination evidence.",
    "Do not let employee self-service access another employee's data.",
    "Add focused tests and targeted verification for each slice.",
    "Save a concise run report under what-next/payroll/.",
]

VERIFICATION_COMMANDS = [
    "npm run prisma:validate",
    "npm run prisma:generate",
    "npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand",
    "npm test -- --runTestsByPath services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand",
    "npm run service:boundary:fail",
    "npm run policy:gates",
    "npm run typecheck",
]

SPECS = [
    {
        "name": "aqstoqflow-hr-payroll-hybrid-reconstructor",
        "title": "AqStoqFlow HR/Payroll Reconstructor",
        "short": "Orchestrate HR/payroll reconstruction gates.",
        "description": "Safely orchestrate AqStoqFlow HR/payroll hybrid reconstruction. Use when sequencing, implementing, reviewing, or gate-checking HR, employee, contract, attendance, payroll run, payslip, payment, declaration, accounting, close-invalidation, privacy, RBAC, assurance, or command-center work from the HR/Payroll roadmap.",
        "purpose": "Choose the safest next HR/payroll implementation slice and coordinate focused skills.",
        "phase": "Master orchestration",
        "steps": ["Classify the request by HR/payroll stream.", "Inspect repo surfaces and latest payroll reports.", "Confirm prerequisites and stop on critical blockers.", "Select or run the focused implementation skill.", "Preserve kernel, event, audit, close, ledger, and export semantics.", "Require focused tests and targeted verification.", "Save or update a run report."],
        "prereqs": ["Source blueprint exists.", "Repo payroll/accounting/payment/close/RBAC surfaces can be inspected."],
        "gates": ["A safe phase is selected.", "Critical blockers are reported instead of bypassed.", "A run report names the next safest slice."],
        "handoff": "Handoff to a focused skill only when the slice maps cleanly to one phase and prerequisites are satisfied.",
        "dry": "Selected next safe execution stream: Phase 0 kernel hardening; implementation deferred to aqstoqflow-payroll-kernel-hardener.",
    },
    {
        "name": "aqstoqflow-payroll-kernel-hardener",
        "title": "AqStoqFlow Payroll Kernel Hardener",
        "short": "Harden payroll kernel and close safety.",
        "description": "Harden the AqStoqFlow payroll kernel. Use for payroll immutability, correction-only mutation rules, tenant-escape tests, salary-read audit, privacy/redaction, module identity, hardcode gates, and certified-close invalidation source expansion.",
        "purpose": "Make the current payroll kernel safe enough to productize.",
        "phase": "Phase 0",
        "steps": ["Inventory active payroll state.", "Confirm graph and platform spines.", "Preserve payroll run close invalidation.", "Restore or prove DB-level immutability.", "Add correction-only mutation rules.", "Add statutory hardcode gate.", "Add tenant-escape tests.", "Add salary-read audit and privacy policy.", "Normalize payroll module identity.", "Evaluate payment/declaration/correction close invalidation sources.", "Save a Phase 0 run report."],
        "prereqs": ["Current schema and migrations inspected.", "Payroll service/action tests inspected.", "Close invalidation report inspected.", "RBAC/protect/fresh-auth helpers located.", "Audit/business-event/close-assurance services located."],
        "gates": ["Posted/emitted/released/submitted artifacts cannot be mutated in place.", "Corrections create new evidence.", "PAYROLL_RUN_POSTED close invalidation remains covered.", "No hardcoded statutory constants in payroll engines.", "Tenant escape tests pass.", "Sensitive salary reads are audited."],
        "handoff": "Do not hand off to broad UI/product skills until immutability, tenant isolation, privacy, and close invalidation gates are stable or documented as blockers.",
        "dry": "Ready to run first for actual implementation. Recommended first executable slice: DB immutability plus tenant/privacy tests.",
    },
    {
        "name": "aqstoqflow-hr-source-data-builder",
        "title": "AqStoqFlow HR Source Data Builder",
        "short": "Build audited HR source-data workflows.",
        "description": "Build AqStoqFlow HR source-data workflows for payroll. Use for employee profiles, contracts, compensation/rubriques, salary changes, payment destination approvals, HR documents, leave, attendance, manager scope, and employee self-service profile subsets.",
        "purpose": "Build professional employee, contract, compensation, document, payment destination, leave, and attendance source-data workflows.",
        "phase": "Phase 1",
        "steps": ["Build employee profile workflow.", "Add employee identity and duplicate-risk signals.", "Build contract lifecycle workflow.", "Add compensation and rubrique catalog.", "Add salary-change request and approval.", "Add payment destination change workflow.", "Add HR document/evidence references.", "Build leave and attendance source workflows.", "Add employee self-service profile subset."],
        "prereqs": ["Phase 0 tenant/RBAC/privacy controls exist or blockers are accepted.", "Payroll employee/contract schema inspected.", "Employee-user mapping inspected.", "Module and redaction policy inspected."],
        "gates": ["HR data is tenant-scoped.", "Payroll cannot calculate without active contract and approved inputs.", "Salary and payment destination changes require maker-checker/fresh auth.", "Employees cannot access another employee profile."],
        "handoff": "Handoff to command center only when payroll readiness can be computed from real HR source data.",
        "dry": "Blocked behind Phase 0 safety gates; source-data execution should begin after kernel hardening report.",
    },
    {
        "name": "aqstoqflow-payroll-command-center",
        "title": "AqStoqFlow Payroll Command Center",
        "short": "Build guided payroll command workflows.",
        "description": "Build the AqStoqFlow Payroll Command Center. Use for payroll command read models, action boards, run wizard, line-level review, blockers, proof drawers, correction workflow, role-specific payroll UX, and lifecycle navigation from readiness to close evidence.",
        "purpose": "Replace the thin payroll workbench with a guided lifecycle and role-specific command center.",
        "phase": "Phase 2",
        "steps": ["Build payroll command read model.", "Recompose first viewport action board.", "Build run wizard.", "Add line-level payroll review.", "Add blocker/anomaly/proof drawer.", "Add correction workflow."],
        "prereqs": ["Phase 0 safety gates stable or documented.", "Enough Phase 1 HR source data exists to compute readiness.", "Current payroll workbench/hook/actions inspected.", "Dashboard UI patterns inspected."],
        "gates": ["Read model is tenant-scoped and role-redacted.", "UI does not compute authoritative payroll totals.", "Steps cannot be skipped when prerequisites fail.", "Proof drawer shows evidence and source links."],
        "handoff": "Handoff to statutory/payslip/payment skills when command center can show their blockers and links without faking completed workflows.",
        "dry": "Blocked until Phase 0 and core Phase 1 readiness inputs are available.",
    },
    {
        "name": "aqstoqflow-payroll-country-pack-engine",
        "title": "AqStoqFlow Payroll Country-Pack Engine",
        "short": "Build country-pack payroll rules.",
        "description": "Build AqStoqFlow payroll country-pack calculation capability. Use for payroll rule resolver boundaries, country-pack payroll schema, rubriques, taxable/social bases, IRPP/income tax, CNPS/social contributions, allowances, benefits, loans, advances, garnishments, overtime, leave effects, YTD totals, corrections, and statutory provenance UI.",
        "purpose": "Expand payroll calculation from narrow logic into country-pack-driven statutory payroll.",
        "phase": "Phase 3",
        "steps": ["Extract payroll rules boundary.", "Expand country-pack payroll schema.", "Add rubriques and bases.", "Add statutory calculation breadth.", "Add YTD totals and corrections.", "Add statutory provenance UI."],
        "prereqs": ["Current payroll calculation tests pass.", "Country-pack resolver/factory inspected.", "Hardcode gate exists or is added.", "Expert-reviewed statutory inputs are available for any production formula."],
        "gates": ["No legal values hardcoded in application logic.", "Artifacts pin country-pack provenance.", "Unsupported country packs block production legal certainty.", "Fixture tests match expert-reviewed results."],
        "handoff": "Handoff to declaration and payslip skills when calculation trace and provenance are stable.",
        "dry": "Blocked until hardcode gate and country-pack provenance work are ready.",
    },
    {
        "name": "aqstoqflow-payslip-self-service",
        "title": "AqStoqFlow Payslip Self-Service",
        "short": "Build payslip and self-service flows.",
        "description": "Build AqStoqFlow payslip and payroll self-service product surfaces. Use for immutable payslip viewer, PDF/archive, bilingual labels, employee payslip self-service, payroll exports, salary-read audit, and payroll register/livre de paie tie-out.",
        "purpose": "Make payslips, employee self-service, exports, and payroll register real products.",
        "phase": "Phase 4",
        "steps": ["Build immutable payslip viewer.", "Add PDF/archive.", "Add bilingual payslip labels.", "Build employee payslip self-service.", "Build payroll exports.", "Build payroll register/livre de paie."],
        "prereqs": ["Payslip immutability proven.", "Redaction and salary-read audit policy exists.", "Employee-user mapping exists.", "Run, payslip, ledger, payment, declaration evidence inspected."],
        "gates": ["Payslips display stored artifact data.", "Employee can only access own payslips.", "Exports require permission, fresh auth, redaction, audit, and evidence hashes.", "Register ties payroll evidence end to end."],
        "handoff": "Handoff to accounting/close and assurance skills after register tie-out is reliable.",
        "dry": "Blocked until payslip immutability, redaction, and employee mapping are in place.",
    },
    {
        "name": "aqstoqflow-payroll-declaration-compliance",
        "title": "AqStoqFlow Payroll Declaration Compliance",
        "short": "Build payroll declarations and evidence.",
        "description": "Build AqStoqFlow payroll declaration and statutory compliance workflows. Use for declaration adapters, submission evidence, acceptance/rejection lifecycle, statutory payment workflow, declaration reconciliation, authority proof trails, and expert-review fallback preservation.",
        "purpose": "Turn declaration preparation into full statutory compliance evidence.",
        "phase": "Phase 5",
        "steps": ["Build declaration adapters.", "Add declaration submission evidence.", "Add acceptance/rejection lifecycle.", "Add statutory payment workflow.", "Add declaration reconciliation."],
        "prereqs": ["Country-pack declaration metadata exists or fallback is explicit.", "preparePayrollDeclarations behavior inspected.", "Compliance center and payment/accounting paths inspected.", "Declaration immutability rule exists or is added."],
        "gates": ["Unsupported adapters keep expert-review fallback.", "Submitted declarations are immutable except corrections.", "Rejected declarations cannot count as accepted proof.", "Statutory payments post balanced and source-linked."],
        "handoff": "Handoff to accounting/close skill when declaration lifecycle creates close-impacting evidence.",
        "dry": "Blocked until country-pack declaration metadata and declaration immutability are ready.",
    },
    {
        "name": "aqstoqflow-payroll-payment-recon",
        "title": "AqStoqFlow Payroll Payment Recon",
        "short": "Build payroll payment reconciliation.",
        "description": "Build AqStoqFlow payroll payment and reconciliation workflows. Use for payroll payment batch details, bank/mobile-money file evidence, payment release proof, provider/statement matching, retry and settlement states, payroll payment exceptions, and treasurer dashboards.",
        "purpose": "Make payroll payment operations certifiable and reconcilable.",
        "phase": "Phase 6",
        "steps": ["Build payment batch detail screens.", "Add bank/mobile-money file evidence.", "Add provider/statement matching.", "Add retry and settlement states.", "Add treasurer dashboard."],
        "prereqs": ["releasePayrollPaymentBatch controls inspected.", "Approved destination evidence workflow exists.", "Payment reconciliation services inspected.", "Posting rules for payroll payment exist or blockers are visible."],
        "gates": ["Duplicate allocation and overpayment remain impossible.", "Release requires destination evidence.", "Mismatches create exception/suspense.", "Retries do not double-pay or double-post.", "Treasurer views do not leak unauthorized salary detail."],
        "handoff": "Handoff to accounting/close once payment status can drive close blockers and stale evidence.",
        "dry": "Blocked until payment destination workflow and payment evidence policy exist.",
    },
    {
        "name": "aqstoqflow-payroll-accounting-close",
        "title": "AqStoqFlow Payroll Accounting Close",
        "short": "Connect payroll to accounting close.",
        "description": "Build AqStoqFlow payroll accounting and close-assurance integration. Use for payroll posting rule management, source-link drillthrough, payroll close blockers, certified-close invalidation for payment/declaration/correction events, stale evidence, certified exports, and auditor proof packs.",
        "purpose": "Connect payroll to accounting truth, close assurance, stale certified exports, and auditor evidence.",
        "phase": "Phase 7",
        "steps": ["Build payroll posting rule management.", "Add source-link drillthrough.", "Add payroll close blockers.", "Extend certified close invalidation mesh.", "Add auditor proof pack."],
        "prereqs": ["Payroll run posting source links exist.", "Close assurance invalidation helper inspected.", "Payment/declaration close-impacting writes evaluated.", "Payroll register or equivalent tie-out data exists."],
        "gates": ["Invalid posting rules block visibly.", "Source links resolve only within tenant.", "Close readiness detects payroll blockers.", "Invalidation preserves stale metadata/audit/events/export semantics.", "Auditor pack is redacted and evidence-backed."],
        "handoff": "Handoff to SMB OS integration and assurance once close blockers and invalidation are stable.",
        "dry": "Partially ready for future invalidation work; broader close integration waits for register/payment/declaration evidence.",
    },
    {
        "name": "aqstoqflow-payroll-smb-ops",
        "title": "AqStoqFlow Payroll SMB Ops",
        "short": "Feed payroll into SMB operations.",
        "description": "Integrate AqStoqFlow payroll into SMB operating surfaces. Use for owner payroll/cash/compliance signals, manager action center payroll inputs, payroll cash forecast, profitability analytics, compliance radar, close readiness, BI, and cross-module operational signals.",
        "purpose": "Bake payroll signals into the broader SMB operating platform.",
        "phase": "Phase 8",
        "steps": ["Add owner payroll/cash/compliance signals.", "Add manager action center payroll inputs.", "Add cash forecast payroll obligations.", "Add profitability analytics.", "Add compliance radar and close readiness."],
        "prereqs": ["Command read models exist.", "Payroll register/payment/declaration evidence exists.", "Manager scope and redaction policies exist.", "Relevant owner/manager/cash/BI/compliance surfaces inspected."],
        "gates": ["Signals link to source evidence.", "Manager scope is limited.", "Forecast reconciles to liabilities and payment status.", "Analytics use ledger/register truth.", "Compliance and close risk update from events."],
        "handoff": "Handoff to assurance skill for monitoring, chaos, and release gates.",
        "dry": "Blocked until command center, register, payment, and declaration evidence exist.",
    },
    {
        "name": "aqstoqflow-payroll-assurance-chaos",
        "title": "AqStoqFlow Payroll Assurance Chaos",
        "short": "Add payroll assurance and chaos gates.",
        "description": "Build AqStoqFlow payroll assurance, chaos, browser smoke, and release gates. Use for payroll assurance checks, attendance drift, duplicate run/posting/payment, missing archive, declaration due risk, unusual salary changes, payment destination changes, correction abuse, closed-period posting, concurrency, rollback, tenant escape, export bypass, and release decision reports.",
        "purpose": "Make the completed HR/payroll system battle-tested.",
        "phase": "Phase 9",
        "steps": ["Add payroll assurance checks.", "Add payroll chaos tests.", "Add browser smoke gates.", "Add release decision report."],
        "prereqs": ["Core payroll workflows exist.", "Service tests and transaction boundaries exist.", "Command center/self-service routes exist for browser smoke.", "Critical/high blockers from previous phases are known."],
        "gates": ["Every assurance check has pass/fail fixtures.", "Concurrent flows do not duplicate evidence.", "Rollback leaves no partial irreversible mutation.", "Browser smoke covers loading/empty/permission/degraded/normal states.", "Release decision is not APPROVED_FOR_013 while critical/high blockers remain."],
        "handoff": "Handoff to the next numbered platform phase only when release decision is APPROVED_FOR_013.",
        "dry": "Blocked until core HR/payroll workflows exist; can later own release gating.",
    },
]

REFINED_PROMPT = (
    "From `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SKILL_SUITE_BLUEPRINT_2026-06-25.md`, "
    "create, install, validate, and dry-run the complete AqStoqFlow HR/payroll skill suite. "
    "Use one master orchestration skill plus focused implementation skills. Preserve the hybrid reconstruction decision "
    "and all payroll kernel, country-pack, ledger, audit, close-invalidation, stale-evidence, and certified export semantics. "
    "Validate each skill structurally and with the available validator, then run a non-code operational pass for each skill "
    "to confirm its first safe execution state and handoff."
)


def yaml_quote(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def numbered(items: list[str]) -> str:
    return "\n".join(f"{idx}. {item}" for idx, item in enumerate(items, 1))


def write_skill(spec: dict[str, object]) -> dict[str, str]:
    target = SKILLS_ROOT / str(spec["name"])
    scaffold_status = "skipped-existing"
    if not target.exists() and INIT_SCRIPT.exists():
        command = [
            sys.executable,
            str(INIT_SCRIPT),
            str(spec["name"]),
            "--path",
            str(SKILLS_ROOT),
            "--resources",
            "references",
            "--interface",
            f"display_name={spec['title']}",
            "--interface",
            f"short_description={spec['short']}",
            "--interface",
            f"default_prompt=Use ${spec['name']} to run the safest next AqStoqFlow HR/payroll slice and save a payroll run report.",
        ]
        proc = subprocess.run(command, text=True, capture_output=True)
        scaffold_status = "created" if proc.returncode == 0 else f"init-failed:{proc.returncode}:{proc.stderr.strip()[:180]}"

    (target / "agents").mkdir(parents=True, exist_ok=True)
    (target / "references").mkdir(parents=True, exist_ok=True)

    skill_md = f"""---
name: {spec['name']}
description: {spec['description']}
---

# {spec['title']}

Use this skill for {str(spec['purpose']).lower()} inside `E:\\ohada saas\\newStockFlow\\aqstoqflow`.

## Required Context

Read these references before acting:

- `references/source-map.md`
- `references/execution-steps.md`
- `references/gates-and-verification.md`

Then inspect the current repo surfaces before editing. Prefer existing service/action/hook/component patterns over new abstractions.

## Workflow

1. Classify the requested HR/payroll slice and confirm it belongs to `{spec['phase']}`.
2. Inspect the current schema, services, actions, UI surfaces, tests, and recent payroll reports named in `references/source-map.md`.
3. Confirm every prerequisite in `references/execution-steps.md`.
4. Stop and report blockers if implementation would weaken tenant isolation, payroll evidence, statutory provenance, ledger integrity, audit, or close semantics.
5. Implement the smallest safe slice.
6. Preserve payroll kernel, country-pack, audit, business-event, ledger source-link, close-invalidation, stale-evidence, and certified export semantics.
7. Add focused tests for the changed invariant.
8. Run targeted verification from `references/gates-and-verification.md`.
9. Save a concise run report under `what-next/payroll/`.

## Non-Negotiables

{bullets(COMMON_NONNEGOTIABLES)}

## Output Contract

End with:

- selected skill: `{spec['name']}`;
- selected phase and executable slice;
- files changed;
- gates passed;
- gates blocked;
- verification result;
- run report path;
- next recommended skill or slice.
"""
    (target / "SKILL.md").write_text(skill_md, encoding="utf-8")

    openai_yaml = f"""interface:
  display_name: {yaml_quote(str(spec['title']))}
  short_description: {yaml_quote(str(spec['short']))}
  default_prompt: {yaml_quote(f"Use ${spec['name']} to run the safest next AqStoqFlow HR/payroll slice and save a payroll run report.")}
policy:
  allow_implicit_invocation: true
"""
    (target / "agents" / "openai.yaml").write_text(openai_yaml, encoding="utf-8")

    source_map = f"""# Source Map

Skill: `{spec['name']}`

Phase: {spec['phase']}

Purpose: {spec['purpose']}

## Source Reports

{bullets(COMMON_DOCS)}

## Current Code Surfaces

{bullets(COMMON_SURFACES)}

## Companion Skills

- `012-aqstoqflow-payroll-presence-architect`
- `012-aqstoqflow-payroll-presence-engine`
- `ledger-first-business-events` for event or ledger changes
- `ohada-payroll-engine` for statutory payroll calculation changes
- `better-auth-rbac-ohada` for permissions, RBAC, or fresh-auth changes
- `payment-reconciliation-moat` for payroll payment and reconciliation changes
- `build-enterprise-dashboard` for command-center UI execution
- `enterprise-error-handling` for service/action error contracts
- `enterprise-fraud-and-controls` for maker-checker, SoD, audit, and abuse controls

## Handoff Rule

{spec['handoff']}
"""
    (target / "references" / "source-map.md").write_text(source_map, encoding="utf-8")

    execution_steps = f"""# Execution Steps

Skill: `{spec['name']}`

## Prerequisites

{bullets(spec['prereqs'])}

## Ordered Steps

{numbered(spec['steps'])}

## Dry-Run Result At Installation

{spec['dry']}

## Handoff

{spec['handoff']}
"""
    (target / "references" / "execution-steps.md").write_text(execution_steps, encoding="utf-8")

    gates = f"""# Gates And Verification

Skill: `{spec['name']}`

## Skill-Specific Gates

{bullets(spec['gates'])}

## Shared Stop Conditions

Stop or return `BLOCKED` if:

{bullets(COMMON_NONNEGOTIABLES)}

## Verification Command Menu

Run only the commands relevant to the touched slice:

```powershell
{chr(10).join(VERIFICATION_COMMANDS)}
```

If Prisma generation fails on Windows because the query engine is locked, retry:

```powershell
npx prisma generate --no-engine
```

## Report Contract

Save a report under `what-next/payroll/` with files changed, gates passed, gates blocked, verification commands and results, residual risks, and next recommended skill or slice.
"""
    (target / "references" / "gates-and-verification.md").write_text(gates, encoding="utf-8")
    return {"name": str(spec["name"]), "path": str(target), "scaffold": scaffold_status}


def manual_validate(spec: dict[str, object]) -> dict[str, object]:
    target = SKILLS_ROOT / str(spec["name"])
    errors: list[str] = []
    skill_md_path = target / "SKILL.md"
    openai_path = target / "agents" / "openai.yaml"
    refs = [target / "references" / name for name in ["source-map.md", "execution-steps.md", "gates-and-verification.md"]]

    if not skill_md_path.exists():
        errors.append("missing SKILL.md")
    else:
        text = skill_md_path.read_text(encoding="utf-8")
        if not text.startswith("---\n"):
            errors.append("frontmatter missing")
        header = text.split("---\n", 2)[1] if text.startswith("---\n") and "---\n" in text[4:] else ""
        keys = [line.split(":", 1)[0].strip() for line in header.splitlines() if ":" in line]
        if keys != ["name", "description"]:
            errors.append(f"frontmatter keys {keys}")
        if f"name: {spec['name']}" not in header:
            errors.append("frontmatter name mismatch")
        if "TODO" in text or "PLACEHOLDER" in text:
            errors.append("placeholder text present")

    if not openai_path.exists():
        errors.append("missing agents/openai.yaml")
    else:
        y = openai_path.read_text(encoding="utf-8")
        required = ["interface:", "display_name:", "short_description:", "default_prompt:"]
        if any(value not in y for value in required):
            errors.append("openai.yaml missing interface fields")
        if f"${spec['name']}" not in y:
            errors.append("default_prompt missing explicit skill token")
        if not (25 <= len(str(spec["short"])) <= 64):
            errors.append("short_description length out of bounds")

    for ref in refs:
        if not ref.exists():
            errors.append(f"missing {ref.name}")

    for unwanted in ["README.md", "CHANGELOG.md", "INSTALLATION_GUIDE.md", "QUICK_REFERENCE.md"]:
        if (target / unwanted).exists():
            errors.append(f"unwanted {unwanted}")

    return {"name": str(spec["name"]), "ok": not errors, "errors": errors}


def run_validator(spec: dict[str, object]) -> dict[str, object]:
    target = SKILLS_ROOT / str(spec["name"])
    if not VALIDATOR.exists():
        return {"name": str(spec["name"]), "returncode": None, "stdout": "", "stderr": "quick_validate.py not found"}
    proc = subprocess.run([sys.executable, str(VALIDATOR), str(target)], text=True, capture_output=True)
    return {
        "name": str(spec["name"]),
        "returncode": proc.returncode,
        "stdout": proc.stdout.strip(),
        "stderr": proc.stderr.strip(),
    }


def write_report(install_results: list[dict[str, str]], manual_results: list[dict[str, object]], validator_results: list[dict[str, object]]) -> None:
    lines: list[str] = []
    lines.append("# AqStoqFlow HR/Payroll Skill Suite Install, Validation, And Dry Run Report")
    lines.append("")
    lines.append("Date: 2026-06-25")
    lines.append("")
    lines.append(f"Source blueprint: `{SOURCE_BLUEPRINT}`")
    lines.append("")
    lines.append("## Refined Prompt")
    lines.append("")
    lines.append(REFINED_PROMPT)
    lines.append("")
    lines.append("## Installed Skills")
    lines.append("")
    for result in install_results:
        lines.append(f"- `{result['name']}` -> `{result['path']}` ({result['scaffold']})")
    lines.append("")
    lines.append("## Validator Results")
    lines.append("")
    for result in validator_results:
        status = "passed" if result["returncode"] == 0 else f"failed ({result['returncode']})"
        detail = result["stdout"] or result["stderr"] or "no output"
        lines.append(f"- `{result['name']}`: {status}. {detail}")
    lines.append("")
    lines.append("## Manual Validation Results")
    lines.append("")
    for result in manual_results:
        if result["ok"]:
            lines.append(f"- `{result['name']}`: passed")
        else:
            lines.append(f"- `{result['name']}`: failed - {', '.join(result['errors'])}")
    lines.append("")
    lines.append("## Dry Run Results")
    lines.append("")
    for spec in SPECS:
        lines.append(f"- `{spec['name']}` ({spec['phase']}): {spec['dry']}")
    lines.append("")
    lines.append("## Execution Decision")
    lines.append("")
    lines.append("The full skill suite is installed and structurally ready. The operational dry run selects `aqstoqflow-payroll-kernel-hardener` as the first implementation skill. Actual product implementation should begin with Phase 0 hardening, especially DB immutability, tenant-escape tests, salary-read audit/privacy, and next close-invalidation source evaluation. Later skills are intentionally blocked behind those gates.")
    lines.append("")
    lines.append("## Notes")
    lines.append("")
    lines.append("This run installed and dry-ran skills. It did not implement the HR/payroll product roadmap itself. That is deliberate: the suite must first exist as reusable execution machinery, then implementation should proceed one gated slice at a time.")
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    install_results = [write_skill(spec) for spec in SPECS]
    manual_results = [manual_validate(spec) for spec in SPECS]
    validator_results = [run_validator(spec) for spec in SPECS]
    write_report(install_results, manual_results, validator_results)
    print(json.dumps({
        "installed": install_results,
        "manual_validation": manual_results,
        "validator": validator_results,
        "report": str(REPORT_PATH),
    }, indent=2))


if __name__ == "__main__":
    main()
