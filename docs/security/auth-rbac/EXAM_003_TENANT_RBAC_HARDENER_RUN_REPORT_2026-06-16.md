# Exam 003 Tenant RBAC Hardener Report-Mode Run

Date: 2026-06-16

Skill: `exam-003-aqstoqflow-tenant-rbac-hardener`

Mode: report-only first run. No application code changed.

## Risk Class

Some legacy actions and routes still accept or pass caller-supplied organization scope, and same-actor segregation is not proven across every sensitive workflow.

## Inputs Read

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`

## First Implementation Slice

Use `$exam-003-aqstoqflow-tenant-rbac-hardener` to harden tenant isolation, trusted organization derivation, RBAC, module gates, fresh-auth, and same-actor controls across services/actions/routes.

Start with these files/patterns:

- `lib/security/**/*`
- `services/_shared/**/*`
- `actions/**/*`
- `app/api/**/*`
- `services/**/*`

## Required Gates

- tenant context derived from trusted auth where possible
- RBAC enforced at service boundary
- same-actor approval blocked where required

## Verification To Run After Implementation

```powershell
npm test -- services/_shared actions --runInBand
npm run typecheck
```

## Status

Ready for implementation in the ordered suite. Do not skip lower-numbered unresolved risk classes.
