# Stoquify Customer Workflow Execution Report

**Execution date:** 2026-08-09  
**Workspace:** `E:\ohada saas\Focused projects\stoquify`  
**Prompt source:** attached Stoquify multidisciplinary customer-workflow execution prompt  
**Report classification:** code-level remediation verified; production release evidence blocked  
**Statutory boundary:** this report is not an OHADA filing certification, legal opinion, or Close & Assurance certificate.

## 1. Executive verdict

The customer workflow is materially stronger and the implemented code slice is verified. Customer routes now enforce the Sales entitlement, customer financial values use the tenant's authoritative currency rather than fixed XAF/USD labels, mixed-currency receivables are never collapsed into a false total, and the AR export now generates a real audited CSV rather than returning only an authorization decision.

The current workspace also contains a substantial pre-existing customer statement, settlement, receivable-document, external-access, delivery, and referral foundation. Its automated customer/AR regression suite is green.

Production readiness is still **blocked**. The repository does not contain a valid real-user pilot manifest, exact deployed revision, production PostgreSQL evidence, consented delivery evidence, external recipient evidence, or the complete statement-to-referral-conversion event sequence. The working tree is also heavily mixed with unrelated and staged changes, so no exact release revision can be certified from this workspace state.

| Decision area | Verdict | Evidence |
|---|---|---|
| Customer master and route boundary | Ready at code level | Permission checks plus enforced Sales-module decision |
| Customer retention behavior | Ready at code level | Financial-history relations cause deactivation; regression coverage added |
| Customer exports | Ready at code level | Server-owned selection, redaction, fresh auth, watermark, audit, file download |
| AR history | Ready at code level | Bitemporal posted-document read model and currency-separated summaries |
| AR export | Ready at code level | Real CSV, server-derived row count, hashes, watermark, audit, download |
| Statements and settlements | Pilot-capable code foundation | Immutable snapshots, receivable evidence, idempotency, reversals, access/delivery models |
| Live statement/referral pilot | Blocked | 0/16 production pilot checks ready |
| Exact release certification | Blocked | Dirty mixed scope, no isolated Git revision, no exact-revision security scan |

## 2. Scope and method

The prompt was executed as an evidence-led audit plus the smallest coherent remediation slice. The audit covered:

- customer master lifecycle and retention;
- customer-to-sales/POS and receivable continuity;
- AR open items, allocations, aging, settlements, reversals, and statements;
- permissions, tenant isolation, module entitlement, fresh authentication, and auditability;
- exports, redaction, spreadsheet-injection safety, watermarks, hashes, and actual browser downloads;
- organization currency, mixed-currency aggregation, locale behavior, and residual localization gaps;
- data-model provenance, idempotency, immutable evidence, performance bounds, and release controls;
- current architecture graphs and the dirty-worktree/release boundary.

No migration, deployment, external message, database mutation, staging operation, commit, or push was performed. The repository was already heavily modified; all unrelated changes were treated as user-owned.

## 3. Architecture and ownership

### 3.1 Canonical ownership

Customer master, customer sales activity, and ordinary customer exports belong to the canonical **Sales** module. Immutable customer statements additionally cross into **Accounting**, which already has its own enforced entitlement on the statement route.

The runtime topology is:

```text
Customer page/layout
  -> RBAC customer permission
  -> Sales module entitlement
  -> protected customer action
  -> tenant-scoped customer service
  -> Sales/POS order
  -> posted receivable document + lifecycle state
  -> customer ledger / settlement allocation
  -> AR open-item projection
  -> immutable statement snapshot
  -> consented external access/delivery/referral evidence
```

### 3.2 Graph findings

The existing action graph separates legacy customer actions into Community 3 (cohesion 0.22) and management/analytics actions into Community 13 (cohesion 0.41): [action graph report](../../graphify-out/GRAPH_REPORT_actions.md#community-3---community-3). This confirms that compatibility and management boundaries coexist and require source-level verification rather than assumptions from graph proximity.

The component graph places customer form/export helpers in a very broad Community 0 with cohesion 0.02: [component graph report](../../graphify-out/GRAPH_REPORT_components.md#community-0---community-0). That graph is useful for navigation, but the low cohesion means source and tests remain authoritative for security and financial behavior.

The release-scope gate requires all architecture graphs to be regenerated only after an isolated customer/referral revision exists. Regenerating them in this mixed worktree would create misleading evidence.

## 4. Implemented and verified remediation

### 4.1 Enforced Sales entitlement for every customer route

The shared customer layout now performs:

1. `customers.read` permission enforcement;
2. authenticated tenant resolution;
3. an audited `sales` module access decision in `enforce` mode;
4. a `locked_module` route state when entitlement is absent.

Evidence: [customer layout](../../app/%5Blocale%5D/(dashboard)/dashboard/customers/layout.tsx#L9) and [layout boundary tests](../../app/%5Blocale%5D/(dashboard)/dashboard/customers/__tests__/layout.test.tsx#L45).

This closes the prior page-level gap where protected actions enforced Sales but the shared UI boundary only checked a customer permission.

### 4.2 Retention-safe customer removal

The current service checks sales orders, ledger entries, receivable documents, statement snapshots, and settlements before deciding whether a customer may be archived. Any financial or operational history forces deactivation rather than historical erasure.

Evidence: [customer lifecycle service](../../services/customer/customer.service.ts#L904) and [retention regression cases](../../services/customer/__tests__/customer-legacy.service.test.ts#L150).

The new regression matrix explicitly covers receivable-document-only, statement-only, and settlement-only customers, plus the genuinely history-free archive path.

### 4.3 Authoritative customer currency

The customer management read model now loads and validates the organization currency. It returns a normalized ISO-style three-letter code with the customer dataset; absent or invalid currency fails closed.

Evidence: [customer management contract and query](../../services/customer/customer.service.ts#L65), [currency validation](../../services/customer/customer.service.ts#L819), and [dashboard formatting](../../components/customers/CustomerManagementDashboard.tsx#L407).

The customer order page independently resolves organization settings on the server, validates the currency, and passes it to the client formatter. The previous fixed `USD` formatter is gone.

Evidence: [customer order server page](../../app/%5Blocale%5D/(dashboard)/dashboard/customers/%5Bid%5D/orders/page.tsx#L25), [order client formatter](../../app/%5Blocale%5D/(dashboard)/dashboard/customers/%5Bid%5D/orders/CustomerOrdersClientPage.tsx#L58), and [fail-closed test](../../app/%5Blocale%5D/(dashboard)/dashboard/customers/%5Bid%5D/orders/__tests__/page.test.tsx#L96).

### 4.4 Currency-safe AR summaries

The AR result contract now exposes `summariesByCurrency`. For a single currency, the compatibility summary still contains monetary totals and an explicit currency. For mixed currencies, top-level monetary fields are `null` and `mixedCurrency` is true; no false combined amount is emitted.

Evidence: [AR result contract](../../services/accounting/ar-open-item.service.ts#L82), [currency grouping](../../services/accounting/ar-open-item.service.ts#L298), [AR workbench currency display](../../components/finance/AROpenItemsHistoryWorkbench.tsx#L95), and [mixed-currency regression](../../services/accounting/__tests__/ar-open-item.service.test.ts#L195).

Rows, drawer details, allocations, KPI labels, and monetary columns now format using each item's actual currency.

### 4.5 Real, controlled AR export

The former AR export returned only a control decision. It now:

- reloads the authoritative server-side AR dataset;
- derives row count on the server and ignores the legacy client count;
- binds normalized filters, `asOf`, and `recordedThrough`;
- emits per-currency summary evidence;
- creates a durable watermark and content hash;
- requires verified fresh authentication and export permission;
- records the allow/deny audit decision inside the transaction;
- escapes spreadsheet formula prefixes;
- returns an actual CSV that the client downloads.

Evidence: [AR export service](../../services/accounting/ar-open-item-export.service.ts#L143), [audit before release](../../services/accounting/ar-open-item-export.service.ts#L197), [server action](../../actions/finance/ar-history.actions.ts#L53), [download hook](../../hooks/useAROpenItemsHistoryWorkbench.ts#L49), and [export regressions](../../services/accounting/__tests__/ar-open-item-export.service.test.ts#L107).

### 4.6 Existing customer export controls verified

The current customer export path already:

- derives tenant scope from protected action context;
- checks Sales entitlement and customer export/read permissions;
- selects rows on the server;
- defaults to redacting email, phone, address, tax ID, credit limit, current balance, and notes;
- prevents CSV formula execution;
- applies fresh authentication, watermark, filter hash, content hash, and audit evidence;
- downloads the generated file only after success.

Evidence: [customer action controls](../../actions/customers/customer-management-actions.ts#L204), [redacted fields](../../services/customer/customer-export.service.ts#L61), [CSV injection control](../../services/customer/customer-export.service.ts#L103), [audit decision](../../services/customer/customer-export.service.ts#L264), and [download hook](../../hooks/useCustomerManagement.ts#L226).

## 5. End-to-end workflow audit

| Domain | Current evidence | Classification | Residual concern |
|---|---|---|---|
| Customer create/read/update | Protected management actions, tenant-derived organization ID, validated schemas | Ready at code level | No live browser evidence in this run |
| Search/filter/analytics | Server read model, bounded 500-row management surface, filtered exports | Ready at code level | Large-tenant query plan not benchmarked |
| Customer archive/delete | Soft lifecycle behavior with broad history check | Ready at code level | Concurrent lifecycle mutation should be stress-tested in PostgreSQL |
| Sales/POS linkage | Customer orders and posted receivable-document foundation | Ready at code level | SalesOrder remains organization-base-currency, not a proven per-order FX model |
| Receivable documents | Immutable document identity, hashes, append-only lifecycle state | Ready at code level | Requires migration deployment evidence on target DB |
| AR open items | Posted state, allocations, aging, `asOf` and `recordedThrough` boundaries | Ready at code level | Live data reconciliation not run |
| Settlement collection | Idempotency, allocation, ledger/accounting links | Pilot-capable | Provider/bank operational evidence not supplied |
| Settlement reversal | Compensating reversal foundation and protected action tests | Pilot-capable | Production maker-checker evidence not supplied |
| Statements | Immutable, currency-specific snapshots with source hashes | Pilot-capable | Production generation and delivery evidence absent |
| External statement access | Token hashes, redacted access logs, disputes/promises-to-pay | Pilot-capable | Real recipient cohort and abuse testing absent |
| Statement delivery/referral | Consent-bound delivery and referral event models | Code foundation present | Live end-to-end event sequence is blocked |
| Customer export | Controlled, redacted, watermarked, audited actual file | Ready at code level | Retention policy for downloaded local files is outside application control |
| AR export | Controlled, currency-explicit, bitemporal actual file | Ready at code level | No production-volume export test |
| Tenant isolation | Protected action context and tenant-scoped service queries | Ready at code level | No live cross-tenant penetration test in this run |
| RBAC and module access | Customer permissions plus Sales/Accounting entitlements | Ready at code level | Exact production role assignment evidence absent |
| Localization | Customer management supports English/French copy | Partial | Customer orders client remains substantially English-only |
| Accessibility/responsiveness | Existing component tests and dashboard primitives | Not certified | No authenticated desktop/mobile browser or assistive-technology run |
| Observability | Audit logs, evidence hashes, business-event links | Pilot-capable | No production alert/dashboard proof supplied |

## 6. Security, privacy, and financial-control assessment

### Controls verified

- Server actions do not trust a caller-supplied organization ID as authority.
- Customer and AR exports require specific permissions and fresh authentication.
- Controlled exports are watermarked, hashed, audited, and spreadsheet-safe.
- AR summaries preserve currency identity and do not add unlike currencies.
- Statements are currency-specific and bind `asOf`, `recordedThrough`, source hashes, and idempotency evidence.
- Historical customer evidence prevents destructive lifecycle behavior.
- Public statement evidence uses token hashes and redacted access logs rather than raw secrets.

### Residual risks

1. **P0 — production pilot evidence missing.** The referral pilot gate reported 0/16 ready checks.
2. **P0 — exact release cannot be isolated.** The worktree contains unrelated staged and unstaged changes, mixed shared files, and unclassified paths.
3. **P1 — full transaction-level multi-currency is not proven.** The remediation prevents mislabeled and mixed aggregation, but ordinary sales still inherit organization currency; a true per-order FX/rate model would require explicit product and accounting design.
4. **P1 — order-history localization is incomplete.** The customer order client contains substantial English-only copy.
5. **P1 — contact toasts expose full email/phone values.** [Customer quick actions](../../components/customers/CustomerQuickActions.tsx#L51) place complete contact data in local notifications before launching `mailto:` or `tel:`; redaction is preferable.
6. **P1 — production-volume performance is unmeasured.** The management page is bounded to 500 rows ([service limit](../../services/customer/customer.service.ts#L122)), but PostgreSQL query plans and export memory behavior were not benchmarked.
7. **P2 — browser and accessibility evidence is absent.** No authenticated runtime, mobile viewport, keyboard-only, or screen-reader session was available.

## 7. Verification evidence

### Automated tests

| Command/scope | Result |
|---|---|
| Baseline customer actions/export and AR service | 3 suites, 20 tests passed |
| Focused remediation set | 5 suites, 30 tests passed |
| Customer layout exact-path test | 1 suite, 2 tests passed |
| Broad `customer|ar-open-item` regression | 34 suites, 197 tests passed |
| Customer order currency boundary exact-path test | 1 suite, 4 tests passed |

The broad run includes customer master, lifecycle, receivable documents, ledger integrity, settlements, reversals, statements, access tokens, recipient actions, delivery, referral gates, API routes, components, and AR services.

### Static verification

| Check | Result |
|---|---|
| TypeScript `tsc --noEmit` | Passed after final changes |
| Focused ESLint on changed customer/AR files | Passed |
| `git diff --check` on scoped files | Passed; only existing CRLF normalization warnings |
| Report trust/export gate | Ready, 35/35 checks, 0 blockers |
| Hard-delete gate | 0 active unsafe findings |

### Release and operational gates

The real-user customer referral pilot gate is **blocked**:

- 0/16 checks ready;
- placeholder pilot ID;
- no exact release revision;
- no PostgreSQL target;
- no read-only production evidence query;
- no immutable statement, sent delivery, external view, recipient response, referral impression/click/conversion, or referred-organization activation evidence.

The release-scope report is also **blocked** because:

- unclassified paths remain;
- unrelated user index changes are present;
- four shared files require hunk isolation;
- architecture graphs must be regenerated on an isolated revision;
- no exact referral Git revision exists;
- no security diff scan exists for that exact revision.

These are legitimate external/release blockers, not code-test failures.

## 8. Dependency-ordered completion plan

### P0 — isolate and bind the release

1. Create a dedicated customer/referral release revision without unrelated staged or working-tree changes.
2. Classify the remaining unclassified paths and isolate the four shared-file hunks.
3. Regenerate architecture graphs on that exact revision.
4. Run a security diff scan and bind its digest to the exact revision.

### P0 — execute the production pilot

1. Deploy the existing migrations to an approved PostgreSQL pilot target.
2. Supply a non-placeholder pilot manifest, tenant consent, exact revision, and evidence references.
3. Execute the statement-to-delivery-to-view-to-response-to-referral-to-activation sequence with real, consented, non-seed data.
4. Re-run the read-only pilot evidence gate until all 16 checks are ready.

### P1 — finish product and control hardening

1. Decide whether Stoquify supports only organization base currency or true per-order currency/FX; if the latter, add explicit currency/rate identity and posting rules.
2. Localize the customer order workbench fully in English and French.
3. Redact contact data in client notifications.
4. Run PostgreSQL query-plan and memory tests for 500-row management reads and large controlled exports.
5. Add authenticated browser tests for create/edit/archive, order navigation, exports, statement generation, module lock, empty/error states, and mobile layouts.

### P2 — release assurance

1. Run keyboard, focus, screen-reader, contrast, and responsive checks.
2. Capture operator, accountant, and customer-recipient evidence.
3. Verify production audit-log ingestion, export alerts, delivery dead-letter handling, and settlement exception monitoring.
4. Route immutable statement and close evidence through Stoquify Close & Assurance before making certification claims.

## 9. Files changed by this execution

- `app/[locale]/(dashboard)/dashboard/customers/layout.tsx`
- `app/[locale]/(dashboard)/dashboard/customers/__tests__/layout.test.tsx`
- `app/[locale]/(dashboard)/dashboard/customers/[id]/orders/page.tsx`
- `app/[locale]/(dashboard)/dashboard/customers/[id]/orders/CustomerOrdersClientPage.tsx`
- `app/[locale]/(dashboard)/dashboard/customers/[id]/orders/__tests__/page.test.tsx`
- `actions/finance/ar-history.actions.ts`
- `components/customers/CustomerManagementDashboard.tsx`
- `components/finance/AROpenItemsHistoryWorkbench.tsx`
- `hooks/useAROpenItemsHistoryWorkbench.ts`
- `messages/en.json`
- `messages/fr.json`
- `services/accounting/ar-open-item.service.ts`
- `services/accounting/ar-open-item-export.service.ts`
- `services/accounting/__tests__/ar-open-item.service.test.ts`
- `services/accounting/__tests__/ar-open-item-export.service.test.ts`
- `services/customer/customer.service.ts`
- `services/customer/__tests__/customer-legacy.service.test.ts`

## 10. Final conclusion

The executed slice closes the most material verified customer-workflow defects that were safe to resolve in the current workspace: missing page entitlement enforcement, invented customer currencies, unsafe mixed-currency totals, and a non-file AR export. The customer/AR automated regression and static control gates pass.

The honest release verdict remains **blocked pending isolated revision and live pilot evidence**. Nothing in this report should be interpreted as production deployment approval, statutory certification, or evidence that external delivery and referral conversion occurred.
