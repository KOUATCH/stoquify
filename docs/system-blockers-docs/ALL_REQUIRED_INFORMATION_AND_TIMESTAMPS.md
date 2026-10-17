# All required information and accompanying timestamps

This consolidates the previously identified gate inputs, existing people/roles/IDs, database dates, external evidence dates, validity periods, freshness rules and missing user inputs. It covers the audited workflows and does not claim a complete inventory of every application endpoint.

## Snapshot and date convention

| Fact | Recorded value |
| --- | --- |
| Database | localhost:5432/stoquify_replay_next_20260830 |
| Database observed at (UTC) | 2026-09-27T13:09:52.689Z |
| Same instant in Europe/Paris | 27/09/2026, 15:09:52 GMT+2 |
| Same instant in Africa/Douala | 27/09/2026, 14:09:52 GMT+1 |
| Latest applied migration | 20260920060000_pos_checkout_lifecycle |
| Migration started_at | 2026-09-20T11:56:54.247Z |
| Migration finished_at | 2026-09-20T11:56:54.247Z |
| Migration rolled_back_at | NOT RECORDED |
| Data access | Enforced read-only transaction; ROLLBACK; no database or approval changes |

Use ISO 8601 with an explicit timezone for instants. Keep date-only business dates as dates. Existing timestamps are evidence of what is stored, not proof of genuine appointment, review or historical business truth. The full source query and database column type accompany every extracted date.

## Complete information files

- [Complete fill-in worksheet, including each required date](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/FILL_IN_REQUIRED_INFORMATION.md>)
- [All 23 existing named candidate assignments and stored dates](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/NAMED_PEOPLE_AND_TIMESTAMPS.md>)
- [All 180 users, IDs, role/employee links and dates](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/people-with-timestamps.csv>)
- [All 174 tenant roles, permissions and creation/update dates](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/roles-with-timestamps.csv>)
- [Every extracted record-level timestamp, including UTC/Paris/Douala display](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/database-timestamps.csv>)
- [All selected required fields, exact types, constraints, current values and IDs](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/all-required-database-fields.json>)
- [All external contract fields, current values, formats and destinations](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/external-required-fields.csv>)
- [Exact external review/approval/validity/expiry timestamp paths](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/external-required-timestamps.csv>)
- [All 11 G1 decisions and 33 nominated role approvals](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/g1-complete-approval-worksheet.csv>)
- [Exact chronological and freshness rules](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/TIME_RULES.md>)
- [Complete structured request for missing information](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/complete-missing-inputs.json>)

## Required dates by input

| Input | What accompanies the information |
| --- | --- |
| INPUT-01 Your decision | Business decision record: record the actual decision date. If an AI activation window is selected, use AgentActivationPackage.activationStartsAt and activationEndsAt. Other pilot planning dates are planning metadata, not newly invented database columns. |
| INPUT-02 Appointments and identity resolution | Genuine appointment/delegation document effective-from/effective-to and date of signing/acceptance, where its contract requires them. AccountantAccessGrant uses consentGrantedAt/effectiveFrom/expiresAt; HrisManagerDelegation uses effectiveFrom/effectiveTo and existing evidence references. No generic appointmentAt or _UserRoles.assignedAt column is implemented. |
| INPUT-03 Qualified expert evidence | requiredApproval.reviewedAt, effectiveFrom, effectiveTo (optional/open-ended only when justified); actual document dates and source effective period. ComplianceAdapterConfig reviewedAt/approvedAt/officialSpecPublishedAt/officialSpecEffectiveFrom are separate fields. |
| INPUT-04 Accountable product/control decisions | For each of 33 G1 role obligations: actual freshAuthenticatedAt and approvedAt. For each of 11 decisions: future reviewOrExpiryAt. Attestation verifiedAt/reviewOrExpiryAt and signing-key validFrom/validUntil are also required by the evidence contract. |
| INPUT-05 Real company, workforce and product inputs | Employer/product classification source-effective dates and genuine review date in its evidence document; current schema does not provide a complete per-product tax-approval record. HR uses PayrollEmployee.hireDate/terminationDate, PayrollContract.effectiveFrom/effectiveTo, HrisWorkCalendar.reviewedAt/effectiveFrom/effectiveTo, HrisLeavePolicy.approvedAt/effectiveFrom/effectiveTo. Preserve business dates and period timezone. |
| INPUT-06 Provider and integration inputs | ComplianceAdapterConfig officialSpecPublishedAt/officialSpecEffectiveFrom, reviewedAt, approvedAt, credentialExpiresAt and actual credentialRotatedAt if applicable. SettlementAccount approvedAt/effectiveFrom/effectiveTo. Provider dates and managed-secret expiry come from the provider/operator, not invented defaults. |
| INPUT-07 Conditional AI pilot / operations | Product/security decidedAt/expiresAt; six owner acceptedAt/coverageStartsAt/coverageEndsAt (plus runtime owner validUntil when used); release activationStartsAt/activationEndsAt; certification passedAt/expiresAt; CI/governance/deployment/scheduler/alert/rotation times listed in TIME_RULES.md and external-required-timestamps.csv. |
| INPUT-08 Deployment inputs | Actual deployment, attestation, credential rotation/review and operational test timestamps from the deployment/evidence systems. Generated audit or file-modification time is not deployment/approval time. |
| INPUT-09 Four existing stocking-unit choices | Record the catalog decision and its intended effective business date in supporting evidence if a change is authorized. Item.updatedAt/Unit.updatedAt are written by the system and do not prove user approval. There is no dedicated stocking-unit approval timestamp in the inspected Item/Unit schema. |

## Existing gate-owner nominations

| Existing name | Role | User ID | Account created (UTC) | Account updated (UTC) |
| --- | --- | --- | --- | --- |
| Yongwa Eli | accounting_owner | rds_org_001_compliance_user_accounting_owner | 2026-08-30T19:51:55.366Z | 2026-08-30T19:51:55.366Z |
| Yonga Springfield | checker | rds_org_001_compliance_user_checker | 2026-08-30T19:51:54.935Z | 2026-08-30T19:51:54.935Z |
| Kouatchoua Marceline | controller_approver | rds_org_001_compliance_user_controller_approver | 2026-08-30T19:51:55.022Z | 2026-08-30T19:51:55.022Z |
| Sango Malo | database_migration_operator | rds_org_001_compliance_user_database_migration_operator | 2026-08-30T19:51:54.868Z | 2026-08-30T19:51:54.868Z |
| Tchami Jennifer | financial_controller | rds_org_001_compliance_user_financial_controller | 2026-08-30T19:51:55.001Z | 2026-08-30T19:51:55.001Z |
| Yonga Lysette | fulfillment_owner | rds_org_001_compliance_user_fulfillment_owner | 2026-08-30T19:51:55.339Z | 2026-08-30T19:51:55.339Z |
| Maximilliano Bonga | independent_migration_checker | rds_org_001_compliance_user_independent_migration_checker | 2026-08-30T19:51:54.893Z | 2026-08-30T19:51:54.893Z |
| Tchana Rose | inventory_controller | rds_org_001_compliance_user_inventory_controller | 2026-08-30T19:51:55.315Z | 2026-08-30T19:51:55.315Z |
| Tamen Marceline | maker | rds_org_001_compliance_user_maker | 2026-08-30T19:51:54.914Z | 2026-08-30T19:51:54.914Z |
| Tamen Marceline | order_to_cash_product_owner | rds_org_001_compliance_user_order_to_cash_product_owner | 2026-08-30T19:51:55.246Z | 2026-08-30T19:51:55.246Z |
| Yonga Junie | payments_owner | rds_org_001_compliance_user_payments_owner | 2026-08-30T19:51:55.046Z | 2026-08-30T19:51:55.046Z |
| tchakoumiLorrain | pos_architect | rds_org_001_compliance_user_pos_architect | 2026-08-30T19:51:55.091Z | 2026-08-30T19:51:55.091Z |
| Kouatchoua Mark | product_approver | rds_org_001_compliance_user_product_approver | 2026-08-30T19:51:54.980Z | 2026-08-30T19:51:54.980Z |
| Arielle Yongwa | product_owner | rds_org_001_compliance_user_product_owner | 2026-08-30T19:51:54.958Z | 2026-08-30T19:51:54.958Z |
| Sonkeng Steve | qa_owner | rds_org_001_compliance_user_qa_owner | 2026-08-30T19:51:55.179Z | 2026-08-30T19:51:55.179Z |
| Tchana Nikita | qualified_accounting_reviewer | rds_org_001_compliance_user_qualified_accounting_reviewer | 2026-08-30T19:51:55.266Z | 2026-08-30T19:51:55.266Z |
| Kouatchoua mMark | qualified_cameroon_country_pack_reviewer | rds_org_001_compliance_user_qualified_cameroon_country_pack_reviewer | 2026-08-30T19:51:55.289Z | 2026-08-30T19:51:55.289Z |
| Tamen Max | retail_operations_owner | rds_org_001_compliance_user_retail_operations_owner | 2026-08-30T19:51:55.067Z | 2026-08-30T19:51:55.067Z |
| Tamen Martial | risk_owner | rds_org_001_compliance_user_risk_owner | 2026-08-30T19:51:55.155Z | 2026-08-30T19:51:55.155Z |
| Yonga Springfield | security_owner | rds_org_001_compliance_user_security_owner | 2026-08-30T19:51:55.113Z | 2026-08-30T19:51:55.113Z |
| Ronald Djakou | sre_owner | rds_org_001_compliance_user_sre_owner | 2026-08-30T19:51:55.221Z | 2026-08-30T19:51:55.221Z |
| Etoo Naomie | support_owner | rds_org_001_compliance_user_support_owner | 2026-08-30T19:51:55.200Z | 2026-08-30T19:51:55.200Z |
| Tamen Stanick | treasury_owner | rds_org_001_compliance_user_treasury_owner | 2026-08-30T19:51:55.134Z | 2026-08-30T19:51:55.134Z |

## Dates that cannot be truthfully filled from the current database

- Role-assignment time: `_UserRoles` has only the role/user keys, no assignment timestamp. `Role.createdAt` is the creation of the role definition, not membership time.
- Genuine appointment, professional qualification/review and external signature dates: no verified authority was established by seeded accounts. The relevant signer/reviewer must provide authentic dated evidence.
- POS G1: the current detached decision approval register has no approval entries. The prefilled worksheet contains nominees and technical decisions; authentication/approval/expiry dates remain empty.
- Generic product-tax classification and stocking-unit approvals: the inspected Item/TaxRate/Unit contracts lack complete dated approval/provenance storage. Their required real evidence cannot be represented by inventing a column.
- Session fresh-authentication times: derived from the actual live protected session when an action occurs. They are not manual values to submit in this worksheet.
- Activation/revocation/deletion/termination: no event means no event timestamp. Null does not automatically mean a missing requirement.

## Current blockers and scope

The prior [decision brief](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/DECISION_BRIEF.md>) and [gate register](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/GATE_REGISTER.md>) retain their original audit times and the 13-pass/8-blocked gate outcomes; those validators were not rerun just to add dates. The new extraction refreshes database information only. Further development can continue while engineering repairs data/access/configuration gaps and authorized owners provide missing decisions/evidence.

Identity conflicts remain: checker Yonga Claude in supplied documentation versus Yonga Springfield in the database; confirm Kouatchoua mMark versus Kouatchoua Mark. Separate accounts with repeated Tamen Marceline/Yonga Springfield names do not prove independent people.

## External field contracts

The complete field tables below retain the original exact storage paths and required formats. Some composite rows summarize several implemented fields; exact date rows are expanded in the external timestamp CSV. Fields marked prior contract/grouped remain definitions, not newly observed values.

### CM_CNPS_PRODUCTION_APPROVAL

Stage: Production CNPS authority; not a development-code prerequisite. Destination: docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json.

| Field | Type | Current value / definition | Required format / rule |
| --- | --- | --- | --- |
| requiredApproval.reviewerIdentity | string | NOT RECORDED | Nonempty. Must resolve to an actual appointed qualified reviewer; plain seed display name is not sufficient authority. |
| requiredApproval.reviewedAt | string | NOT RECORDED | Gate checks nonempty only; supply actual ISO-8601 UTC timestamp of review. |
| requiredApproval.effectiveFrom | string | NOT RECORDED | Gate checks nonempty only; document YYYY-MM-DD effective date tied to reviewed law/pack. |
| requiredApproval.effectiveTo | string\|null | NOT RECORDED | Present in manifest but NOT enforced by this static gate; document end date or explicit open-ended validity. |
| requiredApproval.approvalArtifactFile | string | NOT RECORDED | Existing basename only, co-located with manifest; no path traversal. |
| requiredApproval.approvalArtifactHash | string | NOT RECORDED | 64 lowercase hexadecimal SHA-256 of actual artifact bytes, WITHOUT sha256: prefix. |
| requiredApproval.approvedFixtureFamilies | string[] | [] | All four distinct families: payroll.cnps.pensionRatesBps, payroll.cnps.familyAllowanceRatesBps, payroll.cnps.occupationalRiskRatesBps, payroll.cnps.employerRules. |
| reviewStatus | enum | PENDING_EXPERT_REVIEW | EXPERT_REVIEWED or REGULATOR_CONFIRMED only after authentic review. |
| productionUseAllowed | boolean | false | true only after authentic approval; current false is intentional. |
| artifacts[0].file | string | CNPS-Decree-2016-072-contribution-rates.pdf | Existing local basename; SHA256 must match declared sourceEvidenceHash in runtime pack. |
| artifacts[0].sha256 | string | 1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61 | 64 lowercase hex SHA256 of artifact bytes, without prefix. |
| artifacts[0].reviewStatus | enum | PENDING_EXPERT_REVIEW | EXPERT_REVIEWED or REGULATOR_CONFIRMED after actual review. |
| artifacts[0].productionUseAllowed | boolean | false | true after authentic approval. |
| artifacts[1].file | string | CNPS-employer-general-rules.html | Existing local basename; SHA256 must match declared sourceEvidenceHash in runtime pack. |
| artifacts[1].sha256 | string | bc51f74de8dd3b0c7babd86e8f98d92dbdbece214480f66ac89c42d3e894a868 | 64 lowercase hex SHA256 of artifact bytes, without prefix. |
| artifacts[1].reviewStatus | enum | PENDING_EXPERT_REVIEW | EXPERT_REVIEWED or REGULATOR_CONFIRMED after actual review. |
| artifacts[1].productionUseAllowed | boolean | false | true after authentic approval. |

### AGENT_EXTERNAL_INPUTS

Stage: Internal pilot evidence capture and independent operational release; not generic local development. Destination: docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUTS_2026-07-25.json.

| Field | Type | Current value / definition | Required format / rule |
| --- | --- | --- | --- |
| schemaVersion | number | 1 | Gate-bounded integer; see family-specific rules |
| environment | string | INTERNAL_PILOT | Nonempty identifier/version/text tied to the actual scope |
| release.packageId | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| release.releaseVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| release.commitSha | string | NOT RECORDED | 40 hexadecimal commit SHA (operational evaluator also accepts 64); same across release/CI/governance/deployment |
| release.artifactDigest | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| release.artifactReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| release.deploymentReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| release.manifestHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| release.evidenceBundleHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| release.browserReportHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| release.pilotAllowlistReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| release.roleAllowlistReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| approvers.product.decision | string | PENDING | APPROVED only after deliberate genuine human decision |
| approvers.product.actorDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| approvers.product.approvalReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| approvers.product.decidedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| approvers.product.expiresAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| approvers.security.decision | string | PENDING | APPROVED only after deliberate genuine human decision |
| approvers.security.actorDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| approvers.security.approvalReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| approvers.security.decidedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| approvers.security.expiresAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[0].role | string | ROLLOUT | Nonempty identifier/version/text tied to the actual scope |
| owners[0].primaryDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[0].backupDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[0].acceptedRunbookVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| owners[0].acceptedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[0].coverageStartsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[0].coverageEndsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[0].escalationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| owners[1].role | string | ROLLBACK | Nonempty identifier/version/text tied to the actual scope |
| owners[1].primaryDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[1].backupDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[1].acceptedRunbookVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| owners[1].acceptedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[1].coverageStartsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[1].coverageEndsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[1].escalationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| owners[2].role | string | SUPPORT | Nonempty identifier/version/text tied to the actual scope |
| owners[2].primaryDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[2].backupDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[2].acceptedRunbookVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| owners[2].acceptedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[2].coverageStartsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[2].coverageEndsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[2].escalationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| owners[3].role | string | PILOT | Nonempty identifier/version/text tied to the actual scope |
| owners[3].primaryDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[3].backupDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[3].acceptedRunbookVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| owners[3].acceptedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[3].coverageStartsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[3].coverageEndsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[3].escalationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| owners[4].role | string | SECURITY_INCIDENT | Nonempty identifier/version/text tied to the actual scope |
| owners[4].primaryDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[4].backupDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[4].acceptedRunbookVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| owners[4].acceptedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[4].coverageStartsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[4].coverageEndsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[4].escalationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| owners[5].role | string | ON_CALL_BACKUP | Nonempty identifier/version/text tied to the actual scope |
| owners[5].primaryDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[5].backupDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[5].acceptedRunbookVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| owners[5].acceptedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[5].coverageStartsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[5].coverageEndsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[5].escalationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| evidenceEndpoints.ci.url | string | NOT RECORDED | https URL without username, password, query or fragment |
| evidenceEndpoints.ci.managedSecretReference | string | NOT RECORDED | Value-free secret-manager://, vault:// or keyvault:// controlled reference; never secret bytes |
| evidenceEndpoints.ci.sourceSystemReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| evidenceEndpoints.governance.url | string | NOT RECORDED | https URL without username, password, query or fragment |
| evidenceEndpoints.governance.managedSecretReference | string | NOT RECORDED | Value-free secret-manager://, vault:// or keyvault:// controlled reference; never secret bytes |
| evidenceEndpoints.governance.sourceSystemReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| evidenceEndpoints.scheduler.url | string | NOT RECORDED | https URL without username, password, query or fragment |
| evidenceEndpoints.scheduler.managedSecretReference | string | NOT RECORDED | Value-free secret-manager://, vault:// or keyvault:// controlled reference; never secret bytes |
| evidenceEndpoints.scheduler.sourceSystemReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| evidenceEndpoints.reconciler.url | string | NOT RECORDED | https URL without username, password, query or fragment |
| evidenceEndpoints.reconciler.managedSecretReference | string | NOT RECORDED | Value-free secret-manager://, vault:// or keyvault:// controlled reference; never secret bytes |
| evidenceEndpoints.reconciler.sourceSystemReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| evidenceEndpoints.alert.url | string | NOT RECORDED | https URL without username, password, query or fragment |
| evidenceEndpoints.alert.managedSecretReference | string | NOT RECORDED | Value-free secret-manager://, vault:// or keyvault:// controlled reference; never secret bytes |
| evidenceEndpoints.alert.sourceSystemReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| evidenceEndpoints.credential.url | string | NOT RECORDED | https URL without username, password, query or fragment |
| evidenceEndpoints.credential.managedSecretReference | string | NOT RECORDED | Value-free secret-manager://, vault:// or keyvault:// controlled reference; never secret bytes |
| evidenceEndpoints.credential.sourceSystemReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| managedCredentials.workloadIdentityReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| managedCredentials.collectorIdentityReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| managedCredentials.secretManagerNamespaceReference | string | NOT RECORDED | Value-free secret-manager://, vault:// or keyvault:// controlled reference; never secret bytes |
| managedCredentials.rotationAuthorityReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| managedCredentials.credentialInventoryReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| statutoryApproval.decision | string | PENDING | APPROVED only after deliberate genuine human decision |
| statutoryApproval.reviewerDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| statutoryApproval.qualificationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| statutoryApproval.sourceArtifactHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| statutoryApproval.approvalArtifactReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| statutoryApproval.approvalArtifactHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| statutoryApproval.reviewedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| pilot.cohortReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| pilot.tenantScopeHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| pilot.roleScopeHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| pilot.supportCoverageReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| pilot.rollbackPlanReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| pilot.activationAuthorityDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| pilot.activationDecision | string | PENDING | Nonempty identifier/version/text tied to the actual scope |
| pilot.activationDecisionReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| pilot.activationDecidedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| safety.activationRequested | boolean | false | Exact documented safety/control value; never change solely to make audit pass |
| safety.activationAuthorized | boolean | false | Exact documented safety/control value; never change solely to make audit pass |
| safety.activatedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| safety.phase3Authorized | boolean | false | Exact documented safety/control value; never change solely to make audit pass |
| safety.secretValuesIncluded | boolean | false | Exact documented safety/control value; never change solely to make audit pass |

### AGENT_OPERATIONAL_RELEASE

Stage: Internal pilot evidence capture and independent operational release; not generic local development. Destination: docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json.

| Field | Type | Current value / definition | Required format / rule |
| --- | --- | --- | --- |
| schemaVersion | number | 1 | Gate-bounded integer; see family-specific rules |
| registerId | string | stoquify-agent-runtime-operational-release-2026-07-25 | Nonempty identifier/version/text tied to the actual scope |
| declaredStatus | string | BLOCKED | Gate enum; actual evidence required for ready states |
| release.environment | string | INTERNAL_PILOT | Nonempty identifier/version/text tied to the actual scope |
| release.packageId | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| release.releaseVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| release.packageState | string | PILOT_CERTIFIED | Nonempty identifier/version/text tied to the actual scope |
| release.commitSha | string | NOT RECORDED | 40 hexadecimal commit SHA (operational evaluator also accepts 64); same across release/CI/governance/deployment |
| release.artifactDigest | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| release.artifactReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| release.deploymentReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| release.packageCertificationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| release.packageCertificationHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| release.manifestHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| release.evidenceBundleHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| release.browserReportHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| release.pilotAllowlistReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| release.roleAllowlistReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| release.ciEvidenceSha256 | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| release.activatedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| ci.status | string | PENDING | Gate enum; actual evidence required for ready states |
| ci.sourceTreeClean | boolean | false | Exact documented safety/control value; never change solely to make audit pass |
| ci.commitSha | string | NOT RECORDED | 40 hexadecimal commit SHA (operational evaluator also accepts 64); same across release/CI/governance/deployment |
| ci.branchReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| ci.runReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| ci.artifactDigest | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| ci.artifactReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| ci.browserReportHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| ci.completedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| ci.sourceSystemReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| ci.attestationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| ci.attestationDigest | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| ci.attestedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| ci.evidenceSha256 | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| ci.invalidAuthEvidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| governance.environment | string | INTERNAL_PILOT | Nonempty identifier/version/text tied to the actual scope |
| governance.sourceSystemReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| governance.attestationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| governance.attestationDigest | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| governance.attestedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| governance.evidenceSha256 | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| governance.invalidAuthEvidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| governance.packageId | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| governance.releaseVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| governance.commitSha | string | NOT RECORDED | 40 hexadecimal commit SHA (operational evaluator also accepts 64); same across release/CI/governance/deployment |
| governance.artifactDigest | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| governance.manifestHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| governance.evidenceBundleHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| approvals.product.decision | string | PENDING | APPROVED only after deliberate genuine human decision |
| approvals.product.actorDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| approvals.product.approvalReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| approvals.product.decidedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| approvals.product.expiresAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| approvals.product.manifestHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| approvals.product.artifactDigest | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| approvals.product.evidenceBundleHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| approvals.security.decision | string | PENDING | APPROVED only after deliberate genuine human decision |
| approvals.security.actorDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| approvals.security.approvalReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| approvals.security.decidedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| approvals.security.expiresAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| approvals.security.manifestHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| approvals.security.artifactDigest | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| approvals.security.evidenceBundleHash | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| owners[0].role | string | ROLLOUT | Nonempty identifier/version/text tied to the actual scope |
| owners[0].primaryDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[0].backupDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[0].acceptedRunbookVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| owners[0].acceptedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[0].coverageStartsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[0].coverageEndsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[0].escalationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| owners[1].role | string | ROLLBACK | Nonempty identifier/version/text tied to the actual scope |
| owners[1].primaryDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[1].backupDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[1].acceptedRunbookVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| owners[1].acceptedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[1].coverageStartsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[1].coverageEndsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[1].escalationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| owners[2].role | string | SUPPORT | Nonempty identifier/version/text tied to the actual scope |
| owners[2].primaryDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[2].backupDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[2].acceptedRunbookVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| owners[2].acceptedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[2].coverageStartsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[2].coverageEndsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[2].escalationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| owners[3].role | string | PILOT | Nonempty identifier/version/text tied to the actual scope |
| owners[3].primaryDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[3].backupDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[3].acceptedRunbookVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| owners[3].acceptedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[3].coverageStartsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[3].coverageEndsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[3].escalationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| owners[4].role | string | SECURITY_INCIDENT | Nonempty identifier/version/text tied to the actual scope |
| owners[4].primaryDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[4].backupDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[4].acceptedRunbookVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| owners[4].acceptedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[4].coverageStartsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[4].coverageEndsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[4].escalationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| owners[5].role | string | ON_CALL_BACKUP | Nonempty identifier/version/text tied to the actual scope |
| owners[5].primaryDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[5].backupDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| owners[5].acceptedRunbookVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| owners[5].acceptedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[5].coverageStartsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[5].coverageEndsAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| owners[5].escalationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.provider | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| scheduler.scheduleReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.workloadReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.authType | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| scheduler.managedCredentialReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.intervalMinutes | number | 5 | Gate-bounded integer; see family-specific rules |
| scheduler.singleConcurrency | boolean | false | Exact documented safety/control value; never change solely to make audit pass |
| scheduler.leaseSafe | boolean | true | Exact documented safety/control value; never change solely to make audit pass |
| scheduler.concurrencyEvidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.timeoutMs | number | 120000 | Gate-bounded integer; see family-specific rules |
| scheduler.deployedCommitSha | string | NOT RECORDED | 40 hexadecimal commit SHA (operational evaluator also accepts 64); same across release/CI/governance/deployment |
| scheduler.deployedArtifactDigest | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| scheduler.deployedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| scheduler.deploymentSourceSystemReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.deploymentAttestationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.deploymentAttestationDigest | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| scheduler.deploymentAttestedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| scheduler.deploymentEvidenceSha256 | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| scheduler.deploymentAuthorityInvalidAuthEvidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.readinessStatus | string | PENDING | Gate enum; actual evidence required for ready states |
| scheduler.readinessCheckedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| scheduler.readinessEvidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.readinessEvidenceSha256 | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| scheduler.heartbeatFreshUntil | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| scheduler.invalidAuthEvidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.missingConfigEvidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.failureAlertReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.windows[0].runId | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| scheduler.windows[0].scheduledAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| scheduler.windows[0].completedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| scheduler.windows[0].status | string | PENDING | Gate enum; actual evidence required for ready states |
| scheduler.windows[0].evidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.windows[1].runId | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| scheduler.windows[1].scheduledAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| scheduler.windows[1].completedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| scheduler.windows[1].status | string | PENDING | Gate enum; actual evidence required for ready states |
| scheduler.windows[1].evidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| scheduler.windows[2].runId | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| scheduler.windows[2].scheduledAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| scheduler.windows[2].completedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| scheduler.windows[2].status | string | PENDING | Gate enum; actual evidence required for ready states |
| scheduler.windows[2].evidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| alerting.transportStatus | string | PENDING | Gate enum; actual evidence required for ready states |
| alerting.evidenceSha256 | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| alerting.transportReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| alerting.managedSecretReference | string | NOT RECORDED | Value-free secret-manager://, vault:// or keyvault:// controlled reference; never secret bytes |
| alerting.httpsDeliveryReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| alerting.externalRequestReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| alerting.deliveredAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| alerting.acknowledgementSloMinutes | number | 15 | Gate-bounded integer; see family-specific rules |
| alerting.acknowledgedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| alerting.acknowledgedByDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| alerting.acknowledgementReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| alerting.retryEvidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| alerting.deadLetterEvidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| alerting.recoveryEvidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| alerting.escalationTestedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| alerting.escalatedToDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| alerting.escalationEvidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| alerting.secretRotationEvidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| credentialRotation.registerReference | string | docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| credentialRotation.registerSha256 | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| credentialRotation.securityApprovalReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| credentialRotation.evidenceSha256 | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| credentialRotation.attestationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| activation.requested | boolean | false | Exact documented safety/control value; never change solely to make audit pass |
| activation.authorized | boolean | false | Exact documented safety/control value; never change solely to make audit pass |
| activation.activatedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |

### CREDENTIAL_CLASSIFICATION_AND_ROTATION

Stage: Internal pilot evidence capture and independent operational release; not generic local development. Destination: docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json.

| Field | Type | Current value / definition | Required format / rule |
| --- | --- | --- | --- |
| schemaVersion | number | 1 | Gate-bounded integer; see family-specific rules |
| registerId | string | stoquify-agent-runtime-credential-response-2026-07-25 | Nonempty identifier/version/text tied to the actual scope |
| incidentReference | string | unsafe-local-browser-report-environment-scope | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| declaredStatus | string | BLOCKED | Gate enum; actual evidence required for ready states |
| securityOwnerDirectoryId | string | NOT RECORDED | directory:// or identity:// URI for actual identity; rejects e2e/test/seed/fixture/demo segments; appointment/qualification verified separately |
| securityApprovalReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| authority.environment | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| authority.sourceSystemReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| authority.attestationReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| authority.attestationDigest | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| authority.attestedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| authority.evidenceSha256 | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| authority.invalidAuthEvidenceReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| releaseBinding.environment | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| releaseBinding.packageId | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| releaseBinding.releaseVersion | string | NOT RECORDED | Nonempty identifier/version/text tied to the actual scope |
| releaseBinding.packageState | string | PILOT_CERTIFIED | Nonempty identifier/version/text tied to the actual scope |
| releaseBinding.commitSha | string | NOT RECORDED | 40 hexadecimal commit SHA (operational evaluator also accepts 64); same across release/CI/governance/deployment |
| releaseBinding.artifactDigest | string | NOT RECORDED | sha256: followed by 64 hex digits; compute from authoritative bytes and bind exact release |
| releaseBinding.deploymentReference | string | NOT RECORDED | Value-free scheme:// reference matching gate regex; no query strings or credential content |
| releaseBinding.activatedAt | string\|null | NOT RECORDED | Actual ISO-8601 timestamp; accepted/decided/verified times not future, expiry/coverage end future; see family freshness rules |
| entries[0].id | string | primary-database-credential | Nonempty identifier/version/text tied to the actual scope |
| entries[0].purpose | string | Primary PostgreSQL application and migration access | Nonempty identifier/version/text tied to the actual scope |
| entries[0].environmentVariables | array | ["DATABASE_URL"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[0].dependentWorkloads | array | ["web-application","migration-runner","agent-reconciler"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[0].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[1].id | string | payroll-immutability-database-credential | Nonempty identifier/version/text tied to the actual scope |
| entries[1].purpose | string | Payroll immutability verification database access | Nonempty identifier/version/text tied to the actual scope |
| entries[1].environmentVariables | array | ["PAYROLL_IMMUTABILITY_DATABASE_URL"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[1].dependentWorkloads | array | ["payroll-immutability-verifier"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[1].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[2].id | string | application-auth-signing-secret | Nonempty identifier/version/text tied to the actual scope |
| entries[2].purpose | string | Application authentication and session signing | Nonempty identifier/version/text tied to the actual scope |
| entries[2].environmentVariables | array | ["AUTH_SECRET"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[2].dependentWorkloads | array | ["web-application","authentication-service"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[2].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[3].id | string | legacy-nextauth-signing-secret | Nonempty identifier/version/text tied to the actual scope |
| entries[3].purpose | string | Legacy or compatibility authentication signing | Nonempty identifier/version/text tied to the actual scope |
| entries[3].environmentVariables | array | ["NEXTAUTH_SECRET"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[3].dependentWorkloads | array | ["web-application","authentication-service"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[3].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[4].id | string | google-oauth-client-secret | Nonempty identifier/version/text tied to the actual scope |
| entries[4].purpose | string | Google OAuth client authentication | Nonempty identifier/version/text tied to the actual scope |
| entries[4].environmentVariables | array | ["GOOGLE_CLIENT_SECRET"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[4].dependentWorkloads | array | ["authentication-service"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[4].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[5].id | string | email-server-credential | Nonempty identifier/version/text tied to the actual scope |
| entries[5].purpose | string | Transactional email server authentication | Nonempty identifier/version/text tied to the actual scope |
| entries[5].environmentVariables | array | ["EMAIL_SERVER_USER","EMAIL_SERVER_PASSWORD"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[5].dependentWorkloads | array | ["web-application","email-delivery-worker"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[5].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[6].id | string | redis-connection-credential | Nonempty identifier/version/text tied to the actual scope |
| entries[6].purpose | string | Redis cache, rate-limit, or queue access | Nonempty identifier/version/text tied to the actual scope |
| entries[6].environmentVariables | array | ["REDIS_URL"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[6].dependentWorkloads | array | ["web-application","background-workers"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[6].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[7].id | string | public-identity-hmac-secret | Nonempty identifier/version/text tied to the actual scope |
| entries[7].purpose | string | Public identity abuse-protection hashing | Nonempty identifier/version/text tied to the actual scope |
| entries[7].environmentVariables | array | ["PUBLIC_IDENTITY_ABUSE_HASH_SECRET"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[7].dependentWorkloads | array | ["web-application"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[7].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[8].id | string | public-receipt-signing-secret | Nonempty identifier/version/text tied to the actual scope |
| entries[8].purpose | string | Public receipt token signing | Nonempty identifier/version/text tied to the actual scope |
| entries[8].environmentVariables | array | ["AQSTOQFLOW_RECEIPT_TOKEN_SECRET"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[8].dependentWorkloads | array | ["web-application","receipt-service"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[8].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[9].id | string | history-cursor-signing-secret | Nonempty identifier/version/text tied to the actual scope |
| entries[9].purpose | string | Transaction-history cursor signing | Nonempty identifier/version/text tied to the actual scope |
| entries[9].environmentVariables | array | ["AQSTOQFLOW_HISTORY_CURSOR_SECRET"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[9].dependentWorkloads | array | ["web-application","transaction-history-service"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[9].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[10].id | string | payroll-destination-hmac-secret | Nonempty identifier/version/text tied to the actual scope |
| entries[10].purpose | string | Payroll payment-destination integrity hashing | Nonempty identifier/version/text tied to the actual scope |
| entries[10].environmentVariables | array | ["PAYROLL_PAYMENT_DESTINATION_HASH_SECRET"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[10].dependentWorkloads | array | ["web-application","payroll-service"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[10].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[11].id | string | upload-provider-secret | Nonempty identifier/version/text tied to the actual scope |
| entries[11].purpose | string | Managed upload-provider authentication | Nonempty identifier/version/text tied to the actual scope |
| entries[11].environmentVariables | array | ["UPLOADTHING_SECRET"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[11].dependentWorkloads | array | ["web-application","upload-service"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[11].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[12].id | string | error-monitoring-dsn | Nonempty identifier/version/text tied to the actual scope |
| entries[12].purpose | string | Error-monitoring ingestion authentication | Nonempty identifier/version/text tied to the actual scope |
| entries[12].environmentVariables | array | ["SENTRY_DSN"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[12].dependentWorkloads | array | ["web-application","background-workers"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[12].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[13].id | string | agent-reconciler-credential | Nonempty identifier/version/text tied to the actual scope |
| entries[13].purpose | string | Five-minute Agent Runtime reconciler authentication | Nonempty identifier/version/text tied to the actual scope |
| entries[13].environmentVariables | array | ["STOQUIFY_AGENT_RECONCILER_SECRET","STOQUIFY_AGENT_RECONCILER_SECRET_PREVIOUS"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[13].dependentWorkloads | array | ["web-application","agent-reconciler-scheduler"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[13].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |
| entries[14].id | string | workflow-assurance-webhook-secret | Nonempty identifier/version/text tied to the actual scope |
| entries[14].purpose | string | Workflow Assurance webhook authentication | Nonempty identifier/version/text tied to the actual scope |
| entries[14].environmentVariables | array | ["STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[14].dependentWorkloads | array | ["web-application","agent-reconciler","alert-endpoint"] | Authentic scope/evidence entries; an empty evidence array does not satisfy execution proof |
| entries[14].disposition | string | UNRESOLVED | Gate enum; actual evidence required for ready states |

### POS_G1_ACCOUNTABLE_APPROVAL

Stage: G1 architecture/control promotion; limited local development remains contract-scoped. Destination: docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json.

| Field | Type | Current value / definition | Required format / rule |
| --- | --- | --- | --- |
| contractArtifactId / contractVersion / contractPath / contractSha256 | string | {"contractArtifactId":"STOQUIFY-POS-G1-CONTRACT-FREEZE-0.2.0-20260817","contractVersion":"0.2.0","contractPath":"docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json","contractSha256":"11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db"} | Must equal exact frozen contract artifact/version/path and SHA256 of unchanged bytes. |
| decisionApprovals[].decisionId | enum | NOT RECORDED | D-01 through D-11, unique, all represented. |
| decisionApprovals[].selectedOption / rationale / effectiveVersion | string | NOT RECORDED | Exact selected option; nonempty rationale; effectiveVersion equals contractVersion. |
| decisionApprovals[].reviewOrExpiryAt | UTC timestamp | NOT RECORDED | Future strict ISO UTC timestamp. |
| decisionApprovals[].evidenceLinks / affectedCapabilities | string[] | NOT RECORDED | Nonempty arrays of nonempty strings. |
| decisionApprovals[].rollbackOrDisablePolicy | string | NOT RECORDED | Nonempty concrete policy. |
| decisionApprovals[].approvalStatus | enum | NOT RECORDED | APPROVED only when authentic obligations have completed. |
| decisionApprovals[].approvals[].accountableApprover / approverRole / authorityReference | string | NOT RECORDED | Actual identified appointed person, required exact role and authentic scoped authority reference. |
| decisionApprovals[].approvals[].freshAuthenticatedAt / approvedAt | UTC timestamps | NOT RECORDED | Strict ISO UTC; approvedAt not future, >=freshAuthenticatedAt, within 10 minutes. |
| decisionApprovals[].approvals[].signatureReference | relative file path | NOT RECORDED | Existing file contained in workspace; valid trusted ARTIFACT_BOUND_APPROVAL envelope. |
| decisionApprovals[].approvals[].signatureEvidenceSha256 | string | NOT RECORDED | 64 lowercase hex SHA256 of actual envelope bytes, no prefix. |
| POS_GATE_TRUSTED_PUBLIC_KEYS_PATH | absolute filesystem path | TRUST_ANCHORS_NOT_CONFIGURED | Operator-managed JSON file OUTSIDE candidate repository; values are public keys only. |
| trustedKeys[keyId].publicKeyPem / evidenceClasses / validFrom / validUntil | object | NOT RECORDED | Ed25519 PEM, authorized evidenceClasses, strict UTC validity covering envelope verification and expiry. |
| envelope.schemaVersion / keyId / signature / payload | object | NOT RECORDED | schemaVersion 1.0.0; known keyId; Ed25519 signature base64; canonical JSON payload. |
| payload.result / evidenceClass / binding / verifiedAt / reviewOrExpiryAt / artifacts | object | NOT RECORDED | VERIFIED; ARTIFACT_BOUND_APPROVAL; exact contract/decision/person/time binding; nonexpired; every relative artifact path unique, contained and hash-matching. |

### MODULE_SETUP_AND_ENTITLEMENT

Stage: Operation-specific module readiness; not corporate appointment. Destination: Domain tables via canonical services, TenantModuleLifecycleOperation.setupInputs and evidence.

| Field | Type | Current value / definition | Required format / rule |
| --- | --- | --- | --- |
| organizationAccountingSettings.accountingEnabled / setupStatus | boolean / enum | NOT RECORDED | true / READY and zero collectAccountingSetupReadinessIssues: required active leaf mappings with type/normal balance/SYSCOHADA refs, default journals, open current period, balanced posting scaffolds. |
| ProviderAccount.status / paymentRail.isActive / settlementLedgerAccountId / suspenseLedgerAccountId | enum / boolean / IDs | NOT RECORDED | ACTIVE, active rail, same-tenant active leaf mapped accounts. |
| SettlementAccount.approvalStatus / effectiveFrom / effectiveTo | enum / dates | NOT RECORDED | APPROVED and current effective window, through genuine destination controls. |
| setupInputs.payrollPeriodId | string | NOT RECORDED | Existing same-tenant non-CLOSED period; user has one payroll.runs.calculate/approve/post; getPayrollSetupReadiness must return READY. |
| setupInputs.complianceAdapterId | string | NOT RECORDED | Existing same-tenant CM sandbox adapter; user has compliance.documents.read. |
| ComplianceAdapterConfig.environment / adapterKey / status | enum / string | NOT RECORDED | SANDBOX / CAMEROON DGI sandbox constant / ACTIVE, never production for this readiness path. |
| ComplianceAdapterConfig.credentialReference / credentialExpiresAt | string / Date\|null | NOT RECORDED | Valid vault reference and unexpired; no secret stored in report. |
| ComplianceAdapterConfig.officialSpecHash / officialSpecVersion / officialSpecPublishedAt / officialSpecReference | strings / date | NOT RECORDED | Actual official-spec artifact/version/date/reference; all present. |
| ComplianceAdapterConfig.reviewStatus / reviewEvidenceHash / reviewedAt / reviewedById | enum / string / Date / User.id | NOT RECORDED | EXPERT_APPROVED or REGULATOR_CONFIRMED plus real scoped review proof; matching countryPackVersion/capabilityStatus. |
| module composition expectedRevision / previewHash / idempotencyKey / selectedModules | integer / hash / string / string[] | NOT RECORDED | Fresh canonical preview, current user permissions, existing entitlements/dependencies; cannot purchase/grant entitlement via workspace selection. |

### RELEASE_ENVIRONMENT_INPUTS

Stage: Deployment/release only. Destination: Managed deployment environment; never include secret values.

| Field | Type | Current value / definition | Required format / rule |
| --- | --- | --- | --- |
| PUBLIC_IDENTITY_ABUSE_HASH_SECRET | secret environment variable | NOT RECORDED | At least 32 characters in intended runtime; provided through managed deployment secrets; never supplied in chat/docs. |
| AQSTOQFLOW_RECEIPT_TOKEN_SECRET | secret environment variable | NOT RECORDED | At least 32 characters in intended runtime; provided through managed deployment secrets; never supplied in chat/docs. |
| AQSTOQFLOW_HISTORY_CURSOR_SECRET | secret environment variable | NOT RECORDED | At least 32 characters in intended runtime; provided through managed deployment secrets; never supplied in chat/docs. |

## Identifier and authentication details

Record IDs follow actual primary keys, including `POSCheckoutWorkspace.sessionId` and `TenantModuleConfiguration.organizationId`. This corrects the previous audit field view that used organization ID as the checkout workspace display identifier. [All migration timestamps](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/migration-timestamps.csv>) and [Server-owned authentication timestamp contracts](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/runtime-authentication-timestamp-contracts.json>) are included. Authentication dates were not read from live session records and must be produced by the real authentication workflow.
