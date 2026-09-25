---
name: stoquify-prompt-execution-roadmap-publisher
description: Refine a Stoquify prompt with aqstoqflow-prompt-architect, execute it with evidence capture, derive an implementation roadmap, and publish deterministic Markdown/PDF reports under docs/prompt-execution.
---

# Stoquify Prompt Execution Roadmap Publisher

Use this skill when the user wants a Stoquify prompt refined, executed, documented, and converted into a roadmap with Markdown and PDF reports.

## Fixed scope and outputs

Workspace:

`E:\ohada saas\Focused projects\stoquify`

Publication directory:

`docs/prompt-execution/`

The final directory must contain exactly these five report pairs, unless the user explicitly requests additional named artifacts:

- `01_REFINED_PROMPT.md` and `01_REFINED_PROMPT.pdf`
- `02_EXECUTION_REPORT.md` and `02_EXECUTION_REPORT.pdf`
- `03_EXECUTION_FINDINGS_AND_RISKS.md` and `03_EXECUTION_FINDINGS_AND_RISKS.pdf`
- `04_IMPLEMENTATION_ROADMAP.md` and `04_IMPLEMENTATION_ROADMAP.pdf`
- `05_ROADMAP_EXECUTIVE_SUMMARY.md` and `05_ROADMAP_EXECUTIVE_SUMMARY.pdf`

Do not leave intermediate HTML, browser, temporary, or generated image files in `docs/prompt-execution/`.

## Required workflow

### 1. Validate the request

- Identify the raw prompt from the user message or an explicitly supplied file.
- Confirm the current workspace is the Stoquify repository.
- Keep the publication directory fixed at `docs/prompt-execution/`.
- Do not accept an absolute output path or redirect reports outside `docs/prompt-execution/`.
- Preserve unrelated dirty-worktree changes.

### 2. Refine the prompt

Read and follow:

`C:\Users\J COMPUTER\.codex\skills\aqstoqflow-prompt-architect\SKILL.md`

Use that skill as the mandatory first stage. The refined prompt must contain a Stoquify-specific mission, domain, scope, non-goals, evidence inventory, execution tasks, expected artifacts, verification commands, risk controls, and concrete success criteria.

Save the result without inventing repository evidence as:

`docs/prompt-execution/01_REFINED_PROMPT.md`

### 3. Classify execution risk

Before executing the refined prompt, classify it as planning, audit, implementation, migration, external integration, regulated-finance, or destructive work.

Pause for explicit user approval if execution would:

- delete, reset, overwrite, or irreversibly migrate data;
- contact or mutate an external lender, insurer, payment provider, regulator, customer, or production system;
- use secrets, credentials, personal data, payroll data, or sensitive tenant records;
- make live financial, payment, credit, insurance, or production changes.

Read-only repository inspection, local report generation, focused tests, and safe local edits may proceed when directly authorized by the refined prompt.

### 4. Execute with evidence capture

Execute the refined prompt against the repository. Inspect only relevant paths, including:

- `AGENTS.md`, `CLAUDE.md`, `what-next/`, `innovation/`, and `graphify-out/`;
- `app/`, `actions/`, `services/`, `components/`, `hooks/`, `lib/`, `config/`, `prisma/`, and `scripts/`;
- focused tests, migrations, policy gates, and release evidence.

Record actual:

- files inspected and changed;
- commands run and their results;
- tests passed, failed, skipped, timed out, or blocked;
- assumptions and unresolved decisions;
- external dependencies and missing authority;
- evidence freshness and known limitations.

Do not claim execution or implementation success when the refined prompt was only prepared or execution was blocked.

Save as:

`docs/prompt-execution/02_EXECUTION_REPORT.md`

### 5. Generate findings and risks

Derive findings from the execution report, not from assumptions. Separate:

- implemented;
- partial;
- missing;
- risky;
- intentionally deferred;
- blocked.

Cover applicable architecture, data, security, tenancy, RBAC, privacy, UI/UX, accessibility, localization, accounting, reconciliation, compliance, reliability, observability, operations, packaging, and release concerns. Mark immaterial lenses `not applicable` with a reason.

Save as:

`docs/prompt-execution/03_EXECUTION_FINDINGS_AND_RISKS.md`

### 6. Build the implementation roadmap

Create a dependency-ordered roadmap derived from the refined prompt and findings. Every roadmap item must include:

- ID and title;
- objective and target outcome;
- current state;
- priority;
- dependencies;
- impacted repository paths or modules;
- data and migration impact;
- security and control requirements;
- verification commands or tests;
- rollout and release gate;
- owner role;
- blocker or assumption;
- indicative effort;
- definition of done.

Organize work into immediate unblockers, foundations, implementation, verification/hardening, rollout/operations, and deferred scope.

Save as:

`docs/prompt-execution/04_IMPLEMENTATION_ROADMAP.md`

### 7. Create the executive summary

Summarize:

- the original request;
- the refined mission;
- what was executed;
- what changed;
- readiness status;
- top findings and risks;
- dependencies and blockers;
- recommended next action;
- passed, failed, skipped, and blocked verification.

Save as:

`docs/prompt-execution/05_ROADMAP_EXECUTIVE_SUMMARY.md`

### 8. Publish Markdown and PDF pairs

Use the existing report publisher defined by:

`E:\ohada saas\Focused projects\stoquify\.agents\skills\docs-report-publisher\SKILL.md`

From the repository root, run:

```powershell
node .agents/skills/docs-report-publisher/scripts/publish_reports.mjs prompt-execution 01_REFINED_PROMPT.md 02_EXECUTION_REPORT.md 03_EXECUTION_FINDINGS_AND_RISKS.md 04_IMPLEMENTATION_ROADMAP.md 05_ROADMAP_EXECUTIVE_SUMMARY.md
```

If the Markdown files already exist in the destination, use the publisher’s destination-only mode when appropriate. Do not replace the publisher with an ad hoc PDF generator.

### 9. Validate publication

Publication is complete only when:

- the publisher exits successfully;
- all five Markdown files exist under `docs/prompt-execution/`;
- all five same-named PDFs exist and are non-empty;
- no intermediate HTML, browser, or temporary files remain there;
- Markdown sources were not unexpectedly rewritten;
- filenames are deterministic and stable;
- the executive summary accurately reports passed, failed, skipped, and blocked work;
- all output paths remain inside `docs/prompt-execution/`.

Use focused read-only checks such as:

```powershell
Get-ChildItem -LiteralPath 'docs\prompt-execution' -File | Select-Object Name,Length
```

### 10. Validate this skill when creating or updating it

Run:

```powershell
python C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents/skills/stoquify-prompt-execution-roadmap-publisher
```

Fix validation failures and rerun the validator. A dry-run or fixture execution must demonstrate the report pipeline without unauthorized external actions.

## Safety rules

- Do not recursively delete or reset the repository.
- Do not overwrite unrelated user changes.
- Do not make destructive database changes without explicit approval.
- Do not execute external financial, regulatory, payment, lender, insurer, or production actions without authority.
- Do not expose secrets, credentials, personal data, payroll data, provider payloads, or sensitive tenant records.
- Redact sensitive output while preserving evidence needed to support conclusions.
- Do not fabricate evidence, test results, screenshots, approvals, or certifications.
- Do not modify `aqstoqflow-prompt-architect` or `docs-report-publisher`.
- Do not broaden the skill into a generic workflow engine or arbitrary prompt executor.
- Keep business truth server-side and preserve tenant isolation, RBAC, module entitlement, auditability, idempotency, safe errors, and release gates.

## Completion contract

Report the resolved directory:

`docs/prompt-execution/`

List each published Markdown/PDF pair, the skill-validation result, the execution status, and any unresolved blocker. Never report completion unless the five-pair invariant passes.
