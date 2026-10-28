# Stoquify Codex Maximum-Results Workflow

The best results will not come from putting every command into one giant prompt. Use each control at the stage where it has leverage:

**Durable rules → deep planning → impact analysis → controlled implementation → verification → context compression**

> Important clarification: the current Codex manual does not document `/impact` as a standard slash command. Treat “impact” as an explicit analysis phase inside `/plan`, supported by Stoquify’s existing `graphify-out/` knowledge graphs.

## Recommended Stoquify Workflow

| Stage | Control | Recommended use |
|---|---|---|
| Repository setup | `/init` | Run once only when `AGENTS.md` is missing |
| Discovery | `/permissions` → Read Only | Inspect safely without modifying files |
| Architecture | Reasoning → High/XHigh | Trace financial, tenancy, authorization, ledger, payroll, and compliance effects |
| Planning | `/plan` | Produce an evidence-backed implementation plan |
| Impact analysis | Prompt instruction | Use `graphify-out/`, call paths, schemas, gates, and affected workflows |
| Implementation | `/permissions` → Auto/Workspace | Allow scoped edits and local commands |
| Validation | Targeted tests, then gates | Prove the change before declaring success |
| Review | `/diff`, `/review` | Inspect changes and catch regressions |
| Long sessions | `/compact` | Compress only after completing a coherent phase |

`/init` generates an `AGENTS.md` scaffold. Stoquify already has a repository-level `AGENTS.md`, so refine that file instead of initializing again. Project guidance in `AGENTS.md` persists across tasks, while prompt instructions apply to the current task.

## Refined Master Planning Prompt

Use this prompt in `/plan` mode:

```text
Act as the principal engineer and assurance reviewer for Stoquify, an
enterprise financial and operational platform.

OBJECTIVE
[Describe the exact business or engineering outcome.]

SUCCESS CRITERIA
- [Observable user or system behavior]
- [Required accounting, security, or compliance invariant]
- [Required tests and repository gates]
- No unrelated regressions or speculative features.

OPERATING METHOD

1. Begin with read-only discovery. Do not edit files yet.
2. Read the applicable AGENTS.md instructions and inspect the current Git state.
3. Check for relevant existing implementation before proposing new code.
4. For architecture and impact analysis, inspect the relevant files under
   graphify-out/, including the component, action, route, hook, and type graphs.
5. Trace the complete affected path:
   UI/route → authorization → server action/API → service → database/schema
   → ledger/accounting evidence → audit/release gates.
6. Identify:
   - current behavior and source-of-truth files;
   - affected users, roles, tenants, modules, and workflows;
   - authorization and tenant-isolation boundaries;
   - financial, ledger, reconciliation, payroll, tax, and audit implications;
   - database migrations, backfills, and rollback concerns;
   - failure modes, concurrency risks, idempotency, and data-loss risks;
   - tests, gates, documentation, and generated evidence affected.
7. Surface ambiguity, contradictions, and material tradeoffs. Do not silently
   choose a business rule when alternatives would produce different outcomes.
8. Prefer the smallest coherent implementation. Preserve existing patterns and
   do not refactor unrelated code.
9. Produce an implementation plan containing:
   - evidence-backed diagnosis/current state;
   - assumptions and unresolved decisions;
   - affected files and dependency paths;
   - ordered, independently verifiable implementation steps;
   - test and release-gate matrix;
   - rollback strategy;
   - explicit done conditions.
10. Stop after the plan. Do not implement until I approve it.

STOQUIFY SAFETY RULES
- Never expose or print secrets from .env or credential files.
- Never bypass tenant, role, module-entitlement, approval, audit, or ledger controls.
- Do not invent statutory or country-pack rules.
- Do not mutate financial evidence merely to make a test pass.
- Treat destructive database operations, production migrations, external writes,
  payments, declarations, and releases as approval-required actions.
- Distinguish verified facts from inferences.
```

## Execution Prompt After Plan Approval

Switch out of Plan mode, change permissions to Auto/Workspace, and submit:

```text
Implement the approved Stoquify plan.

Execution constraints:
- Make surgical changes only within the approved scope.
- Preserve unrelated user changes in the working tree.
- Do not expand the feature or refactor adjacent code without reporting why it
  is necessary.
- Re-check authorization, tenant isolation, module entitlement, audit evidence,
  financial invariants, idempotency, and failure behavior while implementing.
- Add or update the minimum tests needed to prove the success criteria.
- Run validation progressively:
  1. directly affected tests;
  2. npm run typecheck;
  3. npm run lint for the affected scope, or the repository lint command;
  4. relevant Stoquify policy/release gates;
  5. npm run verify:repo only when the change and environment justify the full suite.
- If a test fails, determine whether the implementation or the test is wrong.
  Never weaken a control or assertion merely to obtain a passing result.
- Loop until the approved success criteria pass or a genuine external blocker
  is proven.
- Before finishing, inspect the Git diff and report:
  changed files, behavior delivered, validation results, remaining risks,
  assumptions, and anything not verified.
- Do not commit, push, deploy, migrate production data, or perform external
  writes unless explicitly requested.
```

## How to Operate the Controls

For a substantial Stoquify task, begin with:

```text
/permissions
→ Select Read Only

/model
→ Strong coding model, High or XHigh reasoning

/plan [paste the master planning prompt]
```

After reviewing and approving the plan:

```text
/permissions
→ Select Auto or Workspace

[paste the execution prompt]
```

Then:

```text
/diff
/review
```

After completing a major phase:

```text
/compact
```

Continue with this short state-restoration prompt:

```text
Continue from the approved Stoquify plan. Reconfirm the current Git diff,
completed success criteria, remaining steps, and verification status before
making further changes.
```

## Reasoning Strategy

Do not leave maximum reasoning enabled indiscriminately:

- **High/XHigh:** architecture, accounting correctness, security, migrations, concurrency, root-cause debugging, and release decisions.
- **Medium:** implementation once the design is settled.
- **Low:** narrow mechanical changes, formatting, or deterministic scans.
- **Max/Ultra:** reserve for unusually ambiguous cross-system work; it costs more time and context.

Higher reasoning can improve complex work but increases latency and token usage.

## Combined Operating Loop

```text
Read-only + High reasoning + Plan
        ↓
Evidence and impact analysis
        ↓
Human approval
        ↓
Workspace permissions + focused implementation
        ↓
Targeted tests + Stoquify gates
        ↓
Diff/review
        ↓
Compact and continue
```

This keeps deep reasoning where mistakes are expensive, grants write authority only when the scope is understood, and preserves context without allowing an old transcript to overwhelm later decisions.
