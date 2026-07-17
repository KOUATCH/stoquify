---
name: aqstoqflow-module-program-status-register
description: Orchestrate and record the Stoquify/AqStoqFlow module control-plane program. Use when initializing or updating the ordered module skill suite, selecting the next executable stage, reconciling agent evidence, recording stage dependencies and exit gates, or preventing a stage from being marked complete without repository-backed proof.
---

# AqStoqFlow Module Program Status Register

## Purpose

Maintain one truthful execution register for the module control-plane program. Route work to focused skills, preserve dependency order, and make completion depend on evidence rather than narrative confidence.

## Required Sources

Read in this order:

1. `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
2. `docs/new ideas/STOQUIFY_MODULE_SYSTEM_SKILL_SUITE_BLUEPRINT_2026-07-14.md`
3. `what-next/module-system/skill-suite-manifest.json`
4. `what-next/module-system/execution-status.md`
5. `what-next/module-surface-inventory.md` and its JSON companion
6. The focused skill selected for the next stage
7. `references/stage-contract.md`

If an artifact is absent, create it from live evidence before dispatching implementation.

## Operating Rules

- Use only `planned`, `ready`, `in_progress`, `blocked`, or `complete` as stage states.
- Keep at most one implementation stage `in_progress` unless write scopes and dependencies are disjoint.
- Mark a stage `complete` only when every declared exit gate links to current evidence.
- Treat an agent report as advice until verified against repository source or command output.
- Record assumptions, inherited gaps, residual risk, and rollback status explicitly.
- Preserve the dirty worktree and never absorb unrelated changes into a stage report.
- Do not enable enforcement, run destructive migrations, commit, push, or deploy through this skill.

## Workflow

1. Refresh the module surface inventory and repository status without changing runtime behavior.
2. Reconcile installed `aqstoqflow-module-*` skills with the manifest.
3. Verify stage dependencies and promote only the earliest satisfied stage to `ready`.
4. Create a handoff naming the focused skill, owned files, required sources, invariants, commands, artifacts, and rollback boundary.
5. Execute or dispatch the focused stage.
6. Verify returned evidence independently and update the status register.
7. Record the next stage or a concrete blocker with owner and unblock condition.

## Required Artifacts

- `what-next/module-system/skill-suite-manifest.json`
- `what-next/module-system/execution-status.md`
- `what-next/module-system/<stage-number>-<stage-name>-report.md`

## Verification

- Parse the manifest as JSON.
- Confirm every manifest skill exists and validates.
- Confirm every `complete` stage has an existing evidence artifact.
- Confirm no downstream stage is complete while a required dependency is incomplete.
- Run the focused command set named by the active stage.

## Stop Conditions

Stop and record `blocked` when evidence conflicts, a dependency is absent, a command would be destructive without approval, tenant safety cannot be proven, or the requested scope would require unrelated cleanup.

## Completion Report

Report the active stage, evidence added, commands run, pass/fail results, residual risk, rollback state, and next eligible stage.
