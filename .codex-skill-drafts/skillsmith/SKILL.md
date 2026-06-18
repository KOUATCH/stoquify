---
name: skillsmith
description: Use when creating, refactoring, compiling, slimming, sequencing, or auditing Codex skill suites so large skills become boundary-guided, reusable, low-overlap, and easier to execute. Especially useful for AqStoqFlow/OHADA numbered skills, graph-grounded skill orchestration, anti-pattern capture, skill splitting/merging, and reducing repeated prompt reasoning.
---

# SkillSmith

SkillSmith is a Codex-native adaptation of the SkillSmith research pattern: turn broad skill instructions into smaller runtime boundaries, track how skills complement or conflict with each other, and preserve known mistakes as anti-patterns so the agent does not repeat them.

This is not the external Aeloon agent framework. Use this skill inside Codex to improve local skills and skill suites.

## Required Context

Before acting, inspect the relevant skill files and project artifacts:

- The target skill or suite directory under `C:\Users\J COMPUTER\.codex\skills\`
- Any matching draft under `.codex-skill-drafts/`
- Project blueprints under `what-next/`
- `graphify-out/GRAPH_REPORT.md` when the skill concerns architecture or implementation sequencing
- Existing installed companion skills that overlap the target workflow
- This skill's references and templates:
  - `references/skillsmith-method.md`
  - `templates/runtime-boundary-card.md`
  - `templates/anti-pattern-register.md`

## When To Use

Use this skill when:

- A skill has grown too long or too general.
- A suite needs clear execution order and gates.
- Multiple skills overlap, conflict, or repeat instructions.
- A workflow keeps failing in the same way.
- The agent loads too much context for a small task.
- A domain skill should expose only the relevant runtime slice instead of its whole design history.
- You need to convert a roadmap or blueprint into durable Codex skills.

## Core Method

1. Inventory the skills.
   - List each skill name, trigger, purpose, required inputs, tools, references, and outputs.

2. Extract runtime boundaries.
   - For each skill, identify what it must decide, what it must read, what it may edit, what tools it may use, and when it must stop.

3. Detect interactions.
   - Mark complementarity, overlap, conflict, dependency, and retirement candidates.

4. Compile the useful interface.
   - Move long rationale into references.
   - Keep `SKILL.md` focused on triggers, rules, execution loop, stop conditions, and output contract.
   - Add runtime boundary cards when a suite has multiple modes.

5. Capture anti-patterns.
   - Record repeated failure signatures, root cause, veto rule, and repair pattern.

6. Mutate the suite carefully.
   - Split skills that carry unrelated workflows.
   - Merge skills only when the user explicitly wants one canonical skill or when overlap creates real execution risk.
   - Retire skills only after confirming a replacement.
   - Add scripts only when they remove real manual repetition.

7. Verify.
   - Confirm frontmatter has `name` and `description`.
   - Confirm folder name matches the skill name.
   - Confirm referenced files exist.
   - Confirm no placeholders remain.
   - Confirm the suite order and stop conditions are explicit.

## AqStoqFlow Use

For AqStoqFlow, apply SkillSmith to the numbered suite:

- `00-aqstoqflow-execution-suite`
- `01-aqstoqflow-program-orchestrator`
- `02-aqstoqflow-control-plane`
- `03-aqstoqflow-error-notification-foundation`
- `04-aqstoqflow-business-event-gateway`
- `05-aqstoqflow-accounting-control-center`
- `06-aqstoqflow-country-pack-factory`
- `07-aqstoqflow-pos-ledger-controls`
- `08-aqstoqflow-compliance-center`
- `09-aqstoqflow-payment-reconciliation-moat`
- `10-aqstoqflow-inventory-valuation-kernel`
- `11-aqstoqflow-purchasing-ap-controls`
- `12-aqstoqflow-payroll-presence-engine`
- `13-aqstoqflow-data-trust-accountant-portal`
- `14-aqstoqflow-offline-pos-sync`
- `15-aqstoqflow-country-adapter-pilot`
- `16-aqstoqflow-ai-copilot-guardrails`
- `17-aqstoqflow-enterprise-release-gate`

The aim is to prevent the suite from becoming one giant prompt. Each skill should have a narrow execution surface, while `00` decides which skill is relevant.

## Output Contract

When using this skill, produce a concise SkillSmith report:

- Target skill or suite
- Current pain or risk
- Runtime boundaries extracted
- Overlaps or conflicts found
- Anti-patterns added
- Changes made or proposed
- Verification result
- Next improvement

