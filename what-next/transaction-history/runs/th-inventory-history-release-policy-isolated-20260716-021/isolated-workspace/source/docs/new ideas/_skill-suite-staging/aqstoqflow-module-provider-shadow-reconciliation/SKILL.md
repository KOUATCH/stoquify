---
name: aqstoqflow-module-provider-shadow-reconciliation
description: Implement and verify provider-independent shadow reconciliation for Stoquify/AqStoqFlow module subscriptions. Use after durable internal subscription and entitlement truth exists when adding signed provider event ingestion, idempotent inbox processing, ordering recovery, drift comparison, retry, dunning evidence, or adapter promotion without allowing webhooks to authorize access directly.
---

# AqStoqFlow Module Provider Shadow Reconciliation

## Governing Evidence

Read `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md` first, then reverify its findings against current code and generated evidence.

## Purpose

Integrate a billing provider as an evidence source while internal subscription and entitlement services remain authoritative. Prove correctness in shadow mode before any provider command can affect access.

## Prerequisites

- Versioned package and price records exist.
- Internal subscription commands and idempotent provisioning exist.
- Effective entitlement projection and lifecycle events are durable.
- The billing/provisioning boundary skill is complete.
- Read `references/shadow-reconciliation-contract.md`.

## Invariants

- Provider events never grant, revoke, suspend, or reactivate runtime access directly.
- Signature verification and replay protection occur before durable inbox acceptance.
- Inbox identity and command idempotency are deterministic.
- Duplicate, delayed, reordered, missing, and contradictory events are recoverable.
- Commercial status, dunning state, reconciliation exception, and access effect remain separate concepts.
- Raw provider payloads are redacted, retained, and access-controlled according to policy.

## Workflow

1. Define a provider-neutral event envelope and adapter contract.
2. Implement signed event ingestion into an immutable and idempotent inbox.
3. Normalize provider facts without mutating internal subscription truth.
4. Build a shadow comparator across provider facts, internal subscription, package version, provisioning result, and effective entitlement.
5. Create explicit reconciliation exceptions and operator actions for every drift class.
6. Add retry, dead-letter, replay, rate-limit, and observability behavior.
7. Exercise duplicates, delays, reordering, signature failure, outage, timeout, and partial processing.
8. Produce shadow evidence over an approved observation window before recommending promotion.

## Verification

- Invalid signatures and replays are rejected before processing.
- Idempotency-key reuse with a different payload creates an exception.
- Reordered events converge without rewriting immutable history.
- Provider outage does not change effective tenant access.
- Every drift has owner, reason, evidence, and safe remediation command.
- Promotion and rollback simulations preserve internal truth.

## Stop Conditions

Stop if internal subscription truth is absent, webhook code writes entitlement rows, provider identifiers become canonical module identifiers, or shadow drift cannot be explained deterministically.

## Completion Report

Record adapter, event classes, observation window, drift counts, retries, exceptions, tests, residual provider risk, and promotion recommendation.
