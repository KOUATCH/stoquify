# AqStoqFlow Module System Skill Suite Install And Orchestrator Pilot Prompt

Date: 2026-07-12
Workspace: `E:\ohada saas\Focused projects\stoquify`
Source prompt: `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_SKILL_SUITE_CREATION_PROMPT_2026-07-12.md`
Primary roadmap: `docs/modules/AQSTOQFLOW_COMPLETE_MODULE_SYSTEM_ENTERPRISE_ROADMAP_2026-07-12.md`
Purpose: refined execution prompt to create, validate, install, and pilot-run the targeted module-system skill suite

## Refined Professional Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Act as a senior enterprise module-system execution and Codex skill architecture team:

- Senior enterprise software architect: preserve AqStoqFlow module boundaries, service ownership, dependency order, platform modularity, and integration contracts.
- Codex skill architect: create a focused, triggerable, reusable Codex skill suite with progressive disclosure, concise `SKILL.md` bodies, useful references, local install metadata, and validation evidence.
- Cybersecurity and RBAC specialist: ensure every skill protects tenant isolation, RBAC, module entitlement, safe errors, redaction, auditability, and release gates.
- Senior backend engineer: ensure the suite can execute durable entitlement schema, migration, module guard, surface registry, report/export/job leakage, billing boundary, and release-gate roadmap slices.
- Senior frontend engineer and UI/UX specialist: ensure the suite can execute Module Workbench, shell/sidebar, unavailable, read-only, suspended, dependency-missing, and owner/admin upgrade-state roadmap slices without treating sidebar hiding as security.
- Product strategist and SaaS packaging advisor: ensure the suite can execute module vocabulary, commercial package, add-on, pricing dependency, trial, upgrade, downgrade, and read-only retention roadmap slices.
- Enterprise release-governance lead: require validation, saved evidence, rollout sequencing, risk controls, and rollback rules before any enforcement pilot.

## Mission

Using `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_SKILL_SUITE_CREATION_PROMPT_2026-07-12.md` and the related module roadmap documents, create, validate, install, and pilot-run the targeted Codex skill system required to execute AqStoqFlow's complete module-system roadmap.

This is no longer blueprint-only. The run must:

1. Inspect the roadmap and related module documentation.
2. Inspect existing installed `aqstoqflow-module-*` skills.
3. Decide which skills to reuse, update, supersede, or create.
4. Create or update the installed local Codex skills.
5. Validate every installed skill manually or with validation scripts.
6. Save a complete installation and validation report.
7. Run the new orchestrator skill as the pilot of the system.
8. Save the orchestrator pilot evidence.

The orchestrator pilot must prove that the skill system can route roadmap work correctly without enabling hard module enforcement or changing application behavior.

## Installation Target

Install or update skills under:

`C:\Users\J COMPUTER\.codex\skills`

If filesystem approval is required to write outside the repo, request it explicitly. Do not install skills into the application repository unless the user specifically asks for repo-local skills.

## Source Documents To Inspect

Read these before installing or updating skills:

- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_SKILL_SUITE_CREATION_PROMPT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_COMPLETE_MODULE_SYSTEM_ENTERPRISE_ROADMAP_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_CONTROL_PLANE_NEXT_IMPLEMENTATION_PROMPT_2026-07-12.md`
- `docs/modules/README.md`
- `docs/architecture/decisions/0004-kontava-module-vocabulary-and-ownership.md`
- `docs/architecture/decisions/0007-kontava-module-entitlement-observe-mode.md`
- `docs/architecture/decisions/0011-kontava-module-ownership-inventory.md`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`

Inspect these implementation anchors:

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

Inspect existing installed module skills before creating new ones:

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-commercialization-orchestrator`
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-control-center-packages`
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-creation-lifecycle`
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-deactivation-policy`
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-package-read-model`
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-release-gates`
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-surface-inventory-gate`

Reuse or update existing skills when they already cover a roadmap lane. Create new skills only when a lane is missing or the existing skill is too materially different.

## Skills To Create Or Update

Install or update this coordinated suite. Keep each skill narrow and composable.

| Skill | Purpose |
|---|---|
| `aqstoqflow-module-control-plane-orchestrator` | Route roadmap phases to the right skill, enforce non-goals, require evidence, and choose safe next slices. |
| `aqstoqflow-module-vocabulary-freeze` | Reconcile module vocabulary, classify commercial vs platform domains, and define dependency semantics. |
| `aqstoqflow-module-entitlement-schema` | Design durable package, subscription, tenant entitlement, entitlement event, and migration/backfill architecture. |
| `aqstoqflow-module-package-strategy` | Convert modules into package tiers, add-ons, pricing dependency rules, trials, upgrades, downgrades, and read-only retention. |
| `aqstoqflow-module-surface-registry-ratchet` | Expand inventory to all surfaces and add baseline ratchets without broad hard enforcement. |
| `aqstoqflow-module-access-guard-contract` | Design and implement the canonical module access guard contract and wrappers. |
| `aqstoqflow-module-workbench-ux-states` | Define and implement Module Workbench and module-aware UX states. |
| `aqstoqflow-module-billing-provisioning-boundary` | Design provider-independent billing and safe provisioning boundaries. |
| `aqstoqflow-module-leakage-prevention` | Prevent reports, exports, jobs, webhooks, analytics, BI, and proof surfaces from leaking inactive module data. |
| `aqstoqflow-module-enforcement-pilot` | Select and run bounded enforcement pilots only after explicit approval and rollback evidence. |
| `aqstoqflow-module-release-gates-and-rollback` | Build module release gates, ratchets, verification matrices, rollback flags, and release evidence. |

If an existing installed skill should be renamed or superseded, do not delete it. Install the new skill, document the relationship, and mark the old skill as reused, superseded, or deferred in the installation report.

## Skill Artifact Requirements

For each installed or updated skill:

- Use lowercase hyphen-case folder names.
- Keep `SKILL.md` under 500 lines.
- Use only `name` and `description` in YAML frontmatter.
- Make the `description` trigger-rich and explicit.
- Put long details in one-level `references/` files.
- Include `agents/openai.yaml` with `display_name`, `short_description`, and `default_prompt`.
- Avoid README, changelog, quick reference, or installation-guide clutter inside skill folders.
- Include evidence to inspect, workflow steps, expected artifacts, verification commands, non-goals, risk controls, and success criteria.
- Preserve observe mode unless a later user explicitly approves a bounded enforcement pilot.
- Require saved evidence reports for implementation or audit runs.

## Required Reports

Save this blueprint and install report:

- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_TARGETED_SKILL_SUITE_BLUEPRINT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_SKILL_SUITE_INSTALLATION_REPORT_2026-07-12.md`

Save the orchestrator pilot report:

- `docs/modules/AQSTOQFLOW_MODULE_CONTROL_PLANE_ORCHESTRATOR_PILOT_RUN_2026-07-12.md`

The installation report must include:

- skills created;
- skills updated;
- existing skills reused;
- existing skills superseded or intentionally left alone;
- validation method and results;
- any validator/tooling blockers;
- manual validation checklist;
- exact install paths;
- first execution order;
- risks and mitigations;
- next recommended roadmap slice.

## Execution Checklist

### Phase 1: Blueprint And Reuse Matrix

1. Read all source documents and implementation anchors.
2. Inspect current installed module-related skills.
3. Build a phase-to-skill map for roadmap phases 0-14.
4. Decide reuse/update/create/supersede for every skill lane.
5. Save `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_TARGETED_SKILL_SUITE_BLUEPRINT_2026-07-12.md`.

### Phase 2: Create Or Update Skills

1. Create or update the orchestrator first.
2. Create or update vocabulary, entitlement schema, package strategy, and surface registry skills.
3. Create or update guard contract, workbench UX, billing boundary, leakage prevention, enforcement pilot, and release gate skills.
4. Keep each skill focused.
5. Use references for long matrices or examples.
6. Preserve existing installed skills unless explicitly superseding them.

### Phase 3: Validate Skills

Use validation scripts when available. If local Python validation fails because of missing dependencies such as `yaml`, perform manual validation and record the failure as an environment limitation, not a skill failure.

Manual validation checklist:

- folder name equals frontmatter `name`;
- frontmatter includes only `name` and `description`;
- description states when to use the skill;
- no placeholder TODO text remains;
- `agents/openai.yaml` exists and matches the skill;
- references are one level deep and referenced from `SKILL.md`;
- no clutter files were created;
- each skill has clear non-goals;
- each skill names verification commands and expected evidence;
- no skill enables hard enforcement by default.

### Phase 4: Run The Orchestrator As Pilot

After installing and validating the suite, run the orchestrator skill as the pilot of the system.

Pilot task:

```md
Use `aqstoqflow-module-control-plane-orchestrator` to inspect the module-system roadmap and installed skill suite, choose the safest first roadmap execution lane, and route it to the correct focused skill. The pilot must remain observe-mode only. It must not enable hard enforcement or change application behavior. It should produce a short execution packet for Phase 1 vocabulary/dependency freeze, including evidence to inspect, expected artifact path, verification commands, non-goals, and handoff to the appropriate skill.
```

Expected pilot output:

- Confirm the orchestrator can read the roadmap.
- Confirm it can identify the correct next lane.
- Confirm it routes Phase 1 to `aqstoqflow-module-vocabulary-freeze`.
- Confirm it refuses broad hard enforcement.
- Save `docs/modules/AQSTOQFLOW_MODULE_CONTROL_PLANE_ORCHESTRATOR_PILOT_RUN_2026-07-12.md`.

The pilot may create a prompt packet or plan for the Phase 1 vocabulary/dependency freeze. It must not implement hard enforcement or alter runtime module behavior.

## Verification Commands

Always run:

```powershell
npm run module:surface:inventory
```

When validating module service or guard-related skills, run:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "services/modules/__tests__/module-entitlement.service.test.ts"
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "actions/modules/__tests__/module-control.actions.test.ts"
npm test -- --runInBand scripts/__tests__/module-surface-inventory.test.js
```

Run broader gates only if code changes touch application behavior:

```powershell
npm run prisma:validate
npm run typecheck
npm run policy:gates
```

If this run only installs skills and saves docs, do not run full release gates unless needed.

## Non-Goals

- Do not enable hard module enforcement.
- Do not change runtime module access behavior.
- Do not treat sidebar hiding as security.
- Do not treat `Organization.requestedModules` as durable entitlement truth.
- Do not directly couple billing-provider webhooks to runtime entitlement access.
- Do not delete existing installed skills.
- Do not create one giant all-purpose skill.
- Do not install duplicate skills when an existing skill can be updated.
- Do not perform destructive filesystem or database actions.
- Do not refactor unrelated application code.
- Do not touch unrelated dirty-worktree changes.

## Risk Controls

- Keep the suite composable: one orchestrator, narrow execution skills.
- Keep hard enforcement gated behind explicit user approval.
- Preserve tenant isolation, RBAC, auditability, redaction, safe errors, and service ownership.
- Keep module entitlement separate from RBAC and billing-provider state.
- Require source-module checks for reports, exports, analytics, jobs, webhooks, and proof surfaces.
- Require rollback evidence before any future enforcement pilot.
- Prefer manual validation over false failure when tooling lacks local dependencies.
- Save all install, validation, and pilot evidence under `docs/modules/`.

## Success Criteria

This execution is successful when:

- The skill-suite blueprint is saved.
- The required local skills are created or updated under `C:\Users\J COMPUTER\.codex\skills`.
- Existing related skills are reused or documented.
- Each installed skill has valid `SKILL.md` frontmatter.
- Each installed skill has `agents/openai.yaml`.
- Each installed skill has clear workflow, evidence, artifacts, verification, non-goals, and risk controls.
- Validation or manual validation is completed and documented.
- `npm run module:surface:inventory` passes.
- The orchestrator pilot runs and saves its pilot report.
- The orchestrator routes the first safe roadmap lane to the vocabulary/dependency skill.
- No hard enforcement is enabled.
- No runtime module behavior is changed unless explicitly approved separately.

## Final Instruction

Proceed end to end: create the blueprint, install or update the skills, validate them, run the orchestrator pilot, run the required verification, and save all reports. Stop only if filesystem approval is denied, a source document is missing, or installing outside the repo is blocked after approval.
