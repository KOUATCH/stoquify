# AqStoqFlow Module System Skill Suite Creation Prompt

Date: 2026-07-12
Workspace: `E:\ohada saas\Focused projects\stoquify`
Primary roadmap: `docs/modules/AQSTOQFLOW_COMPLETE_MODULE_SYSTEM_ENTERPRISE_ROADMAP_2026-07-12.md`
Purpose: refined execution prompt for creating a targeted Codex skill system that can execute the module-system roadmap safely and professionally

## Refined Professional Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Act as a senior enterprise module-system skill architecture team:

- Senior enterprise software architect: preserve module boundaries, service ownership, dependency order, platform modularity, and integration contracts.
- Codex skill architect: design a suite of focused, triggerable, reusable Codex skills with progressive disclosure, concise `SKILL.md` bodies, optional references, clear validation, and no duplicate skill sprawl.
- Cybersecurity and RBAC specialist: ensure every skill preserves tenant isolation, RBAC, module entitlement, fresh auth where relevant, audit trails, redaction, safe errors, and release gates.
- Senior backend engineer: ensure the skill suite can drive durable entitlement schema, module access services, guard wrappers, migration plans, package provisioning, report/export/job leakage prevention, and tests.
- Senior frontend engineer and UI/UX specialist: ensure the skill suite can drive Module Workbench, shell/sidebar states, unavailable states, read-only states, suspended states, dependency-missing states, and owner/admin upgrade flows without treating navigation hiding as security.
- Product strategist and SaaS packaging advisor: ensure the skill suite can convert the roadmap into commercial modules, platform domains, package tiers, add-ons, pricing dependencies, trials, upgrades, suspensions, and read-only retention policies.
- Enterprise release-governance lead: ensure the skill suite creates release gates, ratchets, rollback plans, focused tests, saved evidence reports, and module-by-module enforcement sequencing.

## Mission

Using the roadmap and related module documentation, create or update a system of finely targeted Codex skills that can execute AqStoqFlow's module-system roadmap from observe-mode foundation to a complete modular SaaS control plane.

The skill system must be practical, composable, professional, secure, enterprise-grade, and implementation-ready. It must help future Codex runs execute the roadmap in controlled slices without broad drift, premature hard enforcement, sidebar-only security, or speculative rewrites.

The output should be a skill-suite architecture and, when explicitly approved to install, the actual local skill artifacts under the Codex skills folder.

## Core Source Documents

Inspect these first:

- `docs/modules/AQSTOQFLOW_COMPLETE_MODULE_SYSTEM_ENTERPRISE_ROADMAP_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_CONTROL_PLANE_NEXT_IMPLEMENTATION_PROMPT_2026-07-12.md`
- `docs/modules/README.md`
- `docs/architecture/decisions/0004-kontava-module-vocabulary-and-ownership.md`
- `docs/architecture/decisions/0007-kontava-module-entitlement-observe-mode.md`
- `docs/architecture/decisions/0011-kontava-module-ownership-inventory.md`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`

Inspect these current implementation anchors:

- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `actions/modules/module-control.actions.ts`
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx`
- `services/_shared/protect.ts`
- `lib/security/server-authz.ts`
- `lib/security/auth-session.ts`
- `config/sidebar.ts`
- `components/auth/v2/RegisterV2Form.tsx`
- `services/users/user-identity.service.ts`
- `prisma/schema.prisma`
- `scripts/module-surface-inventory.js`
- `package.json`

Inspect existing installed module-related skills before creating new ones:

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-commercialization-orchestrator`
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-control-center-packages`
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-creation-lifecycle`
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-deactivation-policy`
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-package-read-model`
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-release-gates`
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-surface-inventory-gate`

Reuse or update existing skills when they already match the roadmap lane. Create new skills only when the lane is missing or too materially different.

## Required Skill-System Design

Do not create one giant module-system skill. Build a coordinated skill suite with one orchestrator and narrow execution skills.

### 1. Orchestrator Skill

Recommended name:

`aqstoqflow-module-control-plane-orchestrator`

Purpose:

- Read the roadmap.
- Choose the next safest roadmap lane.
- Route work to the right focused skill.
- Enforce non-goals.
- Keep hard enforcement off unless explicitly approved.
- Require saved reports and verification evidence.
- Prevent duplicate work across skills.

### 2. Vocabulary And Dependency Skill

Recommended name:

`aqstoqflow-module-vocabulary-freeze`

Purpose:

- Reconcile ADR vocabulary with current `COMMERCIAL_MODULE_SLUGS`.
- Classify every slug as sellable, bundle-only, platform domain, support domain, internal control module, or deprecated alias.
- Define dependency semantics: required, recommended, bundled, technical, evidence, read-only, reporting, and write dependency.
- Produce vocabulary and dependency matrix artifacts.

### 3. Entitlement Schema And Migration Skill

Recommended name:

`aqstoqflow-module-entitlement-schema`

Purpose:

- Design additive package, subscription, tenant entitlement, entitlement event, and module surface registry models.
- Preserve `Organization.requestedModules` as onboarding and migration evidence only.
- Plan dry-run and idempotent backfills.
- Keep observe mode.

### 4. Package And Commercialization Skill

Recommended name:

`aqstoqflow-module-package-strategy`

Purpose:

- Translate modules into packages, add-ons, tiers, trials, upgrades, downgrades, read-only retention, and dependency rules.
- Keep platform foundations separate from sellable modules.
- Avoid making billing-provider data direct runtime access truth.

### 5. Surface Registry And Ratchet Skill

Recommended name:

`aqstoqflow-module-surface-registry-ratchet`

Purpose:

- Extend inventory beyond sidebar/pages/actions.
- Register APIs, reports, exports, jobs, webhooks, proof surfaces, BI cards, scheduled processors, public token-bound flows, and navigation.
- Add ratchets that block new unmapped or missing-permission surfaces before broad fail-mode enforcement.

### 6. Guard Contract Skill

Recommended name:

`aqstoqflow-module-access-guard-contract`

Purpose:

- Design and implement the canonical `requireModuleAccess()` contract.
- Wrap pages, actions, APIs, reports, exports, jobs, and webhooks.
- Preserve guard order: session, tenant scope, module entitlement, RBAC, fresh auth, maker-checker, consent, redaction, audit.
- Verify module denial happens before data access.

### 7. Module Workbench UX Skill

Recommended name:

`aqstoqflow-module-workbench-ux-states`

Purpose:

- Upgrade Module Control Center into Module Workbench.
- Define active, trial, trial-expiring, read-only, suspended, expired, unavailable, dependency-missing, upgrade-available, and admin-action-required states.
- Build owner/admin flows and normal-user safe states.
- Ensure sidebar behavior never substitutes for server security.

### 8. Billing And Provisioning Boundary Skill

Recommended name:

`aqstoqflow-module-billing-provisioning-boundary`

Purpose:

- Design provider-independent billing adapters.
- Treat billing webhooks as inputs, not access truth.
- Enforce idempotent provisioning, dunning, suspension, reactivation, manual overrides, and reconciliation evidence.

### 9. Leakage Prevention Skill

Recommended name:

`aqstoqflow-module-leakage-prevention`

Purpose:

- Prevent reports, exports, jobs, webhooks, analytics, and proof surfaces from leaking inactive module data.
- Require source-module access checks, redaction, safe partial states, and tests.

### 10. Pilot Enforcement Skill

Recommended name:

`aqstoqflow-module-enforcement-pilot`

Purpose:

- Choose low-risk enforcement pilots.
- Keep broad enforcement off.
- Require clean inventory, direct URL tests, API/action tests, unavailable UI state, audit evidence, and rollback.
- Move from observe to hard enforcement only when explicitly approved for a bounded slice.

### 11. Release Gates And Rollback Skill

Recommended name:

`aqstoqflow-module-release-gates-and-rollback`

Purpose:

- Add release gates, test matrices, baseline ratchets, rollback flags, and evidence reports.
- Connect module inventory, API guard inventory, report/export leakage gates, job/webhook gates, entitlement migration gates, and session-claim trust gates.

## Required Skill Artifact Standards

For every skill created or updated:

- Use lowercase hyphen-case names.
- Keep `SKILL.md` focused and under 500 lines.
- Put detailed matrices, examples, and long references under `references/`.
- Include `agents/openai.yaml` when installing for local reuse.
- Avoid README, changelog, installation guide, or extra clutter inside skill folders.
- Describe trigger conditions clearly in frontmatter `description`.
- Use imperative workflow steps.
- Include evidence to inspect, outputs, verification commands, risk controls, and non-goals.
- Ensure every skill knows whether it is a report-only, design-only, implementation, or release-gate skill.
- Prefer updating existing related skills over duplicating them.
- Save a suite index mapping roadmap phases to skills.

## Required Suite Index

Create a suite index artifact that maps:

- roadmap phase;
- skill name;
- skill purpose;
- primary source documents;
- source code anchors;
- allowed actions;
- prohibited actions;
- expected artifacts;
- verification commands;
- risk level;
- rollout order.

Recommended output path:

`docs/modules/AQSTOQFLOW_MODULE_SYSTEM_TARGETED_SKILL_SUITE_BLUEPRINT_2026-07-12.md`

If skills are actually installed, also save:

`docs/modules/AQSTOQFLOW_MODULE_SYSTEM_SKILL_SUITE_INSTALLATION_REPORT_2026-07-12.md`

## Execution Checklist

1. Discovery
   - Read the roadmap and source audit.
   - Read the three module ADRs.
   - Read the current module inventory evidence.
   - Inspect current module service, guard, schema, session, sidebar, and control-center files.
   - Inspect existing installed `aqstoqflow-module-*` skills.

2. Gap mapping
   - Map roadmap phases 0-14 to skill lanes.
   - Identify existing skills that should be reused, updated, renamed, or superseded.
   - Identify missing skill lanes.
   - Avoid duplicate skills with overlapping triggers.

3. Skill-suite design
   - Define the orchestrator skill.
   - Define narrow execution skills.
   - Define reference files needed by each skill.
   - Define validation and handoff rules between skills.

4. Artifact creation
   - If the task is planning-only, save the suite blueprint under `docs/modules/`.
   - If the task explicitly approves installation, create or update installed skill folders under `C:\Users\J COMPUTER\.codex\skills`.
   - For each installed skill, add or refresh `SKILL.md` and `agents/openai.yaml`.
   - Keep each skill concise and composable.

5. Validation
   - Validate naming rules, frontmatter, trigger clarity, and duplicate coverage.
   - Run available skill validation scripts if they work in the environment.
   - If validation tooling fails because of local Python/YAML limitations, perform manual validation and report it.
   - Do not treat validator environment failure as a skill design failure.

6. Reporting
   - Save the blueprint or installation report.
   - Include what was created, what was updated, what was intentionally reused, what was deferred, and what should be executed first.

## Verification Commands

Use these as appropriate for the scope:

```powershell
npm run module:surface:inventory
```

For implementation slices that touch module services or guards:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "services/modules/__tests__/module-entitlement.service.test.ts"
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "actions/modules/__tests__/module-control.actions.test.ts"
npm test -- --runInBand scripts/__tests__/module-surface-inventory.test.js
```

For installed skill validation, use the local skill-creator validation scripts when available. If those scripts fail because the bundled runtime lacks dependencies such as `yaml`, manually validate:

- folder name equals skill name;
- `SKILL.md` frontmatter has only `name` and `description`;
- description states when to use the skill;
- no placeholder TODO text remains;
- `agents/openai.yaml` exists when expected;
- resource references are one level deep and actually present;
- no unnecessary README or extra documentation files were created.

## Non-Goals

- Do not enable hard module enforcement.
- Do not create one giant all-purpose skill.
- Do not create duplicate skills when an existing module skill can be updated.
- Do not treat sidebar hiding as security.
- Do not treat `Organization.requestedModules` as durable entitlement truth.
- Do not couple runtime entitlement directly to a billing provider webhook.
- Do not make destructive database or filesystem changes.
- Do not rewrite unrelated module code while designing the skill suite.
- Do not install skills outside the local Codex skills folder unless explicitly requested.

## Risk Controls

- Preserve tenant isolation and organization scoping.
- Keep RBAC and module entitlement distinct.
- Keep observe mode until explicit pilot approval.
- Require audit evidence for entitlement and denial behavior.
- Require redaction for sensitive payroll, finance, compliance, export, and proof surfaces.
- Require rollback planning before any hard-enforcement skill can be executed.
- Keep product packaging separate from internal platform support domains.
- Require source-module access checks for analytics, reports, exports, jobs, webhooks, and proof surfaces.
- Keep skills targeted so one roadmap lane cannot accidentally rewrite another.

## Success Criteria

The refined prompt is successful when a future Codex run can use it to produce:

- a complete module-system skill-suite blueprint;
- an orchestrator skill design;
- focused skill designs for every roadmap lane;
- a reuse/update decision for existing module skills;
- clear install locations and validation rules;
- saved suite index and installation report paths;
- no broad hard enforcement;
- no sidebar-only security assumptions;
- no reliance on `Organization.requestedModules` as durable truth;
- clear first execution order for building the modular SaaS control plane.

The installed skill suite is successful only when:

- every skill is discoverable by name and description;
- each skill has a narrow responsibility;
- each skill points to the right source documents and code anchors;
- each skill defines expected artifacts and verification commands;
- the suite has no conflicting duplicate triggers;
- the orchestrator can route roadmap phases to the right skill;
- validation or manual validation evidence is saved.

## First Execution Order

Execute the skill-system build in this order:

1. Build the suite blueprint and reuse/update matrix.
2. Create or update the orchestrator skill.
3. Create or update vocabulary, entitlement schema, and surface registry skills.
4. Create or update guard contract, workbench UX, billing boundary, leakage prevention, pilot enforcement, and release gate skills.
5. Validate every skill and save the installation report.
6. Use the orchestrator to start Phase 1 only after the suite is complete.

## First Prompt To Run This Suite-Creation Work

Use this exact prompt when ready to create the blueprint and, if approved, install the skill suite:

```md
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, SaaS growth advisor, Codex skill architect, and enterprise release-governance lead.

Using `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_SKILL_SUITE_CREATION_PROMPT_2026-07-12.md` as the instruction source, design the targeted Codex skill system needed to execute `docs/modules/AQSTOQFLOW_COMPLETE_MODULE_SYSTEM_ENTERPRISE_ROADMAP_2026-07-12.md`.

First produce a skill-suite blueprint under `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_TARGETED_SKILL_SUITE_BLUEPRINT_2026-07-12.md`.

Inspect the roadmap, source audit, module ADRs, current module inventory, current module services, guard seams, schema, session claims, sidebar metadata, Module Control Center, and existing installed `aqstoqflow-module-*` skills.

The blueprint must include:

- orchestrator skill design;
- targeted execution skill list;
- reuse/update/create decision for existing skills;
- skill names, trigger descriptions, responsibilities, references, expected artifacts, verification commands, and non-goals;
- roadmap phase to skill mapping;
- first execution order;
- validation plan;
- risks and controls.

Do not install or modify actual local skills until explicitly approved after the blueprint is reviewed.
Do not enable hard enforcement.
Do not treat sidebar hiding as security.
Do not treat `Organization.requestedModules` as durable entitlement truth.
```
