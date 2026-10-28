# AqStoqFlow Module System Targeted Skill Suite Blueprint

Date: 2026-07-12
Workspace: `E:\ohada saas\Focused projects\stoquify`
Run scope: focused orchestrator install and pilot

## Executive Decision

This run installs the missing control-plane orchestrator skill first, then uses it as the pilot for the module-system skill suite. The remaining focused skills are intentionally not installed in this pass because the user asked specifically to create, validate, install, and run the orchestrator skill.

The orchestrator must not implement roadmap work directly. Its job is to route the next safe roadmap lane, enforce non-goals, require evidence, and produce handoff packets for focused skills.

## Source Evidence

- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_SKILL_SUITE_INSTALL_AND_ORCHESTRATOR_PILOT_PROMPT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_SKILL_SUITE_CREATION_PROMPT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_COMPLETE_MODULE_SYSTEM_ENTERPRISE_ROADMAP_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- Existing installed skills under `C:\Users\J COMPUTER\.codex\skills`

## Installed Skill For This Pass

| Skill | Decision | Install path | Purpose |
|---|---|---|---|
| `aqstoqflow-module-control-plane-orchestrator` | Created | `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-module-control-plane-orchestrator` | Route module-control-plane roadmap work to safe lanes and focused skills. |

## Existing Skills Reused Or Recognized

| Existing skill | Decision | Notes |
|---|---|---|
| `aqstoqflow-module-commercialization-orchestrator` | Reuse for commercialization-only coordination | Existing skill has broad commercialization scope and placeholder source context; the new orchestrator is control-plane specific. |
| `aqstoqflow-module-control-center-packages` | Reuse later | Useful for package/control-center lanes. |
| `aqstoqflow-module-creation-lifecycle` | Reuse later | Useful for module lifecycle work. |
| `aqstoqflow-module-deactivation-policy` | Reuse later | Useful for read-only, deactivation, and historical data policy. |
| `aqstoqflow-module-package-read-model` | Reuse later | Useful after package/entitlement schema lanes mature. |
| `aqstoqflow-module-release-gates` | Reuse later | Useful for release-gate and ratchet work. |
| `aqstoqflow-module-surface-inventory-gate` | Reuse now/later | Existing report-mode inventory gate aligns with baseline and surface registry work. |

## Downstream Skills Still To Install

The orchestrator may route to these skill names. They are deliberately deferred until the next suite-installation slice:

- `aqstoqflow-module-vocabulary-freeze`
- `aqstoqflow-module-entitlement-schema`
- `aqstoqflow-module-package-strategy`
- `aqstoqflow-module-surface-registry-ratchet`
- `aqstoqflow-module-access-guard-contract`
- `aqstoqflow-module-workbench-ux-states`
- `aqstoqflow-module-billing-provisioning-boundary`
- `aqstoqflow-module-leakage-prevention`
- `aqstoqflow-module-enforcement-pilot`
- `aqstoqflow-module-release-gates-and-rollback`

## Roadmap Phase Routing

| Roadmap phase | Default lane | Orchestrator decision |
|---|---|---|
| Phase 0 | Evidence baseline | Use current `module:surface:inventory` output. |
| Phase 1 | Vocabulary and dependency freeze | First safe execution lane. Route to `aqstoqflow-module-vocabulary-freeze`. |
| Phase 2 | Commercial vs platform classification | Follow vocabulary freeze. |
| Phase 3 | Durable entitlement schema | Follow vocabulary/dependency classification. |
| Phase 4 | Requested modules migration | Follow entitlement schema design. |
| Phase 5 | Package pricing and dependency model | Follow commercial classification. |
| Phase 6 | Central access guard contract | Follow entitlement decision model. |
| Phase 7 | Full surface registry | Follow inventory baseline and vocabulary. |
| Phase 8 | Module-aware shell and UX states | Follow service-owned state contract. |
| Phase 9 | Audit/evidence model | Follow entitlement schema and guard contract. |
| Phase 10 | Billing boundary | Follow package/subscription design. |
| Phase 11 | Report/export/job/webhook leakage | Before any enforcement rollout. |
| Phase 12 | Pilot enforcement | Only after explicit approval and rollback evidence. |
| Phase 13 | Module-by-module enforcement | Deferred. |
| Phase 14 | Release gates and rollback | Build gradually from report-mode ratchets. |

## First Safe Pilot Lane

The orchestrator selected Phase 1: canonical module vocabulary and dependency freeze.

Reasons:

- The roadmap says vocabulary and dependency semantics must be frozen before schema, guard, UX, billing, or enforcement work.
- Current inventory remains report-only and shows 34 unmapped and 16 missing-permission findings.
- Broad hard enforcement is not eligible.
- The downstream vocabulary skill is not installed yet, so the pilot produces a handoff packet rather than implementation.

## Non-Goals Preserved

- No hard enforcement enabled.
- No runtime module behavior changed.
- No sidebar hiding treated as security.
- `Organization.requestedModules` remains onboarding and migration evidence only.
- No unrelated application code refactored.

## Addendum: Downstream Skills Installed

After the initial orchestrator pilot, the remaining downstream skills listed above were installed and validated under `C:\Users\J COMPUTER\.codex\skills` on 2026-07-12. See `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_SKILL_SUITE_INSTALLATION_REPORT_2026-07-12.md` for the full validation evidence.
