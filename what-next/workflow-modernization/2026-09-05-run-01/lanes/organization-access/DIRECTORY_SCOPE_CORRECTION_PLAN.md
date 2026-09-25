# Organization directory scope correction plan

Status: source trace complete; proposed tests and patch only. No production/test edits or execution during browser freeze. Parent explicitly authorized this as the next correction after freeze.

## Demonstrated source path

1. Company Settings page (app/[locale]/(dashboard)/dashboard/settings/company/page.tsx:43) renders OrganizationManagementTable with session.user.organizationId. The legacy organization route redirects here.
2. Table calls useOrganizationManagementRows -> getOrganizationManagementRows action. requireOrganizationRead requires system.organization.read and assertCanUseOrganization on requested tenant.
3. requireRbacContext builds ctx.user.permissions from current database role permissions (lib/security/rbac.ts:174); action passes ctx.user as actor.
4. getOrganizationManagementRowsForActor asks canReadOrganizations(actor). The same system.organization.read permission is sufficient, so findMany uses only deletedAt:null instead of current tenant ID. It then groups PAID payments for every returned organization and returns customer/supplier/user/order counts, identity/region/defaults and paidRevenue. CSV uses these same rows.

## Intended authority and scope

No distinct platform/global-admin authority, allowlist or membership resolver exists in this path. isSuperUser is derived from wildcard permissions on ordinary tenant roles; new organization templates contain that wildcard. Both assertCanUseOrganization and resolveRoleOrganization explicitly reject other organizations, including wildcard contexts. The API v1 organisations read also returns only current tenant. Therefore the correction must preserve same-tenant directory scope for all callers. Do not add a wildcard or permission-name exception.

## Exact proposed production change

Own only services/organization/organization-settings.service.ts:getOrganizationManagementRowsForActor initially. Change Organization.findMany where to { id: input.organizationId, deletedAt: null } unconditionally. Keep public result shape and call signature so action/hook/table consumers are unchanged. Existing organizationIds from this scoped query may feed Payment.groupBy; bind/assert they contain only current ID. Empty successful query still returns [] and must not query payments. Keep read failures propagating. No schema, seed, permission vocabulary, provider, organization creation or shared auth modification is required for the listing fix. Existing capability helper exports can remain to avoid unrelated cleanup.

## Narrow failing tests to author after release

- New services/organization/__tests__/organization-management-scope.service.test.ts: use two synthetic in-memory tenants/aggregates and a query-sensitive mock; actor with only system.organization.read must return one tenant and group only its payments. Before-fix exact query assertion and returned foreign-row assertion must fail.
- Repeat for ordinary update permission, COMPANY_READ alias, wildcard administrator and empty actor permissions. None grants cross-tenant directory scope; allow only current nondeleted tenant.
- Missing/deleted current tenant returns [] and never requests paid aggregates; thrown organization/payment query errors remain thrown. Current-tenant aggregate values/shape must remain exact (no fabricated defaults except genuine null sums).
- New actions/organization/__tests__/organization-management-scope.actions.test.ts only if existing legacy auth tests do not cover the boundary: wrong requested organization rejects before service; current context passes server ctx.orgId and current actor; failure envelope is retained. Tests do not fabricate a platform admin.
- Existing organization administrator provisioning suite must still pass; it is unrelated behavior that the listing correction must preserve. Focused lint/typecheck coordinated with parent.
- Verification owner may later use authorized isolated synthetic two-tenant read proof. No live customer read or DB query is authorized by this plan, and no such proof is claimed.

## Separate known limitation

createOrganizationForSettings creates an organization and administrator role without owner/member association. Scope correction will not make the new organization usable or visible from the original tenant. That is a separately registered incomplete handoff (OA-F02); do not retain a data leak to mask it or silently assign/transfer the current user. No source migration or business approval is necessary to correct the read boundary.
