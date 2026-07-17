---
name: aqstoqflow-module-audit-evidence-overrides
description: Design, implement, or verify append-only module lifecycle evidence and governed privileged overrides in Stoquify/AqStoqFlow. Use when module grants, constraints, package changes, subscription transitions, manual overrides, break-glass access, enforcement decisions, or rollback events need immutable audit semantics, approval separation, expiry, tamper evidence, or retention controls.
---

# AqStoqFlow Module Audit Evidence Overrides

## Governing Evidence

Read `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md` first, then reverify its findings against current code and generated evidence.

## Purpose

Make module lifecycle and privileged override evidence durable, explainable, and resistant to silent mutation. Keep operational telemetry separate from retained commercial and security evidence.

## Required Sources

1. `prisma/schema.prisma` audit, security-event, and organization relations
2. `services/modules/module-entitlement.service.ts` audit behavior
3. `lib/security/audit-log.ts`
4. Existing append-only database triggers and evidence chains
5. Entitlement, subscription, provisioning, and enforcement policy designs
6. `references/audit-override-contract.md`

## Invariants

- Lifecycle evidence is append-only after acceptance.
- Audit failure for a critical mutation fails the mutation or creates a durable recovery exception in the same transaction.
- Organization archival does not cascade-delete retained commercial or security evidence.
- Every override has tenant, actor, subject, reason, approval, scope, start, expiry, policy version, and correlation identifiers.
- Maker and checker are distinct where risk policy requires it.
- Break-glass is a separate emergency workflow, not a wildcard-role shortcut.
- Hashes support integrity verification; they do not provide confidentiality or replace access controls.

## Workflow

1. Classify evidence as lifecycle, decision, security, operational telemetry, or provider evidence.
2. Define immutable records, sequence rules, causation/correlation identifiers, retention, redaction, and legal deletion behavior.
3. Add deterministic event names for observe, deny, enforce, override, expire, revoke, rollback, and reconciliation outcomes.
4. Implement database mutation protection and gap detection for retained evidence.
5. Implement override request, approval, activation, expiry, revocation, and post-review transitions.
6. Add tenant, actor, approver, expiry, failure, deletion, reordering, and hash-gap tests.
7. Expose only redacted, role-safe evidence read models to UI and support tools.
8. Save verification and residual-risk evidence.

## Verification

- Update and delete attempts on append-only records fail.
- Sequence gaps, changed payloads, and broken hash links are detected.
- Critical mutations cannot succeed silently when evidence persistence fails.
- Self-approval, expired approval, cross-tenant approval, and overbroad override scopes are denied.
- Expiry and revocation remove effective override access without deleting history.
- Tenant archival preserves retained evidence according to policy.

## Stop Conditions

Stop if evidence can be rewritten through ordinary application code, critical audit writes remain best-effort, overrides lack expiry, or sensitive payloads would be stored without redaction and access controls.

## Completion Report

Record evidence classes, schema and trigger changes, override state machine, tests, retention assumptions, recovery behavior, and unresolved compliance review.
