---
name: aqstoqflow-module-subscription-provisioning-engine
description: Implement provider-independent internal module subscriptions and idempotent entitlement provisioning in Stoquify/AqStoqFlow. Use after durable module, package-version, grant, constraint, and lifecycle-event schema exists when building manual subscriptions, trials, upgrades, downgrades, suspension, reactivation, override commands, atomic projections, reconciliation, or no-delete retention behavior.
---

# AqStoqFlow Module Subscription Provisioning Engine

## Governing Evidence

Read `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md` first, then verify live schema and services.

## Purpose

Make internal subscription commands the authoritative commercial transition boundary. Produce deterministic grants, constraints, lifecycle events, and effective projections without provider coupling.

## Prerequisites

- Stable commercial module identities and immutable package versions exist.
- Durable tenant subscription, grant, constraint, migration, and event models exist.
- Tenant composite constraints and append-only evidence protections pass.
- Read `references/provisioning-command-contract.md`.

## Invariants

- Every command is tenant-scoped, authenticated, authorized, and idempotent.
- Subscription update, grants/constraints, lifecycle events, projection work, and outbox evidence commit atomically.
- An idempotency key reused with different canonical input is an integrity error.
- Dry-run and apply use the same deterministic planner.
- Upgrade, downgrade, trial, suspension, cancellation, and reactivation never delete domain data.
- Commercial status, dunning state, reconciliation status, and effective access remain separate.
- Provider adapters may request commands later but cannot write subscription or entitlement tables.

## Workflow

1. Define provider-neutral command DTOs, canonical input hashing, reason codes, and result contracts.
2. Implement manual/internal subscription create and package-version assignment first.
3. Implement deterministic entitlement planning from package membership, dependencies, constraints, and lifecycle policy.
4. Execute plan and append evidence in one transaction.
5. Add trial start/expiry, upgrade, downgrade, scheduled change, suspend, read-only retention, cancel, reactivate, and override commands.
6. Build reconciliation that replays expected facts and opens exceptions instead of rewriting history silently.
7. Add concurrent, duplicate, partial-failure, stale-version, cross-tenant, and rollback tests.
8. Expose role-safe read models and command evidence for the Workbench.

## Verification

- Same key and same input returns the original result.
- Same key and different input fails with an integrity exception.
- Concurrent commands converge without duplicate grants or events.
- Transaction failure leaves no partial subscription or entitlement state.
- Cross-tenant package, subscription, and grant references are rejected.
- Downgrade and cancellation preserve historical records and allowed retained reads.
- Reconciliation detects missing, extra, stale, and contradictory source facts.
- Provider libraries are absent from the entitlement core.

## Stop Conditions

Stop when schema prerequisites are incomplete, package versions remain mutable, commands can bypass tenant scope or evidence, provider events write access directly, or rollback would require deleting history.

## Completion Report

Record commands implemented, transaction and idempotency design, tests, reconciliation outcomes, retained-data behavior, residual risk, and readiness for provider shadow reconciliation.
