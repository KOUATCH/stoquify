# Qualified skill routing

This is a small routing index, not a requirement to load all skills. Resolve the active harness catalog first; user-level paths and cached plugin versions differ across machines. If a listed capability is absent, say so and use the linked project workflow rather than silently installing it. No slash command is assumed to exist.

| Qualified capability | When to load | Authoritative project supplement |
|---|---|---|
| ECC `configure-ecc` | Native plugin health/update request | [Maintenance](maintenance.md); inspect compatible Codex executable first; do not map Claude hook modes to Codex |
| ECC `search-first` | Before adding an unfamiliar utility or workflow | Current code, tests and graphify nodes; preserve existing services/components |
| ECC `blueprint` | Multi-session/cross-domain plan | Small owned phases, verification and rollback; actual collaboration API only when authorized |
| ECC `security-review` | Auth, permissions, files, payment/sensitive changes | [Workflow risk matrix](WORKFLOW.md); fresh RBAC, tenant binding, step-up, evidence/privacy and replay |
| ECC `verification-loop` | Meaningful implementation/release verification | [Command registry](command-registry.json) and [test lanes](test-lanes.md), not the generic build recipe |
| ECC `frontend-patterns` / `backend-patterns` | Focused implementation/review | Existing Next/React/Prisma/Better Auth architecture and installed versions |
| ECC `skill-stocktake` | Targeted duplication or upgrade review | Review relevant roots, record actual usage as unknown unless measured; no automatic deletion |
| Project `.agents/skills/ui-ux-pro-max/SKILL.md` | UI decision, review, accessibility, interaction | [Design master](../../design-system/stoquify/MASTER.md) and scoped page contract first; generic search is advisory |
| Project `.agents/skills/design-system/SKILL.md` | Token/component engineering | Implemented `app/globals.css`, `tailwind.config.ts` and canonical registries; existing token ownership |
| Project `.agents/skills/brand/SKILL.md` | Brand identity assets/approved adoption | `docs/branding/` proposal status versus current product decisions; do not run unmapped token sync |
| Project `.agents/skills/design/SKILL.md` | Route a design task, marketing/assets | Route product UI to master/UIUX; use discovered project-relative scripts |
| Project `.agents/skills/ui-styling/SKILL.md` | Implement existing UI components | Tailwind 3 baseline and current shared primitives; no implicit framework upgrade/init |
| AQStoqFlow domain/UIUX skills | Specific business or UI program work when installed | Project-owned services, invariants, constitution and tests remain available if global skill is missing |

Two skills are named `design-system`: qualify the project version for token work and ECC's version for an optional extraction/review checklist. Do not generate competing design authorities. Duplicate Neon files in .agents/.claude remain in place until cross-harness distribution is deliberately reviewed. Different `caveman` copies are not assumed interchangeable.

Legacy trigger availability on 2026-10-07: global graphify, test-gen and enterprise-error-handling-complete paths were missing; enterprise-error-handling existed. Re-discover rather than hard-code these observations as permanent truth. Use AGENTS fallback behavior.

Select the model available in the active host; use stronger reasoning for architecture/security decisions and ordinary settings for mechanical edits. Do not copy model names or tool APIs from another provider's examples.
