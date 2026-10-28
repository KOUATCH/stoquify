# Workflow Atlas Transformation Risk Register

**Generated:** 2026-07-30  
**Current decision:** Public lane conditional; authenticated lane NO-GO.

| ID | Severity | Risk | Current evidence | Treatment / control | Owner | Trigger / exit |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | Critical | Public role selection is reused as authorization input | Current selector is client-local and harmless; future misuse would allow self-selected projection | Projection API accepts no role/outcome input; tampering test proves output unchanged | Security | Zero role-derived access paths |
| R-002 | Critical | Cross-tenant or wrong-location work is disclosed | Scope is not yet a universal destination contract | Server session, tenant, location/self resolver, negative E2E, no sensitive denied records | Identity/Security | Any disclosure kills authenticated projection |
| R-003 | High | Permission and module entitlement are conflated | Sidebar and public Atlas expose route metadata; module truth is mixed-mode | Separate permission, scope, entitlement, freshness, and data-state decisions | Platform | Canonical contract and negative matrix pass |
| R-004 | High | Enforce decisions use requested-module or legacy fallback | Current evaluator supports legacy defaults | Durable entitlement read model; prohibit fallback in enforce mode | Module Control Plane | No-access-loss migration and enforce tests pass |
| R-005 | High | Route, sidebar, page guard, module catalog, and action guard drift | 41/41 are represented today but live in separate maps | Stable destination IDs and registry parity gate | Platform Navigation | Zero mismatch before pilot |
| R-006 | High | Hidden counts or entitlement detail leak on denial | Current authenticated projection does not exist | Permission denial masks all sensitive metadata; separate safe state adapter | Security/Dashboard | Negative leakage suite passes |
| R-007 | High | Sensitive action bypasses fresh auth or maker-checker | Existing controls vary by domain | Preserve domain action guards; projection never performs sensitive action | Domain Owners | Action-boundary tests pass |
| R-008 | High | Public copy overstates live capability | EN/FR daily-launch language remains | Phase 1 copy gate and product sign-off | Product/Content | Zero prohibited claims |
| R-009 | Medium | Public guide remains repetitive and hard to scan | Recommendations, map, and library repeat cards | Six journey families and progressive detail | Product/UX | Usability and duplication checks pass |
| R-010 | Medium | Authenticated layer becomes a second static sidebar | Current Atlas is static; command surfaces already exist | Daily Digest-first placement; measure time-to-action and repeat use | Product | Retire if no measured benefit |
| R-011 | Medium | HRIS/payroll privacy boundary is blurred | Current public `hrPayroll` role combines distinct duties | Separate HRIS, payroll admin, and self-service policies | HRIS/Payroll/Security | Persona and redaction tests pass |
| R-012 | Medium | Denied and unavailable states are inconsistent | Existing surfaces use several state vocabularies | Normalized access enum plus separate data readiness | Dashboard/Security | State contract tests pass |
| R-013 | Medium | Analytics creates privacy or retention exposure | No approved Atlas telemetry contract | Approve owner, consent, retention, payload, deletion before events | Privacy/Analytics | Written approval required |
| R-014 | Medium | Browser evidence is stale or visually unreviewed | Existing July 28 run passed; visual helper previously failed | Fresh production-like screenshots and human review | QA/Design | Sign-off attached to phase report |
| R-015 | Medium | Current graph evidence misses new Atlas relationships | Graphs predate Atlas | Treat as boundary evidence only; refresh after implementation | Architecture | Updated graph manifest recorded |
| R-016 | Medium | Rollout cannot be reversed cleanly | No authenticated feature exists yet | Feature flag, cohort policy, kill switch, fallback to existing surfaces | Release/SRE | Rollback drill passes |
| R-017 | Low | Public continuation sends signed-in users through an awkward login path | Current CTA points to `/login` | Safe return path or authenticated adapter after security review | Frontend/Identity | Browser continuation test passes |
| R-018 | Low | Roadmap work touches unrelated dirty files | Workspace is heavily dirty | Phase-owned file list, pre/post status capture, no unrelated cleanup | Every phase DRI | Scoped diff only |

## Promotion Blockers

The authenticated projection remains blocked while any of these is true:

- Module Stage 01 security prerequisites are incomplete.
- Destination policy is not canonical and server-only.
- Durable tenant entitlement is absent.
- Legacy/requested-module fallback can influence enforce decisions.
- Tenant/location/self scope cannot be proven for every displayed destination.
- Page and action/API authorization parity is incomplete.
- Any critical or high risk above lacks passing negative evidence.

## Immediate Kill Conditions

- Cross-tenant, scope, hidden-count, or sensitive-state disclosure.
- One destination-policy/page/action authorization disagreement.
- Stale or revoked session receives projected work.
- Public role tampering changes authenticated output.
- Authorized-destination success falls below 98%.
- Projection duplicates existing navigation without measurable task benefit.

