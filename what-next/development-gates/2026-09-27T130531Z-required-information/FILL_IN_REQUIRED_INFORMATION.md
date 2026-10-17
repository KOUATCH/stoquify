# Complete input worksheet with accompanying dates

Existing information is prefilled in the linked registers. Leave a date unfilled until the actual event or authoritative source is available; use NOT APPLICABLE with a reason for a conditional event that has not occurred. Do not provide raw secrets.

## INPUT-01 — Your decision

**Needed:** Choose the next target stage, existing tenant, branches and modules. Existing tenant IDs/names and module states are supplied; do not invent a new ID.

**Existing information:** [{"id":"96a74406-95a9-49ad-8399-2bd005623787","name":"Stoquify Corp Lmt","countryCode":null,"requestedModules":["POS","Sales","Inventory","Accounting","Payment reconciliation","Payroll"]},{"id":"rds_org_001","name":"Wilkinson - Feeney 001","countryCode":"CM","requestedModules":["POS","Sales","Inventory","Accounting","Finance","Payment reconciliation","Payroll","Compliance"]},{"id":"rds_org_002","name":"McDermott, Greenholt and Johnson 002","countryCode":"CM","requestedModules":["POS","Sales","Inventory","Accounting","Finance","Payment reconciliation","Payroll","Compliance"]}]

**Required dates:** Business decision record: record the actual decision date. If an AI activation window is selected, use AgentActivationPackage.activationStartsAt and activationEndsAt. Other pilot planning dates are planning metadata, not newly invented database columns.

**Expected data format:** stage = development/demo/controlled pilot; organizationId = an existing listed ID; locationIds = selected existing locations; moduleSlugs = exact canonical slugs; optional AI pilot = yes/no

**Who provides it:** Product/business owner; nominate scope approver if not already formally appointed

**Destination / gate:** Decision record first; authorized engineering later applies TenantModuleConfiguration lifecycle with expectedRevision/previewHash/idempotencyKey. No universal pilot-scope appointment column is inferred.; MODULE_SETUP_AND_ENTITLEMENT, POS_G1_ACCOUNTABLE_APPROVAL.

**When and validation:** Before scoped pilot/configuration work. Existing tenant/location ownership, canonical module slugs, prerequisites, explicit scope and promotion criteria.

**Your missing response/evidence location:** ____________________

**Actual event/source date(s), including timezone when an instant:** ____________________

**Effective period / review / expiry, where required:** ____________________

**Not applicable (reason), if conditional:** ____________________

## INPUT-02 — Appointments and identity resolution

**Needed:** Confirm or correct existing nominated responsibilities, authority scope/effective dates and conflicts. Resolve checker Yonga Claude in the supplied working copy versus Yonga Springfield in DB; clarify Kouatchoua mMark versus Kouatchoua Mark and repeated Tamen Marceline/Yonga Springfield accounts.

**Existing information:** 23 named candidate assignments, IDs/emails/employee/location links already extracted. Source documents disclaim authority/signature. No need to resubmit all names.

**Required dates:** Genuine appointment/delegation document effective-from/effective-to and date of signing/acceptance, where its contract requires them. AccountantAccessGrant uses consentGrantedAt/effectiveFrom/expiresAt; HrisManagerDelegation uses effectiveFrom/effectiveTo and existing evidence references. No generic appointmentAt or _UserRoles.assignedAt column is implemented.

**Expected data format:** Use existing userId/roleCode; approve/correct nomination; accountable appointing authority/reference; tenant/branch scope; effectiveFrom/effectiveTo; conflict/independence statement. Confirm usable work email only for selected real operators.

**Who provides it:** Authorized appointing business/governance owner; nominees acknowledge their actual responsibilities

**Destination / gate:** Relevant workflow-specific authorityReference/approval artifact, AccountantAccessGrant or HrisManagerDelegation when applicable. Employee provenance metadata is not an appointment store; a general verified human-appointment workflow was not established in this audit.; POS_G1_ACCOUNTABLE_APPROVAL, CAP-BRANCH-001, CAP-BRANCH-002, CAP-AI-001, CAP-AI-002.

**When and validation:** Before a person is credited with pilot or production authority. Identity-to-account match, accepted authority document, correct scope and separation of people rather than login IDs.

**Your missing response/evidence location:** ____________________

**Actual event/source date(s), including timezone when an instant:** ____________________

**Effective period / review / expiry, where required:** ____________________

**Not applicable (reason), if conditional:** ____________________

## INPUT-03 — Qualified expert evidence

**Needed:** Obtain actual accounting and Cameroon country-pack reviewer qualification, appointment, independence and signed/attested review. Existing candidates are Tchana Nikita and Kouatchoua mMark; use them only if qualified and authorized.

**Existing information:** Candidate IDs already in named-candidates.json. CM source artifact hashes verify; requiredApproval reviewer/date/artifact fields are absent, productionUseAllowed=false, reviewStatus=PENDING_EXPERT_REVIEW.

**Required dates:** requiredApproval.reviewedAt, effectiveFrom, effectiveTo (optional/open-ended only when justified); actual document dates and source effective period. ComplianceAdapterConfig reviewedAt/approvedAt/officialSpecPublishedAt/officialSpecEffectiveFrom are separate fields.

**Expected data format:** Exact CM_CNPS_PRODUCTION_APPROVAL contract: actual reviewerIdentity, reviewedAt, effectiveFrom/effectiveTo, approvalArtifactFile, raw 64-hex SHA256 approvalArtifactHash and approvedFixtureFamilies; verifiable qualification/authority reference and conflict declaration in the authentic artifact.

**Who provides it:** Appointed qualified independent reviewers; engineering computes hashes from supplied genuine files

**Destination / gate:** docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json and co-located genuine approval artifact; runtime publication follows approved review. Runtime compliance review uses ComplianceAdapterConfig.reviewedById/reviewerQualification/reviewerConflictDeclared/reviewEvidenceHash.; statutory-country-pack-production-gate:source_artifact_expert_approval, POS_G1_ACCOUNTABLE_APPROVAL.

**When and validation:** Before production CNPS/statutory authority and relevant G1 decisions; not ordinary software development. Artifact bytes/hash, scope/version/source binding, authentic qualification/approval, effective dates and exact producer contracts; static nonempty checks alone are insufficient.

**Your missing response/evidence location:** ____________________

**Actual event/source date(s), including timezone when an instant:** ____________________

**Effective period / review / expiry, where required:** ____________________

**Not applicable (reason), if conditional:** ____________________

## INPUT-04 — Accountable product/control decisions

**Needed:** Have the already nominated owners approve the 11 frozen POS G1 decisions or record required changes. Supply genuine authority and attestation, not additional names or signature images.

**Existing information:** 17 responsibility labels have existing candidate names. 33 role approval obligations, 0/11 approved decisions; technical13/13 and partial runtime conformance.

**Required dates:** For each of 33 G1 role obligations: actual freshAuthenticatedAt and approvedAt. For each of 11 decisions: future reviewOrExpiryAt. Attestation verifiedAt/reviewOrExpiryAt and signing-key validFrom/validUntil are also required by the evidence contract.

**Expected data format:** Use G1_APPROVAL_ROSTER.md and POS_G1_ACCOUNTABLE_APPROVAL field contract: selectedOption/rationale/effectiveVersion, contract binding, future reviewOrExpiryAt, approval authorityReference, freshAuthenticatedAt/approvedAt and trusted signature evidence.

**Who provides it:** Each legitimately appointed decision owner; infrastructure/security custodian supplies trusted public-key path and attestation integration

**Destination / gate:** docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json; operator-controlled public-key file outside candidate repository; pos-g1-contract-gate.

**When and validation:** Before G1-controlled promotion beyond contract-scoped work. Frozen artifact/version/hash, required per-decision roles, authenticity, freshness, expiry and trusted Ed25519 envelope verification.

**Your missing response/evidence location:** ____________________

**Actual event/source date(s), including timezone when an instant:** ____________________

**Effective period / review / expiry, where required:** ____________________

**Not applicable (reason), if conditional:** ____________________

## INPUT-05 — Real company, workforce and product inputs

**Needed:** For the selected real pilot entity, confirm legal/country setup and supply qualified classification evidence for employer CNPS sector/risk group and product tax treatment; validate real contract/calendar/leave/source records only for the selected workforce.

**Existing information:** rds_org_001 and rds_org_002 use CM/XAF/Africa-Douala, VAT_CM_STANDARD, SYSCOHADA_CM and IN_PROGRESS accounting setup. Both payrollCnpsFamilyAllowanceSector/payrollCnpsOccupationalRiskGroup values are null. Seeded company/tax/source values are not verified business facts.

**Required dates:** Employer/product classification source-effective dates and genuine review date in its evidence document; current schema does not provide a complete per-product tax-approval record. HR uses PayrollEmployee.hireDate/terminationDate, PayrollContract.effectiveFrom/effectiveTo, HrisWorkCalendar.reviewedAt/effectiveFrom/effectiveTo, HrisLeavePolicy.approvedAt/effectiveFrom/effectiveTo. Preserve business dates and period timezone.

**Expected data format:** Reviewed classification/reference with country/pack/version and effective dates; source documents through protected application workflows. Select existing item/employee/location IDs from extracts; engineering maps valid enum/config values.

**Who provides it:** Business owner and qualified accountant/country reviewer; authorized HR owner for workforce source approval

**Destination / gate:** OrganizationAccountingSettings payrollCnpsFamilyAllowanceSector/payrollCnpsOccupationalRiskGroup/setupStatus and relevant tax configuration; HrisWorkCalendar/HrisLeavePolicy/PayrollContract evidence fields. Exact product-tax implementation findings are in runtime tax assessment.; MODULE_SETUP_AND_ENTITLEMENT, statutory-country-pack-production-gate, COUNTRY_ADAPTER_SYNTHETIC_REVIEW_GAPS.

**When and validation:** Before real payroll, tax, fiscal output or real-data pilot. Supported fields/values, authentic source provenance, correct effective period and entity/item applicability; do not fabricate a blanket tax rate.

**Your missing response/evidence location:** ____________________

**Actual event/source date(s), including timezone when an instant:** ____________________

**Effective period / review / expiry, where required:** ____________________

**Not applicable (reason), if conditional:** ____________________

## INPUT-06 — Provider and integration inputs

**Needed:** Identify only the providers/channels selected for the pilot and supply their official specifications, sandbox authorization and managed credential references through the deployment secret manager.

**Existing information:** 24 ProviderAccount records are DRAFT with missing settlement/suspense/fee ledger references;24 compliance adapter rows are SANDBOX/REQUIRES_EXPERT_REVIEW with synthetic channels/versions and absent official/reviewer evidence.

**Required dates:** ComplianceAdapterConfig officialSpecPublishedAt/officialSpecEffectiveFrom, reviewedAt, approvedAt, credentialExpiresAt and actual credentialRotatedAt if applicable. SettlementAccount approvedAt/effectiveFrom/effectiveTo. Provider dates and managed-secret expiry come from the provider/operator, not invented defaults.

**Expected data format:** ProviderCode/channel/adapter, country/currency, officialSpecTitle/version/publishedAt/effectiveFrom/reference/hash, sandbox contract/authority and credentialReference/expiry. Engineering extracts and maps existing paymentRailId and ledger IDs; no passwords or raw secrets in reports.

**Who provides it:** Provider/account owner, integration operator and independent required country reviewer

**Destination / gate:** ProviderAccount, ComplianceAdapterConfig and supported module setupInputs; credentials remain in managed secret storage; MODULE_SETUP_AND_ENTITLEMENT, COUNTRY_ADAPTER_SYNTHETIC_REVIEW_GAPS.

**When and validation:** Before testing a real selected integration or making a real submission/payment. Implemented adapter matches specification, same-tenant account mapping, effective credentials, independent review and provider sandbox conformance.

**Your missing response/evidence location:** ____________________

**Actual event/source date(s), including timezone when an instant:** ____________________

**Effective period / review / expiry, where required:** ____________________

**Not applicable (reason), if conditional:** ____________________

## INPUT-07 — Conditional AI pilot / operations

**Needed:** Only if AI/internal pilot is selected: confirm distinct Product and Security approvers, six operational responsibilities with distinct primary/backup coverage, escalation/runbooks and actual deployment/evidence endpoints.

**Existing information:** Product approver Kouatchoua Mark, Security owner Yonga Springfield, SRE Ronald Djakou and Support Etoo Naomie are existing nominees; there are no AgentDefinition/ActivationPackage/Owner/Approval/Certification rows. Some seeded tenants also lack required AI permissions.

**Required dates:** Product/security decidedAt/expiresAt; six owner acceptedAt/coverageStartsAt/coverageEndsAt (plus runtime owner validUntil when used); release activationStartsAt/activationEndsAt; certification passedAt/expiresAt; CI/governance/deployment/scheduler/alert/rotation times listed in TIME_RULES.md and external-required-timestamps.csv.

**Expected data format:** Follow AGENT_EXTERNAL_INPUTS, AGENT_OPERATIONAL_RELEASE and CREDENTIAL_CLASSIFICATION_AND_ROTATION contracts: real external directory IDs, approved references/dates/expiry, accepted runbook, primary/backup coverage, managed identity/reference IDs, release/CI hashes, endpoint references and authentic scheduler/alert evidence.

**Who provides it:** Appointed Product/Security/SRE/Support owners, infrastructure operator and external evidence authorities

**Destination / gate:** Three existing docs/agents-runtime JSON templates listed in assurance/required-input-contracts.json; supported runtime package workflows when scope is authorized; agent-external-input-readiness, agent-operational-release-gate, agent-credential-rotation-gate.

**When and validation:** Before optional AI internal pilot; not a prerequisite for general development. Real directory identity mapping (do not substitute DB IDs blindly), distinct approvers/backups, current release binding, authentic external evidence and operational readiness; passing does not itself activate.

**Your missing response/evidence location:** ____________________

**Actual event/source date(s), including timezone when an instant:** ____________________

**Effective period / review / expiry, where required:** ____________________

**Not applicable (reason), if conditional:** ____________________

## INPUT-08 — Deployment inputs

**Needed:** Choose the actual pilot deployment target and responsible operator; the operator configures required secrets/identities and reports only presence/reference/rotation evidence.

**Existing information:** Local process and repository evidence do not establish deployed configuration. No raw credential values were extracted.

**Required dates:** Actual deployment, attestation, credential rotation/review and operational test timestamps from the deployment/evidence systems. Generated audit or file-modification time is not deployment/approval time.

**Expected data format:** Deployment/environment/reference, approved scope, public URL when applicable, managed secret reference names, trust anchor location and operator-owned verification evidence; no raw secret or recovery material

**Who provides it:** Deployment/SRE/security operator

**Destination / gate:** Deployment secret manager/environment and release evidence templates; not chat or checked-in secret files; release-evidence-ratchet, RELEASE_ENVIRONMENT_INPUTS.

**When and validation:** Before deployment/release validation. Environment-specific focused release checks and authentic operational evidence after engineering fixes.

**Your missing response/evidence location:** ____________________

**Actual event/source date(s), including timezone when an instant:** ____________________

**Effective period / review / expiry, where required:** ____________________

**Not applicable (reason), if conditional:** ____________________

## INPUT-09 — Four existing stocking-unit choices

**Needed:** Confirm whether Orange juice 1 L and Mango nectar 1 L are stocked/sold by measured litre or by sealed one-litre package. Their names alone do not decide this. If packages, design a unit conversion and quantity-preserving migration rather than merely changing the unit label.

**Existing information:** [{"id":"rds_org_001_item_002","name":"Orange juice 1 L","unitId":"rds_org_001_unit_007","unit":"Liter"},{"id":"rds_org_001_item_013","name":"Mango nectar 1 L","unitId":"rds_org_001_unit_007","unit":"Liter"},{"id":"rds_org_002_item_002","name":"Orange juice 1 L","unitId":"rds_org_002_unit_007","unit":"Liter"},{"id":"rds_org_002_item_013","name":"Mango nectar 1 L","unitId":"rds_org_002_unit_007","unit":"Liter"}]

**Required dates:** Record the catalog decision and its intended effective business date in supporting evidence if a change is authorized. Item.updatedAt/Unit.updatedAt are written by the system and do not prove user approval. There is no dedicated stocking-unit approval timestamp in the inspected Item/Unit schema.

**Expected data format:** For the existing Orange juice 1 L and Mango nectar 1 L items in each reseeded tenant: measured litre or sealed one-litre package; approved conversion if packages are intended.

**Who provides it:** Inventory/catalog owner; existing candidate Tchana Rose with retail owner Tamen Max

**Destination / gate:** Supported Item.unitId and Unit.baseUnit/conversionRate workflow after review; preserve quantities if units change.; STOCKING_UNIT_CONFIRMATION.

**When and validation:** Before a trustworthy demonstration or real inventory use of these four items. Stocking/selling unit matches business meaning; quantity/value preserving conversion and POS tests if changed..

**Your missing response/evidence location:** ____________________

**Actual event/source date(s), including timezone when an instant:** ____________________

**Effective period / review / expiry, where required:** ____________________

**Not applicable (reason), if conditional:** ____________________

## Exact G1 decision and approver worksheet

The [prefilled 33-row G1 worksheet](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T130531Z-required-information/g1-complete-approval-worksheet.csv>) includes exact decision options, contract version/hash, existing named nominees and IDs, and empty fields for genuine authority/authentication/approval/expiry/signature evidence. It is a reporting worksheet, not a signed register or authorization.
