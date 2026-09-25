# Stoquify platform evaluation — archive

Published on 2026-09-24 under docs/platform-evaluation using the docs-report-publisher skill.

This package contains the assessment and prompts produced in this task, plus its verification summary and original machine-readable evidence. Prior repository reports cited by the assessment remain references; they are not republished as newly produced evaluations.

## Published documents

| Document | Markdown | PDF |
| --- | --- | --- |
| Engineering assessment | [Open Markdown](stoquify-engineering-approach-review.md) | [Open PDF](stoquify-engineering-approach-review.pdf) |
| Verification report | [Open Markdown](stoquify-platform-evaluation-verification-report.md) | [Open PDF](stoquify-platform-evaluation-verification-report.pdf) |
| Main execution prompt | [Open Markdown](stoquify-platform-evaluation-execution-prompt.md) | [Open PDF](stoquify-platform-evaluation-execution-prompt.pdf) |
| Offline admission pilot prompt | [Open Markdown](stoquify-offline-admission-pilot-prompt.md) | [Open PDF](stoquify-offline-admission-pilot-prompt.pdf) |
| Pilot evaluation and checks prompt | [Open Markdown](stoquify-pilot-evaluation-and-engineering-checks-prompt.md) | [Open PDF](stoquify-pilot-evaluation-and-engineering-checks-prompt.pdf) |
| Additional execution-method prompt from the shared workspace | [Open Markdown](codebase-execution-method-prompt.md) | [Open PDF](codebase-execution-method-prompt.pdf) |

This index also has a matching README.pdf.

## Reading and execution order

1. Read the engineering assessment and verification report.
2. Use the main execution prompt to repeat or update the assessment against a later working tree.
3. Use the offline admission pilot prompt for the bounded implementation.
4. Use the pilot evaluation prompt to review the result and add justified engineering checks.

Publishing these prompts does not execute their follow-up work.

## Provenance and preservation

The assessment Markdown is copied without changes from what-next/stoquify-engineering-approach-review.md. The main execution prompt is copied from the user-pasted text attachment. The two follow-up prompts are extracted from section 10 of the assessment, with document titles added. The verification report summarizes saved results and does not imply new test runs.

Original JSON/log evidence is retained in evidence/. The publication manifest records source-copy hashes, PDF page counts and the matching Markdown/PDF invariant. Repository source links in the assessment reference the local workspace. Its Mermaid diagram remains Mermaid source in the standard publisher's PDF rendering.

The PDFs are reading copies. Markdown files are the reusable source for prompts and future updates.
