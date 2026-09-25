# Organization and access-management discovery

Read-only source discovery on 2026-09-05. 12 semantic workflows, zero runtime visits and zero complete-workflow verifications. No app/tests/schema/DB/provider changes. ID-03 invitation and ID-04 redemption remain parent-owned cross-references, not duplicate workflow IDs.

## Priority

OA-F01 is the next authorized correction after browser freeze: ordinary current-tenant organization.read becomes an all-tenant directory and aggregate query. Exact entry trace, lack of global authority, minimal owner diff and failing test plan are in DIRECTORY_SCOPE_CORRECTION_PLAN.md. The correction is independent of missing organization-creation membership handoff.

## Current behavior

Current organization settings and member/role reads generally use server-derived tenant identity. Role creation/edit has current grant ceilings; member deactivation preserves records and audits inside its transaction. The model has one organizationId per user and no switch/member-management handoff was found. The organization directory broadening is a service exception to those boundaries.

Organization creation only creates an active record plus administrator template. A usable second-workspace path is missing. User Edit links target an absent route; existing-user role assignment/reactivation was not found. Roles have a real catalogue/create/update path but no retirement and no complete durable governance history. Users and invites have source error-collapse paths; deactivation confirmation and success feedback contradict actual behavior.

## Findings

- **OA-F01 — Ordinary organization read permission broadens directory to every tenant and paid aggregate.** Action requires system.organization.read, asserts requested tenant equals context tenant, then passes ctx.user.permissions. canReadOrganizations returns true for that same permission and omits id from findMany; paid aggregates follow all returned IDs. No distinct platform/global authority found. Scope test/patch plan in DIRECTORY_SCOPE_CORRECTION_PLAN.md. Status: source_confirmed_not_runtime_reproduced.
- **OA-F02 — Additional organization creation has no owner membership or workspace switch.** Transaction creates organization and Administrator role only. No actor association or user transfer. User model is single-organization and guards are tenant strict. Do not introduce a global exception merely to keep newly created rows visible. Status: source_confirmed_incomplete_handoff.
- **OA-F03 — User/invite/role load failures become legitimate empty catalogues.** User/invite actions catch all and return []; roles error data is discarded. Current users page advertises Live Data even for collapsed failures; role update uses not-found for any load failure. Status: source_confirmed_false_empty_paths.
- **OA-F04 — Clearing every role permission skips assignment authority.** updateRole sees [] as truthy, calls assertCanAssignPermissions, which returns early on zero length; service persists []. A roles.update actor without roles.permissions.assign can remove all permissions. No last-admin availability or concurrent revision check found. Status: source_confirmed_authority_gap_requires_policy_regression.
- **OA-F05 — Organization currency/timezone/calendar inputs rely on compile-time types and permissive strings.** Only name trimming validation is explicit in owner. Direct action input can bypass client selects. Currency and operating-date effects on established financial activity require exact domain review, not generic business approval claims. Status: source_confirmed_validation_gap_domain_impact_not_executed.
- **OA-F06 — Fresh-auth and committed-write recovery are incomplete in settings/role forms.** Forms have no local password step-up. Revalidation failure is caught as mutation failure after organization/role commit. Role update can commit then fail reload. No safe same-command create retry identity found. Status: source_evidenced_recovery_defects_not_executed.
- **OA-F07 — Organization profile refetch can replace an unsaved draft.** Effect unconditionally resets all formData whenever query organization changes, with no dirty-state guard. Verify stale query focus/refetch while editing before correction. Status: source_risk_not_runtime_reproduced.
- **OA-F08 — Role mutation governance evidence is best effort after commit.** logSecurityEvent swallows audit insert failures; unlike user deactivation there is no in-transaction before/after audit record for roles. Do not claim trustworthy durable role-change history from this code alone. Status: source_confirmed_audit_limit.
- **OA-F09 — Member deactivation UI falsely claims deletion on rejected action.** deleteUser returns a failure envelope; row callback resolves without throwing; generic action emits Deleted Successfully. Confirmation says irreversible physical deletion while owner deactivates and retains history. No write or browser attempt performed. Status: source_confirmed_false_success_path.
- **OA-F10 — Users/role editing/invite administration retain English-only copy and misleading actions.** RoleForm uses /roles footer/header and unlocalized navigation; most users/admin copy and date formatting are English. Actions are presented independent of their specific mutation permission, leaving server denial as first explanation. Actual EN/FR, keyboard and mobile checks pending. Status: source_confirmed_localization_and_action_affordance_gaps.
- **OA-F11 — User edit links target a route absent from current source.** No settings/users/update/[id] page found; no member update/reactivation/role-assignment workflow found beyond invitations. Read helper is not an editing workflow. Status: source_confirmed_missing_route.
- **OA-F12 — Client permission refresh can conceal service errors or lag role changes.** Client key is user ID, five-minute staleTime; non-OK becomes empty permissions. Role mutations revalidate route only. Explicit private/no-store/error semantics differ across endpoints; server RBAC remains fresh and this is not a proven authorization bypass. Status: source_risk_and_recovery_gap_not_runtime_reproduced.

## Verification boundaries

Current source and graph hints were read; existing test files were located, not executed. Graphs communities 9/26/111/163 (components), 1/0/102 (actions), 14/32 (hooks), and 164/165/166/49/167/3 (routes) helped locate owners and were checked against current source. SOURCE_BINDING.json retains hashes for 47 files. The reports do not certify IAM, tenant isolation, accessibility, privacy, accounting effects or release readiness.

Next implementation is narrowly sequenced after source freeze, starting with directory scope; other findings remain independent recorded work.
