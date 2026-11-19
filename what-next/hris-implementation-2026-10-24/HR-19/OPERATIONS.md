# Payroll-input handoff operations

Delivery mode: **HR_CORE_WITH_HANDOFF**. These are HR input files, never calculated earnings, payment instructions, settlement proof or statutory filings. Existing country payroll admission remains unchanged.

## Admission for a named employer

Before a real dry run, identify employer/country, HR operator, a different payroll recipient, support owner and a reviewed input contract. The generic `HR_CORE_INPUTS_V1` contains IDs, source revisions, applicability dates, decimal currency references, basis-point rates, minutes, exclusions and totals. A recipient must explicitly accept those meanings, including the fact that contract base salary is a reference and is not period earnings. More than one active contract segment blocks this generic version pending a reviewed mapping.

Configure `HRIS_PAYROLL_HANDOFF_POLICIES_JSON` through the existing deployment configuration process. Each policy requires organizationId, version, countryCode, recipientUserId, recipientLabel, templateVersion `HR_CORE_INPUTS_V1`, approvalReference, effectiveFrom, effectiveTo and enabled. Exactly one active policy is required. No real recipient or approval is supplied by this implementation; test configuration contains synthetic identities only. Invalid or absent configuration fails closed.

Operator requires current handoff read/export, HR management and existing salary visibility (`EMPLOYEE_SALARY_READ` or `payroll.payslips.read`). Recipient requires current handoff read/receive and existing salary visibility. Grant narrowly using the existing role process. No automatic default grants. Recipient and issuer must differ. A recipient without HR management sees only addressed retained packages and a current-status result, never newly gathered employee sources.

## Daily procedure

1. Open People → Daily HR work → payroll handoff. Choose the exact period/country. Check inputs and review the included population, exclusions, units and totals.
2. Resolve each blocker in its existing source workspace: employee identity and dates; approved contract/document; approved compensation/payment destination; pending requests/cancellations; attendance anomalies and exact certified period totals. Return and check inputs again.
3. Issue the package. The server rechecks current inputs, the named recipient and authority; a changed preview is rejected. Original JSON/CSV bytes, hashes, version, issuer and predecessor are immutable.
4. Recipient opens the addressed package, downloads the originals, reconciles every identity, date, unit, total and exclusion, and records a review reference. All rows are explicitly partitioned between accepted and rejected; each rejected row needs a reason. A receipt is final for that package.
5. HR fixes rejected source facts through their native approval/certification workflows. Source changes make the prior package stale. Check inputs and issue a linked replacement. Recipient reconciles the replacement independently; original bytes and prior outcome remain retained.
6. Refresh failures hide prior details. If a mutation has a confirmed response, retry reloads the recorded outcome. If the response was lost, retry resubmits the exact original request/key and recovers the single outcome.

History lists the newest100 periods/packages with an explicit limit. Preview resolves the current period's predecessor independently; a full history does not block current issuance. Older periods outside the list are not discoverable through this initial screen: support must use an authorized existing period administration process, not an unreviewed database edit. Up to200 eligible employees and1000 current population candidates are supported; overflow is explicit.

## Release, monitoring and recovery

Two additive migrations are required: immutable package/receipt storage and follow-on actor/lineage guards. Apply only through the existing reviewed migration promotion process for a separately authorized target. The implementation used an explicitly named disposable PostgreSQL database. It did not promote a production schema or regenerate a locked Prisma engine.

Audit/business events contain identifiers, hashes, versions and counts, not salary manifests or recipient rejection text. Monitor blocked preview, stale source, access denial, retry conflicts and unavailable database outcomes through existing error handling. No new automatic email, notification or external provider delivery is introduced.

Disable the reviewed policy to stop new issuance. Exact authorized issue/receipt recovery and retained original reads continue; current status may become unavailable. Revoke roles through the existing process when access must stop. Never overwrite or delete issued bytes to repair a problem. Production services expose no trigger bypass or delete operation. Test-only trigger suspension is restricted by an exact disposable URL guard and exists only for synthetic cleanup.

No live pilot, external payroll import, legal acceptance, bank acceptance, deployment or restore of customer records has been performed. A named employer, recipient/template dry run, operators, support owner and release decision remain required for HR-21 launch acceptance.
