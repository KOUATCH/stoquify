---
name: stoquify-service-boundary-ratchet
description: Audit, implement, and verify Stoquify service-owned business truth. Use for direct Prisma/database access, route/action business logic, caller-supplied organization IDs, unsafe API/action boundaries, legacy service splits, or service-boundary release gates.
---

# Stoquify Service Boundary Ratchet

## Purpose

Keep Stoquify business truth owned by services. Actions, pages, API routes, and UI components may orchestrate and display, but they must not become the source of tenant, accounting, inventory, purchasing, payment, or workflow truth.

## Required First Reads

1. `package.json`
2. `services/_shared/protect.ts`
3. `scripts/service-boundary-gate.js`
4. `scripts/api-route-guard-inventory.js`
5. `scripts/module-surface-inventory.js`

Read `references/evidence-map.md` for domain-specific paths. Read `references/verification.md` before running checks.

## Workflow

1. Classify mode: audit-only, implementation, or verification.
2. Identify the target domain and list the exact actions, API routes, services, and pages in scope.
3. Search for direct DB access, caller-supplied organization IDs, route-local business rules, unprotected actions, unsafe error responses, and duplicated service ownership.
4. Preserve existing service patterns and move only the smallest necessary rule or read model into services.
5. Add or update boundary gates only when they make future regressions harder.
6. Run focused verification and save a report under `what-next/skills-life-cycle/` when the run is material.

## Guardrails

- Do not refactor unrelated services.
- Do not widen module enforcement beyond the requested slice.
- Do not convert UI components into business-truth sources.
- Do not return raw internal errors from actions or API routes.
- Do not trust organization IDs supplied by clients when trusted session context is available.

## Output Contract

Report inspected files, boundary findings, changed files, verification commands, unresolved risks, and the next most useful slice.
