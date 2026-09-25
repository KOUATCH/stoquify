# Codebase review — reports and prompts

Published 24 September 2026 to `docs/platform-evaluation/` with the docs-report-publisher skill. This index covers the codebase review conversation and complements the pre-existing platform evaluation [archive index](README.md).

## Reports

| Document | Markdown | PDF |
| --- | --- | --- |
| Original baseline | [baseline.md](baseline.md) | [baseline.pdf](baseline.pdf) |
| Initial rewrite plan | [rewrite-plan.md](rewrite-plan.md) | [rewrite-plan.pdf](rewrite-plan.pdf) |
| Implementation progress | [progress.md](progress.md) | [progress.pdf](progress.pdf) |
| Reviewer coverage and limits | [reviewer-coverage.md](reviewer-coverage.md) | [reviewer-coverage.pdf](reviewer-coverage.pdf) |
| Verification record | [verification.md](verification.md) | [verification.pdf](verification.pdf) |
| Execution report | [final-report.md](final-report.md) | [final-report.pdf](final-report.pdf) |
| Complete execution roadmap | [execution-roadmap.md](execution-roadmap.md) | [execution-roadmap.pdf](execution-roadmap.pdf) |

## Supporting gate reports

| Document | Markdown | PDF |
| --- | --- | --- |
| Workflow runtime check | [runtime-check.md](runtime-check.md) | [runtime-check.pdf](runtime-check.pdf) |
| Service boundary gate | [service-boundary.md](service-boundary.md) | [service-boundary.pdf](service-boundary.pdf) |
| Inventory boundary gate | [inventory-boundary.md](inventory-boundary.md) | [inventory-boundary.pdf](inventory-boundary.pdf) |

## Prompts

| Prompt | Markdown | PDF | Purpose |
| --- | --- | --- | --- |
| Codebase review and rewrite | [codebase-review-rewrite-execution-prompt.md](codebase-review-rewrite-execution-prompt.md) | [codebase-review-rewrite-execution-prompt.pdf](codebase-review-rewrite-execution-prompt.pdf) | Original refined prompt supplied for the implementation run. |
| Execution method design | [codebase-execution-method-prompt.md](codebase-execution-method-prompt.md) | [codebase-execution-method-prompt.pdf](codebase-execution-method-prompt.pdf) | Latest refined prompt for establishing a resumable, evidence-based execution process around the roadmap. |

This index also has a same-named PDF. The pre-existing platform evaluation documents and prompts are listed in [README.md](README.md), with their matching PDF files.

## Reading and use

1. Read the execution report and verification record to understand completed work and limitations.
2. Read the baseline, reviewer coverage, and supporting gate reports for the underlying findings.
3. Use the complete execution roadmap for the remaining stages and acceptance criteria; the initial rewrite plan is retained for traceability.
4. Use the execution-method prompt to establish the detailed operating process before continuing the broad program.

The complete codebase rewrite remains unfinished. Publishing the prompts does not execute them or satisfy their acceptance criteria. The recorded passing tests/typecheck, build timeout, browser unavailability, and inventory findings retain their original dates and verification boundaries. The execution-method prompt is an instruction for future work, not evidence that its requested method/registers have been created.

## Provenance and preservation

The seven primary reports are copied unchanged, with their original basenames, from `what-next/codebase-rewrite/`. The three supporting reports are copied unchanged from `what-next/codebase-rewrite/evidence/`.

The original rewrite prompt is copied byte-for-byte from the user-pasted text attachment and given a descriptive Markdown basename. The execution-method prompt is extracted from the completed assistant response in this task; only the enclosing chat code fence is removed. Prompt instructions and wording are preserved.

Original raw logs, JSON evidence, scripts, and source snapshots remain in [the source evidence directory](../../what-next/codebase-rewrite/evidence/). References to `evidence/` within the copied codebase reports refer to that original directory. Those reports are preserved as written rather than rewritten for publication.

The task-specific publication manifest records provenance, content hashes, and Markdown/PDF pair verification. Existing archive Markdown and evidence are preserved. Intermediate rendering files are kept outside this destination.
