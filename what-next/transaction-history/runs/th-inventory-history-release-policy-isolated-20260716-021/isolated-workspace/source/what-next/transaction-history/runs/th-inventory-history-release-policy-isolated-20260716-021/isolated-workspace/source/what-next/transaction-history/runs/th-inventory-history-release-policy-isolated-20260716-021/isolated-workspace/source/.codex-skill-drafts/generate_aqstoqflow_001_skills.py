from __future__ import annotations

import re
from pathlib import Path
from textwrap import dedent


ROOT = Path(__file__).resolve().parents[1]
BLUEPRINT = ROOT / "what-next" / "AQSTOQFLOW_ORDERED_IMPLEMENTATION_CHUNKS_AND_SKILL_SUITE_2026-06-14.md"
DRAFT_ROOT = ROOT / ".codex-skill-drafts"


SKILLS = [
    {
        "name": "000-aqstoqflow-execution-suite",
        "title": "AqStoqFlow Execution Suite",
        "chunk": None,
        "summary": "Run the full numbered AqStoqFlow OHADA SMB implementation suite, select the next skill, enforce gates, and resume safely.",
        "triggers": "executing, sequencing, resuming, auditing, or repairing the full AqStoqFlow numbered skill suite",
        "focus": "Suite orchestration, dependency selection, gate enforcement, and resumption control.",
    },
    {
        "name": "001-aqstoqflow-program-orchestrator",
        "title": "Program Orchestrator",
        "chunk": "00",
        "summary": "Turn the OHADA SMB platform roadmap into tracked implementation chunks, dependencies, gates, and release evidence.",
        "triggers": "starting the platform build, planning chunks, sequencing work, tracking dependencies, or defining acceptance criteria",
        "focus": "Program baseline, chunk tracker, skill coordination, and implementation governance.",
    },
    {
        "name": "002-aqstoqflow-control-plane",
        "title": "Control Plane",
        "chunk": "01",
        "summary": "Build tenant isolation, RBAC, module gates, step-up assurance, audit policy, and maker-checker controls.",
        "triggers": "tenant scope, RBAC, permissions, role policy, module gating, step-up authentication, maker-checker, or audit controls",
        "focus": "Tenant and authorization control plane for every regulated workflow.",
    },
    {
        "name": "003-aqstoqflow-error-notification-foundation",
        "title": "Error Notification Foundation",
        "chunk": "02",
        "summary": "Create enterprise typed errors, safe action results, Prisma classification, correlation IDs, and user/operator notifications.",
        "triggers": "error handling, action wrappers, safe failures, observability, notifications, Prisma errors, or operator alerting",
        "focus": "Safe failure contracts, notification mapping, and observability foundations.",
    },
    {
        "name": "004-aqstoqflow-business-event-gateway",
        "title": "Business Event Gateway",
        "chunk": "03",
        "summary": "Implement the durable business event envelope, idempotency, outbox, audit linkage, and replay-safe processing.",
        "triggers": "business events, outbox, idempotency, audit trails, replay, workers, or atomic domain mutations",
        "focus": "Ledger-first business events and reliable asynchronous processing.",
    },
    {
        "name": "005-aqstoqflow-accounting-control-center",
        "title": "Accounting Control Center",
        "chunk": "04",
        "summary": "Build the OHADA accounting backbone, chart of accounts, fiscal periods, journal controls, close blockers, and provenance.",
        "triggers": "accounting backbone, SYSCOHADA, journals, chart of accounts, fiscal periods, close blockers, ledger reports, or accountant controls",
        "focus": "Double-entry accounting, fiscal close safety, and ledger-backed control center.",
    },
    {
        "name": "006-aqstoqflow-country-pack-factory",
        "title": "Country Pack Factory",
        "chunk": "05",
        "summary": "Create effective-dated country packs for OHADA rules, VAT, payroll, fiscal devices, e-invoicing, and authority adapters.",
        "triggers": "country packs, OHADA country rules, VAT, payroll parameters, fiscal devices, e-invoicing, regulatory adapters, or effective dates",
        "focus": "Validated country-specific regulatory configuration without hardcoded domain logic.",
    },
    {
        "name": "007-aqstoqflow-pos-ledger-controls",
        "title": "POS Ledger Controls",
        "chunk": "06",
        "summary": "Connect POS sales, refunds, voids, cash drawer sessions, receipts, stock movements, and Z reports to ledger controls.",
        "triggers": "POS, cashier sessions, cash drawer, sales, refunds, voids, receipts, Z reports, stock movement, or POS ledger posting",
        "focus": "Fraud-resistant POS operations tied to stock and accounting evidence.",
    },
    {
        "name": "008-aqstoqflow-compliance-center",
        "title": "Compliance Center",
        "chunk": "07",
        "summary": "Build fiscal document lifecycle, certification, legal sequences, authority submission, rejection handling, and compliance dashboards.",
        "triggers": "fiscal documents, e-invoicing, certified receipts, legal numbering, tax authority submission, rejections, or compliance dashboards",
        "focus": "Immutable fiscal evidence and authority-facing compliance workflows.",
    },
    {
        "name": "009-aqstoqflow-payment-reconciliation-moat",
        "title": "Payment Reconciliation Moat",
        "chunk": "08",
        "summary": "Implement payment evidence ingestion, matching, suspense, mobile money, bank/card reconciliation, and certification workflows.",
        "triggers": "payment reconciliation, mobile money, bank statements, card settlements, suspense, matching, treasury, or reconciliation certification",
        "focus": "Evidence-backed reconciliation and treasury controls.",
    },
    {
        "name": "010-aqstoqflow-inventory-valuation-kernel",
        "title": "Inventory Valuation Kernel",
        "chunk": "09",
        "summary": "Build stock movements, valuation, counts, transfers, recipes/manufacturing, variance posting, and class 3 ledger reconciliation.",
        "triggers": "inventory movement, costing, valuation, stock count, transfers, manufacturing, recipes, variance posting, or inventory ledger reconciliation",
        "focus": "Reliable stock quantity and value controls tied to accounting.",
    },
    {
        "name": "011-aqstoqflow-purchasing-ap-controls",
        "title": "Purchasing AP Controls",
        "chunk": "10",
        "summary": "Implement requisitions, purchase orders, receiving, supplier invoices, AP approvals, payments, and supplier risk controls.",
        "triggers": "purchasing, requisitions, purchase orders, goods receipt, supplier invoices, AP, supplier payments, or supplier bank controls",
        "focus": "Procure-to-pay controls with ledger and fraud safeguards.",
    },
    {
        "name": "012-aqstoqflow-payroll-presence-engine",
        "title": "Payroll Presence Engine",
        "chunk": "11",
        "summary": "Build HR, employee contracts, presence, attendance, leave, payroll runs, payslips, deductions, and payroll payment controls.",
        "triggers": "HR, employees, contracts, attendance, presence, leave, payroll, payslips, deductions, CNPS, social security, or payroll payments",
        "focus": "Auditable workforce and payroll controls.",
    },
    {
        "name": "013-aqstoqflow-data-trust-accountant-portal",
        "title": "Data Trust Accountant Portal",
        "chunk": "12",
        "summary": "Create ledger-backed reports, source-linked exports, accountant access, data trust metadata, and statutory reporting packs.",
        "triggers": "reports, dashboards, exports, accountant portal, statutory reports, data provenance, source links, or report certification",
        "focus": "Trustworthy reporting and accountant collaboration.",
    },
    {
        "name": "014-aqstoqflow-offline-pos-sync",
        "title": "Offline POS Sync",
        "chunk": "13",
        "summary": "Build offline POS cache, device identity, queued events, conflict handling, sync replay, and legal-numbering safety.",
        "triggers": "offline POS, sync, devices, terminals, local cache, queued events, conflict resolution, replay, or legal numbering offline",
        "focus": "Offline-first POS resilience without duplicate legal or ledger events.",
    },
    {
        "name": "015-aqstoqflow-country-adapter-pilot",
        "title": "Country Adapter Pilot",
        "chunk": "14",
        "summary": "Implement the first real country authority adapter with sandbox fixtures, credentials, outage handling, and disable controls.",
        "triggers": "country authority adapter, tax authority API, fiscal device integration, sandbox fixtures, credentials, outages, or regulatory pilot",
        "focus": "Production-shaped regulatory adapter architecture.",
    },
    {
        "name": "016-aqstoqflow-ai-copilot-guardrails",
        "title": "AI Copilot Guardrails",
        "chunk": "15",
        "summary": "Add read-only/source-cited AI assistance, proposal mode, blocked unsafe actions, and audit controls over trusted data.",
        "triggers": "AI copilot, assistant, automation, source-cited answers, proposal mode, unsafe action blocking, or accounting guardrails for AI",
        "focus": "Safe AI assistance grounded in trusted platform evidence.",
    },
    {
        "name": "017-aqstoqflow-enterprise-release-gate",
        "title": "Enterprise Release Gate",
        "chunk": None,
        "summary": "Review any chunk before promotion using tenant, RBAC, ledger, event, immutability, error, notification, UI, observability, and test gates.",
        "triggers": "reviewing a completed AqStoqFlow chunk, approving release readiness, rejecting unsafe work, or validating promotion gates",
        "focus": "Release approval, required fixes, and rejection evidence.",
    },
]


COMPANION_SKILLS = [
    "stockflow-ohada-saas-backbone",
    "ohada-compliance-oracle",
    "ledger-first-business-events",
    "enterprise-error-handling",
    "enterprise-fraud-and-controls",
    "review",
]


def clean(text: str) -> str:
    return re.sub(r"(?m)^        ", "", text).lstrip()


def section_between(text: str, start: str, next_patterns: list[str]) -> str:
    start_match = re.search(start, text, flags=re.MULTILINE)
    if not start_match:
        return ""
    end = len(text)
    for pattern in next_patterns:
        m = re.search(pattern, text[start_match.end() :], flags=re.MULTILINE)
        if m:
            end = min(end, start_match.end() + m.start())
    return text[start_match.start() : end].strip()


def chunk_section(text: str, chunk: str) -> str:
    pattern = rf"^### Chunk {re.escape(chunk)}: .*$"
    return section_between(text, pattern, [r"^### Chunk \d\d: ", r"^## 8\. "])


def skill_candidate_name(section: str) -> str:
    m = re.search(r"Skill candidate:\s*\n\s*\n- `([^`]+)`", section)
    return m.group(1) if m else ""


def skill_md(skill: dict[str, str], dependencies: str) -> str:
    companion_list = "\n".join(f"- `{name}`" for name in COMPANION_SKILLS)
    return clean(
        dedent(
        f"""\
        ---
        name: {skill['name']}
        description: {skill['summary']} Use when {skill['triggers']} in the AqStoqFlow/OHADA SMB platform, especially when implementing the numbered skill suite with gates, errors, notifications, evidence, and enterprise release discipline.
        ---

        # {skill['title']}

        This skill implements one boundary of the AqStoqFlow numbered OHADA SMB platform suite.

        ## Required Context

        Read these files when present:

        - `references/chunk-blueprint.md`
        - `what-next/AQSTOQFLOW_ORDERED_IMPLEMENTATION_CHUNKS_AND_SKILL_SUITE_2026-06-14.md`
        - `what-next/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md`
        - `docs/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md`
        - `graphify-out/GRAPH_REPORT.md`

        {dependencies}

        ## Focus

        {skill['focus']}

        ## Operating Rules

        1. Start by identifying the current repo state and the active chunk boundary.
        2. Reuse graph-visible foundations before introducing new primitives.
        3. Keep edits limited to the active chunk and its direct dependencies.
        4. Treat legal, tax, payroll, social-security, fiscal-device, and authority-submission behavior as requiring expert validation before production claims.
        5. Add gates, typed errors, notifications, audit evidence, and verification in the same slice as the feature.
        6. Stop instead of advancing when a CRITICAL or HIGH invariant fails.

        ## Companion Skills

        Load companion skills when their trigger applies:

        {companion_list}

        ## Required Gates

        Apply tenant, RBAC, ledger, error, notification, idempotency, evidence, UX, observability, and verification gates. The detailed gate language lives in the suite blueprint.

        ## Output Contract

        End with:

        - selected skill: `{skill['name']}`
        - files changed
        - gates passed
        - gates blocked
        - verification result
        - next recommended numbered skill
        """
        )
    )


def reference_md(skill: dict[str, str], blueprint_text: str, universal_gates: str, error_taxonomy: str) -> str:
    if skill["name"].startswith("000-"):
        suite = section_between(blueprint_text, r"^### 8\.1 Suite Executor Skill$", [r"^### 8\.2 "])
        order = section_between(blueprint_text, r"^## 9\. Skill Creation Order$", [r"^## 10\. "])
        body = "\n\n".join(part for part in [suite, order] if part)
    elif skill["name"].startswith("017-"):
        release = section_between(blueprint_text, r"^### 8\.5 Review Skill$", [r"^## 9\. "])
        body = release
    else:
        body = chunk_section(blueprint_text, skill["chunk"])

    if not body:
        body = f"Source section for {skill['name']} was not found. Use the suite blueprint as the source of truth."

    return clean(
        dedent(
        f"""\
        # {skill['title']} Blueprint

        Skill: `{skill['name']}`

        Summary: {skill['summary']}

        ## Source Blueprint Section

        {body}

        ## Universal Gates

        {universal_gates}

        ## Shared Error And Notification Taxonomy

        {error_taxonomy}
        """
        )
    )


def openai_yaml(skill: dict[str, str]) -> str:
    return clean(
        dedent(
        f"""\
        display_name: {skill['title']}
        short_description: {skill['summary']}
        default_prompt: Use {skill['name']} to inspect the relevant AqStoqFlow blueprint section, implement or audit the active chunk, enforce gates, and report verification plus the next numbered skill.
        """
        )
    )


def next_skill_line(index: int) -> str:
    if index == 0:
        return "This suite runner selects the next numbered skill from `001` through `017`."
    deps = []
    if index > 1:
        deps.append(f"Previous required skill: `{SKILLS[index - 1]['name']}`.")
    if index + 1 < len(SKILLS):
        deps.append(f"Next recommended skill: `{SKILLS[index + 1]['name']}`.")
    return "\n".join(deps)


def write_skill(skill: dict[str, str], index: int, blueprint_text: str, universal_gates: str, error_taxonomy: str) -> None:
    folder = DRAFT_ROOT / skill["name"]
    refs = folder / "references"
    agents = folder / "agents"
    refs.mkdir(parents=True, exist_ok=True)
    agents.mkdir(parents=True, exist_ok=True)
    (folder / "SKILL.md").write_text(skill_md(skill, next_skill_line(index)), encoding="utf-8")
    (refs / "chunk-blueprint.md").write_text(
        reference_md(skill, blueprint_text, universal_gates, error_taxonomy), encoding="utf-8"
    )
    (agents / "openai.yaml").write_text(openai_yaml(skill), encoding="utf-8")


def update_blueprint_numbering(text: str) -> str:
    replacements = {
        "00-aqstoqflow-execution-suite": "000-aqstoqflow-execution-suite",
        "01-aqstoqflow-program-orchestrator": "001-aqstoqflow-program-orchestrator",
        "02-aqstoqflow-control-plane": "002-aqstoqflow-control-plane",
        "03-aqstoqflow-error-notification-foundation": "003-aqstoqflow-error-notification-foundation",
        "04-aqstoqflow-business-event-gateway": "004-aqstoqflow-business-event-gateway",
        "05-aqstoqflow-accounting-control-center": "005-aqstoqflow-accounting-control-center",
        "06-aqstoqflow-country-pack-factory": "006-aqstoqflow-country-pack-factory",
        "07-aqstoqflow-pos-ledger-controls": "007-aqstoqflow-pos-ledger-controls",
        "08-aqstoqflow-compliance-center": "008-aqstoqflow-compliance-center",
        "09-aqstoqflow-payment-reconciliation-moat": "009-aqstoqflow-payment-reconciliation-moat",
        "10-aqstoqflow-inventory-valuation-kernel": "010-aqstoqflow-inventory-valuation-kernel",
        "11-aqstoqflow-purchasing-ap-controls": "011-aqstoqflow-purchasing-ap-controls",
        "12-aqstoqflow-payroll-presence-engine": "012-aqstoqflow-payroll-presence-engine",
        "13-aqstoqflow-data-trust-accountant-portal": "013-aqstoqflow-data-trust-accountant-portal",
        "14-aqstoqflow-offline-pos-sync": "014-aqstoqflow-offline-pos-sync",
        "15-aqstoqflow-country-adapter-pilot": "015-aqstoqflow-country-adapter-pilot",
        "16-aqstoqflow-ai-copilot-guardrails": "016-aqstoqflow-ai-copilot-guardrails",
        "17-aqstoqflow-enterprise-release-gate": "017-aqstoqflow-enterprise-release-gate",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def install_report() -> str:
    lines = [
        "# AqStoqFlow 000-017 Skill Suite Install Report",
        "",
        "Date: 2026-06-14",
        "",
        "## Result",
        "",
        "Created and staged the canonical three-digit AqStoqFlow skill suite.",
        "",
        "## Skills",
        "",
    ]
    for skill in SKILLS:
        lines.append(f"- `{skill['name']}` - {skill['summary']}")
    lines.extend(
        [
            "",
            "## Locations",
            "",
            "- Draft root: `.codex-skill-drafts/`",
            "- Installed root: `C:\\Users\\J COMPUTER\\.codex\\skills\\`",
            "",
            "## Structure",
            "",
            "Each skill contains:",
            "",
            "- `SKILL.md` for trigger, rules, gates, and output contract.",
            "- `references/chunk-blueprint.md` for detailed chunk requirements from the saved blueprint.",
            "- `agents/openai.yaml` for UI metadata.",
            "",
            "## Canonical Numbering",
            "",
            "`000` is the suite runner. `001` through `017` are the implementation and release-gate skills in dependency order.",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    text = BLUEPRINT.read_text(encoding="utf-8")
    universal_gates = section_between(text, r"^## 5\. Universal Gates For Every Chunk$", [r"^## 6\. "])
    error_taxonomy = section_between(text, r"^## 6\. Shared Error And Notification Taxonomy$", [r"^## 7\. "])
    for index, skill in enumerate(SKILLS):
        write_skill(skill, index, text, universal_gates, error_taxonomy)
    BLUEPRINT.write_text(update_blueprint_numbering(text), encoding="utf-8")
    (ROOT / "what-next" / "AQSTOQFLOW_000_017_SKILL_SUITE_INSTALL_REPORT_2026-06-14.md").write_text(
        install_report(), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
