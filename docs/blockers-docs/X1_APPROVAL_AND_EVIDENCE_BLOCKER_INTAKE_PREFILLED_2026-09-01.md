# X1 Finance/Accounting approval and evidence blocker intake

**Prepared:** 2026-09-01  
**Status:** Prefilled from read-only repository/database truth; external authority fields remain incomplete  
**Rule:** Do not enter passwords, tokens, cookies, private keys, connection strings, or browser storage state in this document.

## Completion status information box

| Area | Current state | Who completes the remainder | Release effect |
| --- | --- | --- | --- |
| Repository and database | Passed | Automation | None |
| Contract and policy hashes | Valid | Automation | None |
| Tenant/persona technical identities | Prefilled | Automation | Technical evidence only |
| Formal authority appointments | Missing | Governance owner | Blocks signing |
| Approval platform integration | Missing | Organization/platform administrator | Blocks draft-record creation |
| Standing delegation `POL-004` | Draft unsigned | Authorized signer(s) | Blocks automation authority |
| Product-budget decision | Pending | Product authority | Blocks evidence capture |
| Credential/tenant/evidence authorization | Pending | Security/data-custody authorities | Blocks authenticated capture |
| External-accountant storage state | Absent | Automation after authorization | Blocks browser matrix |
| EN/FR desktop/tablet/mobile evidence | Absent | Automation after authorization | Blocks X1 technical gate |

## A. Values already extracted and filled

### Tenant and contract

| Field | Prefilled value | Interpretation |
| --- | --- | --- |
| Database | `stoquify_replay_next_20260830` | Local disposable target; read-only extraction passed |
| Authorized tenant candidate | `rds_org_001` | Wilkinson - Feeney 001; trade name Stoquify |
| Foreign isolation probe | `rds_org_002` | McDermott, Greenholt and Johnson 002; trade name AqStoq Market 002 |
| Country/currency/timezone | `CM` / `XAF` / `Africa/Douala` | Database configuration |
| Locale context | Tenant EN; foreign probe FR | Matches X1 EN/FR requirement |
| Requested modules | POS, Sales, Inventory, Accounting, Finance, Payment reconciliation, Payroll, Compliance | Request metadata only; not an entitlement approval |
| Existing X1 activation packages | `0` | No conflicting X1 package exists |
| X1 contract URI | `repository://stoquify/docs/blockers-docs/X1_CONTRACT_ARTIFACT_MANIFEST_2026-08-31.json` | Exact technical contract manifest |
| X1 contract SHA-256 | `cdb16e90a74ea942e204bc8191445041a98102850619363096786768e777c9e4` | Verified current manifest fingerprint |

### Technical persona candidates

| Responsibility | Database candidate | User ID | Role ID/code | Status |
| --- | --- | --- | --- | --- |
| Product budget | Kouatchoua Mark | `rds_org_001_compliance_user_product_approver` | `rds_org_001_compliance_role_product_approver` / `product_approver` | Technical candidate; formal appointment missing |
| Security/control | Yonga Springfield | `rds_org_001_compliance_user_security_owner` | `rds_org_001_compliance_role_security_owner` / `security_owner` | Technical candidate; formal appointment missing |
| Managed secrets | Ronald Djakou | `rds_org_001_compliance_user_sre_owner` | `rds_org_001_compliance_role_sre_owner` / `sre_owner` | Approximate candidate; exact appointment missing |
| Fixture-data/tenant custody | Mireille Nkoa | `rds_org_001_compliance_user_owner` | `rds_org_001_compliance_role_owner` / `owner` | Approximate candidate; exact appointment missing |
| Independent release | Sonkeng Steve | `rds_org_001_compliance_user_qa_owner` | `rds_org_001_compliance_role_qa_owner` / `qa_owner` | Candidate; independence and appointment missing |
| Authenticated evidence persona | Carine Manga | `rds_org_001_compliance_user_external_accountant` | `rds_org_001_compliance_role_external_accountant` / `external_accountant` | Exact technical persona; credential-use approval missing |

The database descriptions expressly say these are synthetic development personas and do not establish appointment, signature, qualification, or production authority.

## B. Information you must supply

### Approval platform setup

| Configuration field | What you enter | Where to obtain it | Example format | Status |
| --- | --- | --- | --- | --- |
| `approvalPlatform` | Name of the organization's authoritative approval/e-signature platform | Internal IT/governance administrator | Product name, not a URL | `[YOU FILL]` |
| `approvalWorkspaceId` | Workspace, project, tenant, or account ID | Platform administration page | Provider-issued immutable ID | `[YOU FILL]` |
| `approvalTemplateId` | Workflow/template ID for the X1 package | Platform workflow administration | Provider-issued immutable ID | `[YOU FILL]` |
| `providerAdapterModule` | Repository adapter path | Tell Codex the platform; Codex implements/selects the adapter | `services/governance/approval-providers/<provider>.adapter.js` | `[AUTOMATION AFTER PLATFORM CHOICE]` |
| `identityProvider` | Identity provider holding workload identities and signer directory IDs | IAM administrator | Provider/tenant name | `[YOU FILL]` |

### Governance, secrets and evidence storage

| Configuration field | What you enter | Where to obtain it | Never enter | Status |
| --- | --- | --- | --- | --- |
| `governanceRegisterUri` | URI of the delegated-authority/governance register | Governance or company-secretary function | A person's assumed authority | `[YOU FILL]` |
| `secretManagerReference` | Namespace/vault reference only | Security/platform administrator | Password, token, client secret | `[YOU FILL]` |
| `callbackUrl` | Approved non-production HTTPS webhook callback | Platform/application administrator | Production or unapproved public URL | `[YOU FILL]` |
| `evidenceStoreUri` | Tamper-evident evidence container/repository URI | Security/records administrator | Local temporary folder as final evidence store | `[YOU FILL]` |
| `retentionPolicyReference` | Versioned retention/deletion/legal-hold policy ID | Records-management function | An invented policy number | `[YOU FILL]` |

### Four segregated service principals

| Configuration field | Required function | Where to obtain it | Separation rule | Status |
| --- | --- | --- | --- | --- |
| `servicePrincipals.approvalOrchestration` | Creates/synchronizes approval records | Identity provider | Cannot sign as a human | `[YOU FILL]` |
| `servicePrincipals.evidenceCapture` | Authenticates and captures browser evidence | Identity provider | Cannot promote the gate | `[YOU FILL]` |
| `servicePrincipals.independentVerifier` | Verifies immutable evidence | Identity provider | Must differ from implementation and capture | `[YOU FILL]` |
| `servicePrincipals.implementationCi` | Builds/tests the bound commit | CI/IAM workload inventory | Cannot verify its own output | `[YOU FILL]` |

Enter immutable object IDs, not display names and not human user IDs.

### Signed standing delegation `STOQ-X1-POL-004`

| Configuration field | Required value | How to obtain it | Status |
| --- | --- | --- | --- |
| `signedDelegation.status` | `APPROVED` only after valid signatures | Approval/e-signature workflow | `[YOU SIGN]` |
| `signedDelegation.approvalRecordId` | Immutable approval-system record ID | Created by the authoritative platform | `[YOU FILL]` |
| `signedDelegation.signatureReference` | Signature/envelope/certificate reference | Generated by the signing platform | `[YOU FILL]` |
| `signedDelegation.signedArtifactUri` | Immutable URI of the signed PDF/envelope | Approval/evidence platform | `[YOU FILL]` |
| `signedDelegation.signedArtifactSha256` | SHA-256 of the signed artifact | Automation computes after signing/download | `[AUTOMATION]` |
| `signedDelegation.signedAt` | Provider-recorded ISO-8601 timestamp | Signing platform | `[AUTOMATION RETRIEVES]` |
| `signedDelegation.expiresAt` | Approved bounded expiry | Signer chooses within governance policy | `[YOU CHOOSE]` |
| `signedDelegation.signingModel` | `UMBRELLA` or `CO_SIGNERS` | Use umbrella only with documented authority over every scope | `[YOU CHOOSE]` |
| `signedDelegation.umbrellaAuthorityInstrumentId` | Required only for `UMBRELLA` | Delegated-authority register | `[YOU FILL IF APPLICABLE]` |

## C. Decisions that must be authenticated

### `STOQ-X1-POL-001` product-budget decision

The appointed product authority must choose `APPROVE`, `REJECT`, or `REVISE` for these proposed engineering budgets:

| Signal | Proposed value |
| --- | --- |
| Local sort/filter | Under 100 ms on p75 test hardware |
| Server loading indication | Under 150 ms |
| Server useful result | Under 1,000 ms at p75 |
| Page navigation | Useful rows under 750 ms at p75 after cached shell |
| Bulk acknowledgement | Immediate job receipt with progress/partial-result handling |
| Preference/view hydration | No visible column-layout flash after initial shell |
| Browser row DOM | Bounded by pagination or proven virtualization |
| Export duration | Measured and retained by result tier and format |

Required human entries: authority appointment reference, decision, effective/expiry dates, and authenticated signature.

### `STOQ-X1-POL-002` evidence authorization

Authorize this exact non-production scope:

| Scope field | Proposed exact value |
| --- | --- |
| Origin | `http://127.0.0.1:3000` |
| Database | `stoquify_replay_next_20260830` |
| Tenant | `rds_org_001` |
| Foreign isolation probe | `rds_org_002` |
| Persona | Carine Manga / `rds_org_001_compliance_user_external_accountant` |
| Role | `external_accountant` with 24 read/report/export permissions |
| Locales | `en`, `fr` |
| Viewports | desktop, tablet, mobile |
| Routes | receivables history, payables, cash flow, journals, trial balance, financial statements, accountant portal |

Required human entries: security, managed-secrets and fixture-data authority references; exact secret reference; entitlement/redaction/retention references; effective/expiry dates; authenticated signatures.

### `STOQ-X1-POL-003` independent technical-gate decision

Required human entries: independent release appointment reference, explicit decision, signature, and segregation confirmation. Sonkeng Steve is a database candidate only.

## D. What automation completes after your entries

| Step | Automation action | User action required at that point |
| --- | --- | --- |
| Provider adapter | Implement/configure the selected platform adapter | Name the platform and provide non-secret workspace/template data |
| Draft records | Create exactly three immutable approval records | None |
| Document prefill | Insert record IDs, contract URI/hash and proposed validity | Review only |
| Signing | Send links and wait for decisions | Authenticate and approve/reject/revise |
| Decision sync | Retrieve identities, authority references, decisions, timestamps and signatures | None |
| Evidence run ID | Generate a safe unique run ID | None |
| Storage state | Create ephemeral external-accountant browser state from the approved secret reference | Authorize credential use; never paste the password here |
| Browser evidence | Run 7 routes x 2 locales x 3 viewports = 42 authenticated checks | None unless a check fails |
| Final manifest | Hash artifacts and create the final approval/evidence manifest | None |
| Gate | Pass only if every mandatory approval and evidence check succeeds | Human handles exceptions; automation cannot waive failures |

## E. Least-effort completion order

1. Choose the approval/e-signature platform and identity provider.
2. Obtain workspace/template IDs and create the four workload identities.
3. Obtain governance, secret-manager, callback, evidence-store and retention references.
4. Complete and sign `STOQ-X1-POL-004` using `CO_SIGNERS` unless a valid umbrella authority instrument exists.
5. Enter the non-secret values in `X1_APPROVAL_AUTOMATION_CONFIGURATION_2026-08-31.json`.
6. Ask Codex to run `npm run table:x1:approval:create`.
7. Sign the three generated decisions.
8. Ask Codex to run `npm run table:x1:approval:sync` and the X1 authenticated evidence capture.

## F. Final warning

Do not use the `super_admin` account for X1 evidence. The contract requires the exact `external_accountant` persona. Do not put its password or storage-state contents in this intake file.
