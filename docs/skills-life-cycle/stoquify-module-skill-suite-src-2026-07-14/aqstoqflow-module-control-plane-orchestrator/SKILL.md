---
name: aqstoqflow-module-control-plane-orchestrator
description: Orchestrate the complete Stoquify/AqStoqFlow module control-plane program. Use when selecting, sequencing, executing, or certifying module-system work across status evidence, security prerequisites, vocabulary, enforcement truth, registry, entitlements, packages, provisioning, guards, lifecycle, audit, UX, provider reconciliation, pilots, rollout, release gates, and rollback.
---

# AqStoqFlow Module Control Plane Orchestrator

## Purpose

Route the module program through one dependency-ordered lane at a time. Reconcile specialist-agent evidence, dispatch the focused installed skill, verify its exit gate, and preserve a truthful execution register.

The orchestrator coordinates implementation. It does not replace focused skills or mark their work complete without evidence.

## Required Source Order

1. `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
2. `docs/new ideas/STOQUIFY_MODULE_SYSTEM_SKILL_SUITE_BLUEPRINT_2026-07-14.md`
3. `what-next/module-system/skill-suite-manifest.json`
4. `what-next/module-system/execution-status.md`
5. Current module inventory and baseline
6. Current code in `services/modules`, guards, UI, schema, scripts, and focused tests
7. The selected skill and its references

Use current code over older reports. Exclude graph artifacts whose manifest belongs to another checkout.

## Operating Rules

- Start with `aqstoqflow-module-program-status-register`.
- Resolve P0 security blockers before privileged module commands or broad enforcement.
- Keep RBAC, tenant scope, module entitlement, and domain preconditions separate.
- Do not treat sidebar visibility, session claims, registration intent, or provider events as authorization truth.
- Keep broad default behavior in observe or shadow mode until a bounded pilot and release certification pass.
- Require service-owned read models before UI commands.
- Use additive migrations, dry runs, access-delta evidence, and rollback plans.
- Preserve the dirty worktree and ignore unrelated changes.
- Do not commit, push, deploy, reseed, or run destructive migrations through orchestration alone.

## Canonical Stage Order

1. Program status register and live evidence baseline.
2. Security prerequisites.
3. Vocabulary, aliases, dependencies, and module admission semantics.
4. Effective enforcement truth, policy versions, cohorts, and kill switches.
5. Complete surface registry and no-new-gap ratchet.
6. Durable entitlement schema, migration, and effective projection.
7. Versioned package strategy and package/read-model contracts.
8. Internal subscription, provisioning, idempotency, and reconciliation services.
9. Canonical access-decision guards.
10. Append-only audit evidence and governed overrides.
11. Deactivation, retention, reactivation, and leakage prevention.
12. Module Workbench and role-safe UX states.
13. Provider adapter and shadow reconciliation.
14. Bounded enforcement pilot.
15. Repeatable module rollout certification.
16. Continuous release gates, rollback, and final readiness.

The release-gate skill is continuous from Stage 1 even though final certification occurs last.

## Workflow

1. Read the status register and refresh current inventory evidence.
2. Select the earliest incomplete stage whose prerequisites are satisfied.
3. Assign bounded specialist-agent questions only when they can run independently.
4. Create a handoff naming the focused skill, owned paths, invariants, non-goals, commands, artifacts, and rollback boundary.
5. Execute the focused skill.
6. Verify agent and command evidence independently.
7. Update the manifest, status register, stage report, and release evidence.
8. Continue to the next eligible stage or record a concrete blocker.

## Handoff Contract

Every handoff must include:

- stage and focused skill
- confirmed current behavior
- files and services owned by the stage
- prerequisites and invariants
- implementation steps and prohibited shortcuts
- focused tests and policy commands
- output artifacts and exit gate
- rollback or recovery procedure

## Verification Defaults

Run the smallest honest set. Common baseline:

~~~powershell
npm run module:surface:inventory
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "services/modules/__tests__/module-entitlement.service.test.ts"
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "actions/modules/__tests__/module-control.actions.test.ts"
npm test -- --runInBand scripts/__tests__/module-surface-inventory.test.js
~~~

Add type checking, policy gates, migration checks, browser evidence, leakage tests, provider failure tests, and rollback smoke only when the active stage requires them.

## Stop Conditions

Stop the active stage when a prerequisite is missing, tenant safety is unproven, evidence is stale or contradictory, a migration would be destructive without approval, broad enforcement lacks certification, or unrelated failures prevent an honest claim.

## Completion Report

Report the stage, skill, agents used, files changed, commands and results, evidence artifacts, residual risks, rollback state, next stage, and any explicit non-claims.
