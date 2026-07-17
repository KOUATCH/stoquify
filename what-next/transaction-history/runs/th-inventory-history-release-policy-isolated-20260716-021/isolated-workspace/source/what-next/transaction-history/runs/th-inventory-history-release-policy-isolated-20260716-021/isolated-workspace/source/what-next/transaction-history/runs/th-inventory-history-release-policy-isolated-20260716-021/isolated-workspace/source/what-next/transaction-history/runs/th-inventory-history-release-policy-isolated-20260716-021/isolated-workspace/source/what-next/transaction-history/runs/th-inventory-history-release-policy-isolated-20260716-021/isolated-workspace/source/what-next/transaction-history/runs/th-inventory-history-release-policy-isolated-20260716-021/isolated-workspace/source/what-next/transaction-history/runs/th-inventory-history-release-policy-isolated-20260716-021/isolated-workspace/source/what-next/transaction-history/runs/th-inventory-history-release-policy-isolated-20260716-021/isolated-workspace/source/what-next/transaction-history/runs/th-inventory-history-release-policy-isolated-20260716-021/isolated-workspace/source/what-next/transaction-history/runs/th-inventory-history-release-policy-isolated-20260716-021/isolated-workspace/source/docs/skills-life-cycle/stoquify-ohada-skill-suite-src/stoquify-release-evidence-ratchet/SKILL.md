---
name: stoquify-release-evidence-ratchet
description: Produce durable Stoquify release and skill-run evidence. Use after audits, implementations, verification passes, multi-skill runs, release-readiness reviews, or whenever command results, inspected files, blockers, residual risk, and next-skill recommendations must be saved.
---

# Stoquify Release Evidence Ratchet

## Purpose

Turn material Stoquify skill runs into durable evidence: command results, inspected files, changed files, blockers, residual risk, and next recommended skill.

## Required First Reads

1. `package.json`
2. relevant skill run notes or current conversation
3. relevant `what-next/` reports
4. touched files or inspected modules

Read `references/report-template.md` before saving a run report.

## Workflow

1. Identify run mode, primary skill, supporting skills, and scope.
2. Record evidence inspected and commands run.
3. Separate passed, failed, skipped, timed out, and blocked verification.
4. Record changed files only when changes actually occurred.
5. Capture unresolved blockers and residual risk.
6. Recommend the next skill and the smallest useful next slice.
7. Save the report under `what-next/skills-life-cycle/`.

## Guardrails

- Do not claim commands passed if they were not run.
- Do not hide failed or skipped verification.
- Do not include secrets, tokens, provider credentials, or sensitive personal data.
- Do not invent evidence that was not inspected.

## Output Contract

Return saved report path, verification status, key blockers, and next recommended skill.
