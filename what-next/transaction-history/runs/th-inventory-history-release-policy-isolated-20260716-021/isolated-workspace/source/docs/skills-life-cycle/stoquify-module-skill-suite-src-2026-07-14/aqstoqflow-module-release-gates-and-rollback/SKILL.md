---
name: aqstoqflow-module-release-gates-and-rollback
description: Govern continuous Stoquify/AqStoqFlow module release gates, evidence freshness, ratchets, rollback, and readiness certification. Use throughout the module program when verifying security prerequisites, inventory and registry coverage, migrations, package dependencies, guards, audit integrity, leakage, UX states, provider drift, pilots, support readiness, or enforcement rollback.
---

# AqStoqFlow Module Release Gates And Rollback

## Governing Evidence

Read `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md` first, then reverify its findings against current code and generated evidence.

## Purpose

Prevent module-control regressions and make every promotion reversible and explainable. Run this skill continuously from the evidence-baseline stage through final module certification.

## Required Sources

- Governing July 14 module proposal and skill-suite blueprint
- `what-next/module-system/skill-suite-manifest.json`
- `what-next/module-system/execution-status.md`
- Current module inventory, baseline, policy output, and stage reports
- Module catalog, entitlement service, guards, schema, UI read models, provider evidence, and focused tests
- `references/lane-reference.md`

## Gate Ladder

1. P0 tenant, role-grant, and step-up security prerequisites.
2. Truthful observe, pilot, enforce, policy-version, and kill-switch state.
3. Canonical vocabulary and dependency closure.
4. Complete critical/output surface registration with no new unexplained gaps.
5. Additive migration, explicit entitlements, deterministic projection, and access-delta proof.
6. Canonical guard before data access with tenant-safe denials.
7. Append-only evidence, governed overrides, lifecycle, retention, and leakage controls.
8. Service-owned UI states, direct-route parity, accessibility, and browser evidence.
9. Provider signature, idempotency, outage, drift, and shadow reconciliation evidence.
10. Pilot cohort, failure budget, support runbook, monitoring, and rollback smoke.
11. Named module rollout certificate tied to current versions.

## Operating Rules

- Keep legacy findings in a reviewed baseline; fail on new high-risk gaps after burn-in.
- A passing ratchet proves only that the baseline did not worsen.
- Reject stale evidence, unknown policy versions, missing owners, and unexplained exceptions.
- Require current negative tests, not design documents, for security and leakage claims.
- Keep broad enforcement off unless the named pilot or rollout certificate is valid.
- Revoke certification after material policy, registry, dependency, package, guard, or surface changes.
- Preserve history during rollback and tenant lifecycle changes.

## Release Packet Contract

- Evidence is current only when generated within the previous 24 hours and after the candidate commit. Reject undated evidence and evidence older than the candidate.
- Save the human-readable packet at `what-next/module-system/releases/<module>-<policy-version>-<date>.md` and the machine-readable packet at the matching `.json` path.
- The JSON packet must contain `schemaVersion`, `decision`, `module`, `stage`, `policyVersion`, `registryVersion`, `packageVersion`, `applicationCommit`, `cohort`, `releaseWindow`, `evidenceGeneratedAt`, `evidenceExpiresAt`, `gateResults`, `exceptions`, `rollback`, `failureBudget`, `supportOwner`, and `nextActions`.
- `decision` is one of `pass`, `conditional`, or `fail`. Missing required fields, stale evidence, or an open P0 gate forces `fail`.
- The packet must name an executable repository rollback command. A prose-only rollback plan is not evidence.

## Workflow

1. Resolve the candidate stage, module, policy version, cohort, and release window.
2. Collect gate evidence and verify artifact freshness.
3. Classify failures as active, grandfathered with owner/expiry, false positive, not applicable, or resolved.
4. Run focused tests and rollback smoke for changed behavior.
5. Emit pass, conditional pass, or fail with exact reasons.
6. Update ratchets only after review; never erase history to obtain a pass.
7. Save a release packet and next-action list.

The rollback smoke must execute the packet's rollback command in a non-production environment, restore the previous effective policy within 5 minutes, preserve audit and entitlement history, and rerun candidate allow/deny plus non-pilot smoke tests. The minimum failure budget is zero cross-tenant events, zero unauthorized allows, zero unexplained provider drift, less than 0.1% rollout-attributable guard errors, and no more than 20% or 50 ms P95 guard-latency regression.

## Verification

- Parse all machine-readable evidence.
- Verify referenced files, tests, policy versions, and timestamps exist.
- Re-run inventory and changed-slice tests.
- Confirm the rollback or kill switch meets the declared objective.
- Confirm non-pilot tenants are unaffected.
- Confirm support can explain sampled decisions from correlation evidence.

## Stop Conditions

Fail the gate when P0 security is open, critical surfaces are unregistered, migration delta is unexplained, protected data is read before denial, evidence is mutable or stale, provider events authorize access directly, rollback is untested, or support ownership is absent.

## Completion Report

Record gate results, evidence versions, exceptions with owner and expiry, commands, rollback result, residual risk, and promotion decision.
