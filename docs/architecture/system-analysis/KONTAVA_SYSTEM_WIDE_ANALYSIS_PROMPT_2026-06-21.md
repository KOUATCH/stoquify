# Kontava System-Wide Analysis Prompt

Conduct a thorough system-wide analysis of Kontava/AqStoqFlow to identify incomplete subsystems, weak architectural areas, security gaps, unfinished workflows, fragile integrations, missing UI surfaces, and any technical or product foundations that are not yet enterprise-ready.

The goal is to produce a professional state-of-affairs report that explains what is complete, what is incomplete, what is risky, what is not secure enough, and what must be improved to transform the platform into a modern, robust, secure, scalable, battle-tested, enterprise-grade OHADA-zone SMB operating system.

Analyze the system carefully before making recommendations. Inspect the architecture, code structure, database models, services, server actions, APIs, hooks, UI routes, dashboards, authentication, RBAC, tenant isolation, audit logs, ledger-first accounting, POS, inventory, purchasing, payroll, finance, payment reconciliation, reporting, exports, uploads, background jobs, seed data, migrations, module entitlements, and compliance foundations.

The report should cover:

## 1. Current System State

- What parts of the system appear complete and usable.
- What parts are partially implemented.
- What parts are only backend foundations without proper UI.
- What parts are UI-only or presentation-heavy without strong backend enforcement.
- What parts are risky, fragile, duplicated, or inconsistently implemented.
- What parts are not yet secure enough for production use.

## 2. Incomplete Subsystems

Identify every incomplete or weak subsystem, including:

- Authentication, MFA, verification, reset flows, and session security.
- RBAC, permissions, admin roles, and sensitive action controls.
- Tenant isolation and organization scoping.
- Module entitlements and subscription-based module visibility.
- Accounting, ledger posting, source links, audit trails, and OHADA compliance.
- POS, inventory, purchasing, payroll, finance, reconciliation, reports, dashboards, exports, uploads, and background jobs.
- BI, analytics, Owner War Room, action center, evidence trails, and cross-module intelligence.
- Seed data, migrations, release gates, testing, observability, and recovery.

## 3. Security and Abuse-Resistance Assessment

- Identify where the platform can be intentionally or accidentally broken.
- Explain why those areas are vulnerable.
- Recommend defensive, modern, professional security controls.
- Cover tenant isolation, RBAC, module enforcement, auditability, fresh auth, MFA, maker-checker approvals, export safety, upload safety, rate limiting, backups, logs, secrets, and incident recovery.
- Avoid exploit instructions; focus only on defensive assessment and remediation.

## 4. Architectural Robustness

- Evaluate whether the platform architecture is consistent, modular, scalable, and maintainable.
- Identify duplicated patterns, legacy flows, direct Prisma usage, weak service boundaries, missing contracts, unsafe shortcuts, and areas where business logic is too close to the UI.
- Recommend the best architectural approach for making the platform cleaner, safer, more extensible, and easier to evolve.

## 5. Enterprise-Grade Improvement Proposals

For each major proposal, explain:

- What should be built or changed.
- Why it is necessary.
- What business risk it reduces.
- What technical risk it reduces.
- What user trust or product value it improves.
- Which files, layers, services, modules, or workflows are likely affected.
- Whether it should be done immediately, later, or only after prerequisites are met.

## 6. Prerequisites for Each Proposal

Clearly state the foundations each proposal depends on, including:

- Required schema changes.
- Required service-layer contracts.
- Required server actions or APIs.
- Required guards and permissions.
- Required UI/UX components.
- Required audit events and evidence trails.
- Required seed data and backfills.
- Required tests.
- Required migration and rollback plans.
- Required observability and release gates.

## 7. Prioritized Roadmap

Create a practical roadmap with:

- Immediate critical fixes.
- Short-term hardening.
- Medium-term architectural consolidation.
- Long-term enterprise-grade capabilities.
- Items that must not be built yet because prerequisites are missing.
- Items that would create bloat without enough business value.

## 8. Final Deliverable

Produce a detailed professional report containing:

- Executive summary.
- Current state assessment.
- Incomplete subsystem inventory.
- Security and reliability risk map.
- Architectural weakness analysis.
- Proposal-by-proposal improvement plan.
- Prerequisite map.
- Prioritized roadmap.
- Risk register.
- Testing and release-gate plan.
- Clear recommendation on what to fix first, what to build next, and what to delay.

The final report should be practical, technical, strategic, and execution-ready. It should help the team understand the true state of the platform and the best path to make it secure, modern, robust, scalable, professional, battle-tested, and enterprise-grade without destabilizing existing functionality.
