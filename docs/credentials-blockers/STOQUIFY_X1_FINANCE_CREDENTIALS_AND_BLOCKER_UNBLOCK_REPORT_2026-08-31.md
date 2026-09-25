# Stoquify X1 Finance Credentials and Blocker Unblock Report

Date: 2026-08-31

## Executive conclusion

Most of the technical information needed for the X1 finance/accounting evidence run is already available. The repository and isolated fixture database provide the candidate database, tenant IDs, named personas, role mappings, finance fixtures, test routes, browser matrix, validation contract, and execution commands.

The remaining blockers are not missing technical facts. They are human authorization events and authenticated runtime artifacts that the system must not invent:

1. A product approver must approve the proposed performance budgets and issue a traceable approval record.
2. A security/control owner must authorize the exact non-production tenant, credential reference, seeded data, persona, and evidence run.
3. An authorized credential custodian must create an authenticated Playwright storage-state file for the external-accountant persona without exposing the password or session content.
4. The approved browser run must produce 42 current screenshots and a validation manifest.
5. A human reviewer must inspect the approval records and evidence and record a disposition.

The system is technically ready for those steps. It must remain blocked until the external decisions and authenticated artifacts actually exist.

## What is already available

### Isolated non-production data scope

| Item | Available value | Meaning |
| --- | --- | --- |
| Candidate database | `stoquify_replay_next_20260830` | Isolated local fixture database identified during non-mutating readiness checks. |
| Primary fixture tenant | `rds_org_001` | Candidate tenant for the authenticated external-accountant run. |
| Foreign fixture tenant | `rds_org_002` | Candidate second tenant for the read-only tenant-isolation probe. |
| Current migrations | Up to date | Prisma migration status was current during the readiness execution. |
| Inventory coverage | At least 20 stocked items per active location | Read-only seed verification passed. |
| Finance coverage | Present | Includes draft, posted, reversed and voided journals, EUR/USD/XAF, open and closed periods, AR/AP, payments, reconciliation, cash history, close evidence and derived statements. |

These facts make the database suitable as a candidate fixture target. They do not authorize credential use or an authenticated browser run.

### Available identities and role mappings

| Responsibility | Candidate identity | User ID | Current interpretation |
| --- | --- | --- | --- |
| Product approver | Kouatchoua Mark | `rds_org_001_compliance_user_product_approver` | Correct candidate role and identity; no approval event has been recorded in the evidence packet. |
| External accountant | Carine Manga | `rds_org_001_compliance_user_external_accountant` | Correct read-only persona for the X1 evidence matrix; presence does not authorize use of credentials. |
| Security/control owner | Yonga Springfield | Must be confirmed in the approval/control system | Candidate control owner name is available; the exact approving account and approval record must be selected when authorization occurs. |

The external-accountant role is read-only. It permits finance and accounting review and server-controlled redacted exports while prohibiting journal creation, posting, approval, reversal, period close/reopen, financial-system configuration and cash-transaction management.

### Available product budget proposal

The decision subject is already defined:

| Signal | Proposed target |
| --- | --- |
| Local sort/filter on bounded client data | Under 100 ms on p75 test hardware |
| Server filter/sort feedback | Loading indication under 150 ms and useful result under 1,000 ms at p75 |
| Page navigation | Useful rows under 750 ms at p75 after cached shell |
| Bulk-action acknowledgement | Immediate job receipt with progress and partial-result handling |
| Preference/view hydration | No visible column-layout flash after the initial shell |
| Browser row DOM | Bounded by pagination or a proven virtualization strategy |
| Export duration | Measured by result tier and output format |

These are proposed engineering budgets, not existing measurements or service-level agreements.

### Available evidence machinery

| Capability | Status |
| --- | --- |
| Canonical X1 finance/accounting table contracts | Implemented for 13 archetypes |
| Approval and evidence schema | Implemented and versioned |
| Read-only preflight | Implemented |
| Desktop/tablet/mobile Playwright projects | Implemented |
| English/French route matrix | Implemented |
| Evidence aggregation | Implemented |
| Focused contract verification | 5 suites and 22 tests passed |
| Playwright compilation/listing | 43 tests listed successfully |
| Authenticated browser execution | Not run |
| Release certification | Not claimed |

The 43 Playwright tests consist of 42 route/locale/viewport checks and one dependency-gated aggregator.

## The seven required X1 routes

The external-accountant matrix covers each route in English and French at desktop, tablet and mobile sizes.

| Route purpose | Canonical path |
| --- | --- |
| Receivables history | `/dashboard/finance/receivables/history` |
| Payables | `/dashboard/finance/payables` |
| Cash flow | `/dashboard/finance/cash-flow` |
| Journals | `/dashboard/accounting/journals` |
| Trial balance | `/dashboard/accounting/reports/trial-balance` |
| Financial statements | `/dashboard/accounting/reports/financial-statements` |
| Accountant portal and evidence | `/dashboard/accounting/accountant-portal` |

The complete minimum is 7 routes multiplied by 2 locales multiplied by 3 viewports, resulting in 42 file-backed screenshots from one authenticated run.

## Remaining blocker register

| Blocker | Owner | What is missing | Where it comes from | Resolution |
| --- | --- | --- | --- | --- |
| X1-CB-001 Product budget decision | Product approver | Approval ID, approver user ID, role, timestamp, scope and approved decision | Product decision register, ticketing system, signed decision record or approved control system | Kouatchoua Mark or another authorized product approver reviews the proposed targets and records the real decision. |
| X1-CB-002 Evidence authorization | Security/control owner | Credential approval reference, seeded-data approval reference, authorized tenant, approving user ID and timestamp | Security ticket, access-governance system, change record or signed control-owner authorization | Authorize the exact non-production database, tenants, Carine Manga persona, credential reference and run scope. |
| X1-CB-003 Authenticated browser state | Credential custodian | Non-empty Playwright storage-state file | Approved secret manager plus an interactive login to the approved non-production application | Generate the file after authorization; never put the password or session content in a report or command. |
| X1-CB-004 Run identity and target | Evidence operator | Unique run ID, approved non-production URL and distinct foreign tenant | Test-run register and approved environment inventory | Assign the run ID, use the approved URL, set `rds_org_001` as authorized tenant and `rds_org_002` as foreign probe only after owner confirmation. |
| X1-CB-005 Authenticated artifacts | Evidence operator | 42 current screenshots, fragments, manifest and validation report | The approved Playwright capture command | Run the capture only after preflight passes. |
| X1-CB-006 Human review | Independent reviewer | Reviewer ID, review reference, timestamp, scope and disposition | Review workflow, assurance register or signed review record | Inspect the actual approvals and artifacts; record pass, remediation required or rejected. |

## How to obtain each remaining item

### Product approval record

Use the organization's normal product decision system. Suitable sources include an approved Jira/Linear ticket, change-management record, signed decision form, governance register or another controlled system that preserves the approver and timestamp.

The record must contain:

| Manifest field | Required content |
| --- | --- |
| `budgetApproval.status` | `approved`, but only after the decision is real |
| `budgetApproval.budgetContractVersion` | `1` |
| `budgetApproval.approvalReference` | Real record ID from the decision system |
| `budgetApproval.approvedByUserId` | Exact product-approver user ID |
| `budgetApproval.approvedByRole` | `product_approver` |
| `budgetApproval.approvedAt` | ISO-8601 approval timestamp |
| `budgetApproval.scope` | `X1-finance-accounting-performance-budgets` |

Do not use a document label such as `Approved` without the record ID, approver, date and scope.

### Security/control-owner authorization

Open an access or test-evidence authorization request with the security/control owner. The request should state:

- The environment is non-production.
- The candidate database is `stoquify_replay_next_20260830`.
- The candidate authorized tenant is `rds_org_001`.
- The candidate foreign isolation-probe tenant is `rds_org_002`.
- The persona is Carine Manga with role `external_accountant`.
- The run is read-only and contains no seed or migration command.
- The output contains screenshots and redacted structural measurements, not credentials.

The resulting manifest fields are:

| Manifest field | Required content |
| --- | --- |
| `evidenceAuthorization.status` | `approved`, only after authorization |
| `evidenceAuthorization.environment` | `non-production` |
| `evidenceAuthorization.credentialApprovalReference` | Secret-manager or access-approval record ID |
| `evidenceAuthorization.seededDataApprovalReference` | Approval record for the exact fixture database and tenant |
| `evidenceAuthorization.authorizedFixtureTenantId` | Approved tenant ID, expected candidate `rds_org_001` |
| `evidenceAuthorization.approvedByUserId` | Exact security/control-owner account ID |
| `evidenceAuthorization.approvedAt` | ISO-8601 authorization timestamp |

### Credential and storage-state file

Obtain the login credential from the approved secret manager. Do not retrieve it from a report, add it to the evidence manifest or expose it in terminal history.

An authorized credential custodian can generate the browser state interactively:

```powershell
node node_modules/@playwright/test/cli.js codegen --save-storage=playwright/.auth/finance-x1-external-accountant.json http://127.0.0.1:3000/en/login
```

In the opened browser, the custodian signs in as the approved Carine Manga account, confirms the organization is `rds_org_001`, and closes the browser after authentication succeeds. The resulting JSON file contains sensitive session state and must remain outside source control and evidence uploads.

For an approved staging or QA environment, replace the localhost URL with the exact approved non-production URL. Do not use a production hostname.

### Run ID and environment values

The evidence operator assigns a unique run ID in the test-run register. A suitable format is:

```text
finance-x1-YYYYMMDD-NNN
```

After approvals and browser state exist, configure only references and paths:

```powershell
$env:FINANCE_X1_EVIDENCE_APPROVAL_MANIFEST = "what-next/evidence/finance-x1/<approved-manifest>.json"
$env:FINANCE_X1_EVIDENCE_RUN_ID = "finance-x1-YYYYMMDD-NNN"
$env:FINANCE_X1_FOREIGN_TENANT_ID = "rds_org_002"
$env:PLAYWRIGHT_FINANCE_X1_STORAGE_STATE = "playwright/.auth/finance-x1-external-accountant.json"
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3000"
```

These values identify the authorized run. They do not contain the password or session token.

## Exact safe execution sequence

### Step 1: Create the approved manifest

Start from the pending schema at:

```text
what-next/evidence/finance-x1/finance-x1-evidence-manifest.pending.json
```

Create a run-specific approved manifest only after the real product and security records exist. Replace the two pending approval objects with their traceable approved records and change the workflow state to `approved-awaiting-evidence`. Do not add screenshots before the run.

### Step 2: Run preflight

```powershell
npm run table:x1:finance:evidence:preflight
```

The expected result before capture is:

```text
status: ready-for-capture
blockerCount: 0
certificationClaimed: false
```

If preflight remains blocked, use its finding IDs to correct the approval manifest, run ID, foreign tenant, URL or storage-state reference. Do not bypass the preflight.

### Step 3: Optionally list the bounded test matrix

```powershell
npm run table:x1:finance:evidence:list
```

This lists 43 tests without opening an authenticated browser session.

### Step 4: Run authenticated capture

```powershell
npm run table:x1:finance:evidence:capture
```

This command does not seed or migrate the database. It verifies the external-accountant role, required read permissions, forbidden mutation permissions, tenant override resistance, protected-action absence, secret-like content absence, table discoverability, serious or critical Axe violations, keyboard focus, document overflow, clipped controls and route loading.

### Step 5: Review the generated evidence

The run directory should contain:

```text
42 PNG screenshots
fragment-desktop.json
fragment-tablet.json
fragment-mobile.json
manifest.json
validation-report.json
```

The technical endpoint is:

```text
status: ready-for-human-review
artifactCount: 42
blockerCount: 0
certificationClaimed: false
```

### Step 6: Record human disposition

The reviewer independently opens the approval records and generated artifacts. The reviewer then records:

| Field | Required content |
| --- | --- |
| Reviewer identity | Exact authorized reviewer user ID |
| Review reference | Controlled review or assurance record ID |
| Scope | X1 finance/accounting authenticated evidence |
| Reviewed at | ISO-8601 timestamp |
| Disposition | Pass, remediation required or rejected |

Repository validation cannot replace this review.

## What can and cannot be automated

| Can be produced by the system | Must come from an authorized person or external control system |
| --- | --- |
| Tenant and persona lookup | Product approval decision |
| Role and permission verification | Security/control-owner authorization |
| Seed-fixture verification | Authorization to use credentials |
| Run-ID format validation | Real approval IDs and signatures |
| Browser route execution | Entry of the external-accountant credential |
| Screenshots and measurements | Independent review disposition |
| Evidence manifest aggregation | Release or certification decision |

## Plain-English unblock checklist

1. Ask the product approver to review the seven proposed budgets and issue a real approval record.
2. Ask the security/control owner to authorize `stoquify_replay_next_20260830`, `rds_org_001`, `rds_org_002`, Carine Manga's external-accountant persona and the read-only evidence run.
3. Ask the credential custodian to retrieve the approved login from the secret manager and create the Playwright storage-state file interactively.
4. Put only approval references, IDs, timestamps and file paths into the approved manifest and environment variables.
5. Run preflight and correct every reported finding.
6. Run the authenticated capture to generate all 42 screenshots and the manifest.
7. Have an independent reviewer inspect the real records and artifacts and record the disposition.

Until steps 1 through 3 are completed, the browser run must remain blocked. The available database identities and fixture data are sufficient for preparation, but they are not substitutes for authorization or authenticated evidence.

## Source references

- `what-next/evidence/finance-x1/FINANCE_X1_APPROVAL_AND_EVIDENCE_HANDOFF_2026-08-31.md`
- `what-next/evidence/finance-x1/finance-x1-evidence-manifest.pending.json`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_06_FINANCE_ACCOUNTING_NORMALIZATION_REPORT_2026-08-31.md`
- `components/DataTableComponents/finance-x1-evidence-binding.ts`
- `scripts/finance-x1-evidence-preflight.ts`
- `scripts/validate-finance-x1-evidence.ts`
- `playwright.finance-x1-evidence.config.ts`
- `tests/e2e/finance-x1-authenticated-evidence.spec.ts`
- `tests/e2e/finance-x1-evidence-aggregate.setup.ts`
