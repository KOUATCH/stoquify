---
name: aqstoqflow-module-rollout-certification
description: Certify repeatable module-by-module rollout in Stoquify/AqStoqFlow after a bounded enforcement pilot. Use when graduating a specific module or cohort from observe to pilot or enforce, proving complete surface coverage, tenant safety, leakage controls, unavailable states, support readiness, failure budgets, rollback, and post-release monitoring.
---

# AqStoqFlow Module Rollout Certification

## Governing Evidence

Read `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md` first, then reverify its findings against current code and generated evidence.

## Purpose

Turn a successful one-off pilot into a repeatable graduation process for each module. Issue certification only for a named module, policy version, cohort, and release window.

## Prerequisites

- Security P0 gates are closed.
- Enforcement truth and surface registry are current.
- Durable entitlement, access-decision, lifecycle, audit, and leakage controls exist.
- The bounded enforcement pilot skill has passed.
- Read `references/module-graduation-gates.md`.

## Evidence Contract

- Treat generated inventory, policy, provider, pilot, test, and rollback evidence as current only when it was produced within the previous 24 hours and after the candidate commit. Reject older or undated evidence.
- Save the human-readable certificate at `what-next/module-system/certifications/<module>-<policy-version>-<date>.md`.
- Save the machine-readable certificate at `what-next/module-system/certifications/<module>-<policy-version>-<date>.json`.
- The JSON certificate must contain `schemaVersion`, `decision`, `module`, `policyVersion`, `registryVersion`, `packageVersion`, `applicationCommit`, `cohort`, `releaseWindow`, `evidenceGeneratedAt`, `evidenceExpiresAt`, `observationWindow`, `failureBudget`, `rollback`, `supportOwner`, `exceptions`, and `reviewAt`.
- `decision` is one of `certified`, `conditional`, or `rejected`. Missing required fields or expired evidence forces `rejected`.

## Invariants

- Certification is module-specific and expires when policy, catalog, dependency, guard, package, or surface coverage changes materially.
- Non-pilot tenants remain unaffected until an approved cohort expansion.
- Writes and sensitive outputs promote after read-only surfaces.
- Every denial has a safe user state and support correlation evidence.
- A tested kill switch and rollback procedure exist before promotion.
- Release evidence is current, attributable, and reproducible.

## Workflow

1. Freeze module, policy, registry, package, dependency, and application versions for the candidate.
2. Confirm all page, action, API, report, export, job, webhook, proof, BI, and public-token surfaces are registered.
3. Execute allow, deny, read-only, suspended, expired, dependency-gap, and cross-tenant tests.
4. Verify UI/direct-route parity, accessibility, observability, support runbook, and incident ownership.
5. Run leakage, migration, provider-drift, audit-gap, load, and rollback smoke checks applicable to the module.
6. Observe the approved cohort for at least 24 hours against the mandatory failure budget below; use a longer window when the candidate has insufficient traffic.
7. Issue, reject, or conditionally defer certification with exact evidence.
8. Monitor post-promotion indicators and revoke certification on threshold breach.

## Verification

- No unregistered critical or output surface exists.
- Pilot and non-pilot behavior matches cohort policy.
- Denials occur before protected data access.
- Kill-switch recovery meets the declared objective.
- Support can explain a sampled decision from correlation evidence.
- Required policy and repository gates pass with current evidence.
- Post-release monitoring and rollback ownership are active.

## Failure Budget And Rollback Objective

- Cross-tenant access or leakage events: exactly 0.
- Unauthorized allow decisions: exactly 0.
- Unexplained entitlement or provider drift: exactly 0.
- Module-guard error rate attributable to the rollout: below 0.1% of protected requests.
- P95 guard latency regression: no more than 20% and no more than 50 ms absolute versus the approved baseline.
- Support decision-correlation coverage: 100% for sampled denials.
- Execute the repository-declared rollback command from the release packet in a non-production environment, then rerun the candidate allow/deny and non-pilot smoke tests.
- Kill-switch recovery objective: restore the prior effective policy within 5 minutes without deleting audit or entitlement history.
- Any threshold breach rejects or revokes certification; do not average away a security event.

## Stop Conditions

Do not certify on stale inventory, grandfathered unexplained high-risk gaps, missing rollback proof, unresolved P0 security findings, fabricated production evidence, or UI-only denial behavior.

## Completion Report

Record the certified module, versions, cohort, evidence links, failure budget, observation window, exceptions, rollback result, support owner, expiry/review date, and final decision.
