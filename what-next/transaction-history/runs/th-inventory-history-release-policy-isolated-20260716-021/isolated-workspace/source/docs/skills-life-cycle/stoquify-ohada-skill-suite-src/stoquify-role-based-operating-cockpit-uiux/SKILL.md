---
name: stoquify-role-based-operating-cockpit-uiux
description: Audit, implement, and verify Stoquify role-based command-center UI/UX. Use for owner, accountant, finance officer, cashier, manager, warehouse, purchasing, and POS daily workspaces, command-center anatomy, robust states, accessibility, mobile parity, and service-owned UI truth.
---

# Stoquify Role-Based Operating Cockpit UIUX

## Purpose

Convert enterprise controls into clear daily workspaces for owners, accountants, finance officers, cashiers, managers, warehouse teams, purchasing managers, and POS operators.

## Required First Reads

1. `docs/UI/UX/AQSTOQFLOW_UI_CONSTITUTION_2026-06-26.md`
2. `docs/product/user-experience/ui-registry.md`
3. relevant route under `app/[locale]/(dashboard)/`
4. relevant components under `components/`
5. service-owned read model for the route

Read `references/evidence-map.md` for UI surfaces. Read `references/verification.md` before checks.

## Workflow

1. Identify the role, route, and daily workflow.
2. Verify service-owned read models and permission-aware state exist before UI changes.
3. Check command-center anatomy: operating truth, alerts, next actions, lists/tables, drilldowns, robust states.
4. Preserve design tokens, density, shell behavior, mobile parity, accessibility, and visual consistency.
5. Remove dashboard-only truth or decorative metrics when service evidence is missing.
6. Verify with focused UI checks, accessibility checks, and screenshots when relevant.

## Guardrails

- Do not start with UI when service-owned truth is missing.
- Do not create route-local palettes that conflict with the UI constitution.
- Do not add decorative metrics or client-derived business truth.
- Do not hide permission, empty, error, loading, stale, or blocked states.

## Output Contract

Report role, route, service evidence, UX findings, changed files, verification results, screenshots if used, and remaining usability risk.
