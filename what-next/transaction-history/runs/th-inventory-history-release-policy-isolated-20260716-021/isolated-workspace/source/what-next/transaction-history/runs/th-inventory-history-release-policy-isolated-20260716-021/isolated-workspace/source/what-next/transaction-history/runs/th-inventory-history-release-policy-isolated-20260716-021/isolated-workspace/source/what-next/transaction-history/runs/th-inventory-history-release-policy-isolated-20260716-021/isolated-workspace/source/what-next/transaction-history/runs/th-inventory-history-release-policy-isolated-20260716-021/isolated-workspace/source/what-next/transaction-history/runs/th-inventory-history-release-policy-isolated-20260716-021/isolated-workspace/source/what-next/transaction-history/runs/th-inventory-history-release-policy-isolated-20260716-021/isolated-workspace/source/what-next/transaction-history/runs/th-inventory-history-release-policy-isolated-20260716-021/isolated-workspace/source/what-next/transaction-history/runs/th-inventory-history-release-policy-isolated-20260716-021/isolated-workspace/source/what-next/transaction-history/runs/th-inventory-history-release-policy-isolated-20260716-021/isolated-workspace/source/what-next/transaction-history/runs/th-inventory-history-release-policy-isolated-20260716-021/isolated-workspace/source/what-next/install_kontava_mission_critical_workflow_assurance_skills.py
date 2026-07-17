#!/usr/bin/env python3
"""Install the Kontava Mission-Critical Workflow Assurance skill suite."""

from __future__ import annotations

import subprocess
import sys
from datetime import date
from pathlib import Path


SKILL_ROOT = Path(r"C:\Users\J COMPUTER\.codex\skills")
CREATOR_ROOT = SKILL_ROOT / ".system" / "skill-creator"
INIT_SKILL = CREATOR_ROOT / "scripts" / "init_skill.py"
VALIDATE_SKILL = CREATOR_ROOT / "scripts" / "quick_validate.py"
SOURCE_PROPOSAL = (
    "workflow efficiency/"
    "KONTAVA_MISSION_CRITICAL_WORKFLOW_ASSURANCE_SKILL_SUITE_PROPOSAL_2026-06-21.md"
)
SOURCE_RISK_REPORT = (
    "workflow efficiency/"
    "KONTAVA_MISSION_CRITICAL_WORKFLOW_RISK_REPORT_2026-06-21.md"
)
TODAY = date(2026, 6, 21).isoformat()
MARKER = "Generated from KONTAVA_MISSION_CRITICAL_WORKFLOW_ASSURANCE_SKILL_SUITE_PROPOSAL_2026-06-21"


DOCTRINE = [
    "observe-mode first",
    "tenant-scoped",
    "ledger-aware",
    "evidence-backed",
    "source-hash/fingerprint based",
    "role-aware",
    "redacted by default",
    "direct action links",
    "test-gated before enforce-mode",
    "saved implementation report under `what-next/`",
]

ENFORCE_BLOCKERS = [
    "check definition is versioned",
    "check run is persisted",
    "incident creation is durable and tenant-scoped",
    "alert delivery is deduped by fingerprint and source hash",
    "action route exists",
    "proof/source evidence exists",
    "redaction is server-side",
    "owner role and required permission are defined",
    "waiver has reason, expiry, fresh auth, and maker-checker where sensitive",
    "scheduler failure is visible",
    "seeded false-positive and false-negative tests pass",
    "browser smoke passes for Control Tower and Manager Action Center",
    "release gate reports zero blockers",
]

SHARED_ANCHORS = [
    SOURCE_PROPOSAL,
    SOURCE_RISK_REPORT,
    "workflow efficiency/KONTAVA_WORKFLOW_ASSURANCE_PREREQUISITES_REPORT_2026-06-21.md",
    "what-next/KONTAVA_*ASSURANCE*_RUN_REPORT_2026-06-21.md",
    "prisma/schema.prisma",
    "services/assurance/*",
    "actions/assurance/*",
    "components/assurance/*",
    "scripts/workflow-assurance-release-gate.js",
]


def skill(
    name: str,
    title: str,
    description: str,
    display_name: str,
    short_description: str,
    default_prompt: str,
    purpose: str,
    use: str,
    risk: str,
    problem: str,
    anchors: list[str],
    behavior: list[str],
    outputs: list[str],
    acceptance: list[str],
    dependencies: list[str],
    deferred: list[str],
) -> dict[str, object]:
    return {
        "name": name,
        "title": title,
        "description": description,
        "display_name": display_name,
        "short_description": short_description,
        "default_prompt": default_prompt,
        "purpose": purpose,
        "use": use,
        "risk": risk,
        "problem": problem,
        "anchors": anchors,
        "behavior": behavior,
        "outputs": outputs,
        "acceptance": acceptance,
        "dependencies": dependencies,
        "deferred": deferred,
    }


SKILLS: list[dict[str, object]] = [
    skill(
        "kontava-mission-critical-workflow-assurance-suite",
        "Kontava Mission-Critical Workflow Assurance Suite",
        "Orchestrate the complete Kontava Mission-Critical Workflow Assurance Skills Suite from one command. Use when the user asks to run the full suite, sequence mission-critical workflow hardening, decide safe next slices, or coordinate the 15 workflow assurance skills in observe mode without enabling enforce-mode by default.",
        "Kontava Workflow Assurance Suite",
        "Run the full workflow assurance suite",
        "Use $kontava-mission-critical-workflow-assurance-suite to run the full Kontava mission-critical workflow assurance suite in observe mode.",
        "Provide the one-command entrypoint that sequences the full mission-critical workflow hardening program.",
        "Use when the user asks to run the whole suite, continue the Workflow Assurance program, classify current readiness, or choose the next implementation slice across multiple workflows.",
        "All risk-report sections and the full skill-suite map.",
        "Prevents broad assurance work from turning into scattered fixes or premature enforcement.",
        SHARED_ANCHORS,
        [
            "Run as a coordinator; do not duplicate specialist skill work.",
            "Read the proposal and risk report first, then inspect current repo anchors.",
            "Classify the current phase before making changes.",
            "Open the specialist skill SKILL.md files only when their domain is selected.",
            "Stop before enforce-mode unless every blocker is cleared and the user explicitly requests it.",
        ],
        [
            "phase classification",
            "ordered skill execution plan",
            "next safe implementation slice",
            "cross-skill dependency map",
            "blocked/deferred list",
            "verification plan",
            "suite run report under `what-next/`",
        ],
        [
            "Names the exact specialist skill or slice to run next.",
            "Confirms observe-mode remains the default.",
            "Lists every unresolved enforce-mode blocker.",
            "Links each selected insight to a corrective workflow route.",
            "Saves a concise suite report under `what-next/`.",
        ],
        [
            "All 15 suite skills.",
            "Existing Kontava assurance foundations.",
        ],
        [
            "Full enforce-mode.",
            "External alert channels.",
            "Fraud scoring beyond explicit proposal scope.",
        ],
    ),
    skill(
        "kontava-workflow-risk-orchestrator",
        "Kontava Workflow Risk Orchestrator",
        "Sequence the Kontava mission-critical workflow hardening program. Use for broad Workflow Assurance requests, risk-report follow-up, phase classification, choosing the next safe implementation slice, and preventing prerequisites or enforce-mode blockers from being skipped.",
        "Kontava Workflow Risk Orchestrator",
        "Choose the next safe assurance slice",
        "Use $kontava-workflow-risk-orchestrator to classify the current Workflow Assurance phase and choose the next safe slice.",
        "Sequence the full mission-critical workflow hardening program and select the next safe implementation slice.",
        "Use for broad Workflow Assurance requests, suite execution planning, risk-report follow-up, deciding next skill, or reviewing enforce-mode readiness.",
        "Executive Summary, Ranked Risk Register, Cross-Cutting Failure Precursors, Diagnosis Playbook, Foundational Hardening Roadmap.",
        "Prevents scattered fixes that make one module look safe while the cross-workflow chain remains fragile.",
        SHARED_ANCHORS,
        [
            "Map current repo state to the proposal phases before proposing or editing code.",
            "Prefer the smallest safe implementation slice with direct verification.",
            "Reuse current Workflow Assurance, Control Tower, Manager Action Center, evidence, ledger, notification, and release-gate foundations.",
            "Treat enforce-mode as blocked unless all gates are explicitly proven.",
        ],
        [
            "phase classification",
            "next skill recommendation",
            "prerequisite checklist",
            "blocked/deferred phases",
            "verification plan",
            "saved report under `what-next/`",
        ],
        [
            "Names exactly one next implementation slice unless the user asks for a broad audit.",
            "States prerequisites and deferred work.",
            "Refuses enforce-mode unless gates and live verification pass.",
        ],
        ["Reads all other suite outputs."],
        ["No schema or app code unless explicitly asked to execute a selected slice."],
    ),
    skill(
        "kontava-workflow-assurance-registry",
        "Kontava Workflow Assurance Registry",
        "Build, update, or audit the Kontava Workflow Assurance check registry. Use when adding check definitions, versioning, deterministic result contracts, source-hash rules, check-run persistence, or release-gate coverage for mission-critical workflow invariants.",
        "Workflow Assurance Registry",
        "Define checks and persisted runs",
        "Use $kontava-workflow-assurance-registry to add or audit Workflow Assurance check definitions and check-run persistence.",
        "Maintain the check definition registry, deterministic result contract, versioning, and check-run persistence.",
        "Use when adding, updating, or auditing Workflow Assurance check definitions or run contracts.",
        "Foundational Hardening Roadmap and all workflow invariant definitions.",
        "Stops assurance checks from becoming undocumented service logic with no history, owner, action route, or evidence contract.",
        SHARED_ANCHORS
        + [
            "prisma/schema.prisma models `WorkflowAssuranceCheckDefinition` and `WorkflowAssuranceCheckRun`",
            "services/assurance/assurance-registry-contracts.ts",
            "services/assurance/assurance-registry.service.ts",
            "actions/assurance/workflow-assurance.actions.ts",
            "services/assurance/__tests__/assurance-registry*.test.ts",
        ],
        [
            "Keep checks observe-mode by default.",
            "Require key, version, owner, severity, execution mode, source tables, action route, permission, source hash, and tests.",
            "Persist every run with deterministic input and output contracts.",
            "Do not create alert fan-out here; emit results that incident/routing skills can consume.",
        ],
        [
            "check definitions",
            "typed check results",
            "source hash/fingerprint rules",
            "run persistence",
            "focused Jest tests",
            "release-gate report",
        ],
        [
            "Every check has key, version, owner, severity, execution mode, source tables, action route, required permission, tests, and observe-mode default.",
            "Release gate can detect missing registry metadata.",
        ],
        ["Orchestrator. Required before all workflow-specific skills."],
        ["Alert fan-out and enforce-mode until incident/routing/release gates are ready."],
    ),
    skill(
        "kontava-workflow-incident-control-plane",
        "Kontava Workflow Incident Control Plane",
        "Implement or audit durable Kontava Workflow Assurance incidents. Use when failed checks need incident upsert/dedupe, lifecycle status, alert delivery history, waivers, assignment, resolution, suppression, reopen rules, audit history, fresh-auth, or maker-checker controls.",
        "Workflow Incident Control Plane",
        "Manage durable assurance incidents",
        "Use $kontava-workflow-incident-control-plane to harden durable incidents, waivers, and audit history for failed checks.",
        "Create and manage durable incidents, status lifecycle, alert delivery rows, waivers, audit history, dedupe, reopen rules, and sensitive transition controls.",
        "Use when failed checks need actionable incident records, waiver handling, assignment, resolution, suppression, or audit proof.",
        "Cross-Cutting Failure Precursors, Diagnosis Playbook, Workflow-To-Notification Contract.",
        "Stops anomalies from being hidden in separate exception queues with no shared lifecycle or manager ownership.",
        SHARED_ANCHORS
        + [
            "`WorkflowAssuranceIncident`, `WorkflowAssuranceIncidentEvent`, `WorkflowAssuranceAlertDelivery`, `WorkflowAssuranceWaiver`",
            "services/assurance/assurance-incident.service.ts",
            "actions/assurance/workflow-assurance-incident.actions.ts",
            "components/assurance/AssuranceIncidentActions.tsx",
            "audit log and fresh-auth/RBAC helpers",
        ],
        [
            "Persist incidents tenant-scoped and source-fingerprint deduped.",
            "Record every status transition as an event.",
            "Require reason, actor, timestamp, evidence references, and source hash for sensitive transitions.",
            "Use maker-checker and fresh-auth for waivers or payment/compliance-sensitive actions.",
        ],
        [
            "incident upsert/dedupe/reopen behavior",
            "alert delivery history",
            "waiver controls",
            "focused tests",
            "saved run report",
        ],
        [
            "Every incident can prove what failed, source hash, evidence grade, who saw it, who acted, what changed, and whether it was resolved, waived, suppressed, or reopened.",
        ],
        ["Workflow assurance registry. Supports notification routing and all domain packs."],
        ["Automatic blocking until false-positive and false-negative fixtures pass."],
    ),
    skill(
        "kontava-workflow-notification-routing",
        "Kontava Workflow Notification Routing",
        "Route Kontava Workflow Assurance incidents to the right role and surface. Use for role-aware alerts, Manager Action Center entries, Kontava Control Tower links, notification copy, proof/action links, dedupe keys, and dashboard color semantics using --dash-success, --dash-gold, --dash-danger, --dash-info, and --dash-brand.",
        "Workflow Notification Routing",
        "Route alerts with dashboard semantics",
        "Use $kontava-workflow-notification-routing to wire incidents into role-aware notifications, Manager Action Center, and Control Tower links.",
        "Route incidents to the right role, Manager Action Center, Control Tower, and notification provider using dashboard color semantics.",
        "Use when turning incidents into manager-actionable workflows, adding direct links, improving notification text, or validating UI color semantics.",
        "Notification And Dialog Color Semantics Audit and Workflow-To-Notification Contract.",
        "Prevents critical anomalies from becoming noisy, ambiguous, or visually disconnected alerts that managers ignore.",
        SHARED_ANCHORS
        + [
            "components/notifications/NotificationSystem.tsx",
            "components/notifications/NotificationProvider.tsx",
            "components/assurance/*",
            "services/manager-action-center/*",
            "components/manager-action-center/*",
            "components/finance/finance-dashboard-theme.ts",
            "app/globals.css",
        ],
        [
            "Severity leads color; category refines icon/copy only.",
            "Map success/resolved to `--dash-success`, warning/aging to `--dash-gold`, danger/blocking to `--dash-danger`, info/queued to `--dash-info`, proof/action to `--dash-brand`.",
            "Every notification needs owner role, safe redacted copy, action route, proof route, and dedupe key.",
            "Keep delivery in-app until in-app routing is proven.",
        ],
        [
            "role-aware routing",
            "safe notification copy",
            "action links",
            "Control Tower summaries",
            "Manager Action Center items",
            "dashboard token usage",
            "tests and smoke report",
        ],
        [
            "Severity leads color.",
            "Every alert has a safe message, owner role, proof/action link, and dedupe key.",
            "Notification/dialog colors blend with system dashboard semantics.",
        ],
        ["Incident control plane. Should run before manager pilot."],
        ["External channels such as SMS, email, WhatsApp, or webhooks until in-app delivery is proven."],
    ),
    skill(
        "kontava-workflow-scheduler-release-gates",
        "Kontava Workflow Scheduler Release Gates",
        "Operationalize Kontava Workflow Assurance checks. Use for scheduler modes, tenant cursors, stale-run detection, engine-health incidents, seeded failure fixtures, release gates, and enforce-mode readiness without enabling enforce-mode by default.",
        "Workflow Scheduler Release Gates",
        "Harden scheduling and release gates",
        "Use $kontava-workflow-scheduler-release-gates to audit scheduler health, stale-run detection, and enforce-mode release gates.",
        "Define scheduler modes, tenant cursors, stale-run detection, engine-health incidents, seeded failure fixtures, release gates, and enforce-mode readiness.",
        "Use when operationalizing checks beyond manual runs, adding scheduled scans, or preparing enforce-mode pilots.",
        "Foundational Hardening Roadmap and Acceptance Criteria For Future Implementation.",
        "Prevents slow, stale, noisy, or untested assurance jobs from giving false confidence.",
        SHARED_ANCHORS
        + [
            "services/assurance/assurance-scheduler.service.ts",
            "services/assurance/assurance-scheduler-contracts.ts",
            "services/assurance/__tests__/assurance-scheduler.service.test.ts",
            "what-next/WORKFLOW_ASSURANCE_RELEASE_GATE_STATIC_REPORT_2026-06-21.md",
        ],
        [
            "Use tenant cursors and leases to avoid cross-tenant or duplicate scans.",
            "Create visible engine-health incidents for stale or failed runs.",
            "Keep checks in observe-mode until release gates prove readiness.",
            "Seed failure fixtures before approving any enforcement pilot.",
        ],
        [
            "scheduler plan",
            "cursor rules",
            "lease/backoff guidance",
            "engine-health checks",
            "release-gate output",
            "tests",
            "saved report",
        ],
        [
            "Release gate blocks enforce-mode when checks lack owner, route, proof/source evidence, source hash, tests, or scheduler health.",
        ],
        ["Registry, incidents, routing."],
        ["Fraud scoring and enforce-mode until seeded tests and live tenant-volume smoke pass."],
    ),
    skill(
        "kontava-pos-sale-truth-assurance",
        "Kontava POS Sale Truth Assurance",
        "Assure POS sale truth for Kontava. Use for POS sale completion, payment, receipt, drawer, stock movement, fiscal document, ledger posting, idempotency, refund, void, and direct corrective workflow links in observe mode.",
        "POS Sale Truth Assurance",
        "Verify sale/payment/stock/ledger truth",
        "Use $kontava-pos-sale-truth-assurance to verify POS sale payment, receipt, stock, fiscal, and ledger proof.",
        "Assure every POS sale has aligned sale, payment, receipt, stock, fiscal, and ledger proof.",
        "Use for POS completion checks, sale finalization hardening, receipt proof, drawer/payment proof, stock movement proof, and journal source-link proof.",
        "Section 1: POS Sale, Payment, Receipt, Stock, And Ledger Posting.",
        "Prevents cash captured without receipt, stock moved without ledger, or revenue posted without payment truth.",
        SHARED_ANCHORS
        + [
            "services/pos/*",
            "POS sale/refund/void services and actions",
            "drawer dashboard services",
            "fiscal document services",
            "inventory movement services",
            "ledger posting batches and source links",
            "app/[locale]/(dashboard)/dashboard/pos",
            "POS tests and offline replay tests",
        ],
        [
            "Start with observe-mode scheduled checks.",
            "Allow synchronous guards only for duplicate tender, closed shift, missing terminal context, and obviously unsafe fiscal delivery.",
            "Classify every completed sale as complete, pending explicit blocker, or incident.",
            "Link incidents to POS sale, receipt/fiscal proof, drawer proof, stock movement, and journal entry routes.",
        ],
        [
            "checks for completed sale payment",
            "receipt delivery state",
            "stock movement proof",
            "posting batch proof",
            "source link proof",
            "idempotency hash checks",
            "focused tests and saved report",
        ],
        [
            "Every completed sale is classified as complete, pending explicit blocker, or incident with direct link to POS/source proof.",
        ],
        ["Registry, incident control plane, ledger gateway, payment reconciliation, fiscal compliance, inventory class 3."],
        ["Full enforce-mode for sale completion until seeded partial-failure tests cover payment, receipt, stock, ledger, refund, and void paths."],
    ),
    skill(
        "kontava-offline-pos-replay-assurance",
        "Kontava Offline POS Replay Assurance",
        "Assure Kontava offline POS sync and replay. Use for offline device trust, hash-chain validation, sequence gaps, replay idempotency, conflict quarantine, provisional receipt blockers, and replay incident routing in observe mode.",
        "Offline POS Replay Assurance",
        "Validate offline sync and replay once",
        "Use $kontava-offline-pos-replay-assurance to verify offline POS envelopes, hash chains, conflicts, and replay idempotency.",
        "Assure offline POS envelopes are device-trusted, hash-chain valid, replayed exactly once, or quarantined with visible conflict proof.",
        "Use for offline device sync, sequence validation, conflict queues, replay adapters, provisional receipt blockers, and replay incident routing.",
        "Section 2: Offline POS Sync And Replay.",
        "Prevents duplicate sales, missing sales, broken branch cash, and untrusted device data.",
        SHARED_ANCHORS
        + [
            "offline device/event/conflict models",
            "services/pos/offline-sync.service.ts",
            "offline replay services",
            "POS sync actions and tests",
            "accountant data-trust blockers",
            "app/[locale]/(dashboard)/dashboard/pos",
        ],
        [
            "Replay must pass through normal POS sale finalization.",
            "Never let offline sync directly mutate ledger, stock, drawer, payment, or fiscal state.",
            "Detect hash-chain breaks, sequence gaps, duplicate replay, conflict quarantine, and pending replay SLA breaches.",
            "Route each conflict to a branch/action route with redacted proof.",
        ],
        [
            "hash-chain checks",
            "sequence-gap checks",
            "duplicate replay checks",
            "pending replay SLA checks",
            "conflict incident links",
            "focused tests and saved report",
        ],
        [
            "Each offline envelope is accepted, replayed exactly once, pending with SLA, or quarantined as an incident.",
        ],
        ["POS sale truth, incident control plane, scheduler."],
        ["Automatic replay enforce-mode until device conflict fixtures and replay idempotency tests pass."],
    ),
    skill(
        "kontava-payment-reconciliation-assurance",
        "Kontava Payment Reconciliation Assurance",
        "Assure Kontava payment reconciliation truth. Use for provider ingestion, bank or mobile-money statement imports, matching, suspense, exceptions, unresolved stale amounts, reconciliation signoff, certificate drift, and finance action links.",
        "Payment Reconciliation Assurance",
        "Verify matched, suspended, or signed cash",
        "Use $kontava-payment-reconciliation-assurance to verify provider ingestion, suspense, exceptions, and reconciliation signoff.",
        "Assure provider ingestion, statement import, matching, suspense, exceptions, and signoff remain explainable.",
        "Use for payment provider reliability, unmatched funds, suspense aging, reconciliation certificate drift, and signed reconciliation checks.",
        "Section 3: Payment Ingestion, Reconciliation, Suspense, And Signoff.",
        "Prevents bank/mobile-money truth from diverging from ledger, customer balances, and supplier balances.",
        SHARED_ANCHORS
        + [
            "provider events",
            "statement imports",
            "reconciliation runs",
            "suspense and exception models",
            "services/reconciliation/*",
            "services/payments/*",
            "app/[locale]/(dashboard)/dashboard/finance/reconciliation",
        ],
        [
            "Every cash movement must be matched, suspended, excepted, or signed.",
            "Unresolved stale amounts become incidents.",
            "Use source hashes for provider payload, statement row, match decision, and signoff certificate.",
            "Link actions to reconciliation workbench, suspense item, provider event, and ledger proof routes.",
        ],
        [
            "unmatched provider event checks",
            "suspense owner checks",
            "exception SLA checks",
            "unsigned reconciliation checks",
            "provider drift checks",
            "certificate stale-hash checks",
            "tests and saved report",
        ],
        [
            "Finance managers can open one route and explain each cash movement state with evidence grade.",
        ],
        ["Ledger gateway, incident control plane, notification routing."],
        ["Provider rail scoring until ingestion and signoff checks are stable."],
    ),
    skill(
        "kontava-purchasing-ap-assurance",
        "Kontava Purchasing AP Assurance",
        "Assure Kontava purchasing and accounts payable evidence chains. Use for PO approval, goods receipt, supplier invoice, AP posting, duplicate invoices, over-receipts, 3-way match checks, ledger proof, and payables action links.",
        "Purchasing AP Assurance",
        "Verify PO-to-AP evidence chain",
        "Use $kontava-purchasing-ap-assurance to verify PO approval, receiving, supplier invoice, AP balance, and ledger proof.",
        "Assure PO approval, receiving, supplier invoice, stock update, AP balance, and ledger posting form one evidence chain.",
        "Use for PO/GRN/invoice matching, AP posting failures, duplicate invoices, over-receipts, and payment allocation proof.",
        "Section 4: Purchasing, Receiving, Supplier Invoice, And AP Posting.",
        "Prevents unreliable inventory value, supplier debt, and expense recognition.",
        SHARED_ANCHORS
        + [
            "purchasing/AP services",
            "PO workflow actions",
            "supplier invoice/payment models",
            "inventory receiving",
            "ledger posting batches",
            "app/[locale]/(dashboard)/dashboard/finance/payables",
            "app/[locale]/(dashboard)/dashboard/purchases/*",
        ],
        [
            "Run observe-mode checks for chain completeness.",
            "Detect duplicate supplier reference, receipt/invoice mismatch, AP posting state, and source-link gaps.",
            "Respect configured tolerances; do not invent strict 3-way matching policy without accounting configuration.",
            "Link actions to PO, receipt, invoice, AP account, supplier, and journal routes.",
        ],
        [
            "3-way match assurance",
            "AP ledger proof",
            "duplicate invoice incidents",
            "partial/over-receipt blockers",
            "tests and saved report",
        ],
        [
            "Every AP obligation is traceable from PO to receipt to invoice to AP balance to ledger proof.",
        ],
        ["Ledger gateway, inventory class 3, supplier bank payment risk."],
        ["Strict 3-way match enforce-mode until line-level tolerances and country/accounting policy are configured."],
    ),
    skill(
        "kontava-supplier-bank-payment-risk-assurance",
        "Kontava Supplier Bank Payment Risk Assurance",
        "Assure Kontava supplier bank-change and payment-release controls. Use for bank approval evidence, maker-checker, same-actor detection, fresh-auth, payment release blockers, suspicious amount checks, and fraud-risk incident routing.",
        "Supplier Payment Risk Assurance",
        "Block risky supplier payment paths",
        "Use $kontava-supplier-bank-payment-risk-assurance to verify supplier bank changes and payment release controls.",
        "Assure supplier bank changes and payment releases cannot bypass evidence, maker-checker, role boundaries, or fraud-risk controls.",
        "Use for supplier bank approvals, payment release blockers, same-actor detection, suspicious amount checks, and recent bank-change risk.",
        "Section 5: Supplier Bank Change And Supplier Payment Release.",
        "Prevents fraud, misdirected payments, and reputational loss.",
        SHARED_ANCHORS
        + [
            "supplier bank change models",
            "supplier payment release services",
            "AP controls",
            "RBAC and fresh-auth helpers",
            "audit logs",
            "payment transactions",
            "app/[locale]/(dashboard)/dashboard/purchases/suppliers",
            "app/[locale]/(dashboard)/dashboard/finance/payables",
        ],
        [
            "Prefer observe-mode, but mark payment release blockers as early enforce-mode candidates only after seeded tests pass.",
            "Detect pending bank change, same-actor release, missing evidence, unusual amount, over-allocation, missing payment transaction, and missing ledger/recon link.",
            "Require role-aware redaction for bank details.",
            "Link actions to supplier, bank-change approval, payment release, AP obligation, and ledger/recon proof.",
        ],
        [
            "bank-change checks",
            "same-actor checks",
            "payment release blocker checks",
            "missing evidence checks",
            "ledger/reconciliation link checks",
            "tests and saved report",
        ],
        [
            "No supplier payment can be released to unresolved bank evidence without a visible incident or approved waiver.",
        ],
        ["Purchasing/AP, incident control plane, RBAC/fresh-auth."],
        ["Advanced supplier dependency/fraud scoring until base bank and payment proof gates pass."],
    ),
    skill(
        "kontava-inventory-class3-assurance",
        "Kontava Inventory Class 3 Assurance",
        "Assure Kontava inventory and OHADA class 3 truth. Use for stock counts, adjustments, write-offs, valuation movements, stock projection drift, high-risk write-offs, class 3 ledger reconciliation, and close blockers.",
        "Inventory Class 3 Assurance",
        "Reconcile stock value and class 3",
        "Use $kontava-inventory-class3-assurance to verify stock counts, adjustments, valuation movements, and class 3 ledger reconciliation.",
        "Assure stock counts, adjustments, write-offs, valuation movements, and class 3 ledger reconciliation remain aligned.",
        "Use for stock projection drift, high-risk write-offs, class 3 reconciliation, stale counts, valuation movement proof, and close blockers.",
        "Section 6: Inventory Count, Adjustment, Write-Off, And Class 3 Reconciliation.",
        "Prevents stock value, gross margin, and OHADA inventory balances from becoming fiction.",
        SHARED_ANCHORS
        + [
            "inventory adjustment/count/write-off services",
            "stock movements and projections",
            "valuation services",
            "class 3 ledger accounts",
            "inventory dashboards",
            "app/[locale]/(dashboard)/dashboard/inventory/movements",
            "close assurance services",
        ],
        [
            "Run scheduled and pre-close checks.",
            "Detect movement evidence gaps, projection drift, write-off maker-checker gaps, valuation movement gaps, and ledger variance.",
            "Use source hashes for count snapshot, adjustment approval, valuation movement, and ledger proof.",
            "Link actions to count, adjustment, write-off, valuation, stock movement, and class 3 ledger routes.",
        ],
        [
            "class 3 reconciliation check",
            "stale count warning",
            "high-risk write-off incident",
            "valuation movement proof",
            "tests and saved report",
        ],
        [
            "Inventory quantity and value are both explainable or explicitly blocked before close.",
        ],
        ["Ledger gateway, close trust pack, POS/purchasing integrations."],
        ["Strict close blocking until class 3 mapping rules and seeded reconciliation fixtures are complete."],
    ),
    skill(
        "kontava-payroll-statutory-assurance",
        "Kontava Payroll Statutory Assurance",
        "Assure Kontava payroll and statutory workflow truth. Use for attendance freeze, payroll run idempotency, posting proof, salary payment evidence, statutory declaration readiness, country-pack provenance, redaction, and payroll close blockers.",
        "Payroll Statutory Assurance",
        "Verify payroll posting and declarations",
        "Use $kontava-payroll-statutory-assurance to verify attendance freeze, payroll posting, payment evidence, and declarations.",
        "Assure attendance freeze, payroll calculation, posting, payment evidence, and declarations remain compliant and reconciled.",
        "Use for payroll run approval, posting failures, payment release proof, statutory declaration readiness, and country-pack drift.",
        "Section 7: Payroll Attendance, Run Posting, Payments, And Declarations.",
        "Prevents employee trust failures, statutory payroll exposure, and inaccurate cash planning.",
        SHARED_ANCHORS
        + [
            "payroll run/payment/declaration models",
            "payroll control service",
            "attendance/presence models",
            "ledger posting batches",
            "payment reconciliation links",
            "country packs",
            "app/[locale]/(dashboard)/dashboard/payroll",
        ],
        [
            "Protect salary/person data through server-side redaction and role boundaries.",
            "Detect frozen attendance hash drift, duplicate payroll run posting, missing ledger proof, missing payment evidence, declaration due-date risk, and country-pack provenance drift.",
            "Link actions to payroll run, attendance freeze, payment proof, declaration, ledger entry, and reconciliation routes.",
        ],
        [
            "frozen attendance hash check",
            "payroll run idempotency check",
            "posting proof",
            "payment evidence",
            "declaration due-date assurance",
            "country-pack provenance drift warning",
            "tests and saved report",
        ],
        [
            "Payroll manager and accountant can explain payroll state without exposing protected salary/payment details to unauthorized roles.",
        ],
        ["Ledger gateway, payment reconciliation, evidence redaction, country-pack/compliance."],
        ["Enforce-mode for declarations until local statutory rules and country-pack expert review are complete."],
    ),
    skill(
        "kontava-fiscal-compliance-outbox-assurance",
        "Kontava Fiscal Compliance Outbox Assurance",
        "Assure Kontava fiscal documents and compliance outbox. Use for fiscal document creation, certification state, legal delivery gating, authority outage vs validation failure, final hash retention, country-pack readiness, and compliance incident routing.",
        "Fiscal Compliance Outbox Assurance",
        "Verify certification and legal delivery",
        "Use $kontava-fiscal-compliance-outbox-assurance to verify fiscal document certification, compliance outbox, and authority evidence.",
        "Assure fiscal documents are created, certified/queued/rejected correctly, legal delivery is gated, and authority evidence is retained.",
        "Use for fiscal document certification, compliance submission outbox, legal receipt delivery, authority outage differentiation, and country-pack readiness.",
        "Section 8: Fiscal Document Creation And Compliance Certification Outbox.",
        "Prevents unsafe legal receipt/invoice delivery and unverifiable statutory compliance.",
        SHARED_ANCHORS
        + [
            "fiscal document models",
            "compliance submissions",
            "compliance services",
            "country-pack metadata",
            "evidence records",
            "outbox",
            "app/[locale]/(dashboard)/dashboard/compliance",
        ],
        [
            "Separate internal validation failure from retryable authority outage.",
            "Never corrupt posted ledger truth when compliance submission fails.",
            "Detect missing fiscal document, uncertified legal delivery, stuck outbox, authority rejection, missing final hash, and stale country-pack provenance.",
            "Link actions to fiscal document, compliance submission, authority evidence, POS/sales source, and ledger proof routes.",
        ],
        [
            "missing fiscal document checks",
            "uncertified legal delivery checks",
            "stuck outbox checks",
            "authority rejection checks",
            "missing final hash checks",
            "country-pack provenance checks",
            "tests and saved report",
        ],
        [
            "Every legal document is certified, safely queued, rejected with evidence, or blocked with a manager-visible incident.",
        ],
        ["Ledger gateway, POS sale truth, notification routing, close trust pack."],
        ["Statutory production claims until country-pack expert validation and provider integration are complete."],
    ),
    skill(
        "kontava-close-trust-pack-assurance",
        "Kontava Close Trust Pack Assurance",
        "Assure Kontava close readiness and accountant trust packs. Use for month-end blockers, unresolved incidents, evidence graph completeness, source-hash drift, stale certified pack invalidation, BI trust downgrades, and accountant handoff proof.",
        "Close Trust Pack Assurance",
        "Verify close pack trust and drift",
        "Use $kontava-close-trust-pack-assurance to verify close readiness, source-hash drift, trust packs, and BI trust gates.",
        "Assure close readiness, accountant trust pack, certified exports, and source-hash drift invalidation remain reliable.",
        "Use for month-end readiness, close blockers, stale evidence, certified pack invalidation, accountant handoff, and BI trust downgrades.",
        "Section 9: Close Assurance, Accountant Trust Pack, And Stale Evidence Invalidation.",
        "Prevents month-end confidence collapse and stale certified reports.",
        SHARED_ANCHORS
        + [
            "close assurance services",
            "close pack certification",
            "accountant portal/trust pack",
            "evidence graph",
            "snapshot services",
            "BI blockers",
            "app/[locale]/(dashboard)/dashboard/accounting/close",
        ],
        [
            "Close certification must depend on unresolved incidents and source hashes.",
            "Certification becomes stale if source evidence changes.",
            "Detect unresolved blockers, missing evidence graph, stale certified pack, changed annex hash, unsigned/reopened incidents, and BI trust downgrade.",
            "Link actions to close checklist, evidence graph, trust pack, domain incident, BI snapshot, and journal proof routes.",
        ],
        [
            "unresolved blocker checks",
            "missing evidence graph checks",
            "stale certified pack checks",
            "changed annex hash checks",
            "unsigned/reopened incident checks",
            "BI trust downgrade checks",
            "tests and saved report",
        ],
        [
            "Close pack can only be treated as trusted when source evidence and domain incidents support it.",
        ],
        ["All domain workflow skills, evidence redaction, scheduler."],
        ["Enforce-mode close block until every high-risk workflow has seeded violation tests."],
    ),
    skill(
        "kontava-ledger-posting-gateway-assurance",
        "Kontava Ledger Posting Gateway Assurance",
        "Assure Kontava accounting posting gateway truth. Use for balanced journals, journal source links, period guards, posting batch state, reversals, failed posting visibility, source hash mismatches, and ledger invariant release gates.",
        "Ledger Posting Gateway Assurance",
        "Verify journals and source-link truth",
        "Use $kontava-ledger-posting-gateway-assurance to verify balanced journals, source links, period guards, and posting batches.",
        "Assure accounting posting gateway, journal source links, period guards, balanced entries, posting batches, reversals, and ledger invariants.",
        "Use for ledger source-link gaps, unbalanced journals, posting failures, closed-period posting attempts, source mismatch, and reversal proof.",
        "Section 10: Accounting Posting Gateway, Journal Source Links, And Ledger Invariants.",
        "Prevents every BI and management number from becoming questionable.",
        SHARED_ANCHORS
        + [
            "`LedgerPostingBatch`",
            "`JournalEntry`",
            "`JournalEntryLine`",
            "`AccountingSourceLink`",
            "accounting posting services",
            "reconciliation services",
            "audit logs",
            "app/[locale]/(dashboard)/dashboard/accounting/journals",
            "app/[locale]/(dashboard)/dashboard/accounting/control-center",
        ],
        [
            "Ledger invariants are the clearest enforce-mode candidates, but only after tests pass.",
            "Detect unbalanced journal entries, missing source links, missing batch journal entries, closed-period posting attempts, failed posting invisibility, source hash mismatch, and missing reversal evidence.",
            "Link actions to posting batch, journal entry, source document, period close, reversal, and Control Tower routes.",
        ],
        [
            "balanced journal checks",
            "source-link checks",
            "posting batch checks",
            "closed-period guard checks",
            "failed posting visibility checks",
            "source hash mismatch checks",
            "reversal evidence checks",
            "tests and saved report",
        ],
        [
            "Every financial mutation is balanced, source-linked, period-valid, auditable, and visible when failed.",
        ],
        ["Registry, incident control plane, notification routing."],
        ["Broad blocking of all posting flows until legacy bypasses and service-boundary gates are clean."],
    ),
]


ORDER = [
    "kontava-workflow-risk-orchestrator",
    "kontava-workflow-assurance-registry",
    "kontava-workflow-incident-control-plane",
    "kontava-workflow-notification-routing",
    "kontava-workflow-scheduler-release-gates",
    "kontava-ledger-posting-gateway-assurance",
    "kontava-payment-reconciliation-assurance",
    "kontava-pos-sale-truth-assurance",
    "kontava-offline-pos-replay-assurance",
    "kontava-purchasing-ap-assurance",
    "kontava-supplier-bank-payment-risk-assurance",
    "kontava-inventory-class3-assurance",
    "kontava-payroll-statutory-assurance",
    "kontava-fiscal-compliance-outbox-assurance",
    "kontava-close-trust-pack-assurance",
]


def yaml_quote(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def bullet(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def numbered(items: list[str]) -> str:
    return "\n".join(f"{i}. `{item}`" for i, item in enumerate(items, start=1))


def skill_body(spec: dict[str, object]) -> str:
    name = str(spec["name"])
    title = str(spec["title"])
    special_suite = name == "kontava-mission-critical-workflow-assurance-suite"
    suite_section = ""
    if special_suite:
        suite_section = f"""
## One-Command Suite Run

When the user invokes `$kontava-mission-critical-workflow-assurance-suite run`, execute a suite pass:

1. Read `{SOURCE_PROPOSAL}` and `{SOURCE_RISK_REPORT}`.
2. Inspect the current assurance foundation reports under `what-next/`.
3. Classify the current phase: readiness, registry, incidents/routing, domain packs, Control Tower/proof trails, or scheduler/release gates.
4. Use this skill order unless the current repo state proves a prerequisite is missing:

{numbered(ORDER)}

5. For each selected specialist skill, open its sibling `SKILL.md` before acting.
6. Stop at the first unsafe prerequisite, missing evidence route, failed verification, or enforce-mode blocker.
7. Save a suite run report under `what-next/`.

The first three skills to run after installation are:

1. `kontava-workflow-risk-orchestrator`
2. `kontava-ledger-posting-gateway-assurance`
3. `kontava-payment-reconciliation-assurance`
"""

    return f"""---
name: {name}
description: {spec["description"]}
---

# {title}

{MARKER}

Default repo root: `E:\\ohada saas\\newStockFlow\\aqstoqflow`. If the current working directory is different, adapt paths to the active AqStoqFlow/Kontava workspace.

## Purpose

{spec["purpose"]}

## Use

{spec["use"]}

## Risk Report Coverage

{spec["risk"]}

## Business Problem Eliminated

{spec["problem"]}
{suite_section}

## Operating Doctrine

{bullet(DOCTRINE)}

## Repo Anchors To Inspect

{bullet(spec["anchors"])} 

## Execution Workflow

1. Confirm whether the user asked for audit/report-only work or implementation.
2. Read the relevant risk report and proposal sections before changing code.
3. Inspect existing Prisma models, services, actions, dashboards, tests, reports, and release gates from the anchors above.
4. Reuse existing services and data sources; do not replace them.
5. Define or verify the invariant, evidence source, owner role, severity, execution mode, action route, and source fingerprint.
6. Keep new or changed checks in observe-mode unless the user explicitly asks for an enforce-mode pilot and all blockers are cleared.
7. Add focused tests and run the narrowest useful verification.
8. Save an implementation or audit report under `what-next/` with what changed, what was verified, what remains deferred, and whether enforce-mode is still blocked.

## Required Implementation Behavior

{bullet(spec["behavior"])}

## Expected Outputs

{bullet(spec["outputs"])}

## Acceptance Criteria

{bullet(spec["acceptance"])}

## Dependencies

{bullet(spec["dependencies"])}

## Deferred Until Later Phases

{bullet(spec["deferred"])}

## Enforce-Mode Blockers

Do not approve enforce-mode unless all are true:

{bullet(ENFORCE_BLOCKERS)}

## Verification

- Run focused unit/service tests for the touched invariant or routing path.
- Run `node scripts/workflow-assurance-release-gate.js` when registry, incidents, scheduler, or enforcement readiness is affected.
- For UI surfaces, run browser smoke on Control Tower, incident detail, Manager Action Center links, proof links, and notification/dialog colors.
- Record skipped verification with the exact reason and risk in the saved report.
"""


def openai_yaml(spec: dict[str, object]) -> str:
    return "\n".join(
        [
            "interface:",
            f"  display_name: {yaml_quote(str(spec['display_name']))}",
            f"  short_description: {yaml_quote(str(spec['short_description']))}",
            f"  default_prompt: {yaml_quote(str(spec['default_prompt']))}",
            "",
            "policy:",
            "  allow_implicit_invocation: true",
            "",
        ]
    )


def ensure_initialized(spec: dict[str, object]) -> tuple[str, str]:
    name = str(spec["name"])
    skill_dir = SKILL_ROOT / name
    if skill_dir.exists():
        skill_file = skill_dir / "SKILL.md"
        if skill_file.exists():
            text = skill_file.read_text(encoding="utf-8")
            if MARKER not in text and "[TODO" not in text:
                return ("skipped-existing", str(skill_dir))
        return ("updated-existing", str(skill_dir))

    subprocess.run(
        [
            sys.executable,
            str(INIT_SKILL),
            name,
            "--path",
            str(SKILL_ROOT),
            "--interface",
            f"display_name={spec['display_name']}",
            "--interface",
            f"short_description={spec['short_description']}",
            "--interface",
            f"default_prompt={spec['default_prompt']}",
        ],
        check=True,
    )
    return ("created", str(skill_dir))


def install_skill(spec: dict[str, object]) -> dict[str, str]:
    name = str(spec["name"])
    status, path = ensure_initialized(spec)
    skill_dir = Path(path)
    if status != "skipped-existing":
        (skill_dir / "SKILL.md").write_text(skill_body(spec), encoding="utf-8")
        agents = skill_dir / "agents"
        agents.mkdir(exist_ok=True)
        (agents / "openai.yaml").write_text(openai_yaml(spec), encoding="utf-8")
    return {"name": name, "status": status, "path": str(skill_dir)}


def validate_skill(path: str) -> tuple[bool, str]:
    try:
        result = subprocess.run(
            [sys.executable, str(VALIDATE_SKILL), path],
            check=False,
            text=True,
            capture_output=True,
        )
    except Exception as exc:  # pragma: no cover - defensive for local env drift.
        return False, f"validator failed to start: {exc}"
    output = (result.stdout + "\n" + result.stderr).strip()
    return result.returncode == 0, output


def write_report(results: list[dict[str, str]], validations: list[dict[str, str]]) -> Path:
    report_path = Path("what-next") / f"KONTAVA_MISSION_CRITICAL_WORKFLOW_ASSURANCE_SKILLS_INSTALL_REPORT_{TODAY}.md"
    created = [r for r in results if r["status"] == "created"]
    updated = [r for r in results if r["status"] == "updated-existing"]
    skipped = [r for r in results if r["status"] == "skipped-existing"]
    failed = [v for v in validations if v["ok"] != "true"]

    lines = [
        "# Kontava Mission-Critical Workflow Assurance Skills Install Report",
        "",
        f"Date: {TODAY}",
        "",
        "Source proposal:",
        f"- `{SOURCE_PROPOSAL}`",
        "",
        "Installed suite entrypoint:",
        "- `$kontava-mission-critical-workflow-assurance-suite`",
        "",
        "One-command run:",
        "- Invoke `$kontava-mission-critical-workflow-assurance-suite run` to coordinate the suite in observe-mode.",
        "",
        "Created skills:",
        *(f"- `{r['name']}` -> `{r['path']}`" for r in created),
        "",
        "Updated existing generated skills:",
        *(f"- `{r['name']}` -> `{r['path']}`" for r in updated),
        "",
        "Skipped pre-existing non-generated skills:",
        *(f"- `{r['name']}` -> `{r['path']}`" for r in skipped),
        "",
        "Recommended first three skills to run:",
        "- `kontava-workflow-risk-orchestrator`",
        "- `kontava-ledger-posting-gateway-assurance`",
        "- `kontava-payment-reconciliation-assurance`",
        "",
        "Install order:",
        *(f"- `{name}`" for name in ["kontava-mission-critical-workflow-assurance-suite", *ORDER]),
        "",
        "Validation summary:",
        *(f"- `{v['name']}`: {v['status']}" for v in validations),
        "",
        "Enforce-mode remains blocked unless all proposal blockers pass:",
        *(f"- {item}" for item in ENFORCE_BLOCKERS),
        "",
        "Notes:",
        "- Skills are installed in `C:\\Users\\J COMPUTER\\.codex\\skills`.",
        "- The suite is intentionally observe-mode first.",
        "- These skills do not replace existing services or data sources.",
        "- Each future skill run must end with focused verification and a saved `what-next/` report.",
    ]
    if failed:
        lines.extend(
            [
                "",
                "Validation issues:",
                *(f"- `{v['name']}`: {v['output']}" for v in failed),
            ]
        )
    report_path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")
    return report_path


def main() -> int:
    if not INIT_SKILL.exists():
        raise SystemExit(f"Missing init_skill.py at {INIT_SKILL}")
    if not VALIDATE_SKILL.exists():
        raise SystemExit(f"Missing quick_validate.py at {VALIDATE_SKILL}")

    results = [install_skill(spec) for spec in SKILLS]
    validations: list[dict[str, str]] = []
    for result in results:
        ok, output = validate_skill(result["path"])
        validations.append(
            {
                "name": result["name"],
                "ok": "true" if ok else "false",
                "status": "passed" if ok else "failed",
                "output": output.replace("\r\n", "\n"),
            }
        )

    report_path = write_report(results, validations)
    print(f"Installed/updated {len(results)} skills.")
    print(f"Report: {report_path}")
    for result in results:
        print(f"{result['status']}: {result['name']} -> {result['path']}")
    failures = [v for v in validations if v["ok"] != "true"]
    if failures:
        print("Validation failures:")
        for failure in failures:
            print(f"- {failure['name']}: {failure['output']}")
        return 1
    print("All validations passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
