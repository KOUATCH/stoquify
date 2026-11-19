# HR-09 additive data and rollout review

Existing HrisManagerDelegation requires two employee records. A one-employee company needs a separately authenticated tenant member to review time configuration without a fictitious employee or tenant-wide manager grant. HrisSetupReviewerGrant is bounded authorization evidence, not a new employee master or decision engine. Existing operational-time services continue to own decisions.

The additive table has composite tenant/user and tenant/employee foreign keys, finite ordered intervals, independent grantor, explicit domain/scope checks and a tenant/reviewer/domain/expiry index. No backfill or change to legacy delegations. New grants are explicit; read-only grants never decide. Revocation retains history. Decision transactions share-lock the current account/organization and grant; setup writes serialize on the organization. Existing employment/reporting history remains unchanged.

Reviewed local target only: PostgreSQL 17 on 127.0.0.1:55464, database stoquify_local_hris_20261024. Apply only this migration to the already owned synthetic cluster using psql ON_ERROR_STOP and a transaction. Do not run db push, reset, application seeders or production schema promotion. Real production promotion remains under the existing migration release controls.

Deployment-owned `HRIS_SETUP_PILOT_ORGANIZATIONS` is a comma-separated exact tenant allowlist, empty by default. No live tenant IDs are supplied in this change. Before activation collect actual employer structure, reviewed policy sources, named independent verified reviewers and tested roles. Grant checkers only existing hris.people.read entry access plus the narrow grant. Source decisions check current account, scope and expiry. Other payroll/financial approval workflows remain separately authorized.

Rollback: remove the tenant from the allowlist/disable setup entry points. Keep the additive table, approved calendars/policies/schedules and audit evidence. Do not revoke previously committed business effects or drop history. No automatic public holidays, accrual or statutory-country defaults are introduced.
