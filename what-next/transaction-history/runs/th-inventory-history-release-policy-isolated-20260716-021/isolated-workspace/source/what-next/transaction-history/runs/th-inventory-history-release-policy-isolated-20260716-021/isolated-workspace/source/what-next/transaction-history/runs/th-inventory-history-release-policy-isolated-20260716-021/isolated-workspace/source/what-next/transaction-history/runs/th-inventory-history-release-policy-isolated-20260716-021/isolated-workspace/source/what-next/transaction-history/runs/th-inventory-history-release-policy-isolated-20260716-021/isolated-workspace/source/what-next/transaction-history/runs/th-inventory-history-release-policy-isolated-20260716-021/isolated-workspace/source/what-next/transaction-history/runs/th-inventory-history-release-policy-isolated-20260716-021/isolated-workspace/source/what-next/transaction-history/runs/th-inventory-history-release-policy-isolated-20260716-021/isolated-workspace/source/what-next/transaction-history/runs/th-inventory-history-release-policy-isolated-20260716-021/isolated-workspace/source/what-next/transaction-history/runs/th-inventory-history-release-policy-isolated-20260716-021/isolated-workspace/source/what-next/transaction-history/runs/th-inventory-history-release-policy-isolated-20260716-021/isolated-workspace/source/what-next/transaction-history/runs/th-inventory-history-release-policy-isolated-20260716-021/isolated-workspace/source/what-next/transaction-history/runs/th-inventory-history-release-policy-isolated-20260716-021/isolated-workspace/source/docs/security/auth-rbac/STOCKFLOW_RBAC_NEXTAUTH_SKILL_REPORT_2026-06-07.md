# StockFlow RBAC NextAuth Skill Report

Date: 2026-06-07

## Summary

Created and installed the Codex skill `stockflow-rbac-nextauth` for designing, implementing, auditing, and hardening enterprise-grade RBAC and permission workflows in StockFlow.

The skill targets StockFlow's Next.js App Router, Prisma, NextAuth, server actions, services, TanStack Query, bilingual UI, and OHADA-zone business context. It is designed for accounting, POS, inventory, purchasing, payroll, finance, reporting, administration, and other SMB SaaS workflows where authorization must be secure, auditable, tenant-scoped, and fail-closed.

## Installed Location

```text
C:\Users\J COMPUTER\.codex\skills\stockflow-rbac-nextauth
```

## Installed Files

```text
stockflow-rbac-nextauth/
  SKILL.md
  agents/
    openai.yaml
  references/
    permission-model-patterns.md
    nextauth-integration.md
    stockflow-module-permission-matrix.md
    rbac-verification-checklist.md
```

## Trigger Intent

The skill should be used when the user asks Codex to work on:

- RBAC, roles, permissions, or access control
- authorization or authorisation workflows
- NextAuth security and session authorization
- tenant isolation and org/location/terminal scoping
- admin permission management screens
- permission registry design
- server-side permission enforcement
- StockFlow financial, POS, inventory, purchasing, payroll, or reporting access rules

## Design Choices

The skill separates authentication from authorization:

- NextAuth is treated as the authentication and session backbone.
- Permission decisions are enforced through explicit server-only authorization helpers.
- Client-side permission hooks are allowed only for UI visibility and ergonomics.
- Unknown permissions, stale memberships, missing tenant context, invalid scopes, inactive users, and ambiguous data deny by default.

The skill also pushes Codex to inspect the existing codebase before implementation, including NextAuth config, Prisma models, server actions, services, hooks, dashboard navigation, and existing `graphify-out/` reports when available.

## Reference Structure

`SKILL.md` contains the compact workflow and execution rules. The reference files hold heavier details so Codex can load only what the task needs:

- `permission-model-patterns.md`: permission naming, scope modeling, Prisma shape options, separation of duties, audit requirements, and migration safety.
- `nextauth-integration.md`: safe NextAuth session claims, callback guidance, middleware boundaries, stale permission handling, and server helper responsibilities.
- `stockflow-module-permission-matrix.md`: starter permissions for administration, accounting/OHADA finance, POS, inventory, purchasing, payroll, and reports.
- `rbac-verification-checklist.md`: focused tests, manual checks, smoke checks, security review questions, and completion evidence.

## Security Emphasis

The skill explicitly highlights high-risk workflows:

- Accounting journal posting, reversal, OHADA account mapping, financial statement export, and period close/reopen.
- POS refund, void, payment reversal, discount override, cash drawer, X/Z report, and terminal assignment.
- Inventory stock adjustment, adjustment approval, transfer approval, valuation, and negative-stock override.
- Purchasing purchase order approval, goods receipt, invoice matching, and payment scheduling.
- Payroll compensation changes, payroll run approval, payslip export, attendance overrides, and statutory settings.
- Administration role assignment, user invitations, organization settings, audit export, and integration credentials.

## Verification Guidance Included

The skill directs Codex to verify:

- allowed user success
- unauthenticated denial
- missing-permission denial
- cross-tenant denial
- wrong location/terminal/department denial
- stale or inactive membership denial where practical
- server denial even when the client attempts direct calls
- audit events for sensitive changes when local audit infrastructure exists
- focused lint/type/test checks for touched files

## Notes

The installed skill follows the local skill-authoring pattern: scaffold a named skill, keep `SKILL.md` concise, place UI metadata in `agents/openai.yaml`, and move heavier operational details into `references/`.

Restart Codex to ensure the newly installed skill is picked up in future sessions.
