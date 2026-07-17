# Stoquify OHADA SMB Skill Suite Execution Blueprint

Date: 2026-07-11

Source report: `docs/skills-life-cycle/STOQUIFY_OHADA_SMB_SKILLS_AUDIT_REPORT_2026-07-11.md`

Purpose: Transform the proposed Stoquify/OHADA Codex skills into a realistic, professionally structured, executable skill suite with an orchestrator, reusable bundles, validation gates, and an execution sequence that maximizes product, security, accounting, and operational leverage.

## Operating Premise

Stoquify should not receive ten disconnected skills. It should receive a coordinated skill system:

1. One orchestrator skill that decides which skill to run, in what mode, and with which verification gates.
2. Ten domain skills that remain focused, reusable, and independently triggerable.
3. One release/evidence support skill that turns runs into auditable evidence and prevents skill work from becoming undocumented drift.

The suite should be created as source artifacts first, then installed into the local Codex skills folder after approval:

- Source package location: `docs/skills-life-cycle/stoquify-ohada-skill-suite-src/`
- Installed skills location: `C:\Users\J COMPUTER\.codex\skills\`

## Skill Suite Grouping

### Bundle A: Control Plane and Trust Foundations

These skills protect the platform before any domain expansion.

1. `stoquify-ohada-leadership-orchestrator`
   - Type: Orchestrator
   - Mission: Route requests to the right Stoquify skill, enforce evidence-first discovery, preserve service ownership, select verification commands, and save run reports.

2. `stoquify-service-boundary-ratchet`
   - Type: Audit, implementation, verification
   - Mission: Keep business truth owned by services, not pages, client components, actions, or API routes.

3. `stoquify-rbac-tenant-freshauth-enforcer`
   - Type: Audit, implementation, verification
   - Mission: Enforce tenant isolation, RBAC, module entitlement, permission taxonomy, and fresh-auth consistency.

4. `stoquify-public-api-abuse-boundary`
   - Type: Security hardening, public route verification
   - Mission: Harden public/customer/API surfaces against raw-ID access, data leaks, replay, scraping, unsafe errors, and secret exposure.

### Bundle B: Finance Truth and Operational Spine

These skills protect money, inventory, purchasing, payments, POS, and close readiness.

5. `stoquify-ledger-close-truth-guardian`
   - Type: Accounting correctness, close assurance
   - Mission: Ensure economic events reach ledger postings, source links, audit trails, close invalidation, and proof evidence.

6. `stoquify-purchasing-ap-consolidator`
   - Type: Domain implementation, AP controls
   - Mission: Align purchase orders, receipts, supplier invoices, AP controls, stock, approvals, and payment readiness.

7. `stoquify-payment-recon-cash-truth-moat`
   - Type: Reconciliation, provider evidence, close blocker
   - Mission: Make bank, mobile money, cash drawer, POS, suspense, and ledger reconciliation defensible.

8. `stoquify-offline-pos-fiscal-replay-finalizer`
   - Type: Offline/POS hardening
   - Mission: Make offline POS replay-safe without corrupting fiscal numbering, stock, cash, or ledger evidence.

### Bundle C: Statutory, Reporting, and Daily Usefulness

These skills turn correctness into trusted adoption and commercial defensibility.

9. `stoquify-statutory-country-pack-production-gate`
   - Type: Compliance, statutory truth, production-readiness gate
   - Mission: Prevent false production claims for OHADA/SYSCOHADA, tax, payroll, country packs, and fiscal adapters.

10. `stoquify-report-trust-export-certifier`
    - Type: Report trust, export verification
    - Mission: Make reports accountant-grade through provenance, filters, currency, period status, row counts, redaction, and certification state.

11. `stoquify-role-based-operating-cockpit-uiux`
    - Type: UX audit, implementation, verification
    - Mission: Convert enterprise controls into clear daily workspaces for owners, accountants, finance officers, cashiers, managers, warehouse teams, purchasing managers, and POS operators.

### Bundle D: Release Evidence and Skill Governance

12. `stoquify-release-evidence-ratchet`
    - Type: Verification and release evidence
    - Mission: Convert each skill run into saved evidence, command results, unresolved blockers, follow-up tasks, and release-gate status.

This twelfth skill is intentionally added beyond the original ten. The suite needs a lightweight evidence ratchet so good work does not disappear into chat history.

## Orchestrator Design

### Skill Name

`stoquify-ohada-leadership-orchestrator`

### Core Mission

Coordinate the Stoquify skill suite so Codex can move from audit to implementation to verification without losing domain boundaries, service ownership, tenant safety, or accounting evidence.

### Trigger Contexts

Use the orchestrator when the user asks to:

- improve Stoquify toward OHADA SMB operating-system leadership
- run a systematic enterprise-grade audit or hardening pass
- choose which Stoquify skill should execute next
- coordinate multiple Stoquify skills
- turn a report into implementation chunks
- create evidence-backed `what-next/` reports
- verify release readiness after multiple domain changes

### Orchestrator Workflow

1. Classify request mode:
   - Audit only
   - Implementation
   - Verification
   - Skill creation or update
   - Release-readiness synthesis

2. Read the minimum evidence:
   - `docs/skills-life-cycle/STOQUIFY_OHADA_SMB_SKILLS_AUDIT_REPORT_2026-07-11.md`
   - relevant `what-next/` reports
   - `package.json`
   - relevant scripts under `scripts/`
   - focused code paths under `app/`, `actions/`, `services/`, `components/`, `hooks/`, `lib/`, `config/`, `prisma/`, and tests
   - `graphify-out/` only when architecture or dependency analysis is requested

3. Select one primary skill and at most two supporting skills.

4. Build a focused execution plan:
   - scope
   - non-goals
   - evidence to inspect
   - files likely to change
   - verification commands
   - expected artifact path

5. Execute only the selected slice.

6. Save a report when work is more than trivial:
   - recommended path: `what-next/skills-life-cycle/YYYY-MM-DD-<skill-name>-run-report.md`

7. Summarize:
   - what changed or was found
   - verification results
   - blockers
   - next skill to run

### Orchestrator Non-Goals

- Do not run all skills by default.
- Do not broaden scope because a nearby domain looks interesting.
- Do not override skill-specific safety rules.
- Do not make production statutory claims without expert-reviewed evidence.
- Do not install or modify local skills outside the workspace without explicit approval when sandbox permissions require it.

## Standard Skill Structure

Every executable skill should use this shape:

```text
skill-name/
  SKILL.md
  agents/
    openai.yaml
  references/
    evidence-map.md
    verification.md
```

Add `scripts/` only when deterministic evidence collection or validation is repeatedly needed. Do not add README, changelog, installation guide, or unrelated documentation inside the skill folder.

### SKILL.md Contract

Each `SKILL.md` should contain:

1. Minimal YAML frontmatter:
   - `name`
   - `description`

2. Purpose:
   - what the skill does
   - when to use it
   - when not to use it

3. Required first reads:
   - only the few files needed to route the skill
   - references loaded conditionally

4. Workflow:
   - discovery
   - audit or implementation
   - verification
   - report handoff

5. Guardrails:
   - dirty worktree safety
   - tenant/RBAC safety
   - service-boundary safety
   - redaction/privacy
   - accounting/ledger/close safety
   - no broad refactors

6. Output contract:
   - changed files, if any
   - verification commands and results
   - saved report path
   - residual risk
   - next recommended skill

### agents/openai.yaml Contract

Each skill should include:

- `display_name`
- `short_description`
- `default_prompt`

Keep the short description concise enough for Codex UI constraints. Validate manually if generator tooling fails due local Python/YAML environment issues.

## Skill Creation Sequence

### Phase 0: Freeze the Suite Manifest

Create a manifest under:

`docs/skills-life-cycle/stoquify-ohada-skill-suite-src/manifest.md`

The manifest should list:

- skill name
- bundle
- type
- purpose
- trigger examples
- required first reads
- verification commands
- expected report path
- dependency order

Done when the manifest can answer: "Which skill should run for this request, and why?"

### Phase 1: Create the Orchestrator First

Create:

`docs/skills-life-cycle/stoquify-ohada-skill-suite-src/stoquify-ohada-leadership-orchestrator/SKILL.md`

The orchestrator should not implement domain fixes itself. It should route, scope, select evidence, choose commands, and produce run reports.

Done when the orchestrator can route at least these requests:

- "Audit service boundaries for inventory actions."
- "Harden public receipt access."
- "Check if purchasing/AP is finance-grade."
- "Prepare a release evidence summary after a skill run."
- "Improve the owner/accountant daily dashboard without breaking service truth."

### Phase 2: Create Bundle A

Create the three foundation skills:

- `stoquify-service-boundary-ratchet`
- `stoquify-rbac-tenant-freshauth-enforcer`
- `stoquify-public-api-abuse-boundary`

These should be built before finance-domain skills because all later work depends on service ownership, tenant safety, and safe external boundaries.

Done when each skill has:

- clear trigger description
- required first reads
- inspect/modify workflow
- verification commands
- report output contract
- at least one realistic default prompt

### Phase 3: Create Bundle B

Create the finance truth skills:

- `stoquify-ledger-close-truth-guardian`
- `stoquify-purchasing-ap-consolidator`
- `stoquify-payment-recon-cash-truth-moat`
- `stoquify-offline-pos-fiscal-replay-finalizer`

These should encode the operational-to-accounting spine.

Done when each skill explicitly covers:

- service-owned commands
- source evidence
- idempotency
- audit trail
- close invalidation or close blocker behavior where relevant
- focused tests or policy gates

### Phase 4: Create Bundle C

Create:

- `stoquify-statutory-country-pack-production-gate`
- `stoquify-report-trust-export-certifier`
- `stoquify-role-based-operating-cockpit-uiux`

These should protect legal truth, report trust, and user adoption.

Done when:

- unsupported statutory flows remain blocked
- reports carry trust metadata
- UI work stays aligned with the UI constitution and service-owned read models

### Phase 5: Create Bundle D

Create:

- `stoquify-release-evidence-ratchet`

This support skill should standardize saved evidence after any material skill run.

Done when it can turn a run into:

- command summary
- changed files or inspected files
- evidence found
- unresolved blockers
- next skill recommendation
- saved report under `what-next/skills-life-cycle/`

### Phase 6: Install the Skills

Install only after the source package is reviewed.

Target:

`C:\Users\J COMPUTER\.codex\skills\`

Installation should create one folder per skill. If the sandbox requires approval for that path, request it explicitly.

Manual validation should check:

- folder name matches `name`
- frontmatter has only `name` and `description`
- no placeholder text remains
- `agents/openai.yaml` matches `SKILL.md`
- references are linked directly from `SKILL.md`
- descriptions are trigger-rich and not vague

### Phase 7: Forward-Test the Suite

Run a small test matrix:

1. Orchestrator routes a service-boundary request.
2. Orchestrator routes an RBAC request.
3. Orchestrator routes a public receipt request.
4. Orchestrator routes a purchasing/AP request.
5. Orchestrator routes a UI constitution request.

Do not pass expected answers into the test. Pass only the skill path and a realistic user request.

Done when the suite:

- selects the right primary skill
- avoids broad scope
- names the right first evidence
- proposes relevant verification
- saves reports only when appropriate

## First Execution Run

After installation, the first real execution should be:

`stoquify-service-boundary-ratchet` in audit-only mode.

Reason:

This skill protects the core contract that later domain skills rely on. It should produce a narrow map of current service-boundary risk before any new implementation skill starts modifying accounting, purchasing, POS, reconciliation, reporting, or UI.

Recommended first prompt:

```md
Use `stoquify-ohada-leadership-orchestrator` to run `stoquify-service-boundary-ratchet` in audit-only mode against the current Stoquify workspace.

Mission:
Identify the top remaining service-boundary risks that could undermine tenant safety, financial correctness, or operational truth. Do not make code changes.

Required outputs:
- concise risk-ranked findings
- exact files/modules inspected
- existing gates and reports used
- recommended first implementation slice
- verification commands to run before and after that slice
- saved report under `what-next/skills-life-cycle/`
```

## Execution Order for Maximum Results

1. `stoquify-service-boundary-ratchet`
2. `stoquify-rbac-tenant-freshauth-enforcer`
3. `stoquify-public-api-abuse-boundary`
4. `stoquify-ledger-close-truth-guardian`
5. `stoquify-payment-recon-cash-truth-moat`
6. `stoquify-purchasing-ap-consolidator`
7. `stoquify-offline-pos-fiscal-replay-finalizer`
8. `stoquify-statutory-country-pack-production-gate`
9. `stoquify-report-trust-export-certifier`
10. `stoquify-role-based-operating-cockpit-uiux`
11. `stoquify-release-evidence-ratchet`

The orchestrator runs before each item to confirm scope, dependencies, and evidence.

## Maximum-Result Strategy

### Do Not Start With UI

The role cockpit skill should wait until service-owned read models, permissions, report provenance, and daily truth contracts are clear. Otherwise, UI work risks becoming dashboard-only theater.

### Do Not Start With Statutory Expansion

Statutory and country-pack work should follow service-boundary, ledger, report trust, and release evidence work. Otherwise, production claims can outrun the platform evidence.

### Keep Implementation Slices Small

Each skill run should produce one narrow implementation slice:

- one module
- one workflow
- one family of routes/actions
- one verification bundle
- one saved report

### Prefer Evidence Ratchets Over Heroic Refactors

When a domain is broad, first add a scanner, report, or release gate. Then fix the highest-risk slice. This keeps the platform steadily safer without destabilizing unrelated work.

## Suggested Source Package Layout

```text
docs/skills-life-cycle/stoquify-ohada-skill-suite-src/
  manifest.md
  stoquify-ohada-leadership-orchestrator/
    SKILL.md
    agents/openai.yaml
    references/evidence-routing.md
  stoquify-service-boundary-ratchet/
    SKILL.md
    agents/openai.yaml
    references/evidence-map.md
    references/verification.md
  stoquify-rbac-tenant-freshauth-enforcer/
    SKILL.md
    agents/openai.yaml
    references/evidence-map.md
    references/verification.md
  stoquify-public-api-abuse-boundary/
    SKILL.md
    agents/openai.yaml
    references/evidence-map.md
    references/verification.md
  stoquify-ledger-close-truth-guardian/
    SKILL.md
    agents/openai.yaml
    references/evidence-map.md
    references/verification.md
  stoquify-purchasing-ap-consolidator/
    SKILL.md
    agents/openai.yaml
    references/evidence-map.md
    references/verification.md
  stoquify-payment-recon-cash-truth-moat/
    SKILL.md
    agents/openai.yaml
    references/evidence-map.md
    references/verification.md
  stoquify-offline-pos-fiscal-replay-finalizer/
    SKILL.md
    agents/openai.yaml
    references/evidence-map.md
    references/verification.md
  stoquify-statutory-country-pack-production-gate/
    SKILL.md
    agents/openai.yaml
    references/evidence-map.md
    references/verification.md
  stoquify-report-trust-export-certifier/
    SKILL.md
    agents/openai.yaml
    references/evidence-map.md
    references/verification.md
  stoquify-role-based-operating-cockpit-uiux/
    SKILL.md
    agents/openai.yaml
    references/evidence-map.md
    references/verification.md
  stoquify-release-evidence-ratchet/
    SKILL.md
    agents/openai.yaml
    references/report-template.md
```

## Final Recommendation

Create the source package first, then install the skills as a second step.

The first authored skill should be `stoquify-ohada-leadership-orchestrator`, because it prevents the suite from becoming a pile of disconnected prompts. The first executed domain skill should be `stoquify-service-boundary-ratchet`, because service-owned truth is the base layer for security, accounting, operations, reporting, and role UX.
