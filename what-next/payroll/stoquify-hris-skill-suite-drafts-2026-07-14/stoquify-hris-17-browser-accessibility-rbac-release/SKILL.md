---
name: stoquify-hris-17-browser-accessibility-rbac-release
description: "Validate Stoquify People and Payroll routes with authenticated browser smoke, responsive screenshots, accessibility checks, RBAC negative tests, and release evidence. Use before release certification or after UI route changes."
---

# Stoquify HRIS 17 Browser Accessibility RBAC Release

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Prove the HRIS/payroll experience works in real authenticated browser routes and does not leak by role or viewport.

## Trigger/use cases

Use after People workspace UI is implemented or before release gates.

## Prerequisites

- People routes exist.
- Route access and RBAC contracts exist.
- Seed/auth state available or documented blocker.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- playwright.config.ts
- tests/e2e/payroll-authenticated-smoke.spec.ts
- scripts/payroll-browser-smoke.js
- __tests__/payroll-dashboard-routes.smoke.test.tsx
- what-next/payroll/screenshots/

## Files/surfaces likely touched

- tests/e2e/
- scripts/
- screenshots
- browser evidence reports
- accessibility reports

## What the skill may change

- Add route smoke coverage.
- Add accessibility checks.
- Save screenshot/evidence artifacts.

## What the skill must not change

- Claim browser readiness from component tests only.
- Ignore mobile/tablet overlap or denied-state failures.

## Required tests or gates

- Desktop/tablet/mobile smoke.
- RBAC negative route checks.
- Accessibility checks.
- Visual no-overlap checks.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_BROWSER_ACCESSIBILITY_RBAC_RELEASE_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-18-migration-backfill-pilot`.

## Stop/blocker conditions

Stop with blocker if auth state, seed data, or dev server is unavailable.

## Success criteria

People and payroll routes have current browser, access, and accessibility evidence.

## Execution Workflow

1. Read the governing HRIS analysis, skill-system blueprint, current status register, and the latest report for the active slice.
2. Confirm the prerequisites before making code or report changes.
3. Inspect only the surfaces needed for this skill.
4. Preserve tenant isolation, RBAC, redaction, audit, evidence hashes, and payroll/accounting ownership boundaries.
5. Stop and save a blocker report when a prerequisite or risk control fails.
6. Change only the active slice when implementation is explicitly requested.
7. Run the smallest honest verification gate set.
8. Save the required report and name the next handoff skill.

## Shared Risk Controls

- Do not duplicate employee master truth.
- Do not let payroll invent mutable HRIS facts.
- Do not run payroll from uncertified, stale, or UI-derived HRIS inputs.
- Do not leak salary, identifiers, payment destination data, raw documents, provider payloads, or authority payloads.
- Do not broaden work outside the active slice.
- Do not claim unrestricted production readiness from controlled-pilot evidence.

## Report Contract

Every run must report scope, files inspected, files changed, current blockers, data ownership, tenant/RBAC decision, audit/redaction decision, gates run, skipped checks, residual risk, and next handoff skill.
