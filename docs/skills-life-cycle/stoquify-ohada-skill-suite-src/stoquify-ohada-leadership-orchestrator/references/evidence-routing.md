# Evidence Routing

Use this reference when the user asks for broad improvement, maximum results, multi-skill execution, or a vaguely scoped enterprise-grade pass.

## First Evidence

- `package.json` for available gates and focused commands.
- `docs/skills-life-cycle/STOQUIFY_OHADA_SMB_SKILLS_AUDIT_REPORT_2026-07-11.md` for skill missions.
- `docs/skills-life-cycle/STOQUIFY_OHADA_SMB_SKILL_SUITE_EXECUTION_BLUEPRINT_2026-07-11.md` for suite order.
- `what-next/` for current execution evidence.
- `graphify-out/` only when architecture, dependency, or impact analysis is required.

## Routing Tests

- If the request asks "what should we do first", pick `stoquify-service-boundary-ratchet`.
- If the request touches money and close readiness, support with `stoquify-ledger-close-truth-guardian`.
- If the request touches user access or module entitlement, support with `stoquify-rbac-tenant-freshauth-enforcer`.
- If the request touches public access, customer links, or APIs, support with `stoquify-public-api-abuse-boundary`.
- If the request asks for release confidence, support with `stoquify-release-evidence-ratchet`.

## Report Rule

Save a report when the run inspects more than one module, changes files, executes verification, or identifies blockers that should survive beyond chat.
