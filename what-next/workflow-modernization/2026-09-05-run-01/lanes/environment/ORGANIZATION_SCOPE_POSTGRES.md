# Organization listing — read-only PostgreSQL verification

`organization-scope-7e7c1c57.json`:7passed/0failed. The corrected production listing service ran against two existing synthetic tenants in one actual Prisma transaction with PostgreSQL `transaction_read_only=on`, checked at entry and exit. No records, permissions, counters or sessions were created or changed. Source hashes before/after match.

For each tenant, canonical `system.organization.read`, legacy `COMPANY_READ` and wildcard service-input permissions returned exactly that tenant's ID. Eight relation counts matched independently scoped count queries. The legacy organization actually had four users and four purchase orders; the retailer organization had two users and no purchase orders, so the count assertions covered distinct real tenant data. A nonexistent requested tenant returned an empty list instead of any other tenant.

The PAID, non-deleted payment aggregate matched its independently scoped query. Both fixtures contain zero payments; this real test does not prove a nonzero payment sum or mixed payment-status arithmetic. Those require separate unit/fixture evidence and are not fabricated here.

The service was imported with a test-only pinned Prisma transaction adapter. Permission arrays were input variants, not real grants or authenticated user sessions. The service assumes its organization ID was authenticated by its caller; this receipt does not certify the action/session authorization boundary, deleted-tenant behavior, write controls or concurrent isolation beyond the stated read-only transaction.

Service source: `services/organization/organization-settings.service.ts`, SHA256 `d0403ea941a6f18494ee33c75e2920313f6677f56274efd8edb35a9e1861649d`. The receipt also binds the actual schema and verification driver.
