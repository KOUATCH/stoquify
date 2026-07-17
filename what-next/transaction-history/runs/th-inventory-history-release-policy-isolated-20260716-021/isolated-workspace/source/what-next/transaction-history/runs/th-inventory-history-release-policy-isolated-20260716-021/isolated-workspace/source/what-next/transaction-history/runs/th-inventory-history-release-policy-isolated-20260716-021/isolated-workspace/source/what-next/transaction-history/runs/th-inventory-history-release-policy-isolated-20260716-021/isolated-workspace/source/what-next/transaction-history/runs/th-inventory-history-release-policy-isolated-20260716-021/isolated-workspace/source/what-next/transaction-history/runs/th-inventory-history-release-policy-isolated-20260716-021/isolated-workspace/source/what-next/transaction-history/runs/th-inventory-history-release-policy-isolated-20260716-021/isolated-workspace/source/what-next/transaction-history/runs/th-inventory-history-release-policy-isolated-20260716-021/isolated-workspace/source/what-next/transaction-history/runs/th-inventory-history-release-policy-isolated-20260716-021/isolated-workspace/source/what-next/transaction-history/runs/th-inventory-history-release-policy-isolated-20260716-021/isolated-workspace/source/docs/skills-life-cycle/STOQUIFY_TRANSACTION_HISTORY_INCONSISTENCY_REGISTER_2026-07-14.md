# Stoquify Transaction History Inconsistency Register

Date: 2026-07-14

| ID | Severity | Affected workflow | Evidence | Consequence | Recommended remedy | Verification | Deferred risk |
|---|---|---|---|---|---|---|---|
| TH-001 | Critical | Cash, payment, proof and close summaries | Drawer caps 120/250; payment cap 500; reconciliation and proof child caps | A dashboard can silently understate totals or blockers | Separate exact aggregate queries from paginated rows; disclose partial sources | Boundary tests at cap+1; exact summary parity | False close confidence and hidden exposure |
| TH-002 | Critical | Every paginated history/export | Non-unique ordering and no cursor across current reads | Duplicate, missing or drifting rows | Opaque versioned cursor bound to tenant, adapter, filter hash and `recordedThrough`; order by effective, recorded, id | Same-timestamp, new-row and backdated-insert traversal tests | Non-reproducible statements and exports |
| TH-003 | Critical | Supplier/customer statements | Stored `balanceAfter` is based on mutable current balances and can be backdated | Concurrent lost updates and false as-of balance | Compute opening and movement from immutable entries at a fixed knowledge cutoff; keep current balance as projection | Concurrency, backdating and opening+movement=closing tests | Financial misstatement |
| TH-004 | Critical | Accountant trust-pack export | Portal rows may be capped while manifest uses full counts | Incomplete payload may appear certified | Stream all server-filtered rows at fixed `recordedThrough`; manifest count must equal emitted count | 501 and 10,000-row export tests | Audit evidence omission |
| TH-005 | High | Inventory movement table and KPIs | TypeScript/Prisma enum drift; `as any`; summary omits type; placeholders | Invalid filters and contradictory KPIs | Use canonical Prisma-backed vocabulary or explicit adapter mapping; one normalized filter for rows/summary/export | Full enum coverage and filter-parity tests | Users act on contradictory stock information |
| TH-006 | High | Inventory access | Page checks `inventory.levels.read`; read actions only trust organization identity | Direct action invocation can bypass page-level permission | Protect every read action with the same or stricter permission and negative tests | Unauthorized action test and cross-tenant test | Sensitive stock disclosure |
| TH-007 | High | Receivables | Finance aging treats sales orders and inferred due dates as AR truth | Orders can be mistaken for invoices/open items | Create AR service contracts for invoice/open item, allocation, credit/refund/write-off/reversal and GL link before statement UI | Open-item and control-account tie-out | Commercially misleading AR |
| TH-008 | High | Supplier/customer activity and exports | `take: 8` snippets; client-generated filtered exports | Recent snippets look like complete history | Label snippets honestly now; replace with paginated adapters and server exports | Complete filtered export parity | Dispute and audit omissions |
| TH-009 | High | Proof badges | Only four proof subjects are supported | Unsupported domains can overstate evidence grade | Add subject contract, permission map and proof builder before any badge | Subject-specific positive/negative tests | False assurance |
| TH-010 | High | Cashier accountability | Finance permission exposes organization-wide drawer data; no own-session/manager scope contract | Excess disclosure and punitive misuse | Define cashier-own, supervisor-location and controller-organization scopes | Scope-negative tests | Privacy and labor-control risk |
| TH-011 | High | Export privacy and abuse | Export controls differ by surface; some are browser-only | Large extraction and redaction inconsistency | Dedicated export permission, fresh auth for sensitive datasets, row limits/jobs, watermark and access audit | Redaction, permission and throttling tests | Data exfiltration |
| TH-012 | High | Time filters | Inventory converts date strings in server local time; organization timezone not explicit | Boundary-day omissions or duplication | Normalize organization-time half-open intervals at service boundary | Timezone/DST tests | Period cut-off errors |
| TH-013 | Medium | Close assurance | Snapshot `asOf` is mixed with later comments/reviews | One response appears more coherent than it is | Expose `snapshotAsOf` and `activityAsOf` separately | Snapshot/activity change tests | Misread certification freshness |
| TH-014 | Medium | Read-path observability | Reconciliation dashboard sends notifications during a read; proof reads write audits | Refresh/retry can amplify writes | Move notifications to command/worker; keep deliberate sensitive-access audit isolated and idempotent | Assert pure reads do not notify | Load and duplicate notification noise |
| TH-015 | Medium | Audit evidence | Generic audit writes are best effort and mutable DB rows | Audit presence is not immutable proof | Define fail-open/fail-closed policy per event; restrict DB mutation; anchor critical checkpoints externally | DB-role and tamper-evidence tests | Forensic gaps |
| TH-016 | Medium | Query performance | Current indexes omit stable-order keys and common tenant/filter combinations | Sort, scan and memory pressure at scale | Add only plan-proven indexes after production-like `EXPLAIN` evidence | Plan and p95 evidence | Slow daily workflows |
| TH-017 | Medium | Graph-based architecture claims | Graph is older than current proposal/worktree | Stale topology can mislead implementation | Use graph as navigation only; verify source before each edit | Record graph/source date in stage evidence | Wrong impact assumptions |

## Resolution Order

Resolve TH-001 through TH-006 before shared frontend delivery. Resolve TH-007 before enabling customer receivable statements. Resolve TH-009 through TH-012 before proof-enabled export. TH-013 through TH-017 can proceed in parallel only when they do not weaken the earlier gates.

## Execution Update

| ID | Status | Evidence and next action |
|---|---|---|
| TH-006 | RESOLVED | Run `th-foundation-inventory-20260714-001` now enforces `inventory.levels.read`, RBAC tenant scope, and the `inventory` module on all three history reads; 6 focused tests, lint, and typecheck pass. |
| TH-018 | BLOCKING | `InventoryTransaction` stores only `createdAt`; add immutable effective and recorded time with backfill provenance before as-of or recorded-through claims. |
| TH-019 | BLOCKING | Inventory source-continuity reconciliation caps movements at 500 and events at 1,000; replace with complete set-based checks or keyset traversal. |
| TH-020 | BLOCKING | Period-scoped movements and class 3 lines are compared with current inventory value; add a closing valuation at the same effective/recorded cutoff. |
| TH-021 | BLOCKING | Inventory movements lack explicit immutable reversal/correction lineage; define and test original, reversal, replacement, and close-invalidation behavior. |

Stages 04-07 remain ineligible until TH-018 through TH-021 are remediated and Stage 03 returns exact `PASS`.
