# Kontava System Analysis and Daily BI Innovation Prompt

Conduct a deep system-wide product, technical, architectural, security, UX, BI, and business-readiness analysis of Kontava/AqStoqFlow.

The goal is to identify incomplete subsystems, weak architectural areas, security gaps, unfinished workflows, fragile integrations, missing UI surfaces, incomplete backend foundations, weak product experiences, and any technical or business foundations that are not yet enterprise-ready.

Produce a professional state-of-affairs report that explains what is complete, what is incomplete, what is risky, what is not secure enough, and what must be improved to transform Kontava into a modern, secure, robust, scalable, battle-tested, enterprise-grade OHADA-zone SMB operating system.

The analysis should also determine what must be built to make Kontava a daily go-to business platform, not merely an accounting/POS tool. The system should become a place where SMB owners, managers, accountants, finance teams, stockkeepers, payroll teams, and branch supervisors return every day for operational truth, BI, decision support, business alerts, cash visibility, stock intelligence, compliance readiness, and rare cross-module insights that ordinary business apps do not provide.

Analyze the system carefully before making recommendations. Inspect the architecture, code structure, database models, services, server actions, APIs, hooks, UI routes, dashboards, authentication, RBAC, tenant isolation, audit logs, ledger-first accounting, POS, inventory, purchasing, payroll, finance, payment reconciliation, reporting, exports, uploads, background jobs, seed data, migrations, module entitlements, compliance foundations, analytics surfaces, and BI/read-model foundations.

The report should cover:

## 1. Current System State

- What parts of the system appear complete and usable.
- What parts are partially implemented.
- What parts are only backend foundations without proper UI.
- What parts are UI-only or presentation-heavy without strong backend enforcement.
- What parts are risky, fragile, duplicated, inconsistent, or too tightly coupled.
- What parts are not yet secure enough for production use.
- What parts are strong enough to reuse as foundations for future enterprise-grade work.

## 2. Incomplete Subsystems

Identify every incomplete or weak subsystem, including:

- Authentication, MFA, verification, reset flows, session security, and fresh-auth.
- RBAC, permissions, admin roles, wildcard permissions, maker-checker, and sensitive actions.
- Tenant isolation, organization scoping, direct URL access, and cross-tenant safeguards.
- Module entitlements and subscription-based module visibility.
- Accounting, ledger posting, source links, audit trails, close readiness, and OHADA compliance.
- POS, inventory, purchasing, payroll, finance, reconciliation, reports, dashboards, exports, uploads, and background jobs.
- BI, analytics, Owner War Room, Manager Action Center, proof trails, evidence grades, snapshots, alerts, and cross-module intelligence.
- Seed data, migrations, release gates, testing, observability, rollback, backups, and recovery.

## 3. Security and Abuse-Resistance Assessment

- Identify where the platform can be intentionally or accidentally broken.
- Explain why those areas are vulnerable.
- Recommend defensive, modern, professional security controls.
- Cover tenant isolation, RBAC, module enforcement, auditability, fresh auth, MFA, maker-checker approvals, export safety, upload safety, rate limiting, logs, secrets, backups, incident response, and recovery.
- Avoid exploit instructions; focus only on defensive assessment and remediation.

## 4. Architectural Robustness

- Evaluate whether the platform architecture is consistent, modular, scalable, and maintainable.
- Identify duplicated patterns, legacy flows, direct Prisma usage, weak service boundaries, missing contracts, unsafe shortcuts, and areas where business logic is too close to the UI.
- Recommend the best architectural approach for making the platform cleaner, safer, more extensible, and easier to evolve.
- Explain what should become shared infrastructure instead of being rebuilt module by module.

## 5. Daily-Go-To BI and Business Insight Opportunity

Analyze what Kontava must become so SMB users open it daily for business truth, not only occasional transactions.

Identify features and surfaces that can make the platform indispensable, including:

- Owner daily command center.
- Manager action center.
- Cash visibility and cash leakage alerts.
- Stock-to-cash intelligence.
- Payment reconciliation insights.
- Supplier debt and AP risk monitoring.
- Payroll-to-profitability visibility.
- Sales, margin, branch, staff, and product performance insights.
- Compliance readiness alerts.
- Close-period readiness.
- Suspense, exception, and risk queues.
- What changed since yesterday summaries.
- What needs action today recommendations.
- Evidence-backed KPI drill-through.
- Role-specific dashboards for owners, accountants, managers, stockkeepers, and finance teams.

For each proposed insight capability, explain:

- The business problem it solves.
- Why users would return to it daily.
- Why ordinary business apps rarely provide it well.
- What data foundations are required.
- What UI surface should present it.
- What proof, audit, or evidence trail should support it.
- What action the user should be able to take from the insight.

## 6. Enterprise-Grade Improvement Proposals

For each major proposal, explain:

- What should be built or changed.
- Why it is necessary.
- What business risk it reduces.
- What technical risk it reduces.
- What user trust or product value it improves.
- Which files, layers, services, modules, or workflows are likely affected.
- Whether it should be done immediately, later, or only after prerequisites are met.
- How it contributes to making Kontava modern, professional, robust, secure, and battle-tested.

## 7. Prerequisites for Each Proposal

Clearly state the foundations each proposal depends on, including:

- Required schema changes.
- Required service-layer contracts.
- Required server actions or APIs.
- Required hooks.
- Required guards and permissions.
- Required UI/UX components.
- Required audit events and evidence trails.
- Required BI contracts, snapshots, read models, or source links.
- Required seed data and backfills.
- Required tests.
- Required migration and rollback plans.
- Required observability and release gates.

## 8. Anti-Bloat and Product Discipline

For every recommendation, explain:

- What should not be built yet.
- What should remain read-only first.
- What should reuse existing services instead of creating new models.
- What should wait until data quality, usage, or customer demand proves the need.
- What would make the platform heavier without increasing SMB value.
- How to preserve Kontava as one unified OHADA SMB operating system rather than disconnected mini-apps.

## 9. Prioritized Roadmap

Create a practical roadmap with:

- Immediate critical fixes.
- Short-term security and stability hardening.
- Medium-term architectural consolidation.
- BI and daily-insight foundations.
- Long-term enterprise-grade and moat-building capabilities.
- Items that must not be built yet because prerequisites are missing.
- Items that should be delayed to avoid unnecessary complexity.

## 10. Final Deliverable

Produce a detailed professional report containing:

- Executive summary.
- Current state assessment.
- Incomplete subsystem inventory.
- Security and reliability risk map.
- Architectural weakness analysis.
- Daily-go-to BI and business insight opportunity map.
- Proposal-by-proposal improvement plan.
- Prerequisite map.
- Anti-bloat recommendations.
- Prioritized roadmap.
- Risk register.
- Testing and release-gate plan.
- Clear recommendation on what to fix first, what to build next, and what to delay.

The final report should be practical, technical, strategic, product-aware, and execution-ready. It should help the team understand the true state of Kontava and the best path to make it secure, modern, robust, scalable, professional, battle-tested, insight-rich, and enterprise-grade without destabilizing existing functionality.
