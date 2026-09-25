# Native module workspace integration

Evidence date: 2026-09-05. Branch: `codex/migration-control-plane-release-2026-08-29`. Starting commit: `a05a41ef66cd5d98fd69ae3df18225795f912232`. The repository was already dirty; the baseline is retained in `evidence/baseline-working-tree.txt`. The published `docs/modern-modules` design and original prototype remain unchanged.

## Delivered behavior

The existing authenticated `/en/dashboard/settings/modules` and `/fr/dashboard/settings/modules` routes now host a native React workbench. An authorized administrator can choose a retailer or service-business starting point, edit capabilities, inspect required connections, obtain a server-generated consequence review, confirm with fresh authentication, and use the resulting workspace. Drafts and submitted changes have durable records. Reopening history creates a new draft.

The shared sidebar, mobile navigation and command search use the saved workspace and current grant decisions in addition to existing role permissions. A workspace selection never creates a grant. Existing direct access and obligations remain protected when an item leaves the workspace. This is a working configuration integration; it does not implement commercial provisioning or universal operational deactivation.

## Integration map

| Accepted behavior | Current implementation reused | Extension and boundary |
|---|---|---|
| Authenticated settings entry | Existing settings route registry, `withSettingsSurfaceAccess`, dashboard layout | Native workbench replaces diagnostic module cards; shell remains shared |
| Catalogue and dependency understanding | `module-catalog.service.ts`, 19 canonical slugs | Typed composition read model distinguishes grants, actual routes, selection and setup; no proposed identifier is installed blindly |
| Retailer and service builder | Shared buttons, checkbox, tabs, dialog, command header and next-intl | Local draft is editable; server computes authoritative dependency closure |
| Consequence review | Existing entitlement evaluator and real accounting/provider reads | Preview binds tenant, actor, permissions, catalogue, revision, grant validity and effective access, setup evidence and consequences |
| Apply and recovery | `protect`, verified password step-up, serializable Prisma transactions | Unique tenant/idempotency key, payload binding, revision compare-and-swap, immutable review/command history |
| Resulting workspace | Current guarded route destinations and role permissions | Sidebar/search/mobile and workspace links derive from persisted configuration; hidden navigation is not authorization |
| Legacy conversion | Registration intent compatibility | Snapshot effective grants before configuration; preserve 19 legacy rights and unknown historical values |
| Record retention | Organization-scoped audit log | Separate configuration, grant and immutable command tables; foreign keys prevent orphan authority/history |

Graph evidence used to locate relationships included actions community 116 (module control) and community 1 (organization settings), followed by current-source verification. Historical July reports are not treated as current test results.

## Access defects corrected

- Explicit empty grants remain empty instead of restoring legacy defaults.
- Missing/inactive organizations do not receive legacy grants.
- Grant validity uses an inclusive start and exclusive end; invalid intervals fail closed.
- Required dependencies must support the requested operation; suspended, expired and read-only dependencies cannot support writes.
- Read-only behavior follows operation intent across page/API/action transports; exports and jobs are not silently treated as reads.
- Enforcement metadata and explanations describe the actual mode. The broad default remains observe; existing enforcing callers remain enforcing.
- Duplicate grants fail closed independently of order; the durable database also enforces one grant per tenant/module.
- Activating an already available capability in an empty legacy configuration preserves all 19 rights.
- Managed tenants use durable grants. The older single-module activation endpoint requires them to use the reviewed workbench.
- Lost configuration with retained grants or history cannot restore legacy rights. Database foreign keys prevent that orphan state.
- A grant expiring between review and submission invalidates the review even if no row was updated.

## Significant decisions and tradeoffs

**Workspace composition and operational authority remain separate.** Existing route enforcement is incomplete. Treating removal as an operational shutdown would give false assurance and could strand payroll, offline POS, reconciliation or accounting obligations. The UI explicitly states that removal affects workspace presentation while access remains. Universal stop-new-work behavior is an implementation gap, not a completed safety feature.

**Apply is atomic, not simulated provisioning.** There are no artificial provider steps, countdowns or success flags. Draft, applied and failed command records correspond to actual storage outcomes. Operational preparation remains in the responsible domain workspace; the previous active workspace survives failed validation. Unknown-outcome retries use the same command; a terminal failure requires a fresh review and new command.

**Existing access is the eligibility ceiling.** No price, subscription or arbitrary new commercial grant is inferred from prototype acceptance. Planned identifiers such as standalone HRIS, assisted work and a separate ledger kernel remain explanatory proposals. The current payroll and accounting boundaries remain intact.

**Durability requires a coordinated migration.** The access reader and shell use the new tables. Apply both additive migrations and generate the matching Prisma client before a target app restart. An unavailable authority store must not fall back to broad legacy access. See `ROLLOUT_AND_RECOVERY.md`.

## Review responsibilities

| Perspective | Applied result |
|---|---|
| Architecture/backend/database | Service-owned contracts, transactional state, explicit authority, scoped keys, immutable history, additive migrations |
| Security/IAM/privacy/fraud | Server-derived tenant/actor, known settings permission, fresh authentication, no wildcard bypass, review binding, no session fabrication |
| Frontend/design/accessibility/localization | Existing shell, current semantic tokens, shared controls, EN/FR, keyboard/dialog and responsive verification |
| Product/SaaS/operations | Outcomes-first recipes, plain capability descriptions, retained access, no invented prices or subscription changes |
| Finance/reconciliation/audit | Actual setup evidence; no failed-query-as-zero conversion; no ledger or obligation mutation; retained review and grant evidence |
| QA/release/SRE | Focused negative tests, isolated PostgreSQL and browser evidence, route timing observations, explicit rollout dependency |
| API/events/offline/provider boundaries | Existing operations remain domain-owned; no provider calls or notifications are added to preview; no unsupported shutdown claims |
| OHADA/country-pack legal/tax review | Not applicable to rule changes: statutory calculations and country packs are unchanged; readiness/certification remains domain/expert controlled |
| AI/agent evaluation | Not applicable: this integration adds no model invocation, autonomous approval or agent execution |
| Growth/billing/integrations | Not applicable to transactional changes: no provider, purchase, pricing or subscription operation is introduced |

No legal, accounting, security, accessibility or release certification is claimed. Actual verification results and source bindings are in `VERIFICATION.md`.
