---
name: stoquify-transaction-history-00-orchestrator
description: Coordinate Stoquify transaction-history delivery across foundation/inventory, cash/payment, and AP/AR slices. Use when Codex must create or resume an audit, implementation, or verification run; enforce stage dependencies and edit ownership; detect overlapping dirty files; invalidate stale downstream evidence; block immature AR work; or produce evidence-backed run artifacts without implementing product code.
---

# Stoquify Transaction History Orchestrator

## Mission

Coordinate the role-specific transaction-history skills. Maintain durable run state, select the next eligible stage, validate evidence, and stop unsafe advancement. Never implement or repair product code.

## Required reads

Read:

1. `docs/new ideas/STOQUIFY_TRANSACTION_HISTORY_ANALYTICS_AND_SECURITY_PROPOSAL_2026-07-14.md`
2. `docs/skills-life-cycle/stoquify-transaction-history-skill-suite-src/manifest.md`
3. `references/run-manifest.schema.json`
4. `references/stage-evidence.schema.json`
5. Exactly one slice reference matching the run

Read `AGENTS.md` and current Git status before dispatching any stage. Treat graph output as supporting evidence only when its age and source path are recorded.

## Modes

- `audit`: inspect and write runtime evidence only.
- `implement`: dispatch implementation to the eligible role skill; Stage 00 still writes runtime evidence only.
- `verify`: run review and verification without silently repairing production code.

Reject any other mode.

## Workflow

1. Create or load `what-next/transaction-history/runs/<run-id>/run-manifest.json`.
2. Validate the manifest and existing stage evidence with `scripts/validate-run-artifacts.mjs`.
3. Capture dirty paths. Exclude this run's artifact root, then compare remaining paths with the next stage's exact allowlist.
4. Run `scripts/select-next-stage.mjs` with current input fingerprints and dirty paths.
5. Stop on overlap, malformed evidence, unresolved dependency, fingerprint conflict, or a blocking slice gate.
6. Dispatch only the selected skill and real agent type. Pass the run manifest, upstream evidence paths, active lanes, exact allowlist, and required output schema. Never pass another agent's credentials or system prompt.
7. Require a schema-valid stage JSON artifact and concise Markdown report under `what-next/transaction-history/runs/<run-id>/slices/<slice-id>/`; promoted stage evidence at the run root is invalid.
8. Revalidate artifacts. Promote a stage to `PASS` only when its evidence and verification support the claim.
9. On input fingerprint drift, mark that stage and all transitive dependants `STALE`; resume from the earliest stale stage.
10. Append one structured span per dispatch to `trace.jsonl` and atomically update `run-state.json`.

## Stage graph

Use this order:

```text
01 -> 02 -> 04 -> 05 -> 06 -> 07
  \-> 03 -/               \-----/
```

Stages 02 and 03 both depend on 01. Stage 04 requires both. Stage 07 requires 02 through 06 according to the manifest graph.

## Dirty-worktree rule

Preserve all unrelated edits. Continue when dirty paths do not overlap the selected stage allowlist. Stop before dispatch when any dirty path matches an allowed file or directory for that stage. Record exact conflicts; never revert, stash, or overwrite them.

## AR gate

For the `ap-ar` slice, permit stages 01 through 03 to assess prerequisites. Before stage 04, remove lane `ar` unless `gates.arAccountingPrerequisites.status` is `PASS` with evidence paths. Continue AP-only when lane `ap` remains. Stop an AR-only run with a structured blocker.

## Failure handling

- Retry one malformed or timed-out agent result with unchanged inputs and a narrower prompt.
- After the retry, save a degraded `BLOCKED` artifact and stop dependants.
- On security/accounting contradiction, record `CONFLICT` in run state and block stages 04 through 07.
- Never truncate required manifest or evidence fields. Stop if required context cannot be preserved.

## Prohibitions

- Do not edit `app/`, `actions/`, `components/`, `config/`, `hooks/`, `lib/`, `prisma/`, `services/`, product tests, or product scripts.
- Do not install skills, deploy migrations, publish, or invoke external side effects.
- Do not infer completion from chat history or a Markdown report alone.
- Do not describe SHA-256 checksums as authenticity or non-repudiation proof.

## Handoff

Return the run ID, slice, mode, selected/completed stage, active and blocked lanes, dirty-file decision, stale stages, validation commands/results, artifact paths, blockers, and next eligible stage.
