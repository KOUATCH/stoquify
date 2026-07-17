# RBAC Skill — Design Report

*Companion document to `~/.claude/skills/rbac/SKILL.md`. Explains design choices, role rationale, permission tier decisions, and how the skill blocks the major fraud schemes in accounting and inventory systems for OHADA SMB SaaS.*

**Date:** 2026-06
**Skill version:** v1 (expanded, with five anatomy examples)
**Stack assumed:** Next.js App Router + NextAuth (Auth.js v5) + Prisma + Postgres

---

## 1. What the Skill Is, in One Sentence

A discipline guide for designing, building, and auditing the role-and-permission system of a multi-tenant Next.js + NextAuth SaaS that handles the books, cash, stock, payroll, and supplier payments of OHADA SMBs — where every authorization failure is also a financial-loss or compliance event.

## 2. Why the Skill Reads the Way It Does — Core Design Choices

### 2.1 Permissions, not role names

Most failed RBAC systems check role names (`if (user.role === 'admin')`). That conflates *who someone is* with *what they may do*, and the check has to be re-litigated every time the role evolves. The skill enforces the opposite: code checks atomic permissions (`accounting.journal.post`), roles are bundles of permissions, and role names appear only in admin UI and seed migrations. Renaming `cashier_lead` to `chef_caisse` is a UI change; renaming a permission would break code, so permissions evolve under a typed catalog.

### 2.2 Four-tier risk classification

Every permission carries a risk tier: `low`, `med`, `high`, `crit`. The tier drives operational behavior:

| Tier | What it allows the code to do                                  | Examples                                      |
| ---- | -------------------------------------------------------------- | --------------------------------------------- |
| low  | Trust the JWT cache for the full 8h session                    | `inventory.item.view`                         |
| med  | Trust JWT; lighter audit                                       | `pos.sale.create`, `inventory.item.create`    |
| high | Re-fetch from DB if JWT > 5min stale; full audit               | `accounting.journal.post`, `pos.refund.issue` |
| crit | **Always** re-fetch from DB; full audit + often two-party rule | `accounting.period.close`, `pos.cash.adjust`, `payroll.run.approve` |

This is the single most important design decision in the skill. It accepts a deliberate trade-off: low-tier checks are fast and stale-tolerant; crit checks pay a DB round-trip every time because the alternative is letting a revoked manager close a period in the 7 minutes before her JWT expires.

### 2.3 Defense in depth — four layers, all four required

Authorization is not a single check; it is four. UI affordance → middleware → server-action permission check → data-layer tenant/scope filter. The skill is emphatic that Layer 1 (UI) is **UX only, never security**, because the most common AI-generated RBAC bug is "we hide the button" being treated as the gate. The real gate is Layer 3, with Layer 4 as belt-and-suspenders.

The skill encodes this as the **`scopedPrisma(ctx)`** primitive — a Prisma client extension that auto-injects `tenantId` on every query and refuses writes that don't include it. Even if a developer forgets a `requirePermission` call (Layer 3), the data layer (Layer 4) still refuses to leak across tenants. Two missed layers, not one, are required to produce a CVE.

### 2.4 Multi-tenancy as a tuple element, not a context variable

Every authorization is `(tenantId, userId, permission, resource)`. Every row in every table carries `tenantId`. Every query filters by it at the data layer. The skill explicitly forbids accepting `tenantId` from the request body — mass-assignment of `tenantId` (`{ ...input, tenantId }`) is named as a Red Flag because it is the canonical way to escape your own tenant. `tenantId` always comes from the verified session.

### 2.5 Naming convention — `<module>.<resource>.<verb>`

Three reasons:
1. **Greppability**: `grep -r "payroll\." src/` enumerates every payroll-touching code site.
2. **Test generation**: the matrix test programmatically iterates the catalog × roles.
3. **Predictability**: developers can guess permission names correctly without reading docs.

### 2.6 Module namespacing + subscription gating

Each module (accounting, POS, inventory, payroll, purchasing) is a permission namespace and an independently subscribable unit. The `can()` primitive short-circuits to `false` if `PERMISSIONS[perm].module` is not in the tenant's `modulesEnabled` list. This means a tenant who subscribed to POS but not payroll cannot trigger payroll code paths even by URL-fishing — the gate fires before any business logic runs.

## 3. The Roles — Why These Eleven, Not Others

The role list reflects how OHADA SMBs (typically 5–50 staff) actually divide labor. Picking the wrong starter roles forces every tenant into custom-role work on day one.

| Role             | Why it exists                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `tenant_owner` (Gérant) | The legally responsible party. In OHADA SMBs this is almost always one person, and they must be able to do everything in subscribed modules. No business runs without this role. |
| `accountant` (Comptable) | The most important specialist role. Often external — a fiduciaire serving 10–30 SMBs. Needs full accounting power and read access to source documents (payroll, purchasing) but no operational authority over them. |
| `cashier` (Caissier) | Front-line POS user. The most-frequented role and the highest-fraud surface. Deliberately scoped narrow: open/close sessions, create sales. No refunds, no voids, no discounts, no cash adjustments. |
| `cashier_lead` (Chef Caissier) | Shift supervisor. Cashier + ability to issue refunds and override discounts. Still cannot adjust cash without a manager. |
| `warehouse` (Magasinier) | Stock operations only. Critically: costs hidden. Magasiniers handling items don't need to know unit costs — and not knowing makes cost-based fraud harder. |
| `hr_manager` (RH) | Computes payroll, sees employees, but cannot approve. Approval is split out deliberately to enforce two-party control on the largest single cash outflow most SMBs make each month. |
| `payroll_admin` (Admin Paie) | The approver. Distinct role precisely so it cannot be the same person as the computer. |
| `buyer` (Acheteur) | Creates POs. Doesn't approve them, doesn't pay them. |
| `purchasing_mgr` (Responsable Achats) | Approves POs and records payments. Bigger PO threshold = needs additional permission. |
| `sales_rep` (Commercial) | Quotes and view, no posting. The "I want them to use the system but not break anything" role. |
| `auditor` (Auditeur, RO) | Read-only across all modules + access to the audit log. The commissaire-aux-comptes role. Cannot mutate anything, ever. |

**What's deliberately absent:** there is no single `manager` or `admin` mid-tier role. Mid-tier roles invite scope creep — they accumulate permissions over time and become de facto owners. The skill forces a choice: either you have a specific operational role (cashier_lead, payroll_admin) or you have full ownership (tenant_owner). Custom roles fill the gap when needed.

## 4. The Permission Catalog — Tier Decisions

Some tier choices in the catalog are obvious; others encode a specific risk model worth explaining.

### Why `accounting.journal.post` is `high` and not `crit`
Posting a journal entry is irreversible from the user's perspective (you must reverse with a counter-entry, never edit). But it happens dozens of times per day for a comptable, and forcing a DB re-fetch on every post would degrade their workflow. The audit row + reversal-only correction path provides traceability; the freshness window (`high`, re-fetch if >5 min stale) is the compromise.

### Why `accounting.period.close` is `crit`
Closing a period is a SYSCOHADA-legal event that locks the books for tax filing. Once filed externally (DSF, IRPP), the closed period is what the State sees. A stale JWT that lets a revoked manager close a period in their last 7 minutes is unacceptable; force DB re-fetch.

### Why `pos.cash.adjust` is `crit`
The most common SMB fraud globally is till skimming, and `pos.cash.adjust` is the digital cover-up. The skill makes this crit (always fresh) and additionally:
- Reason text minimum 20 chars (forces an explanation)
- Per-tenant threshold above which a second approver is required (`pos.cash.adjust.high-value`)
- Self-cannot-be-second-approver enforced at the action layer

### Why `payroll.employee.salary.view` is `crit`
Salary data leaks are the second-most damaging HR incident (after termination data). A stale JWT that still permits salary view after an HR person leaves is real risk. Crit forces DB re-fetch every time, which is acceptable because salary views are infrequent.

### Why `purchasing.payment.record` is `high` and not `crit`
Recording a payment is itself just a bookkeeping action — the money already moved through the bank. The fraud surface is in the **preconditions** the skill enforces around it (fresh-supplier rule, bank-account cooldown, dedup key), not in stale permissions. The risk tier reflects that the freshness check isn't the binding constraint.

### Why `purchasing.supplier.fast-track` exists as a separate `crit` permission
Specifically to make phantom-supplier fraud harder. The default rule is "you cannot pay a supplier created in the last 7 days." Fast-track is the override permission for the rare legitimate case (new emergency vendor). Splitting it out means most users never have it, and the audit log shows clearly who used the override.

## 5. The Anti-Fraud Architecture

The skill's most important property is that it doesn't just gate "who can do what" — it encodes specific anti-fraud controls into the action shape. Below, the major fraud patterns in accounting and inventory, and how the skill blocks each.

---

### 5.1 Accounting Fraud Schemes

#### Scheme A — Backdated journal entries to shift losses or revenue across periods

**How it's carried out.** A comptable books a Q1 expense in Q2 to make Q1 look profitable (impressing a lender), or shifts Q4 revenue into Q1 to hit a bonus. Done by setting the entry's transaction date in the prior period.

**Who does it.** Comptable acting alone, or under pressure from the gérant. Sometimes the gérant themselves on a small SMB where the comptable is part-time.

**Controls the skill installs.**
- `accounting.period.close` locks the period — once closed, no posts. The action layer rejects any post whose `periodId` resolves to a closed period.
- The Layer 4 data filter (`scopedPrisma`) refuses the write even if Layer 3 is bypassed.
- The `accounting.period.reopen` two-party rule (separate `crit` permission, no self-approval, mandatory reason ≥ 50 chars, second different approver required) makes reopening loud and traceable.
- Audit row captures every post attempt against a closed period — including denials — so post-mortem can prove someone *tried*.

#### Scheme B — Period-close manipulation

**How it's carried out.** Close the period early to lock favorable numbers before the year-end adjustments would come in. Or reopen after filing to revise numbers without re-filing.

**Controls.** The `closePeriod` server action enforces preconditions **at the action**, not the UI: zero unposted entries, bank reconciliations complete, trial balance must balance, TVA period declared. A user with the permission still can't close mid-revision. Reopen requires a second user with the same `crit` permission, mandatory reason, audited. The 72-hour timeout on `reopen_pending` means stalled reopens die rather than linger.

#### Scheme C — Trial-balance plug (the classic "I'll just balance it" fix)

**How it's carried out.** Manual journal mess leaves DR ≠ CR by some amount. The comptable plugs the difference into a suspense or misc account so the trial balance reconciles. The plug hides the original error and any fraud it might have contained.

**Controls.**
- Trial balance balancing is a **precondition** of period close, but the skill goes further: the `closePeriod` action computes the trial balance fresh at the moment of close. If it doesn't balance, close fails with `TRIAL_BALANCE_OFF` and the delta. There's no way to close on a plug because the recomputation reveals it.
- Suspense accounts can be lint-flagged (custom rule) to require zero balance at period end.

#### Scheme D — VAT (TVA) declaration fraud

**How it's carried out.** Under-declare sales TVA, over-declare deductible inputs, or file a TVA return whose numbers don't match the underlying journal entries.

**Controls.**
- `accounting.vat.declare` is `crit` — fresh DB lookup every time.
- The declaration action recomputes the TVA position from the journal at the moment of filing, so the filed figures match the books by construction.
- The audit row captures both the filed figure and the journal-derived figure (a redundancy check). Drift triggers an integrity alarm.
- Subsequent journal posts whose effect would change a filed TVA period are gated by the period-lock rule.

#### Scheme E — Statutory filing fraud (DSF, CNPS, IRPP figures don't match books)

**How it's carried out.** File state declarations with numbers different from what's in the system — to hide payroll volume, underreport CNPS employer contributions, or skim IRPP withholdings.

**Controls.**
- `payroll.cnps.declare` and the equivalent IRPP permission are `crit`.
- Declarations derive from the underlying `payrollRun` and reference its id; you cannot file a declaration with a number that didn't come from an approved run.
- The audit row stores the `paymentFileSha256` from the run, the declared figures, and the recomputed figures. Mismatch = alarm.
- The skill calls out explicitly that CNPS underreporting is a **criminal offense** in most OHADA member states (Cameroun, Sénégal, Côte d'Ivoire). That's why these are crit, not high.

#### Scheme F — Chart of accounts manipulation

**How it's carried out.** Rename or merge accounts so historical movements show up in different SYSCOHADA buckets — distorting the bilan or compte de résultat structure.

**Controls.** `accounting.chart.configure` is `high`, every change audited with before/after snapshots, and changes to system-mandated SYSCOHADA accounts can be hard-disabled (no permission grants the right). Comparison reports flag accounts that moved between SYSCOHADA classes.

---

### 5.2 Inventory Fraud Schemes

#### Scheme A — Shrinkage cover-up

**How it's carried out.** Magasinier (or someone with magasinier access) steals items, then files a stock adjustment marking the missing units as "shrinkage," "damaged," or "expired." On paper, the items are accounted for; in reality, they've left the building.

**Who does it.** The classic insider — a warehouse staffer with `inventory.adjust.create` but who can also (in a broken system) approve their own write-off.

**Controls.**
- `inventory.adjust.create` and `inventory.adjust.approve` are **separate permissions** held by different roles (magasinier creates, responsable approves).
- The `approveStockAdjustment` action enforces `createdBy !== ctx.session.user.id` at the action layer, not the UI. Self-approval throws `SelfApprovalForbiddenError`.
- The optimistic guard (`where: { status: 'pending' }`) blocks race-condition double-approval attempts.
- Photo evidence (`photoRefs`) is part of the audit row; the skill recommends hash-deduping photos to flag the same image attached to multiple adjustments.
- Mirror journal entry in the same transaction (6037 Variation Stocks / 3 Stocks) means the loss hits the compte de résultat immediately and visibly — the comptable will see operating margin erode, prompting investigation.
- Audit row includes line-item snapshots (before qty, after qty, unit cost, total value) — the loss is quantified and attributable.

#### Scheme B — Phantom stock inflation

**How it's carried out.** Write-on adjustments add items that don't physically exist, inflating the inventory asset on the bilan. Used to (1) qualify for a higher inventory-collateralized loan, (2) hide losses during an audit period, or (3) inflate apparent business value before a sale.

**Who does it.** Usually the gérant or someone they direct, around lending/audit/sale events.

**Controls.**
- Approval still required from a separate user (`createdBy !== approver`). Even the gérant must convince a second person to approve a large write-on — and that second person now shares legal exposure.
- Mirror journal entry (6037 / 3) inflates both an asset and a P&L line; the comptable will see the entry and the auditor will sample it.
- Audit row preserves the reason category, photo evidence, and approver — exactly what an external auditor or a forensic investigation needs.
- Pattern detection: an unusually large number of write-on adjustments in the weeks before a known event (audit, loan application) is itself a signal — the audit log is queryable for this.

#### Scheme C — Stocktake fraud

**How it's carried out.** During the periodic stocktake (`inventory.stocktake.run`), record counts that match the system instead of reality — masking shortages or hiding excess buffer that will be stolen later.

**Controls.**
- `inventory.stocktake.run` is `high`, audited.
- The skill recommends (and the action shape supports) blind counts — the counter doesn't see the expected quantity at count time. Discrepancies above a threshold trigger a recount by a second user.
- All variances flow through the regular adjustment + approval path, so the same anti-fraud controls (separation of duties, mirror journal, audit) apply to stocktake-driven write-offs.

#### Scheme D — Cross-branch arbitrage

**How it's carried out.** Magasinier at Branch A creates a transfer to Branch B (where they're not assigned), then diverts items in transit. Or fabricates phantom transfers to hide items that were stolen at Branch A.

**Controls.**
- Branch scope (`session.branchIds`) is checked at the action layer: `requirePermission(session, 'inventory.transfer.create', { branchId: sourceBranch })`. A magasinier assigned only to Branch A cannot initiate a transfer out of Branch B.
- The approve-stock-adjustment example specifically iterates branches across all lines and checks each — a multi-branch adjustment requires the approver to hold scope on **every** branch.
- Cross-branch transfers in production typically require an additional "receive" confirmation at the destination by a different user, creating an audit chain.

#### Scheme E — Receipt fraud at PO time

**How it's carried out.** Buyer records receiving more units than were physically delivered (typically in exchange for a kickback from the supplier), then writes off the "excess" later as shrinkage.

**Controls.**
- PO receipt is gated by a permission distinct from PO creation/approval (separation of duties).
- The shrinkage write-off path (`inventory.adjust.approve` requires non-creator) means the buyer who fudged the receipt cannot also be the one approving the subsequent write-off. The two roles are by-design held by different people.
- Audit trail correlates: a PO with abnormally high receipt-vs-ordered ratios followed shortly by adjustments against the same items is a queryable forensic pattern.

#### Scheme F — Pricing / unit-cost manipulation

**How it's carried out.** Inflate unit cost on inward movement (cash kickback), then write off the cost difference. Or undervalue on outward to depress COGS and inflate apparent margin.

**Controls.**
- Costs are not shown to `warehouse` role at all — they don't see them, they can't manipulate them deliberately.
- Cost changes go through `inventory.item.update` with full before/after in the audit row.
- The mirror journal entry produced by any cost-affecting movement makes the financial impact visible to the comptable immediately.

---

## 6. OHADA-Specific Considerations

The skill is deliberately OHADA-aware in several places:

- **Bilingual role names.** Role identifiers are English (stable, code-friendly); display is French/English. This matches the reality that the UI users (gérant, comptable, caissier) speak French and the developers may not.
- **SYSCOHADA account mapping** in journal mirrors. Every example cites the actual SYSCOHADA compte (401 Fournisseurs, 512 Banque, 571 Caisse, 66 Charges de Personnel, 43 CNPS, 44 IRPP, 6037 Variation Stocks, 3 Stocks). This anchors the fraud controls in the legal accounting framework — auditors, fiduciaires, and commissaires-aux-comptes all reason in these account numbers.
- **Period-close as a SYSCOHADA-defined event.** The clôture isn't a UX nicety; it's the legal anchor for tax filings.
- **Filing-aware controls.** DSF, CNPS, IRPP, TVA — the skill explicitly ties these to crit permissions and recomputation-at-filing-time to prevent post-filing drift.
- **Mobile money as a first-class payment method.** Sous-compte 571 mobile is real in OHADA SMBs; the supplier-payment example handles it explicitly.
- **Criminal-liability framing.** The skill flags CNPS underreporting as criminal precisely because that influences how seriously the implementer treats the permission tiering and the audit retention (10 years).
- **Multi-tenant support for fiduciaires.** A single accountant serving multiple SMBs as separate tenants is a normal OHADA pattern; the multi-tenant membership + tenant-switching design supports it.

## 7. Trade-offs the Skill Accepts

No system is free; the skill makes specific trade-offs worth naming:

- **DB round-trip on every crit action.** Latency cost is real (~5–20ms typical). Accepted because the alternative is letting revoked permissions persist for the JWT lifetime.
- **Verbose audit log.** Both allowed and denied actions logged with before/after JSON. Storage cost is meaningful at scale. Accepted because OHADA retention is 10 years and forensic value of denials is high.
- **Two-party rules slow down small teams.** A 4-person SMB has trouble finding a "second approver." The threshold (`pos.cash.adjust.high-value`) is configurable per tenant so very small teams can effectively opt out of two-party for low-stake actions. They still cannot opt out of cross-creator approval on payroll.
- **Reason-text minimums create friction.** Forcing a 20-character reason on cash adjusts is annoying for cashiers. Accepted: the friction itself is the deterrent, and the text is the forensic record.
- **No "super admin who can fix anything" role.** Even `tenant_owner` cannot bypass period locks without `accounting.period.reopen` + a second approver. Operationally inconvenient, deliberately so. Bypass roles defeat the entire system.

## 8. What the Skill Doesn't Cover

- **Identity authentication itself.** That's NextAuth. The skill assumes Auth.js v5 is wired and focuses on authorization on top of it.
- **Tenant provisioning, billing, and subscription management.** The skill consumes `modulesEnabled` but doesn't define how the subscription system populates it.
- **External integrations** (bank feeds, mobile money APIs, tax authority APIs). Each has its own authorization context that intersects with this system but isn't covered here.
- **Field-level RBAC.** The skill is row-level. If a tenant needs "show this column to manager but not analyst," that's a separate layer.
- **UI of the admin role-management screen.** Deferred to `frontend-design`.

## 9. Where This Skill Fits in the Larger Skill Set

- Use **`architect`** when designing a new role/permission surface from scratch.
- Use **this skill (`rbac`)** when implementing or extending — it's the how.
- Use **`cybersecurity-review`** / **`rbac-hardening`** / **`auth-authz-hardening`** as complementary review passes.
- Use **`review`** to gate a finished RBAC-touching feature.
- Use **`pro-grade-audit`** for project-wide auth/authz audits.

## 10. Bottom Line

The skill encodes a simple principle: in this product, **authorization is not infrastructure, it is the product**. The roles list reflects how OHADA SMBs actually staff their operations; the permission tiers reflect how the most common frauds actually unfold; the four-layer enforcement reflects how authorization actually fails in production AI-built code. Every design choice — from "permissions not role names" to "separate create and approve permissions" to "crit always re-fetches from DB" — exists because real money would walk out the door without it.
