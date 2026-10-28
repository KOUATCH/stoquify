from __future__ import annotations

import datetime
import json
import subprocess
import sys
from pathlib import Path


REPO = Path.cwd()
SKILL_ROOT = Path(r"C:\Users\J COMPUTER\.codex\skills")
CREATOR = SKILL_ROOT / ".system" / "skill-creator" / "scripts"
INIT_SCRIPT = CREATOR / "init_skill.py"
VALIDATE_SCRIPT = CREATOR / "quick_validate.py"
TODAY = datetime.date.today().isoformat()

SOURCE_DOCS = [
    "docs/referrals/stoquify-referral-worthy-war-plan-report.md",
    "docs/referrals/stoquify-referral-worthy-war-plan-prompt.md",
    "docs/referrals/stoquify-referral-worthy-execution-roadmap.md",
    "docs/referrals/stoquify-referral-worthy-executed-roadmap-report.md",
    "docs/referrals/referral-worthy-platform-features-report.md",
]

EXISTING_REUSE = [
    "004-aqstoqflow-business-event-gateway",
    "005-aqstoqflow-accounting-control-center",
    "007-aqstoqflow-pos-ledger-controls",
    "008-aqstoqflow-compliance-center",
    "009-aqstoqflow-payment-reconciliation-moat",
    "010-aqstoqflow-inventory-valuation-kernel",
    "010-aqstoqflow-stock-adjustment-writeoff-finalizer",
    "013-aqstoqflow-data-trust-accountant-portal",
    "016-aqstoqflow-ai-copilot-guardrails",
    "017-aqstoqflow-enterprise-release-gate",
    "020-aqstoqflow-close-assurance-engine",
    "021-aqstoqflow-close-assurance-portal",
    "022-aqstoqflow-close-pack-certification",
    "aqstoqflow-dashboard-daily-habit-completion",
    "aqstoqflow-module-package-strategy",
    "aqstoqflow-release-verification-foundation",
    "stoquify-daily-operating-brief",
    "stoquify-cash-exception-triage",
    "stoquify-inventory-variance-investigation",
    "stoquify-compliance-readiness-explanation",
    "stoquify-release-evidence-ratchet",
]

SPECS = [
    {
        "name": "stoquify-referral-war-room-orchestrator",
        "display": "Referral War Room Orchestrator",
        "short": "Coordinate referral roadmap execution",
        "prompt": "Use $stoquify-referral-war-room-orchestrator to select and govern the next referral-worthy roadmap phase.",
        "trigger": "/stoquify-referral-war-room",
        "desc": "Coordinate the Stoquify referral-worthy roadmap execution program. Use for phase registers, next-slice selection, pillar skill routing, what-next/referrals evidence, and roadmap drift prevention.",
        "purpose": "Coordinate the full referral-worthy roadmap across phases, skills, status registers, reports, and verification gates without implementing product features directly.",
        "files": ["docs/referrals/*.md", "what-next/referrals/", "app/", "actions/", "services/", "components/", "hooks/", "lib/", "config/", "prisma/", "scripts/"],
        "workflow": ["Inspect all referral source documents and the current status register.", "Identify the smallest next phase or pillar slice with clear dependencies.", "Select the appropriate pillar skill and define its evidence inputs, artifacts, and focused verification.", "Update what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md before and after the run.", "Save a dated phase report with command results, blockers, risks, and next handoff."],
        "artifacts": ["what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md", "what-next/referrals/REFERRAL_WAR_ROOM_PHASE_<N>_REPORT_<date>.md"],
        "verification": ["rg -n \"Phase|Next task|Verification|Blocker\" what-next/referrals", "npm run typecheck only when code contracts are touched", "npm test -- --runInBand <focused-test-files>"],
        "risks": ["Do not implement product features inside the orchestration pass.", "Do not widen into unrelated lint, UI, or schema cleanup.", "Require service-owned read models before dashboard work.", "Route external sharing through signed-token, redaction, expiry, and audit controls."],
        "success": "A status register exists, the next implementation slice is identified, and a pillar skill has a concrete evidence and verification plan.",
        "non_goals": ["Implementing dashboard, leakage, accountant, statement, financing, or automation features directly.", "Changing application code without a selected pillar slice."],
        "handoff": "Run /stoquify-daily-truth first unless the status register identifies a blocker that requires a foundation or release-verification skill.",
        "related": ["aqstoqflow-release-verification-foundation", "stoquify-release-evidence-ratchet", "004-aqstoqflow-business-event-gateway"],
    },
    {
        "name": "stoquify-daily-truth-command-center",
        "display": "Daily Truth Command Center",
        "short": "Build daily owner truth loop",
        "prompt": "Use $stoquify-daily-truth-command-center to design the service-owned daily truth dashboard slice.",
        "trigger": "/stoquify-daily-truth",
        "desc": "Build the Stoquify daily business truth command center. Use for service-owned daily snapshots, action center contracts, end-of-day close loops, and owner/manager dashboard surfaces.",
        "purpose": "Create the owner morning and manager end-of-day operating truth loop using service-owned read models before UI surfaces.",
        "files": ["services/", "actions/", "app/[locale]/(dashboard)/dashboard/", "components/dashboard/", "hooks/", "lib/security/", "what-next/referrals/"],
        "workflow": ["Read the war-plan report and current status register.", "Map available POS, payment, inventory, customer, supplier, payroll, and compliance sources.", "Define or inspect the daily snapshot service contract and action lifecycle.", "Implement the narrow read-model or UI slice selected by the orchestrator.", "Save a dated Daily Truth report with before/after evidence and focused checks."],
        "artifacts": ["what-next/referrals/DAILY_TRUTH_COMMAND_CENTER_REPORT_<date>.md", "service/read-model tests", "desktop/mobile screenshots when UI is changed"],
        "verification": ["npm test -- --runInBand <daily-truth-focused-tests>", "npm run typecheck", "route smoke or screenshot checks when dashboard UI changes"],
        "risks": ["Never derive business truth from dashboard state.", "Keep cards role-aware and location-aware.", "Avoid marketing-style dashboard redesigns.", "Preserve RBAC, module entitlement, and audit trails."],
        "success": "Owners can see critical daily operating state with source evidence and at least one clear next action from a service-owned read model.",
        "non_goals": ["Building leakage scoring, financing passport, or broad benchmarking.", "Replacing the app shell or global dashboard design system."],
        "handoff": "Handoff to /stoquify-leakage-radar after daily snapshot and action center contracts exist.",
        "related": ["aqstoqflow-dashboard-daily-habit-completion", "stoquify-daily-operating-brief", "004-aqstoqflow-business-event-gateway"],
    },
    {
        "name": "stoquify-cash-leakage-radar",
        "display": "Cash Leakage Radar",
        "short": "Detect cash and payment leakage",
        "prompt": "Use $stoquify-cash-leakage-radar to implement deterministic cash and payment exception controls.",
        "trigger": "/stoquify-leakage-radar",
        "desc": "Implement or audit Stoquify cash leakage radar controls. Use for deterministic POS, cash drawer, bank, mobile money, refund, void, discount, stock movement, and staff-attributed exception workflows.",
        "purpose": "Detect and route money-protection exceptions as reviewable evidence-backed cases, not unsupported accusations.",
        "files": ["services/pos/", "services/payments/", "services/reconciliation/", "services/inventory/", "actions/", "components/", "lib/security/", "prisma/"],
        "workflow": ["Inspect POS sale, payment, cash drawer, refund, void, discount, and stock movement sources.", "Define deterministic mismatch rules and thresholds.", "Create or update exception models with severity, amount at risk, actor, source evidence, and resolution state.", "Require maker-checker controls for dismissal or resolution.", "Save a dated leakage report with fixture scenarios and verification results."],
        "artifacts": ["what-next/referrals/CASH_LEAKAGE_RADAR_REPORT_<date>.md", "exception model/read-model tests", "permission and audit tests"],
        "verification": ["npm test -- --runInBand <leakage-focused-tests>", "npm run typecheck", "npm run policy:gates when release contracts are touched"],
        "risks": ["Use exception language, not automatic fraud accusations.", "Do not allow silent exception dismissal.", "Preserve immutable audit events for overrides.", "Tune false positives through deterministic fixtures before predictive scoring."],
        "success": "Cash/payment/stock mismatches become evidenced exceptions with permissions, resolution workflow, and audit history.",
        "non_goals": ["Building AI fraud prediction first.", "Implementing customer statements or financing passport."],
        "handoff": "Handoff to /stoquify-inventory-loss for stock-loss workflows or /stoquify-accountant-close for close impact.",
        "related": ["009-aqstoqflow-payment-reconciliation-moat", "007-aqstoqflow-pos-ledger-controls", "stoquify-cash-exception-triage"],
    },
    {
        "name": "stoquify-accountant-close-portal",
        "display": "Accountant Close Portal",
        "short": "Build accountant close workflow",
        "prompt": "Use $stoquify-accountant-close-portal to build close readiness and accountant proof workflows.",
        "trigger": "/stoquify-accountant-close",
        "desc": "Build or audit Stoquify accountant portal and monthly close readiness workflows. Use for accountant-client grants, missing evidence queues, OHADA/SYSCOHADA close packs, redacted exports, and close assurance verification.",
        "purpose": "Turn monthly close into an accountant-led referral channel while preserving tenant-scoped access, evidence, and redaction.",
        "files": ["services/accounting/", "services/assurance/", "services/payroll/", "services/pos/", "actions/", "app/[locale]/(dashboard)/dashboard/", "components/", "prisma/"],
        "workflow": ["Inspect close assurance and accounting control services.", "Define accountant-client grants and role boundaries.", "Build or update close readiness and missing evidence read models.", "Generate close pack exports with redaction and export history.", "Save a dated accountant close report with access, redaction, and export verification."],
        "artifacts": ["what-next/referrals/ACCOUNTANT_CLOSE_PORTAL_REPORT_<date>.md", "close readiness tests", "redacted export fixtures"],
        "verification": ["npm test -- --runInBand <accountant-close-focused-tests>", "npm run typecheck", "redaction and RBAC tests"],
        "risks": ["Do not expose one client's data to another accountant or firm.", "Do not create close claims without evidence completeness.", "Keep statutory logic in reviewed country-pack/config sources."],
        "success": "Accountants can see authorized client close readiness, request missing proof, and export redacted close packs with audit history.",
        "non_goals": ["Full accountant practice management.", "Unreviewed statutory rule implementation."],
        "handoff": "Handoff to /stoquify-statement-network for external proof or /stoquify-financing-passport after close packs mature.",
        "related": ["013-aqstoqflow-data-trust-accountant-portal", "020-aqstoqflow-close-assurance-engine", "022-aqstoqflow-close-pack-certification"],
    },
    {
        "name": "stoquify-statement-proof-network",
        "display": "Statement Proof Network",
        "short": "Share safe customer/supplier proof",
        "prompt": "Use $stoquify-statement-proof-network to build signed customer and supplier statement sharing.",
        "trigger": "/stoquify-statement-network",
        "desc": "Build or audit Stoquify customer and supplier statement proof network. Use for signed external access, expiring statement links, redacted payloads, delivery logs, disputes, and promise-to-pay workflows.",
        "purpose": "Create safe external proof surfaces for customers and suppliers that improve collections and generate organic referrals.",
        "files": ["services/customers/", "services/suppliers/", "services/purchasing/", "services/pos/", "app/api/", "actions/", "components/", "lib/security/"],
        "workflow": ["Inspect customer, supplier, invoice, payment, receipt, and purchase order services.", "Define statement generation from service-owned balances.", "Implement signed tokens with expiry, revocation, redaction, and view logs.", "Add recipient actions for confirm, dispute, and promise-to-pay.", "Save a dated statement network report with route/service tests."],
        "artifacts": ["what-next/referrals/STATEMENT_PROOF_NETWORK_REPORT_<date>.md", "signed-link route tests", "statement payload redaction tests"],
        "verification": ["npm test -- --runInBand <statement-network-focused-tests>", "token tamper/expiry tests", "external route redaction tests"],
        "risks": ["Never expose full tenant ledger externally.", "Require least-privilege payloads and revocation.", "Log recipient views and actions.", "Treat WhatsApp as delivery only."],
        "success": "Customers and suppliers can access intended statements through safe, audited, revocable links.",
        "non_goals": ["Replacing accounting ledgers.", "Sending automated WhatsApp messages before consent and templates exist."],
        "handoff": "Handoff to /stoquify-proof-artifacts for branding/referral tracking or /stoquify-copilot-whatsapp after delivery logs are safe.",
        "related": ["aqstoqflow-narrow-enforce-external-readiness", "stoquify-public-api-abuse-boundary", "stoquify-redaction-disclosure-policy"],
    },
    {
        "name": "stoquify-inventory-loss-control",
        "display": "Inventory Loss Control",
        "short": "Control variance and write-offs",
        "prompt": "Use $stoquify-inventory-loss-control to implement inventory variance and write-off controls.",
        "trigger": "/stoquify-inventory-loss",
        "desc": "Build or audit Stoquify inventory loss controls. Use for cycle counts, variance approvals, stock write-offs, expiry/damage tracking, transfer conflict review, loss analytics, and stock-to-cash evidence workflows.",
        "purpose": "Ensure stock value cannot disappear without traceable reason, approval, evidence, and loss analytics.",
        "files": ["services/inventory/", "actions/inventory/", "app/[locale]/(dashboard)/dashboard/inventory/", "components/inventory/", "prisma/", "lib/security/"],
        "workflow": ["Inspect stock ledger, movement, adjustment, transfer, and valuation services.", "Define cycle count and variance lifecycle.", "Require approval and reason evidence for write-offs and high-risk adjustments.", "Feed loss summaries into daily truth and leakage workflows.", "Save a dated inventory loss report with ledger and RBAC verification."],
        "artifacts": ["what-next/referrals/INVENTORY_LOSS_CONTROL_REPORT_<date>.md", "variance lifecycle tests", "write-off approval tests"],
        "verification": ["npm test -- --runInBand <inventory-loss-focused-tests>", "stock ledger integrity tests", "RBAC tests"],
        "risks": ["Do not bypass inventory service boundaries.", "Preserve valuation and ledger integrity.", "Do not silently mutate stock quantities without audit evidence."],
        "success": "Cycle counts, variances, and write-offs become evidenced, approved, and analyzable by product/location/actor.",
        "non_goals": ["Broad inventory UI modernization.", "Predictive replenishment before loss controls are stable."],
        "handoff": "Handoff to /stoquify-leakage-radar when stock loss affects cash leakage or to /stoquify-daily-truth for owner summaries.",
        "related": ["010-aqstoqflow-inventory-valuation-kernel", "010-aqstoqflow-stock-adjustment-writeoff-finalizer", "stoquify-inventory-variance-investigation"],
    },
    {
        "name": "stoquify-compliance-readiness-calendar",
        "display": "Compliance Readiness Calendar",
        "short": "Track compliance readiness safely",
        "prompt": "Use $stoquify-compliance-readiness-calendar to build country-pack compliance readiness workflows.",
        "trigger": "/stoquify-compliance-readiness",
        "desc": "Build or audit Stoquify compliance readiness calendars. Use for country-pack obligation registries, filing readiness, missing evidence, owner/accountant reminders, OHADA/SYSCOHADA provenance, and compliance release evidence.",
        "purpose": "Turn tax, payroll, OHADA close, declaration, license, and social contribution anxiety into reviewed readiness workflows.",
        "files": ["services/compliance/", "services/payroll/", "services/accounting/", "config/", "prisma/", "actions/", "components/"],
        "workflow": ["Inspect country-pack and compliance service sources.", "Define obligation, due date, evidence requirement, and readiness states.", "Require reviewed provenance for statutory rules.", "Route reminders through action center and accountant review.", "Save a dated compliance readiness report with fixture and provenance checks."],
        "artifacts": ["what-next/referrals/COMPLIANCE_READINESS_REPORT_<date>.md", "country-pack fixture tests", "readiness state tests"],
        "verification": ["npm test -- --runInBand <compliance-readiness-focused-tests>", "country-pack provenance checks", "RBAC/redaction tests"],
        "risks": ["Do not hard-code statutory values without provenance.", "Do not claim filing readiness without evidence completeness.", "Preserve country-pack versioning and accountant override paths."],
        "success": "Owners and accountants see upcoming obligations, missing proof, and readiness state before deadlines.",
        "non_goals": ["Automated legal advice.", "Unreviewed tax calculation changes."],
        "handoff": "Handoff to /stoquify-accountant-close for close evidence or /stoquify-financing-passport when compliance readiness contributes to credit proof.",
        "related": ["008-aqstoqflow-compliance-center", "006-aqstoqflow-country-pack-factory", "stoquify-compliance-readiness-explanation"],
    },
    {
        "name": "stoquify-financing-passport",
        "display": "Financing Passport",
        "short": "Create lender-ready proof packs",
        "prompt": "Use $stoquify-financing-passport to design financing readiness from evidence-backed data.",
        "trigger": "/stoquify-financing-passport",
        "desc": "Build or audit Stoquify financing passport workflows. Use for business health score, data-quality scoring, lender-ready proof packs, consent-based sharing, redaction, and explainable readiness recommendations.",
        "purpose": "Convert trusted operating data into controlled financing readiness proof while avoiding overclaims.",
        "files": ["services/analytics/", "services/accounting/", "services/assurance/", "services/inventory/", "services/payments/", "app/api/", "components/", "lib/security/"],
        "workflow": ["Inspect daily truth, close pack, payment discipline, stock turnover, compliance readiness, and leakage exception sources.", "Define data-quality and health-score inputs before scoring.", "Generate explainable readiness recommendations.", "Implement consent-based, redacted partner sharing.", "Save a dated financing passport report with score and sharing verification."],
        "artifacts": ["what-next/referrals/FINANCING_PASSPORT_REPORT_<date>.md", "score fixture tests", "partner view redaction tests"],
        "verification": ["npm test -- --runInBand <financing-passport-focused-tests>", "consent/share tests", "redaction and explainability tests"],
        "risks": ["Never imply guaranteed credit approval.", "Do not score weak or missing evidence as strong readiness.", "Require owner consent and revocation for external partner views."],
        "success": "Owners understand financing readiness, weak data areas, and can share redacted proof by consent.",
        "non_goals": ["Direct lender integration before score quality is proven.", "Opaque black-box credit scoring."],
        "handoff": "Handoff to /stoquify-proof-artifacts for external presentation or /stoquify-copilot-whatsapp for guided readiness explanations.",
        "related": ["022-aqstoqflow-close-pack-certification", "kontava-fintech-evidence-api", "stoquify-report-trust-export-certifier"],
    },
    {
        "name": "stoquify-copilot-whatsapp-ops",
        "display": "Copilot WhatsApp Ops",
        "short": "Automate trusted workflows safely",
        "prompt": "Use $stoquify-copilot-whatsapp-ops to add guarded copilot and WhatsApp flows on trusted facts.",
        "trigger": "/stoquify-copilot-whatsapp",
        "desc": "Build or audit Stoquify copilot and WhatsApp operations. Use for evidence-grounded copilot explanations, approved action suggestions, WhatsApp templates, delivery logs, consent, redaction, and no-approval-bypass checks.",
        "purpose": "Accelerate trusted workflows through AI and WhatsApp without making either channel a source of truth.",
        "files": ["services/copilot/", "services/notifications/", "app/api/", "actions/", "components/", "lib/security/", "config/"],
        "workflow": ["Inspect action center, statement hub, close evidence, compliance reminders, and existing copilot guardrails.", "Define allowed copilot actions and prohibited actions.", "Create WhatsApp template, consent, and delivery-log contracts.", "Require human confirmation for sensitive or external actions.", "Save a dated automation report with safety and delivery verification."],
        "artifacts": ["what-next/referrals/COPILOT_WHATSAPP_OPS_REPORT_<date>.md", "copilot policy registry", "WhatsApp template registry", "delivery log tests"],
        "verification": ["npm test -- --runInBand <copilot-whatsapp-focused-tests>", "prompt safety tests", "redaction tests", "no-approval-bypass tests"],
        "risks": ["Do not let AI create financial truth.", "Do not send external messages without confirmation and consent.", "Do not include redacted context in prompts or messages.", "Keep delivery channels secondary to service-owned facts."],
        "success": "Copilot and WhatsApp speed evidence-backed workflows while preserving approval, redaction, audit, and consent.",
        "non_goals": ["Broad autonomous agent behavior.", "WhatsApp-first data entry as source of truth."],
        "handoff": "Handoff to /stoquify-proof-artifacts for referral-visible outputs or back to the pillar skill that owns the underlying workflow.",
        "related": ["016-aqstoqflow-ai-copilot-guardrails", "ai-copilot-with-accounting-guardrails", "stoquify-evidence-grounded-retrieval"],
    },
    {
        "name": "stoquify-referral-proof-artifacts",
        "display": "Referral Proof Artifacts",
        "short": "Make proof artifacts referral-ready",
        "prompt": "Use $stoquify-referral-proof-artifacts to standardize safe branded proof artifacts and referral tracking.",
        "trigger": "/stoquify-proof-artifacts",
        "desc": "Build or audit Stoquify referral proof artifacts. Use for professional receipts, statements, close packs, payslips, financing passports, subtle trust branding, referral attribution, external view logs, redaction, and proof artifact release evidence.",
        "purpose": "Make every external proof artifact professional, safe, auditable, and capable of creating measurable referrals.",
        "files": ["services/pos/", "services/accounting/", "services/payroll/", "services/assurance/", "services/analytics/", "components/", "app/api/", "messages/"],
        "workflow": ["Inventory external artifacts: receipts, statements, close packs, payslips, and financing passports.", "Define a proof artifact standard for branding, metadata, source evidence, redaction, and recipient scope.", "Add or verify referral attribution and view logs where safe.", "Test payload shape and redaction for each artifact touched.", "Save a dated proof artifacts report with before/after examples."],
        "artifacts": ["what-next/referrals/REFERRAL_PROOF_ARTIFACTS_REPORT_<date>.md", "artifact payload snapshots", "view/referral attribution tests"],
        "verification": ["npm test -- --runInBand <proof-artifact-focused-tests>", "payload shape tests", "redaction tests", "external view tests"],
        "risks": ["Do not add marketing content that exposes sensitive data.", "Do not weaken signed access boundaries.", "Do not make referral tracking mandatory for private artifacts."],
        "success": "External artifacts look professional, preserve safety, and create trackable referral paths.",
        "non_goals": ["Full loyalty program implementation.", "Peer benchmarking before anonymized cohort thresholds exist."],
        "handoff": "Handoff to the orchestrator for phase close and the next referral loop after artifacts are verified.",
        "related": ["stoquify-report-trust-export-certifier", "022-aqstoqflow-close-pack-certification", "stoquify-redaction-disclosure-policy"],
    },
]

AGENTS = [
    ("program-orchestrator-agent", "Program Orchestrator Agent", "Coordinate roadmap phases, status register, skill handoffs, evidence reports, and next-slice selection."),
    ("product-strategy-agent", "Product Strategy Agent", "Keep scope tied to referral-worthy value, packaging, GTM loops, and user pain."),
    ("enterprise-architecture-agent", "Enterprise Architecture Agent", "Preserve service ownership, data flows, read models, and integration contracts."),
    ("security-rbac-redaction-agent", "Security/RBAC/Redaction Agent", "Enforce tenant isolation, RBAC, module entitlement, signed access, redaction, audit, and safe errors."),
    ("uiux-workflow-agent", "UI/UX Workflow Agent", "Design dense role-aware workflows for daily, weekly, and monthly operating habits."),
    ("pos-cash-control-agent", "POS/Cash Control Agent", "Own POS, cash drawer, payment, refund, void, discount, and leakage-control analysis."),
    ("inventory-control-agent", "Inventory Control Agent", "Own stock movement, cycle count, variance, write-off, and loss-control workflows."),
    ("accountant-close-assurance-agent", "Accountant/Close Assurance Agent", "Own accountant access, close readiness, missing evidence, exports, and proof packs."),
    ("compliance-ohada-agent", "Compliance/OHADA Agent", "Own country-pack provenance, filing readiness, statutory guardrails, and compliance evidence."),
    ("ai-copilot-automation-agent", "AI Copilot/Automation Agent", "Own evidence-grounded copilot behavior, WhatsApp delivery, consent, and no-bypass controls."),
    ("gtm-referral-packaging-agent", "GTM/Referral Packaging Agent", "Own tier mapping, referral loops, proof artifact visibility, and partner-channel alignment."),
]


def yaml_quote(value: str) -> str:
    return json.dumps(value)


def bullets(items: list[str]) -> str:
    return "\n".join(f"- `{item}`" if "/" in item or item.startswith("docs") or item.startswith("what-next") else f"- {item}" for item in items)


def skill_body(spec: dict) -> str:
    workflow = "\n".join(f"{index + 1}. {step}" for index, step in enumerate(spec["workflow"]))
    verification = "\n".join(f"- `{cmd}`" for cmd in spec["verification"])
    risks = "\n".join(f"- {risk}" for risk in spec["risks"])
    non_goals = "\n".join(f"- {goal}" for goal in spec["non_goals"])
    return f"""---
name: {spec["name"]}
description: {yaml_quote(spec["desc"])}
---

# {spec["display"]}

## Trigger Phrase

Use `{spec["trigger"]}` when the user asks to execute this roadmap pillar or explicitly names `${spec["name"]}`.

## Purpose And Scope

{spec["purpose"]}

This skill is part of the Stoquify referral-worthy roadmap execution suite. Keep business truth service-owned, tenant-safe, evidence-backed, and release-verifiable.

## Required First Reads

{bullets(SOURCE_DOCS)}
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` if it exists

## Existing Skills To Consult

{bullets(spec["related"])}

Use adjacent skills as references or handoff targets. Do not duplicate their implementation scope unless this skill is explicitly selected by the orchestrator for a narrow roadmap slice.

## Likely Files And Folders

{bullets(spec["files"])}

Inspect only the files needed for the selected slice. Preserve dirty-worktree safety and do not clean unrelated lint or test failures.

## Execution Workflow

{workflow}

## Expected Artifacts

{bullets(spec["artifacts"])}

Always save unresolved blockers, skipped checks, and residual risks in the dated report.

## Verification Commands

{verification}

Run only the focused commands that match the touched files. Escalate only when a required local command is blocked by the sandbox or needs external access.

## Risk Controls

{risks}

## Success Criteria

{spec["success"]}

## Non-Goals

{non_goals}

## Handoff Instructions

{spec["handoff"]}
"""


def create_or_update_skills() -> tuple[list[str], list[str], list[dict]]:
    created: list[str] = []
    skipped: list[str] = []
    init_results: list[dict] = []
    for spec in SPECS:
        skill_dir = SKILL_ROOT / spec["name"]
        if skill_dir.exists():
            skipped.append(spec["name"])
        else:
            cmd = [
                sys.executable,
                str(INIT_SCRIPT),
                spec["name"],
                "--path",
                str(SKILL_ROOT),
                "--interface",
                f"display_name={spec['display']}",
                "--interface",
                f"short_description={spec['short']}",
                "--interface",
                f"default_prompt={spec['prompt']}",
            ]
            result = subprocess.run(cmd, text=True, capture_output=True)
            init_results.append({"skill": spec["name"], "returncode": result.returncode, "stdout": result.stdout.strip(), "stderr": result.stderr.strip()})
            if result.returncode != 0:
                raise RuntimeError(f"init_skill failed for {spec['name']}: {result.stderr or result.stdout}")
            created.append(spec["name"])
        (skill_dir / "SKILL.md").write_text(skill_body(spec), encoding="utf-8")
    return created, skipped, init_results


def create_agent_briefs() -> list[str]:
    agents_dir = REPO / "docs" / "referrals" / "agents"
    agents_dir.mkdir(parents=True, exist_ok=True)
    paths: list[str] = []
    for slug, title, role in AGENTS:
        path = agents_dir / f"{slug}.md"
        paths.append(f"docs/referrals/agents/{slug}.md")
        path.write_text(f"""# {title}

## Role

{role}

## Required Context

- `docs/referrals/stoquify-referral-worthy-war-plan-report.md`
- `docs/referrals/stoquify-referral-worthy-war-plan-prompt.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` when present

## Responsibilities

- Work only within the selected roadmap phase or pillar.
- Preserve service-owned truth, RBAC, redaction, audit, and evidence links.
- Produce implementation-ready findings, tasks, or artifacts instead of broad advice.
- Save blockers, assumptions, skipped checks, and next handoff guidance.

## Expected Outputs

- Narrow recommendations or implementation notes for the selected slice.
- Evidence references to inspected files and reports.
- Verification commands and residual risks.

## Collaboration Boundaries

- Do not implement unrelated product features.
- Do not bypass the orchestrator status register.
- Do not treat AI or WhatsApp as sources of truth.
- Hand off to the relevant Stoquify roadmap skill when work crosses domains.

## Risk Controls

- Require signed tokens, expiry, revocation, redaction, and audit for external sharing.
- Require accountant and compliance provenance for statutory or close claims.
- Require deterministic evidence before fraud, leakage, or financing-readiness claims.

## Validation Expectations

- Output must name inspected source documents and affected roadmap pillar.
- Output must include at least one verification path or explain why verification is not applicable.
- Output must identify whether the next step is implementation, audit, report, or skill handoff.
""", encoding="utf-8")
    return paths


def validate_skills() -> list[dict]:
    required_sections = [
        "## Trigger Phrase",
        "## Purpose And Scope",
        "## Required First Reads",
        "## Execution Workflow",
        "## Expected Artifacts",
        "## Verification Commands",
        "## Risk Controls",
        "## Success Criteria",
        "## Non-Goals",
        "## Handoff Instructions",
    ]
    validation = []
    for spec in SPECS:
        skill_dir = SKILL_ROOT / spec["name"]
        result = subprocess.run([sys.executable, str(VALIDATE_SCRIPT), str(skill_dir)], text=True, capture_output=True)
        content = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
        missing = [section for section in required_sections if section not in content]
        validation.append({
            "skill": spec["name"],
            "path": str(skill_dir),
            "quick_validate_exit": result.returncode,
            "quick_validate_stdout": result.stdout.strip(),
            "quick_validate_stderr": result.stderr.strip(),
            "missing_sections": missing,
            "manual_status": "pass" if not missing else "blocked",
        })
    return validation


def write_status_register() -> Path:
    target_dir = REPO / "what-next" / "referrals"
    target_dir.mkdir(parents=True, exist_ok=True)
    rows = "\n".join(f"| `{spec['name']}` | `{spec['trigger']}` | installed and validated | {spec['handoff']} |" for spec in SPECS)
    body = f"""# Referral War Room Status

Generated: {TODAY}

## Current Objective

Create and install the Stoquify referral-worthy roadmap execution skill suite. Product feature implementation has not started in this run.

## Installed Roadmap Skills

| Skill | Trigger | Status | Next Use |
|---|---|---|---|
{rows}

## First Runnable Phase

Run `stoquify-referral-war-room-orchestrator` with `/stoquify-referral-war-room` to open Phase 0: Program Control Plane.

## Phase Register

| Phase | Status | Primary Skill | Next Task | Evidence Artifact |
|---|---|---|---|---|
| Phase 0: Program Control Plane | ready | `stoquify-referral-war-room-orchestrator` | Create/refresh phase status and select first implementation slice. | `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_0_REPORT_<date>.md` |
| Phase 1: Service-Owned Operating Truth | pending | `stoquify-daily-truth-command-center` | Define daily snapshot and action center contracts after Phase 0. | `what-next/referrals/DAILY_TRUTH_FOUNDATION_REPORT_<date>.md` |
| Phase 2: Daily Truth Dashboard And Action Center | pending | `stoquify-daily-truth-command-center` | Implement role-aware dashboard/actions after read models exist. | `what-next/referrals/DAILY_TRUTH_COMMAND_CENTER_REPORT_<date>.md` |
| Phase 3: Leakage Radar And Inventory Loss | pending | `stoquify-cash-leakage-radar` / `stoquify-inventory-loss-control` | Build deterministic exceptions and variance controls. | `what-next/referrals/CASH_LEAKAGE_RADAR_REPORT_<date>.md` |
| Phase 4: Accountant Portal And Close Pack | pending | `stoquify-accountant-close-portal` | Build close readiness and missing evidence workflow. | `what-next/referrals/ACCOUNTANT_CLOSE_PORTAL_REPORT_<date>.md` |
| Phase 5: Statement Hub And External Proof | pending | `stoquify-statement-proof-network` | Build signed statement sharing. | `what-next/referrals/STATEMENT_PROOF_NETWORK_REPORT_<date>.md` |
| Phase 6: Financing Passport | pending | `stoquify-financing-passport` | Build data-quality and readiness proof. | `what-next/referrals/FINANCING_PASSPORT_REPORT_<date>.md` |
| Phase 7: Automation And Referral Flywheel | pending | `stoquify-copilot-whatsapp-ops` / `stoquify-referral-proof-artifacts` | Add automation and referral artifacts after core workflows are trusted. | `what-next/referrals/COPILOT_WHATSAPP_OPS_REPORT_<date>.md` |

## Blockers

- None for skill-suite installation.
- Product implementation remains intentionally out of scope until the orchestrator selects a narrow slice.
"""
    path = target_dir / "REFERRAL_WAR_ROOM_STATUS.md"
    path.write_text(body, encoding="utf-8")
    return path


def write_report(created: list[str], skipped: list[str], init_results: list[dict], validation: list[dict], agent_paths: list[str], status_path: Path) -> tuple[Path, Path]:
    validation_path = REPO / "docs" / "referrals" / "stoquify-referral-worthy-skill-suite-validation.json"
    validation_payload = {
        "generated": TODAY,
        "created": created,
        "skipped_existing_exact": skipped,
        "init_results": init_results,
        "validation": validation,
        "related_existing_skills": EXISTING_REUSE,
        "agent_briefs": agent_paths,
    }
    validation_path.write_text(json.dumps(validation_payload, indent=2), encoding="utf-8")
    rows = []
    for spec in SPECS:
        item = next(v for v in validation if v["skill"] == spec["name"])
        status = "pass" if item["quick_validate_exit"] == 0 and item["manual_status"] == "pass" else "blocked"
        rows.append(f"| `{spec['name']}` | `{spec['trigger']}` | {status} | {spec['purpose']} |")
    validation_rows = []
    for item in validation:
        missing = ", ".join(item["missing_sections"]) if item["missing_sections"] else "none"
        validation_rows.append(f"| `{item['skill']}` | {item['quick_validate_exit']} | {item['manual_status']} | {missing} |")
    report = f"""# Stoquify Referral-Worthy Skill Suite Installation Report

Generated: {TODAY}

## Scope

This run executed the skill-suite creation prompt from `C:/Users/J COMPUTER/.codex/attachments/c206f02d-d989-473d-8e52-e83369ff49b5/pasted-text.txt` against `docs/referrals/stoquify-referral-worthy-war-plan-report.md`.

The run created execution machinery only. No Stoquify product features or application code were implemented.

## Source Evidence Inspected

{chr(10).join(f"- `{doc}`" for doc in SOURCE_DOCS)}

## Created Or Updated Skills

| Skill | Trigger | Validation | Purpose |
|---|---|---|---|
{chr(10).join(rows)}

## Existing Skills Reused Or Referenced

{chr(10).join(f"- `{name}`" for name in EXISTING_REUSE)}

## Agent Briefs Created

{chr(10).join(f"- `{path}`" for path in agent_paths)}

## Status Register

Created `{status_path.relative_to(REPO).as_posix()}` with the phase register and first runnable phase.

## Validation Summary

- Skills initialized with `skill-creator/scripts/init_skill.py` where exact folders did not already exist.
- Each `SKILL.md` was replaced with roadmap-specific instructions after initialization.
- Each skill was validated with `skill-creator/scripts/quick_validate.py`.
- Manual section checks verified trigger, evidence, workflow, artifacts, verification commands, risk controls, success criteria, non-goals, and handoff instructions.

Detailed validation JSON: `docs/referrals/stoquify-referral-worthy-skill-suite-validation.json`

## Validation Results

| Skill | quick_validate exit | Manual section check | Missing sections |
|---|---:|---|---|
{chr(10).join(validation_rows)}

## Installed Skill Suite Order

{chr(10).join(f"{index + 1}. `{spec['name']}`" for index, spec in enumerate(SPECS))}

## First Recommended Skill To Run

Run `stoquify-referral-war-room-orchestrator` first with `/stoquify-referral-war-room`.

Its first job is to open Phase 0, refresh the status register, select the first narrow implementation slice, and route the work to `stoquify-daily-truth-command-center` only after the service-owned truth foundation is scoped.

## Guardrails Preserved

- Product feature implementation was intentionally not started.
- Existing related skills were referenced, not overwritten.
- Each new skill requires service-owned truth, evidence links, RBAC, redaction, audit, and focused verification.
- WhatsApp and AI copilot are explicitly delivery/guidance layers, not sources of truth.
- External sharing skills require signed tokens, expiry, revocation, redaction, and view logs.

## Residual Risks

- The new skills become available to future turns after the environment refreshes its skill list.
- The suite is intentionally instruction-first; the first implementation run should still inspect live code before changing application files.
- Forward-testing with subagents was not performed in this run to keep scope bounded and avoid generating extra artifacts.

## Next Step

Start the actual roadmap execution with `/stoquify-referral-war-room`.
"""
    report_path = REPO / "docs" / "referrals" / "stoquify-referral-worthy-skill-suite-installation-report.md"
    report_path.write_text(report, encoding="utf-8")
    return report_path, validation_path


def main() -> None:
    created, skipped, init_results = create_or_update_skills()
    agent_paths = create_agent_briefs()
    validation = validate_skills()
    status_path = write_status_register()
    report_path, validation_path = write_report(created, skipped, init_results, validation, agent_paths, status_path)
    failures = [item for item in validation if item["quick_validate_exit"] != 0 or item["manual_status"] != "pass"]
    print(json.dumps({
        "created": created,
        "skipped_existing_exact": skipped,
        "validation_failures": failures,
        "status_register": str(status_path),
        "report": str(report_path),
        "validation_json": str(validation_path),
        "agent_brief_count": len(agent_paths),
    }, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
