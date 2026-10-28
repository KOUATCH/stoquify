---
name: stoquify-rbac-tenant-freshauth-enforcer
description: Audit, implement, and verify Stoquify RBAC, tenant isolation, module entitlement, permission taxonomy, fresh-auth, maker-checker, and sensitive-action controls across actions, APIs, services, and role workflows.
---

# Stoquify RBAC Tenant Fresh-Auth Enforcer

## Purpose

Make Stoquify authorization consistent across server actions, APIs, services, and role workflows. Every protected operation should derive tenant and user context from trusted server-side context and enforce the correct permission, module entitlement, and freshness rule.

## Required First Reads

1. `lib/security/rbac.ts`
2. `lib/security/server-authz.ts`
3. `services/_shared/protect.ts`
4. `scripts/module-surface-inventory.js`
5. `what-next/module-surface-inventory.md` when present

Read `references/evidence-map.md` for target surfaces. Read `references/verification.md` before checks.

## Workflow

1. Classify the target operation as read, write, approval, sensitive action, public access, or admin/system setting.
2. Identify expected permission, module slug, tenant source, and freshness requirement.
3. Inspect action/API/service layers for missing or inconsistent guards.
4. Normalize permission names and module gates without broadening unrelated enforcement.
5. Add fresh-auth or maker-checker only where sensitivity justifies it.
6. Verify with focused authorization tests or module inventory gates.

## Guardrails

- Do not trust caller-supplied organization IDs for authorization.
- Do not weaken existing high-risk audit decisions.
- Do not grant compatibility fallbacks that bypass module entitlement.
- Keep module enforcement report-only outside the requested slice unless explicitly asked.
- Redact sensitive evidence in reports.

## Output Contract

Report expected permission model, current behavior, changes made, tests or gates run, remaining permission gaps, and next authorization slice.
