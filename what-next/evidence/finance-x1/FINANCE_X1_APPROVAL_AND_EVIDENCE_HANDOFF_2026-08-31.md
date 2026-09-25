# Finance X1 Approval and Authenticated Evidence Handoff

Date: 2026-08-31

## Purpose

This packet contains the exact external inputs needed to move X1 finance/accounting from repository-ready to authenticated evidence review. It does not authorize a database reset, expose credentials, or create release certification.

## 1. Product budget decision

The product approver must accept, reject, or revise these proposed engineering budgets. They are not current measurements or SLAs.

| Signal | Proposed target |
| --- | --- |
| Local sort/filter on a bounded client set | Interaction response under 100 ms on p75 test hardware |
| Server filter/sort feedback | Loading indication under 150 ms and useful result under 1,000 ms at p75 |
| Page navigation | Useful rows under 750 ms at p75 after cached shell |
| Bulk action acknowledgement | Immediate job receipt with progress and partial-result handling |
| Preference/view hydration | No visible column-layout flash after the initial shell |
| Browser row DOM | Bounded by pagination or a proven virtualization strategy |
| Export duration | Measured and recorded by result tier and format |

Required approval record fields:

| Field | Required value |
| --- | --- |
| `status` | `approved` only after the real decision |
| `budgetContractVersion` | `1` |
| `approvalReference` | ID from the approved control or decision system |
| `approvedByUserId` | Exact approving user ID |
| `approvedByRole` | `product_approver` |
| `approvedAt` | ISO-8601 timestamp |
| `scope` | `X1-finance-accounting-performance-budgets` |

The read-only identity reconciliation identified Kouatchoua Mark as the `product_approver` candidate for `rds_org_001`, user ID `rds_org_001_compliance_user_product_approver`. This identifies a candidate only; it is not evidence that approval occurred.

## 2. Non-production evidence authorization

The security/control owner must approve the exact non-production credential reference, fixture tenant, seeded data, persona, and run scope.

Required authorization fields:

| Field | Required value |
| --- | --- |
| `status` | `approved` only after the real authorization |
| `environment` | `non-production` |
| `credentialApprovalReference` | Secret-manager or control-system reference, never the credential itself |
| `seededDataApprovalReference` | Approval reference for the exact seeded fixture target |
| `authorizedFixtureTenantId` | Exact tenant ID approved for evidence |
| `approvedByUserId` | Exact security/control owner user ID |
| `approvedAt` | ISO-8601 timestamp |

The current candidate fixture scope is the isolated local database `stoquify_replay_next_20260830`. Candidate tenant `rds_org_001` includes external accountant Carine Manga, user ID `rds_org_001_compliance_user_external_accountant`. Neither the database name nor the persona record is authorization to use credentials.

Do not place passwords, tokens, cookies, storage state, connection strings, or authorization headers in the manifest or report.

## 3. Authenticated evidence run

Capture one authorized run after both approval timestamps. The minimum evidence matrix is:

| Persona | Locale | Viewport |
| --- | --- | --- |
| `external_accountant` | `en` | desktop |
| `external_accountant` | `en` | tablet |
| `external_accountant` | `en` | mobile |
| `external_accountant` | `fr` | desktop |
| `external_accountant` | `fr` | tablet |
| `external_accountant` | `fr` | mobile |

Run that six-cell locale/viewport matrix for each required X1 route:

| Route key | Route |
| --- | --- |
| Receivables history | `/dashboard/finance/receivables/history` |
| Payables | `/dashboard/finance/payables` |
| Cash flow | `/dashboard/finance/cash-flow` |
| Journals | `/dashboard/accounting/journals` |
| Trial balance | `/dashboard/accounting/reports/trial-balance` |
| Financial statements | `/dashboard/accounting/reports/financial-statements` |
| Accountant portal and evidence | `/dashboard/accounting/accountant-portal` |

The complete minimum is 42 file-backed screenshots from one authenticated run.

Each manifest artifact must contain:

- Unique artifact ID and workspace-relative image path.
- One common authenticated run ID.
- Authorized fixture tenant ID.
- Exact persona role.
- Locale and viewport.
- Locale-matching route such as `/en/finance` or `/fr/finance`.
- Browser and ISO-8601 capture timestamp.
- `authenticated: true`.
- Passed route loading, authorization, tenant isolation, redaction, layout, and accessibility-review checks.
- Optional measured viewport width, rendered-row count, loading feedback, useful-result time, and interaction latency.

The checked-in pending manifest is `what-next/evidence/finance-x1/finance-x1-evidence-manifest.pending.json`. Keep it pending until real references and artifacts exist. A completed run may use a new path such as `what-next/evidence/finance-x1/<run-id>/manifest.json`.

## 4. Validation commands

Configure references only after approval. The storage-state value is a file path, not a password, token, or cookie value.

```powershell
$env:FINANCE_X1_EVIDENCE_APPROVAL_MANIFEST = "what-next/evidence/finance-x1/<approved-manifest>.json"
$env:FINANCE_X1_EVIDENCE_RUN_ID = "finance-x1-<approved-run-id>"
$env:FINANCE_X1_FOREIGN_TENANT_ID = "<approved-foreign-fixture-tenant-id>"
$env:PLAYWRIGHT_FINANCE_X1_STORAGE_STATE = "<approved-storage-state-path>"
$env:PLAYWRIGHT_BASE_URL = "<approved-non-production-origin>"
```

Run the capture preflight:

```powershell
npm run table:x1:finance:evidence:preflight
```

List the bounded Playwright matrix without authenticating or capturing:

```powershell
npm run table:x1:finance:evidence:list
```

After preflight passes, execute the read-only authenticated capture and dependency-gated aggregation:

```powershell
npm run table:x1:finance:evidence:capture
```

The capture command does not seed or migrate the database. It checks the external-accountant role, required read permissions, forbidden mutation permissions, tenant override resistance, protected-action absence, secret-like content absence, table discoverability, serious/critical Axe findings, keyboard focus, document overflow, clipped controls, and route loading before writing each artifact.

Structural report using the pending manifest:

```powershell
npm run table:x1:finance:evidence:report
```

Failing gate after supplying a completed manifest at the default path:

```powershell
npm run table:x1:finance:evidence:gate
```

For a run-specific manifest:

```powershell
npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' scripts/validate-finance-x1-evidence.ts --mode fail --manifest what-next/evidence/finance-x1/<run-id>/manifest.json
```

Passing means only that the approval references are structurally present and the complete file-backed evidence matrix is ready for human review. It does not independently verify the external control system, certify accessibility or security, or approve release.

## 5. Human review

The final reviewer must independently open the referenced approval records and evidence files, confirm their authenticity and scope, record reviewer identity, review reference, timestamp, and disposition, and keep certification outside the self-authored manifest.
