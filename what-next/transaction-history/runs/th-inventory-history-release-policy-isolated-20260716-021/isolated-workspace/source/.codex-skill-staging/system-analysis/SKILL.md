---
name: system-analysis
description: Conduct a thorough Kontava/AqStoqFlow system-wide analysis for incomplete subsystems, weak architecture, security gaps, unfinished workflows, missing UI surfaces, enterprise-readiness risks, prerequisites, and execution-ready improvement roadmaps. Use when asked to inspect the platform, assess state of affairs, find incomplete or unsecured systems, or propose robust modern enterprise-grade architecture and implementation plans.
---

# System Analysis

Use this skill to inspect Kontava/AqStoqFlow as a full OHADA-zone SMB operating platform and produce a professional state-of-affairs report. The report should identify what is complete, incomplete, fragile, unsecured, duplicated, UI-only, backend-only, or not yet enterprise-ready, then propose practical foundations and roadmap steps.

## Operating Rules

- Inspect before recommending.
- Do not modify product code unless the user explicitly asks for implementation.
- Treat the system as a financial operating platform where tenant isolation, RBAC, auditability, ledger-first accounting, compliance, reconciliation, payroll, POS, purchasing, inventory, exports, and sensitive data protection are critical.
- Prefer concrete findings with file/path evidence over generic advice.
- Avoid exploit instructions. Security analysis must be defensive and remediation-oriented.
- Preserve existing workflows and dirty worktree changes.
- Use `rg` for discovery before slower searches.
- If the user asks to save the report, save it under `system analysis/` unless they specify another folder.

## Inspect First

Start with a focused scan of:

- `app/**` for routes, public pages, dashboard pages, auth/register/login flows, APIs, and missing UI surfaces.
- `components/**` for dashboard shells, tables, forms, BI cards, proof drawers, denied states, and incomplete presentation surfaces.
- `actions/**` for server actions, guard patterns, tenant scoping, permission checks, and legacy flows.
- `services/**` for service boundaries, ledger posting, reconciliation, tenant safety, module entitlements, snapshots, evidence, jobs, and business rules.
- `hooks/**` for client data-fetching patterns and whether client state is being treated as authority.
- `lib/**` for auth, RBAC, middleware helpers, audit, security, storage, token, and permission utilities.
- `prisma/schema.prisma` and seed/migration files for data model completeness, constraints, auditability, tenant scope, idempotency, and destructive risk.
- `middleware.ts`, `next.config.*`, `package.json`, scripts, CI files, and release gates for operational hardening.
- `graphify-out/**` reports when present, especially for architecture, dependency, route, component, action, hook, and type analysis.

Use the existing implementation style as evidence. Distinguish confirmed findings from informed inferences.

## Analysis Areas

Cover these system areas:

1. Authentication, registration, login, verification, reset flows, MFA, sessions, lockout, and fresh-auth.
2. RBAC, permissions, admin wildcard, maker-checker, sensitive actions, and support/break-glass access.
3. Tenant isolation, organization scoping, direct URL/API access, client-provided organization IDs, and cross-tenant safeguards.
4. Module entitlements, subscription gating, observe/enforce mode, route guards, API guards, report guards, export guards, and background job guards.
5. Accounting, journal entries, ledger posting, source links, audit events, period locks, close assurance, OHADA compliance, reversals, and immutable evidence.
6. POS, inventory, purchasing, payroll, finance, reconciliation, suppliers, customers, receivables, payables, and operational workflows.
7. Reports, dashboards, analytics, BI contracts, Owner War Room, Manager Action Center, snapshots, stale/partial/blocked states, and proof-backed KPIs.
8. Uploads, imports, attachments, exports, public receipts, signed URLs, storage safety, scanning, watermarking, and data exfiltration controls.
9. Background jobs, outbox, seed data, migrations, backfills, idempotency, rollback, environment safety, and release gates.
10. Observability, logging, incident response, backups, restore drills, performance budgets, error handling, and operational reliability.
11. UI/UX completeness, consistency with system color semantics, empty states, denied states, onboarding surfaces, trust labels, upgrade prompts, and role-specific dashboards.

## Classify Each Finding

For every meaningful finding, classify:

- Status: complete, mostly complete, partial, backend-only, UI-only, missing, risky, duplicated, insecure, or unknown.
- Severity: critical, high, medium, or low.
- Evidence: file/path, route, service, schema model, action, or observed pattern.
- Business impact: what SMB owners, accountants, staff, finance teams, partners, or administrators suffer if it remains unresolved.
- Technical impact: what can break, leak, corrupt, slow down, or become hard to maintain.
- Prerequisites: what must exist before the fix or proposal can safely land.
- Recommended action: immediate fix, short-term hardening, medium-term consolidation, long-term capability, or delay.

## Proposal Requirements

For each major proposal, include:

- Objective.
- Why it is necessary.
- What business risk it reduces.
- What technical risk it reduces.
- What user trust or product value it improves.
- Likely affected files, layers, services, modules, or workflows.
- Required schemas, service contracts, server actions, APIs, hooks, guards, UI surfaces, audit events, tests, seed/backfill work, migration plan, rollback plan, and release gates.
- What must not be built yet because prerequisites are missing.
- Anti-bloat guidance: what should reuse existing services, remain read-only, or wait for proof of value.

## Security Guidance

Assess defensive security across:

- Tenant isolation and direct object reference risk.
- RBAC and wildcard/admin overreach.
- MFA, step-up auth, password reset, verification, token generation, and session safety.
- Module entitlement enforcement.
- Audit logs and immutable security evidence.
- Ledger-first accounting controls.
- Upload, import, attachment, export, receipt, and public-sharing safety.
- Rate limiting, bot resistance, abuse monitoring, logs, secrets, backups, restore drills, and incident response.

Do not provide operational exploit steps. Phrase "how it can break" at a defensive architecture level, then provide mitigation.

## Report Structure

When producing the report, use this structure:

1. Executive summary.
2. Inspection scope and limits.
3. Current system state assessment.
4. Incomplete subsystem inventory.
5. Security, abuse-resistance, and reliability risk map.
6. Architecture and service-boundary weakness analysis.
7. UI/UX completeness and presentation analysis.
8. Proposal-by-proposal improvement plan.
9. Prerequisite map.
10. Prioritized roadmap.
11. Testing, observability, release-gate, and rollback plan.
12. Risk register.
13. Recommended first build, next build, and delayed items.

## Validation

For a report-only run:

- Confirm the report file exists if saved.
- Mention that the result is a static inspection unless tests or live checks were run.
- List any commands that failed or were skipped.

For an implementation follow-up:

- Use focused tests for the touched area.
- Prefer `npm run typecheck`, `npm run lint`, focused Jest/service tests, Prisma validation, and existing Kontava release gates where relevant.
- Do not run destructive database reset, migration, or reseed commands unless the user explicitly asks and approves the risk.

## Completion Criteria

Finish when the user has an execution-ready assessment that clearly explains:

- What is working.
- What is incomplete.
- What is insecure or fragile.
- Why the gaps matter.
- What prerequisites must be built first.
- Which proposals should be executed immediately, later, or delayed.
- How to move Kontava toward a secure, modern, robust, scalable, professional, battle-tested, enterprise-grade OHADA SMB operating system without destabilizing existing workflows.
