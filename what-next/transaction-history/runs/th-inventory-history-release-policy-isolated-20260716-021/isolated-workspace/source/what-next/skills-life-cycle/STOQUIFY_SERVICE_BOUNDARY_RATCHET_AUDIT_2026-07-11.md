# Stoquify Service Boundary Ratchet Audit

Date: 2026-07-11

Mode: audit-only

Primary skill: `stoquify-service-boundary-ratchet`

Supporting skills:

- `stoquify-ohada-leadership-orchestrator`
- `stoquify-rbac-tenant-freshauth-enforcer`
- `stoquify-public-api-abuse-boundary`
- `stoquify-release-evidence-ratchet`

## Scope

Run the first real audit required by the Stoquify OHADA skill-suite blueprint. The goal was to verify current service-boundary, API guard, and module-surface evidence before starting implementation work.

## Non-Goals

- No code changes.
- No broad refactor.
- No new module enforcement behavior.
- No UI changes.
- No statutory or accounting production claims.

## Evidence Inspected

- `docs/skills-life-cycle/STOQUIFY_OHADA_SMB_SKILL_SUITE_EXECUTION_BLUEPRINT_2026-07-11.md`
- `docs/skills-life-cycle/STOQUIFY_OHADA_SMB_SKILLS_AUDIT_REPORT_2026-07-11.md`
- `docs/skills-life-cycle/stoquify-ohada-skill-suite-src/`
- `scripts/service-boundary-gate.js`
- `scripts/api-route-guard-inventory.js`
- `scripts/module-surface-inventory.js`
- `what-next/api-route-guard-inventory.md`
- `what-next/module-surface-inventory.md`

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run service:boundary:fail` | Passed | Active service-boundary violations: 0. Allowed test/mock/service findings: 10. Total callsites scanned: 10. |
| `npm run api:guard:inventory:fail` | Passed | API route guard inventory wrote 12 records and found no active issues. |
| `npm run module:surface:inventory` | Passed in report mode | Module surface inventory wrote 306 records. |

## Findings

### 1. Service Boundary Is Currently Clean

The service-boundary gate reported zero active direct Prisma or action-owned mutation violations in the scanned runtime boundaries.

This is a strong baseline. The next work should preserve it rather than starting with broad service refactors.

### 2. API Guard Inventory Is Clean

The API guard inventory found no active issues.

Summary from `what-next/api-route-guard-inventory.md`:

- API routes inventoried: 10
- Supporting guard evidence files inventoried: 2
- Evidence files inventoried: 12
- Issues flagged: 0
- Module access: none=7, enforced=5

This suggests the immediate public/API risk is lower than the module-surface permission-normalization risk.

### 3. Module Surface Inventory Remains the Main Ratchet Surface

Summary from `what-next/module-surface-inventory.md`:

- Catalog modules: 20
- Surfaces inventoried: 306
- Source coverage: sidebar=present, moduleCatalog=present, dashboardRoot=present, actionsRoot=present
- Enforcement candidate: 306
- Mapped: 248
- Missing permission: 41
- Unmapped: 58
- Delegated re-export: 1

The module report is not a service-boundary failure, but it is the best next implementation frontier because Stoquify's operating-system promise depends on consistent module entitlement and permission ergonomics.

## Recommended First Implementation Slice

Run `stoquify-rbac-tenant-freshauth-enforcer` against the module-surface report in a narrow first pass.

Recommended slice:

- Target the highest-risk `missing permission` and `unmapped` action surfaces that are clearly operational, not shared helpers.
- Prioritize POS, organization/settings, users/roles, payroll setup/country-pack, analytics reports, and storage/config actions.
- Keep broad module enforcement report-only.
- Do not touch pages or UI until the action/API permission model is normalized.

## Suggested Next Prompt

```md
Use `stoquify-ohada-leadership-orchestrator` to run `stoquify-rbac-tenant-freshauth-enforcer` in narrow implementation mode.

Mission:
Use `what-next/module-surface-inventory.md` and `what-next/module-surface-inventory.json` to select the safest high-impact first slice of missing/unmapped action permissions. Keep broad module enforcement report-only. Do not touch unrelated lint warnings or UI.

Required outputs:
- exact selected action files
- permission/module rationale
- code changes only for the selected slice
- focused verification commands
- saved report under `what-next/skills-life-cycle/`
```

## Residual Risk

The clean service-boundary and API guard results do not mean the product is fully enterprise-ready. They mean the next highest-leverage work has shifted from direct service-boundary violations to module/RBAC normalization and domain-specific finance evidence skills.
