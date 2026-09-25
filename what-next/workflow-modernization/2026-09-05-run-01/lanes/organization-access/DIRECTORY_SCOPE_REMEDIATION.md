# Organization directory tenant-scope correction

OA-F01 is corrected in the organization directory service. Ordinary organization read/update permission, legacy aliases and a tenant administrator wildcard no longer select all organizations. The query always includes the server-supplied organization ID, so contact details, operational counts and paid-revenue aggregation remain in that tenant.

Only services/organization/organization-settings.service.ts changed in production: the conditional broad where clause became { id: input.organizationId, deletedAt: null }. The function signature, row data, tenant action authorization, permission aliases and wildcard definitions are unchanged. The existing public action first checks requested organization access, then passes ctx.orgId; this service change preserves that boundary.

The new query-sensitive two-tenant regression reproduced 10 failures and 4 passes before the correction (3.523 s), including foreign rows when the current organization was missing/deleted. Afterward the new suite and existing administrator provisioning suite passed all 15 checks (6.999 s). Errors remain errors; only a successful payment query with no paid records produces zero. No database/browser/customer/provider operation occurred.

The baseline Jest JSON output failed with EPERM after the tests finished. DIRECTORY_SCOPE_VERIFICATION.json accurately records the command output and source hashes; it does not claim the missing JSON artifact exists.

Creating another organization has a separate incomplete owner/membership/navigation handoff. This correction does not silently keep cross-tenant exposure to make that created organization visible. A deliberate future global-admin product boundary would need its own explicit authority and entry point.

Runtime tenant-separated directory and CSV verification remain pending. This bounded service result is not whole organization/access workflow completion.
