Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

# Phase 05: Measurement And Role Validation

## Objective

Determine whether public and authenticated guidance improve comprehension and task access enough to justify continued investment.

## Prerequisites

- Phase 04 pilot security and access gates pass.
- Privacy-approved telemetry is live and quality-monitored.
- Baseline time-to-action and support-volume measures exist.

## Required Skills

- `aqstoqflow-prompt-architect`
- `aqstoqflow-uiux-00-orchestrator`
- `017-aqstoqflow-enterprise-release-gate`

## Measure

1. Public guide views, journey opens, role-lens selection, CTA continuation, and qualified rollout.
2. Authenticated guidance impressions, destination selection, access result, source-action open, and resolution.
3. Event completeness, duplication, delay, and deletion behavior.
4. Median time-to-relevant-action versus the existing Dashboard/Daily Digest baseline.
5. Open-to-resolution rate, repeated weekly use, source freshness, and denial/dead-end rate.
6. Comprehension and task walkthroughs for at least three role families in EN and FR.
7. Navigation-related support volume and qualitative confusion.

## Privacy Boundary

Use only locale, stable journey/destination ID, placement, cohort, and coarse role family. Do not collect raw tenant data, sensitive counts, personal data, financial values, or user-entered text.

## Exit Gate

- Event completeness is at least 95%.
- At least 4 of 5 public participants identify owner, control, evidence, and destination.
- Median time-to-action improves by at least 15%, with a 95% bootstrap interval excluding zero.
- Repeat use exists in at least three role families.
- Security and dead-end thresholds remain perfect.

## Decision

Record one decision: expand, revise and retest, reduce to public only, or retire authenticated guidance.

## Evidence

Save the metric dictionary, privacy approval, query definitions, denominators, intervals, interview synthesis, support review, and decision under:

`what-next/workflow-atlas-transformation-roadmap/phase-05-measurement/`

## Stop Conditions

- Telemetry quality is below 95%.
- Privacy approval is absent or payloads exceed the approved contract.
- The sample cannot support the stated conclusion.

## Non-Goals

No dedicated route decision based on opinion, no new status semantics without service ownership, and no expansion before the evidence review.

