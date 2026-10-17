# What you need to provide

Existing names, user/role/employee/location IDs, emails and current configuration have already been extracted. Do not re-enter them. No password, private key, signing secret, bank credential or MFA recovery code is requested. Nomination and technical access do not establish qualified human authority.

## INPUT-01 — Your decision

**Provide/decide:** Choose the next target stage, existing tenant, branches and modules. Existing tenant IDs/names and module states are supplied; do not invent a new ID.

**Already known:** Stoquify Corp Lmt (`96a74406-95a9-49ad-8399-2bd005623787`); Wilkinson - Feeney 001 (`rds_org_001`); McDermott, Greenholt and Johnson 002 (`rds_org_002`)

**When / gates:** Before scoped pilot/configuration work; MODULE_SETUP_AND_ENTITLEMENT, POS_G1_ACCOUNTABLE_APPROVAL.

**Format:** stage = development/demo/controlled pilot; organizationId = an existing listed ID; locationIds = selected existing locations; moduleSlugs = exact canonical slugs; optional AI pilot = yes/no

**Who:** Product/business owner; nominate scope approver if not already formally appointed

**Where:** Decision record first; authorized engineering later applies TenantModuleConfiguration lifecycle with expectedRevision/previewHash/idempotencyKey. No universal pilot-scope appointment column is inferred.

**Validation:** Existing tenant/location ownership, canonical module slugs, prerequisites, explicit scope and promotion criteria

**Can continue:** All independent code and clearly synthetic fixture repairs.

## INPUT-02 — Appointments and identity resolution

**Provide/decide:** Confirm or correct existing nominated responsibilities, authority scope/effective dates and conflicts. Resolve checker Yonga Claude in the supplied working copy versus Yonga Springfield in DB; clarify Kouatchoua mMark versus Kouatchoua Mark and repeated Tamen Marceline/Yonga Springfield accounts.

**Already known:** 23 named candidate assignments, IDs/emails/employee/location links already extracted. Source documents disclaim authority/signature. No need to resubmit all names.

**When / gates:** Before a person is credited with pilot or production authority; POS_G1_ACCOUNTABLE_APPROVAL, CAP-BRANCH-001, CAP-BRANCH-002, CAP-AI-001, CAP-AI-002.

**Format:** Use existing userId/roleCode; approve/correct nomination; accountable appointing authority/reference; tenant/branch scope; effectiveFrom/effectiveTo; conflict/independence statement. Confirm usable work email only for selected real operators.

**Who:** Authorized appointing business/governance owner; nominees acknowledge their actual responsibilities

**Where:** Relevant workflow-specific authorityReference/approval artifact, AccountantAccessGrant or HrisManagerDelegation when applicable. Employee provenance metadata is not an appointment store; a general verified human-appointment workflow was not established in this audit.

**Validation:** Identity-to-account match, accepted authority document, correct scope and separation of people rather than login IDs

**Can continue:** Development with explicitly synthetic personas; engineering can prepare least-privilege changes for review.

## INPUT-03 — Qualified expert evidence

**Provide/decide:** Obtain actual accounting and Cameroon country-pack reviewer qualification, appointment, independence and signed/attested review. Existing candidates are Tchana Nikita and Kouatchoua mMark; use them only if qualified and authorized.

**Already known:** Candidate IDs already in named-candidates.json. CM source artifact hashes verify; requiredApproval reviewer/date/artifact fields are absent, productionUseAllowed=false, reviewStatus=PENDING_EXPERT_REVIEW.

**When / gates:** Before production CNPS/statutory authority and relevant G1 decisions; not ordinary software development; statutory-country-pack-production-gate:source_artifact_expert_approval, POS_G1_ACCOUNTABLE_APPROVAL.

**Format:** Exact CM_CNPS_PRODUCTION_APPROVAL contract: actual reviewerIdentity, reviewedAt, effectiveFrom/effectiveTo, approvalArtifactFile, raw 64-hex SHA256 approvalArtifactHash and approvedFixtureFamilies; verifiable qualification/authority reference and conflict declaration in the authentic artifact.

**Who:** Appointed qualified independent reviewers; engineering computes hashes from supplied genuine files

**Where:** docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json and co-located genuine approval artifact; runtime publication follows approved review. Runtime compliance review uses ComplianceAdapterConfig.reviewedById/reviewerQualification/reviewerConflictDeclared/reviewEvidenceHash.

**Validation:** Artifact bytes/hash, scope/version/source binding, authentic qualification/approval, effective dates and exact producer contracts; static nonempty checks alone are insufficient

**Can continue:** Draft/source-checked country-pack development, simulations and sandbox fixtures. No production authority is inferred.

## INPUT-04 — Accountable product/control decisions

**Provide/decide:** Have the already nominated owners approve the 11 frozen POS G1 decisions or record required changes. Supply genuine authority and attestation, not additional names or signature images.

**Already known:** 17 responsibility labels have existing candidate names. 33 role approval obligations, 0/11 approved decisions; technical13/13 and partial runtime conformance.

**When / gates:** Before G1-controlled promotion beyond contract-scoped work; pos-g1-contract-gate.

**Format:** Use G1_APPROVAL_ROSTER.md and POS_G1_ACCOUNTABLE_APPROVAL field contract: selectedOption/rationale/effectiveVersion, contract binding, future reviewOrExpiryAt, approval authorityReference, freshAuthenticatedAt/approvedAt and trusted signature evidence.

**Who:** Each legitimately appointed decision owner; infrastructure/security custodian supplies trusted public-key path and attestation integration

**Where:** docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json; operator-controlled public-key file outside candidate repository

**Validation:** Frozen artifact/version/hash, required per-decision roles, authenticity, freshness, expiry and trusted Ed25519 envelope verification

**Can continue:** Existing technical decisions can guide limited development; missing approval does not authorize the gate-controlled promotion.

## INPUT-05 — Real company, workforce and product inputs

**Provide/decide:** For the selected real pilot entity, confirm legal/country setup and supply qualified classification evidence for employer CNPS sector/risk group and product tax treatment; validate real contract/calendar/leave/source records only for the selected workforce.

**Already known:** rds_org_001 and rds_org_002 use CM/XAF/Africa-Douala, VAT_CM_STANDARD, SYSCOHADA_CM and IN_PROGRESS accounting setup. Both payrollCnpsFamilyAllowanceSector/payrollCnpsOccupationalRiskGroup values are null. Seeded company/tax/source values are not verified business facts.

**When / gates:** Before real payroll, tax, fiscal output or real-data pilot; MODULE_SETUP_AND_ENTITLEMENT, statutory-country-pack-production-gate, COUNTRY_ADAPTER_SYNTHETIC_REVIEW_GAPS.

**Format:** Reviewed classification/reference with country/pack/version and effective dates; source documents through protected application workflows. Select existing item/employee/location IDs from extracts; engineering maps valid enum/config values.

**Who:** Business owner and qualified accountant/country reviewer; authorized HR owner for workforce source approval

**Where:** OrganizationAccountingSettings payrollCnpsFamilyAllowanceSector/payrollCnpsOccupationalRiskGroup/setupStatus and relevant tax configuration; HrisWorkCalendar/HrisLeavePolicy/PayrollContract evidence fields. Exact product-tax implementation findings are in runtime tax assessment.

**Validation:** Supported fields/values, authentic source provenance, correct effective period and entity/item applicability; do not fabricate a blanket tax rate

**Can continue:** Synthetic data and development scenarios. Engineering does not need new personal data to repair synthetic historical fixtures.

## INPUT-06 — Provider and integration inputs

**Provide/decide:** Identify only the providers/channels selected for the pilot and supply their official specifications, sandbox authorization and managed credential references through the deployment secret manager.

**Already known:** 24 ProviderAccount records are DRAFT with missing settlement/suspense/fee ledger references;24 compliance adapter rows are SANDBOX/REQUIRES_EXPERT_REVIEW with synthetic channels/versions and absent official/reviewer evidence.

**When / gates:** Before testing a real selected integration or making a real submission/payment; MODULE_SETUP_AND_ENTITLEMENT, COUNTRY_ADAPTER_SYNTHETIC_REVIEW_GAPS.

**Format:** ProviderCode/channel/adapter, country/currency, officialSpecTitle/version/publishedAt/effectiveFrom/reference/hash, sandbox contract/authority and credentialReference/expiry. Engineering extracts and maps existing paymentRailId and ledger IDs; no passwords or raw secrets in reports.

**Who:** Provider/account owner, integration operator and independent required country reviewer

**Where:** ProviderAccount, ComplianceAdapterConfig and supported module setupInputs; credentials remain in managed secret storage

**Validation:** Implemented adapter matches specification, same-tenant account mapping, effective credentials, independent review and provider sandbox conformance

**Can continue:** Local fake adapters, clear synthetic scenarios and implementation fixes.

## INPUT-07 — Conditional AI pilot / operations

**Provide/decide:** Only if AI/internal pilot is selected: confirm distinct Product and Security approvers, six operational responsibilities with distinct primary/backup coverage, escalation/runbooks and actual deployment/evidence endpoints.

**Already known:** Product approver Kouatchoua Mark, Security owner Yonga Springfield, SRE Ronald Djakou and Support Etoo Naomie are existing nominees; there are no AgentDefinition/ActivationPackage/Owner/Approval/Certification rows. Some seeded tenants also lack required AI permissions.

**When / gates:** Before optional AI internal pilot; not a prerequisite for general development; agent-external-input-readiness, agent-operational-release-gate, agent-credential-rotation-gate.

**Format:** Follow AGENT_EXTERNAL_INPUTS, AGENT_OPERATIONAL_RELEASE and CREDENTIAL_CLASSIFICATION_AND_ROTATION contracts: real external directory IDs, approved references/dates/expiry, accepted runbook, primary/backup coverage, managed identity/reference IDs, release/CI hashes, endpoint references and authentic scheduler/alert evidence.

**Who:** Appointed Product/Security/SRE/Support owners, infrastructure operator and external evidence authorities

**Where:** Three existing docs/agents-runtime JSON templates listed in assurance/required-input-contracts.json; supported runtime package workflows when scope is authorized

**Validation:** Real directory identity mapping (do not substitute DB IDs blindly), distinct approvers/backups, current release binding, authentic external evidence and operational readiness; passing does not itself activate

**Can continue:** All non-AI work and local guardrail development. Engineering generates CI hashes and technical evidence; the user does not invent them.

## INPUT-08 — Deployment inputs

**Provide/decide:** Choose the actual pilot deployment target and responsible operator; the operator configures required secrets/identities and reports only presence/reference/rotation evidence.

**Already known:** Local process and repository evidence do not establish deployed configuration. No raw credential values were extracted.

**When / gates:** Before deployment/release validation; release-evidence-ratchet, RELEASE_ENVIRONMENT_INPUTS.

**Format:** Deployment/environment/reference, approved scope, public URL when applicable, managed secret reference names, trust anchor location and operator-owned verification evidence; no raw secret or recovery material

**Who:** Deployment/SRE/security operator

**Where:** Deployment secret manager/environment and release evidence templates; not chat or checked-in secret files

**Validation:** Environment-specific focused release checks and authentic operational evidence after engineering fixes

**Can continue:** All local development and audit remediation.

## INPUT-09 — Four existing stocking-unit choices

**Provide/decide:** Confirm whether Orange juice 1 L and Mango nectar 1 L are stocked/sold by measured litre or by sealed one-litre package. Their names alone do not decide this. If packages, design a unit conversion and quantity-preserving migration rather than merely changing the unit label.

**Already known:** Orange juice 1 L (`rds_org_001_item_002`, current `rds_org_001_unit_007`); Mango nectar 1 L (`rds_org_001_item_013`, current `rds_org_001_unit_007`); Orange juice 1 L (`rds_org_002_item_002`, current `rds_org_002_unit_007`); Mango nectar 1 L (`rds_org_002_item_013`, current `rds_org_002_unit_007`)

**When / gates:** Before a trustworthy demonstration or real inventory use of these four items; STOCKING_UNIT_CONFIRMATION.

**Format:** For the existing Orange juice 1 L and Mango nectar 1 L items in each reseeded tenant: measured litre or sealed one-litre package; approved conversion if packages are intended.

**Who:** Inventory/catalog owner; existing candidate Tchana Rose with retail owner Tamen Max

**Where:** Supported Item.unitId and Unit.baseUnit/conversionRate workflow after review; preserve quantities if units change.

**Validation:** Stocking/selling unit matches business meaning; quantity/value preserving conversion and POS tests if changed.

**Can continue:** Unrelated development and synthetic scenarios with explicit unit assumptions.

## Copy and fill first

- Next stage: ___ ; existing organization ID: ___ ; branch IDs/modules selected from the supplied registers: ___ .
- Existing nominee roster: confirmed / corrections ___ ; appointment authority/reference and effective scope: ___ .
- Checker: Yonga Claude / Yonga Springfield / clarify ___ .
- Kouatchoua mMark and Kouatchoua Mark: distinct people / same person / clarification ___ . Repeated maker/order-to-cash and checker/security accounts: independence confirmation ___ .
- Tchana Nikita and Cameroon reviewer: qualification/appointment evidence location ___ ; qualified review availability ___ .
- POS G1 decisions D-01 to D-11: accountable review owner/date or genuine approval evidence location ___ .
- Real pilot classifications/provider/HR inputs ready: ___ ; optional AI pilot in scope: yes/no ___ .

Engineering owns extracting existing IDs, correcting local synthetic fixtures, resolving permission/entitlement implementation gaps, repairing stale scanners, computing hashes and producing technical tests. You are not being asked to manufacture missing approvals or rewrite technical reports.
