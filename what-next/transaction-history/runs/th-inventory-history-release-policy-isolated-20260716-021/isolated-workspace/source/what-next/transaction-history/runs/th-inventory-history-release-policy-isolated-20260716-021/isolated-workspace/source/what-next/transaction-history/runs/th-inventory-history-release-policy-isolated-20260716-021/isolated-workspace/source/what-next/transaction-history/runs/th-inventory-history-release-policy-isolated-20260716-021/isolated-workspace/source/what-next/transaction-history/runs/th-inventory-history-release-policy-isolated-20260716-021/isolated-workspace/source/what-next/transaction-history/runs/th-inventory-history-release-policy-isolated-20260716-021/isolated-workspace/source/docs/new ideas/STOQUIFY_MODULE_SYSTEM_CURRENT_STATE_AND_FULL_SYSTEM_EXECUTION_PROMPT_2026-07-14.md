# Stoquify Module System Current-State and Full-System Assessment Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Act as a senior enterprise module-system architecture team:

- Senior enterprise software architect: preserve module boundaries, service ownership, dependency order, platform modularity, integration contracts, and source-of-truth ownership.
- SaaS modularity specialist: evaluate package strategy, module registry, module provisioning, activation/deactivation, tenant entitlements, subscription boundaries, billing readiness, and upgrade/downgrade behavior.
- Cybersecurity and RBAC specialist: evaluate tenant isolation, RBAC, module entitlement, route/action/API enforcement, fresh authentication, maker-checker controls where needed, audit trails, redaction, safe denials, and abuse-resistant admin flows.
- Product strategist: assess how the module system should support packaging, pricing, trials, plans, bundles, add-ons, enterprise sales, and operational clarity.
- UI/UX specialist: propose command-center module-management surfaces that fit the Stoquify authenticated dashboard design system.
- Business logic analyst: protect correctness, lifecycle state transitions, dependency rules, approval history, entitlement evidence, and operational invariants.
- Enterprise finance and controls expert: evaluate how module activation, billing, finance, close, audit, and compliance evidence should connect.
- Release governance specialist: define verification gates, policy checks, rollout controls, rollback behavior, observability, and production-readiness evidence.

Use all available competent specialist agents for architecture, security, database/schema, UI/UX, product strategy, compliance, and release readiness. Coordinate them so they do not duplicate work. Treat their outputs as advisory, then synthesize one coherent final proposal.

## Task

From a deep analysis of the current Stoquify codebase and documentation, produce a professional, honest proposal explaining:

1. What the module system is today.
2. What is real, partially implemented, mocked, report-only, or UI-only.
3. What is needed for it to become a full enterprise-grade modular system.
4. How the future module system should securely manage modules, packages, entitlements, tenant access, billing, provisioning, deactivation, UI visibility, route/action enforcement, audit, and release governance.

Use realistic security language. Do not claim the system can be "bulletproof." Use terms such as defense-in-depth, tamper-evident, abuse-resistant, auditable, secure-by-design, production-ready, and resilient.

Do not exaggerate. Do not invent existing features. Clearly separate confirmed current behavior from recommendations, assumptions, and future roadmap items.

## Evidence To Inspect

Inspect the current repository before making recommendations. At minimum, review:

- `docs/modules/`
- `what-next/`
- `what-next/module-surface-inventory.json`
- `what-next/module-surface-inventory.md`
- Any module/package/entitlement reports under `docs/`, `what-next/`, or `docs/new ideas/`
- `config/sidebar.ts`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `services/modules/`
- `services/billing/`
- `services/security/`
- `actions/`
- `app/[locale]/(dashboard)/dashboard/`
- `components/dashboard/`
- `prisma/schema.prisma`
- `scripts/`
- `tests/`
- `package.json`

If `graphify-out/` exists, inspect relevant graph reports for module, route, action, service, and permission relationships. Treat graph data as secondary context if it is stale; current code and schema are authoritative.

## Analysis Areas

Analyze:

- Current module registry and definitions.
- Package strategy and plan/package mapping.
- Tenant module access and entitlement truth.
- Whether module access is enforced or only observed/report-only.
- Route, sidebar, page, server action, API route, service, background job, report, export, webhook, analytics, and BI enforcement.
- Relationship between RBAC permissions and module entitlements.
- Onboarding and provisioning.
- Activation, suspension, deactivation, downgrade, cancellation, and reactivation.
- Trial, plan upgrade, plan downgrade, add-on, bundle, and enterprise override behavior.
- Billing/subscription integration and source of truth.
- Audit logs, business events, approval flows, and evidence history.
- Security risks including UI-only gating, stale entitlement claims, cross-tenant leakage, privilege escalation, missing server-side checks, and unsafe admin overrides.
- Operational risks including partial activation, broken dependencies, hidden routes, stale navigation, orphaned data, and downgrade data retention.
- Module-management UI/UX.
- Release gates, rollback, production readiness, observability, support tooling, diagnostics, and incident recovery.
- Any other high-value module-system concern discovered from the codebase.

## Required Proposal Structure

For each major proposal, include:

1. Business use case.
2. User roles that benefit.
3. Current confirmed behavior.
4. Source-of-truth owner that should control the behavior.
5. Required service/schema boundary.
6. Required UI pattern.
7. Value added to the platform.
8. Risks, tradeoffs, and cases where it may not be worth building yet.
9. Practical implementation path.
10. Tests or verification needed before release.

## UI Recommendations

Follow the Stoquify authenticated dashboard design system:

- Use the dark dashboard command-center style.
- Prefer compact, scannable operational tables.
- Use command brief, KPI/status strip, action queue, proof/evidence strip, workbench table, and detail drawer where relevant.
- Every module-management screen should answer: What is enabled? What is blocked? What is the risk? What action is needed? What is the proof?
- Avoid decorative dashboards, duplicated cards, route-local palettes, UI-only business truth, and entitlement decisions derived from the sidebar.

Evaluate these future surfaces:

- Module Control Center.
- Tenant module entitlement detail page.
- Package/plan builder.
- Module activation/deactivation workflow.
- Module dependency graph.
- Billing and entitlement reconciliation view.
- Module access audit history.
- Module release/readiness gate dashboard.
- Support/admin override console with strict audit and expiry.

## Security And Control Requirements

Analyze and propose controls for:

- Server-side module entitlement enforcement.
- RBAC plus module entitlement checks.
- Tenant isolation.
- Fresh authentication for sensitive module/admin actions.
- Maker-checker approval for high-risk activation/deactivation or enterprise overrides.
- Tamper-evident audit history and append-only entitlement events.
- Safe downgrade/deactivation behavior.
- Data retention and read-only legal evidence after module cancellation.
- Billing reconciliation and payment-failure behavior.
- Signed or versioned entitlement snapshots where useful.
- Admin override expiry, justification, and review.
- Break-glass access.
- Observability and alerting for entitlement failures.
- Negative tests for unauthorized route/action/API/service access.

State residual risks honestly and do not describe any design as bulletproof.

## Deliverables

Save:

- `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_EXECUTION_PROMPT_2026-07-14.md`
- `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
- `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.pdf`

The final proposal must be professional, structured, honest, implementation-oriented, and grounded in confirmed repository evidence.

## Verification

Before finalizing, verify:

- The report distinguishes confirmed behavior from recommendations.
- No existing feature is invented.
- Report-only enforcement is labeled as report-only.
- UI-only gating is not treated as secure entitlement enforcement.
- Module truth is assigned to service/schema boundaries, not sidebar state.
- Risks and tradeoffs are explicit.
- The roadmap is phased and practical.
- The Markdown and PDF files exist.
- Any skipped tests, stale docs, dirty-worktree concerns, or missing evidence are disclosed.

## Non-Goals

- Do not implement code unless explicitly asked.
- Do not refactor module services.
- Do not change package or entitlement behavior.
- Do not commit or push.
- Do not clean unrelated files.
- Do not claim unrestricted production readiness unless the evidence proves it.
