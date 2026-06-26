from __future__ import annotations

import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path


WORKSPACE = Path(r"E:\ohada saas\newStockFlow\aqstoqflow")
SKILLS_ROOT = Path(r"C:\Users\J COMPUTER\.codex\skills")
INIT_SCRIPT = SKILLS_ROOT / ".system" / "skill-creator" / "scripts" / "init_skill.py"
VALIDATOR = SKILLS_ROOT / ".system" / "skill-creator" / "scripts" / "quick_validate.py"
SOURCE = WORKSPACE / "what-next" / "payroll" / "AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md"
REPORT = WORKSPACE / "what-next" / "payroll" / "AQSTOQFLOW_HR_PAYROLL_EXPERT_SKILL_INSTALL_VALIDATE_REPORT_2026-06-25.md"


@dataclass(frozen=True)
class SkillSpec:
    number: str
    slug: str
    display_name: str
    short_description: str

    @property
    def name(self) -> str:
        return f"aqstoqflow-hrpayroll-{self.number}-{self.slug}"


SPECS = [
    SkillSpec("00", "orchestrator", "AqStoqFlow HR/Payroll 00 Orchestrator", "Orchestrate payroll gates and phases."),
    SkillSpec("01", "governance-map", "AqStoqFlow HR/Payroll 01 Governance Map", "Map payroll ownership and blockers."),
    SkillSpec("02", "immutability-boundary", "AqStoqFlow HR/Payroll 02 Immutability", "Prove payroll evidence immutability."),
    SkillSpec("03", "country-pack-gate", "AqStoqFlow HR/Payroll 03 Country Pack Gate", "Gate statutory country-pack safety."),
    SkillSpec("04", "access-privacy-actions", "AqStoqFlow HR/Payroll 04 Access Privacy", "Gate payroll access and privacy."),
    SkillSpec("05", "accounting-close-gate", "AqStoqFlow HR/Payroll 05 Accounting Close", "Gate payroll accounting and close."),
    SkillSpec("06", "seed-backfill-setup", "AqStoqFlow HR/Payroll 06 Setup Readiness", "Prepare payroll setup and backfill."),
    SkillSpec("07", "source-data-foundation", "AqStoqFlow HR/Payroll 07 Source Data", "Build HR payroll source-data roots."),
    SkillSpec("08", "employee-contract-workflow", "AqStoqFlow HR/Payroll 08 Contracts", "Build employee and contract workflows."),
    SkillSpec("09", "compensation-approval", "AqStoqFlow HR/Payroll 09 Compensation", "Build compensation approval controls."),
    SkillSpec("10", "payment-evidence-readiness", "AqStoqFlow HR/Payroll 10 Evidence Readiness", "Gate payment and HR evidence."),
    SkillSpec("11", "command-read-model", "AqStoqFlow HR/Payroll 11 Command Read Model", "Build payroll command read model."),
    SkillSpec("12", "command-center-ux", "AqStoqFlow HR/Payroll 12 Command UX", "Build payroll command center UX."),
    SkillSpec("13", "country-pack-expansion", "AqStoqFlow HR/Payroll 13 Country Expansion", "Expand statutory country packs."),
    SkillSpec("14", "payslip-self-service", "AqStoqFlow HR/Payroll 14 Payslips", "Build payslip self-service safely."),
    SkillSpec("15", "register-tieout", "AqStoqFlow HR/Payroll 15 Register", "Tie out payroll register evidence."),
    SkillSpec("16", "declaration-lifecycle", "AqStoqFlow HR/Payroll 16 Declarations", "Build payroll declaration lifecycle."),
    SkillSpec("17", "payment-reconciliation", "AqStoqFlow HR/Payroll 17 Payment Recon", "Build payroll payment reconciliation."),
    SkillSpec("18", "close-data-trust", "AqStoqFlow HR/Payroll 18 Close Trust", "Expand payroll close data trust."),
    SkillSpec("19", "assurance-release-gates", "AqStoqFlow HR/Payroll 19 Release Gates", "Run assurance and release gates."),
    SkillSpec("20", "observability-runbooks", "AqStoqFlow HR/Payroll 20 Runbooks", "Add payroll ops runbooks and alerts."),
    SkillSpec("21", "final-readiness", "AqStoqFlow HR/Payroll 21 Final Readiness", "Decide payroll production readiness."),
]


NON_NEGOTIABLES = [
    "Services own HR/payroll business truth.",
    "Server actions expose protected workflows and derive tenant/actor context server-side.",
    "Dashboards render trusted server-provided data.",
    "RBAC governs user capability.",
    "Module entitlement governs tenant/module access.",
    "No client-computed payroll truth or duplicated payroll metrics.",
    "No dashboard-specific payroll shadow services.",
    "No speculative UI routes or unfinished production surfaces.",
    "No mutation of finalized payroll evidence in place.",
    "No statutory legal claims without expert-reviewed country-pack provenance.",
    "No payroll payment release without approved payment destination evidence.",
    "No salary/person-data exposure without permission, audit, and redaction.",
    "No phase may proceed when an earlier hard blocker is unresolved.",
]


RELEASE_GATES = [
    "npm run prisma:validate",
    "npm run prisma:generate",
    "npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand",
    "npm test -- --runTestsByPath services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts --runInBand",
    "npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand",
    "npm test -- --runTestsByPath services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand",
    "npm run service:boundary:fail",
    "npm run policy:gates",
    "npm run typecheck",
]


def yaml_quote(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def parse_prompts(source_text: str) -> dict[str, tuple[str, str]]:
    pattern = re.compile(
        r"^## Prompt (?P<number>\d{2}): (?P<title>[^\n]+)\n\n```text\n(?P<body>.*?)\n```",
        re.MULTILINE | re.DOTALL,
    )
    prompts: dict[str, tuple[str, str]] = {}
    for match in pattern.finditer(source_text):
        prompts[match.group("number")] = (match.group("title").strip(), match.group("body").strip())
    if len(prompts) != 22:
        raise RuntimeError(f"Expected 22 prompts, found {len(prompts)}")
    return prompts


def frontmatter_description(number: str, title: str) -> str:
    return (
        f"Run Prompt {number} of the AqStoqFlow expert-grade HR/Payroll implementation suite: {title}. "
        "Use when implementing, validating, or blocker-reporting this ordered HR/payroll roadmap slice with prerequisite gates, "
        "single-source-of-truth rules, RBAC, tenant isolation, payroll privacy, accounting controls, and release discipline."
    )


def skill_body(spec: SkillSpec, title: str, prompt_body: str) -> str:
    non_negotiables = "\n".join(f"- {item}" for item in NON_NEGOTIABLES)
    release_gates = "\n".join(f"- `{item}`" for item in RELEASE_GATES)
    return f"""---
name: {spec.name}
description: {yaml_quote(frontmatter_description(spec.number, title))}
---

# {spec.display_name}

Source prompt suite:
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

Run order:
- This is Prompt {spec.number}: {title}.
- Use it only when all earlier hard blockers have passed or have a documented blocker decision.
- If a prerequisite gate fails, stop this skill and save a blocker report under `what-next/payroll/`.

## Execution Rules

1. Read the full source prompt suite and the latest HR/payroll reports before implementation.
2. Inspect the files listed in the prompt before changing code.
3. Run the prerequisite gate first and record the result.
4. Keep service-owned HR/payroll truth on the server. UI may render trusted data and call protected server actions only.
5. Preserve tenant isolation, RBAC, module entitlement, fresh-auth requirements, maker-checker controls, audit, redaction, and evidence immutability.
6. Use the smallest relevant release-gate subset after changes. Explain every skipped check.
7. Save a dated phase report or blocker report under `what-next/payroll/`.
8. Do not continue to the next prompt unless this prompt's handoff criteria are satisfied.

## Non-Negotiable Rules

{non_negotiables}

## Standard Release Gate Menu

Use the smallest relevant subset:

{release_gates}

If Prisma engine generation is blocked locally, use `npx prisma generate --no-engine` and report why.

## Prompt Contract

```text
{prompt_body}
```
"""


def openai_yaml(spec: SkillSpec) -> str:
    default_prompt = f"Use ${spec.name} to run Prompt {spec.number} of the AqStoqFlow HR/payroll roadmap and save the required report."
    return "\n".join(
        [
            "interface:",
            f"  display_name: {yaml_quote(spec.display_name)}",
            f"  short_description: {yaml_quote(spec.short_description)}",
            f"  default_prompt: {yaml_quote(default_prompt)}",
            "policy:",
            "  allow_implicit_invocation: true",
            "",
        ]
    )


def run_init(spec: SkillSpec) -> str:
    target = SKILLS_ROOT / spec.name
    if target.exists():
        return "updated-existing"
    command = [
        sys.executable,
        str(INIT_SCRIPT),
        spec.name,
        "--path",
        str(SKILLS_ROOT),
        "--interface",
        f"display_name={spec.display_name}",
        "--interface",
        f"short_description={spec.short_description}",
        "--interface",
        f"default_prompt=Use ${spec.name} to run Prompt {spec.number} of the AqStoqFlow HR/payroll roadmap and save the required report.",
    ]
    proc = subprocess.run(command, text=True, capture_output=True)
    if proc.returncode != 0:
        return f"init-failed:{proc.returncode}:{(proc.stderr or proc.stdout).strip()[:220]}"
    return "created"


def manual_validate(spec: SkillSpec, title: str) -> list[str]:
    issues: list[str] = []
    folder = SKILLS_ROOT / spec.name
    skill_md = folder / "SKILL.md"
    agent_yaml = folder / "agents" / "openai.yaml"
    if folder.name != spec.name:
        issues.append("folder name mismatch")
    if not skill_md.exists():
        issues.append("missing SKILL.md")
    if not agent_yaml.exists():
        issues.append("missing agents/openai.yaml")
    if skill_md.exists():
        text = skill_md.read_text(encoding="utf-8")
        if not text.startswith("---\n"):
            issues.append("frontmatter does not start at first line")
        if f"name: {spec.name}" not in text:
            issues.append("frontmatter name mismatch")
        if "description:" not in text:
            issues.append("frontmatter description missing")
        if title not in text:
            issues.append("prompt title missing")
        if re.search(r"\b(TODO|TBD|FIXME)\b", text):
            issues.append("placeholder text remains")
    if agent_yaml.exists():
        meta = agent_yaml.read_text(encoding="utf-8")
        if spec.display_name not in meta:
            issues.append("openai.yaml display name mismatch")
        if spec.short_description not in meta:
            issues.append("openai.yaml short description mismatch")
        if f"${spec.name}" not in meta:
            issues.append("openai.yaml default prompt missing skill reference")
    return issues


def quick_validate(spec: SkillSpec) -> str:
    if not VALIDATOR.exists():
        return "skipped: validator missing"
    proc = subprocess.run(
        [sys.executable, str(VALIDATOR), str(SKILLS_ROOT / spec.name)],
        text=True,
        capture_output=True,
    )
    output = (proc.stdout + proc.stderr).strip().replace("\r\n", "\n")
    if proc.returncode == 0:
        return "passed"
    return f"failed:{proc.returncode}:{output[:260]}"


def main() -> int:
    source_text = SOURCE.read_text(encoding="utf-8")
    prompts = parse_prompts(source_text)
    rows: list[dict[str, str]] = []

    for spec in SPECS:
        title, prompt_body = prompts[spec.number]
        scaffold = run_init(spec)
        folder = SKILLS_ROOT / spec.name
        (folder / "agents").mkdir(parents=True, exist_ok=True)
        (folder / "SKILL.md").write_text(skill_body(spec, title, prompt_body), encoding="utf-8", newline="\n")
        (folder / "agents" / "openai.yaml").write_text(openai_yaml(spec), encoding="utf-8", newline="\n")
        issues = manual_validate(spec, title)
        qv = quick_validate(spec)
        rows.append(
            {
                "number": spec.number,
                "skill": spec.name,
                "title": title,
                "scaffold": scaffold,
                "manual": "passed" if not issues else "; ".join(issues),
                "quick_validate": qv,
                "path": str(folder),
            }
        )

    lines = [
        "# AqStoqFlow HR/Payroll Expert Skill Install And Validation Report",
        "",
        f"Date: {date.today().isoformat()}",
        "",
        f"Source: `{SOURCE.relative_to(WORKSPACE).as_posix()}`",
        f"Install root: `{SKILLS_ROOT}`",
        "",
        "## Summary",
        "",
        f"- Skills expected: {len(SPECS)}",
        f"- Skills installed or updated: {len(rows)}",
        f"- Manual validation passed: {sum(1 for row in rows if row['manual'] == 'passed')}",
        "- Quick validator status is recorded per skill. If it fails because local dependencies are missing, manual validation is authoritative for this install task.",
        "",
        "## Installed Skills",
        "",
        "| # | Skill | Source prompt | Scaffold | Manual validation | Quick validator |",
        "|---|---|---|---|---|---|",
    ]
    for row in rows:
        qv = row["quick_validate"].replace("|", "\\|").replace("\n", " ")
        lines.append(
            f"| {row['number']} | `{row['skill']}` | {row['title']} | {row['scaffold']} | {row['manual']} | {qv} |"
        )
    lines.extend(
        [
            "",
            "## Validation Checks",
            "",
            "- Folder name matches skill name.",
            "- `SKILL.md` exists.",
            "- YAML frontmatter contains `name` and `description`.",
            "- `agents/openai.yaml` exists.",
            "- Metadata display name, short description, and default prompt match the skill.",
            "- No `TODO`, `TBD`, or `FIXME` placeholders remain.",
            "- Prompt title from the source suite is present in the installed skill.",
            "",
            "## Execution Note",
            "",
            "Installation and structural validation are complete. Runtime execution must still follow Prompt 00 orchestration: run skills in order, stop at the first failed prerequisite gate, and save phase/blocker reports under `what-next/payroll/`.",
            "",
        ]
    )
    REPORT.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(str(REPORT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
