# Refined Prompt: Stoquify Prompt Execution Roadmap Publisher

Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Use the installed `aqstoqflow-prompt-architect` skill to refine a raw Stoquify prompt, execute the refined prompt against the repository, capture evidence, derive findings and risks, build a dependency-ordered implementation roadmap, and publish each stage as matching Markdown and PDF files.

## Mission

Create and validate the reusable skill:

`stoquify-prompt-execution-roadmap-publisher`

Store it at:

`E:\ohada saas\Focused projects\stoquify\.agents\skills\stoquify-prompt-execution-roadmap-publisher\SKILL.md`

Use the fixed publication directory:

`docs/prompt-execution/`

## Required report outputs

- `01_REFINED_PROMPT.md` and `.pdf`
- `02_EXECUTION_REPORT.md` and `.pdf`
- `03_EXECUTION_FINDINGS_AND_RISKS.md` and `.pdf`
- `04_IMPLEMENTATION_ROADMAP.md` and `.pdf`
- `05_ROADMAP_EXECUTIVE_SUMMARY.md` and `.pdf`

## Required behavior

1. Use `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-prompt-architect\SKILL.md` as the mandatory refinement stage.
2. Preserve tenant isolation, RBAC, module entitlement, auditability, idempotency, safe errors, privacy and dirty-worktree safety.
3. Classify execution risk before making changes; pause for authority before destructive, external, financial, payment, lender, insurer or production actions.
4. Record actual files, commands, results, tests, changes, assumptions, blockers and evidence freshness.
5. Generate findings from execution evidence and generate the roadmap from those findings.
6. Use `docs-report-publisher` to render PDFs; do not create ad hoc PDF output.
7. Validate that every Markdown file has a same-named, non-empty PDF and that no intermediate HTML/browser files remain in the destination.

## Success criteria

The renamed skill exists, its instructions are executable and safe, the five report pairs are published under `docs/prompt-execution/`, all verification results are honestly reported, and unresolved validator or environment blockers remain visible.
