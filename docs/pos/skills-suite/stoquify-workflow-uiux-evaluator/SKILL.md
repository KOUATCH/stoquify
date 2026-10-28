---
name: stoquify-workflow-uiux-evaluator
description: "Evaluate any Stoquify workflow, route, page, dashboard, form, or UI component using coordinated specialist agents, repository and browser evidence, scored UX and control dimensions, and a prioritized 9+ roadmap. Use for comprehensive UI/UX audits, workflow reviews, operational readiness assessments, competitive evaluations, or implementation-planning reports without changing product code unless explicitly requested."
---

# Stoquify Workflow and UI/UX Evaluator

## Mission

Produce an evidence-led current-state evaluation and practical 9+/10 roadmap for one clearly bounded workflow or interface surface. Balance usability and visual quality with business truth, authorization, resilience, accessibility, performance, and release safety.

Default to evaluation and documentation only. Do not change product code unless the user explicitly requests implementation.

## Inputs

Resolve or ask for only the inputs that materially affect the result:

- Target workflow, route, page, dashboard, form, or component
- Primary personas and permissions
- Evaluation-only or implementation scope
- Expected report location and date
- Browser, credentials, representative data, and hardware availability
- Domain-specific invariants such as money, stock, payroll, identity, or compliance

When the target is discoverable from the repository, inspect it instead of stopping for clarification.

## Required Reference

Read [evaluation-framework.md](references/evaluation-framework.md) after identifying the target. Select only the relevant optional dimensions; do not force marketing, financial, offline, or hardware criteria onto unrelated surfaces.

## Workflow

### 1. Establish safety and scope

1. Inspect `AGENTS.md` and applicable repository instructions.
2. Inspect `git status` and preserve all unrelated changes.
3. State the target, personas, success criteria, non-goals, and evidence limitations.
4. For architecture or impact analysis, inspect current `graphify-out/` artifacts and verify graph freshness against source.
5. Identify the smallest useful verification set.

### 2. Build the evidence map

Trace the target from entry route to components, hooks, actions, services, persistence, authorization, and downstream side effects. Inspect relevant tests, messages, styles, readiness reports, runbooks, and prior audits.

Label every material claim as one of:

- Code-confirmed
- Test-confirmed
- Browser-observed
- Report-derived
- Externally sourced
- Inference
- Untested gap

Never equate documented, implemented, tested, passing, and browser-observed states.

### 3. Coordinate specialist reviews

When agents are available and the scope merits parallel review, assign bounded read-only lenses. Use only relevant roles:

- Workflow and persona UX
- Frontend, design system, accessibility, responsiveness, and performance
- Business logic and domain invariants
- Security, RBAC, privacy, and tenant isolation
- Reliability, offline behavior, conflicts, and recovery
- Product, localization, and market fit
- Test, evidence, and release readiness

Give each agent explicit file or responsibility ownership. Tell agents they are not alone in the repository, must not edit files, and must return exact evidence paths. The lead agent deduplicates findings and resolves conflicts.

### 4. Observe the real interface

When a runnable environment and authorization are available:

1. Exercise happy paths and high-risk failure paths.
2. Capture desktop, tablet, and narrow screenshots where relevant.
3. Check keyboard and focus behavior.
4. Record persona, permission, viewport, locale, data state, and exact steps.
5. Inspect loading, empty, error, denied, stale, partial, conflict, and recovery states.

If browser access, credentials, representative data, or hardware is unavailable, record the limitation. Do not fabricate observations.

### 5. Benchmark carefully

Use current primary sources for external comparisons. Select products comparable to the target job, not merely popular brands. Cite each feature claim and extract principles rather than copying designs.

Skip external benchmarking when it adds little value or the user prohibits web research.

### 6. Score the current state

Use the core and selected optional dimensions in the framework. For every score provide:

- Current score from 0-10
- Evidence and confidence: High, Medium, or Low
- Main gap
- 9+ target condition
- Required improvement
- Verification needed to award 9+

Do not average away a critical safety defect. A severe authorization, data-integrity, accessibility, or recovery failure can cap the overall score.

### 7. Produce the roadmap

Prioritize recommendations as:

- P0: correctness, security, data loss, blocked core journeys, and release blockers
- P1: primary-task efficiency, recovery, accessibility, and workflow clarity
- P2: differentiation, management visibility, localization, and experience depth
- P3: optional experiments and future optimization

For each item include problem, evidence, impact, effort, dependencies, owner, likely boundaries, risks, acceptance criteria, verification, and containment or rollback where relevant.

### 8. Write and validate the report

Follow the report contract in the framework. Save only requested documentation artifacts. If PDF is requested, generate it from the final Markdown and visually inspect representative pages.

Run the smallest relevant validation set. Record commands, results, skipped checks, and blockers. Do not stage or commit unless explicitly requested.

## Stop Conditions

Stop and report a blocker when:

- The target cannot be identified safely.
- Required authorization or representative data is unavailable and source inspection cannot answer the central question.
- Existing dirty changes overlap the requested documentation output and cannot be preserved.
- A requested claim would require inventing compliance, customer proof, hardware support, or production behavior.
- Evaluation requires a state-changing production action that the user did not authorize.

## Completion Contract

The evaluation is complete only when:

- Scope and personas are explicit.
- Important dependencies and trust boundaries are mapped.
- Material findings have exact evidence or an uncertainty label.
- Happy paths, failure states, and recovery are addressed.
- Scores include confidence and objective 9+ conditions.
- P0-P3 recommendations are implementation-ready.
- Release gates and no-go conditions are explicit.
- Unrelated working-tree changes remain untouched.

