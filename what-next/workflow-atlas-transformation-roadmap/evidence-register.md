# Workflow Atlas Transformation Evidence Register

**Generated:** 2026-07-30  
**Purpose:** Record the evidence used to establish the transformation roadmap.  
**Evidence rule:** Current code outranks older reports; functional evidence does not imply authorization or launch readiness.

| ID | Evidence | Verified finding | Confidence | Freshness / limitation |
| --- | --- | --- | --- | --- |
| E-001 | `docs/workflow-atlas/STOQUIFY_WORKFLOW_ATLAS_VALUE_EVALUATION_2026-07-30.md` | Governing verdict is retain, reshape, and split | High | Current governing report |
| E-002 | `app/[locale]/(home)/workflows/page.tsx` | EN/FR public routes render `WorkflowAtlas` | High | Current code |
| E-003 | `components/landing/workflow-atlas.tsx` | Role/outcome state is client-local; recommendations are `visibleWorkflows.slice(0, 3)` | High | Current code |
| E-004 | `components/landing/workflow-atlas-data.ts` | 8 roles, 12 outcomes, 12 workflows, and 41 unique destination hrefs | High | Current code |
| E-005 | `messages/en.json`, `messages/fr.json` | Copy still describes daily shortcut and operating use | High | Current code; P0 blocker |
| E-006 | `scripts/__tests__/workflow-atlas-landing.test.js` | Destination test proves route shape and page-file existence, not authorization | High | Current test |
| E-007 | `package.json` | `ui:gate:workflow-atlas` runs 3 focused suites; browser smoke script is available | High | Current script contract |
| E-008 | `what-next/workflow-atlas-role-conditioned-outcomes/browser-evidence.json` | Saved EN/FR mobile/desktop run passed 4/4 checks with no browser errors, overflow, or clipping | High for recorded run | Single run; dev-server evidence; screenshots were not freshly reviewed |
| E-009 | `what-next/workflow-atlas-role-conditioned-outcomes/screenshots/` | Eight decision/launchpad screenshots exist | High for existence | Human visual review still required |
| E-010 | `config/sidebar.ts` | All 41 current Atlas hrefs are represented in the sidebar comparison; sidebar filtering is permission metadata, not enforcement | High | Read-only source comparison; no CI drift gate |
| E-011 | `services/modules/module-catalog.service.ts` | Catalog has route prefixes, permissions, dependencies, owners, risk, and module slugs | High | Current code; not a complete surface policy |
| E-012 | `services/modules/module-entitlement.service.ts` | Entitlement may derive from requested modules or legacy full-suite defaults; control center reports hard enforcement false | High | Current code |
| E-013 | `lib/security/server-authz.ts` | Enforcing API module guard seam exists | High | Current code; not universal page/action contract |
| E-014 | `what-next/module-system/execution-status.md` | Stage 00 complete; Stage 01 security prerequisites in progress; broad enforcement no-go | High | Current program register |
| E-015 | `what-next/module-system/skill-suite-manifest.json` | Durable entitlement, registry, guard, pilot, rollout, and final release stages remain planned | High | Current program manifest |
| E-016 | `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md` | Module control is mixed-mode and lacks durable commercial entitlement truth | High | Older than current code; consistent with live status |
| E-017 | `lib/security/rbac.ts` | Server-side permission checks and fail-closed unknown permission behavior exist | High | Current code |
| E-018 | `app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx` | Daily Digest derives tenant-scoped access server-side and is a viable pilot placement | High | Current code |
| E-019 | `app/[locale]/(dashboard)/dashboard/manager-action-center/page.tsx` | Manager Action Center is already a source-owned, guarded operating surface | High | Current code |
| E-020 | `services/manager-action-center/manager-action-center.service.ts` | Action state includes tenant, location, freshness, due state, evidence, and maker-checker semantics | High | Current code |
| E-021 | `services/owner-war-room/owner-war-room.service.ts` | Owner view already aggregates source-owned evidence and freshness | High | Current code |
| E-022 | `graphify-out/ORDERED_GRAPHIFY_RUN_2026-07-14.md` and graph reports | Existing graph evidence identifies command and security hubs | Medium | Predates Workflow Atlas; refresh after implementation |
| E-023 | Product/UX specialist review, 2026-07-30 | Six public journey families and Daily Digest-first contextual guidance recommended | High | Read-only repository-grounded review |
| E-024 | Security architecture review, 2026-07-30 | Authenticated projection is NO-GO until destination policy, scope, and entitlement are authoritative | High | Read-only repository-grounded review |
| E-025 | QA/release review, 2026-07-30 | Public preview is conditional GO after copy and visual gates; authenticated pilot requires negative persona matrix | High | Existing evidence inspected, not rerun |

## Verification Already Recorded

| Check | Recorded result | Claim boundary |
| --- | --- | --- |
| `npm run ui:gate:workflow-atlas` | PASS: 3 suites, 12 tests | Component, localization, static route, and smoke-script contracts |
| Saved browser smoke | PASS: 4/4 EN/FR mobile/desktop | One dev-server run; not production reliability |
| Current Atlas href to sidebar comparison | 41/41 represented | Presence only; not permission/module/action parity |
| Multidisciplinary review | Product, security, and QA complete | Planning evidence; no code implemented |

## Evidence Still Required

- Fresh scoped git-status capture when each implementation phase starts.
- Human visual review of current and changed screenshots.
- Production-start browser smoke.
- Accessibility automation plus manual assistive-technology sample.
- Canonical destination-policy snapshot and drift test.
- Durable entitlement and enforcement-policy evidence.
- Authenticated allow/deny/scope/entitlement browser traces.
- Telemetry privacy approval and event-quality evidence.
- Canary, support, and rollback drill evidence.

