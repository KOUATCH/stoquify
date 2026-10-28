---
name: rbac
description: "Use when designing, building, extending, hardening, or auditing RBAC, roles, permissions, authorization/authorisation, Auth.js/NextAuth access control, tenant isolation, module gating, role-management workflows, or fraud-resistant approval workflows for a multi-tenant SaaS, especially OHADA/SYSCOHADA SMB platforms with French roles such as Gérant, Comptable, Caissier, Chef Caissier, Magasinier, RH, Admin Paie, Acheteur, Responsable Achats, Commercial, and Auditeur. Skip when the task is only generic login UI, password reset, marketing copy, or frontend-only visibility with no server authorization surface."
---

# RBAC

## Operating Principle

Authorization is the load-bearing system. Treat every missing check as a critical bug: cross-tenant leakage, unauthorized journal posting, payroll tampering, cash-drawer fraud, period-close bypass, silent privilege escalation, or a falsified OHADA reporting trail. Violating the letter is violating the spirit.

Use this skill to design, build, extend, harden, or audit RBAC for a multi-tenant SaaS serving SMBs in the OHADA / SYSCOHADA zone. The default stack is Next.js App Router, TypeScript, Auth.js v5 / NextAuth, Prisma, Postgres, server actions, and route handlers. Adapt names to the local project, but keep the security rules intact.

## Non-Negotiables

- Multi-tenant first: every permission decision includes `tenantId` plus branch/location, customer, supplier, period, amount, workflow state, or ownership scope when relevant.
- Defense in depth is required at four layers: UI, middleware, action/API, and data layer. UI is never security.
- Authorize permissions, not role names. Roles are bundles; permissions are capabilities.
- Server-side truth wins. Never trust client-supplied `tenantId`, `userId`, `roles`, `permissions`, branch IDs, amount thresholds, or approval status.
- Deny by default for unknown permissions, disabled modules, stale critical claims, inactive membership, closed periods, self-approval, or ambiguous ownership.
- Audit allowed and denied high-risk actions.
- Module subscription gates run before permission grants. Disabled module means deny or redirect to upgrade.

## Permission Catalog

Use a typed catalog. Names follow `<module>.<resource>.<verb>`. Risk tiers are `low`, `med`, `high`, and `crit`.

```ts
export type RiskTier = "low" | "med" | "high" | "crit";
export type ModuleKey = "accounting" | "pos" | "inventory" | "payroll" | "purchasing" | "admin" | "reports";

export const PERMISSIONS = {
  "accounting.accounts.view": { module: "accounting", risk: "low" },
  "accounting.accounts.manage": { module: "accounting", risk: "high" },
  "accounting.journal.create": { module: "accounting", risk: "med" },
  "accounting.journal.post": { module: "accounting", risk: "crit" },
  "accounting.journal.reverse": { module: "accounting", risk: "crit" },
  "accounting.period.close": { module: "accounting", risk: "crit" },
  "accounting.period.reopen": { module: "accounting", risk: "crit" },
  "accounting.tax.tvaDeclare": { module: "accounting", risk: "crit" },
  "pos.sale.create": { module: "pos", risk: "med" },
  "pos.sale.discount": { module: "pos", risk: "high" },
  "pos.sale.refund": { module: "pos", risk: "crit" },
  "pos.sale.void": { module: "pos", risk: "crit" },
  "pos.cash.adjust": { module: "pos", risk: "crit" },
  "pos.cash.adjust.highValue": { module: "pos", risk: "crit" },
  "pos.cashDrawer.close": { module: "pos", risk: "high" },
  "pos.zReport.run": { module: "pos", risk: "crit" },
  "inventory.item.view": { module: "inventory", risk: "low" },
  "inventory.item.manage": { module: "inventory", risk: "med" },
  "inventory.adjust.create": { module: "inventory", risk: "med" },
  "inventory.adjust.approve": { module: "inventory", risk: "high" },
  "inventory.transfer.approve": { module: "inventory", risk: "high" },
  "inventory.valuation.update": { module: "inventory", risk: "crit" },
  "payroll.employee.view": { module: "payroll", risk: "med" },
  "payroll.employee.salary.view": { module: "payroll", risk: "crit" },
  "payroll.compensation.update": { module: "payroll", risk: "crit" },
  "payroll.run.prepare": { module: "payroll", risk: "high" },
  "payroll.run.approve": { module: "payroll", risk: "crit" },
  "payroll.cnps.file": { module: "payroll", risk: "crit" },
  "purchasing.supplier.manage": { module: "purchasing", risk: "med" },
  "purchasing.supplier.fastTrack": { module: "purchasing", risk: "crit" },
  "purchasing.purchaseOrder.create": { module: "purchasing", risk: "med" },
  "purchasing.purchaseOrder.approve": { module: "purchasing", risk: "crit" },
  "purchasing.invoice.match": { module: "purchasing", risk: "high" },
  "purchasing.payment.record": { module: "purchasing", risk: "high" },
  "admin.user.invite": { module: "admin", risk: "high" },
  "admin.role.assign": { module: "admin", risk: "crit" },
  "admin.role.manage": { module: "admin", risk: "crit" },
  "reports.financial.export": { module: "reports", risk: "crit" },
  "reports.audit.view": { module: "reports", risk: "high" }
} as const satisfies Record<string, { module: ModuleKey; risk: RiskTier }>;

export type Permission = keyof typeof PERMISSIONS;
```

## System Roles

Role identifiers stay English. Display names are bilingual.

| Role ID | FR | EN | Example permission set |
| --- | --- | --- | --- |
| `owner` | Gérant | Owner | Tenant setup, subscription, audited role assignment, sensitive approvals |
| `accountant` | Comptable | Accountant | Accounting view/create, TVA prep, reports, limited posting if approved |
| `cashier` | Caissier | Cashier | Scoped POS sale create at assigned location/terminal |
| `head_cashier` | Chef Caissier | Head Cashier | Drawer close, discounts, Z reports, limited refund review |
| `stock_clerk` | Magasinier | Stock Clerk | Inventory view, transfers, count entry, adjustment create |
| `hr` | RH | HR | Employee records, attendance, no salary approval |
| `payroll_admin` | Admin Paie | Payroll Admin | Payroll prepare, payslip export, no self-approval |
| `buyer` | Acheteur | Buyer | Supplier view, purchase order create |
| `purchase_manager` | Responsable Achats | Purchase Manager | Purchase approvals, invoice matching, payment review |
| `sales` | Commercial | Sales | Customer and sales workflows, no finance overrides |
| `auditor` | Auditeur | Auditor | Read-only reports and audit logs |

Do not grant every critical permission to `owner` by reflex. Some workflows still require two-party approval.

## NextAuth / Auth.js Integration

Use JWT sessions for performance, not as final security truth. Enrich claims, then re-check freshness based on risk.

```ts
type SessionClaims = {
  userId: string;
  tenantId: string;
  membershipId: string;
  roles: string[];
  permissions: Permission[];
  modulesEnabled: ModuleKey[];
  permsFetchedAt: number;
};

export const authOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user || trigger === "update") {
        const userId = String(token.sub ?? user.id);
        const tenantId = trigger === "update" ? session?.tenantId : token.tenantId;
        return { ...token, ...(await loadClaimsForUser(userId, tenantId)) };
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.tenantId = token.tenantId as string;
      session.user.roles = token.roles as string[];
      session.user.modulesEnabled = token.modulesEnabled as ModuleKey[];
      session.user.permsFetchedAt = token.permsFetchedAt as number;
      return session;
    }
  }
};
```

Tenant switching uses the NextAuth `update` trigger and reloads membership, roles, permissions, and enabled modules. Never accept a client-provided tenant switch without verifying active membership.

## Freshness Rule

| Risk | JWT claim use | Required behavior |
| --- | --- | --- |
| low | trusted briefly | Use current JWT if tenant and module match |
| med | trusted briefly | Use current JWT if tenant and module match |
| high | conditionally trusted | Re-fetch if permissions are older than 5 minutes |
| crit | not trusted | Always re-fetch from DB inside the action/API/service |

```ts
const FIVE_MIN = 5 * 60 * 1000;

export async function can(ctx: AuthzContext, permission: Permission, scope?: Scope) {
  const meta = PERMISSIONS[permission];
  if (!meta) return false;
  if (!ctx.modulesEnabled.includes(meta.module)) return false;

  const stale = Date.now() - ctx.permsFetchedAt > FIVE_MIN;
  const claims = meta.risk === "crit" || (meta.risk === "high" && stale)
    ? await loadClaimsForMembership(ctx.membershipId)
    : ctx;

  if (!claims.permissions.includes(permission)) return false;
  return scope ? await checkResourceScope(claims, scope) : true;
}
```

## Server Primitives

Build once and use everywhere.

```ts
export async function requireSession(): Promise<AuthzContext> {
  const session = await auth();
  if (!session?.user?.id || !session.user.tenantId) throw new ForbiddenError("Session required");
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, tenantId: session.user.tenantId, active: true }
  });
  if (!membership) throw new ForbiddenError("Active tenant membership required");
  return toAuthzContext(session, membership);
}

export async function requirePermission(permission: Permission, scope?: Scope) {
  const ctx = await requireSession();
  if (!(await can(ctx, permission, scope))) {
    await audit({ ctx, permission, scope, result: "denied" });
    throw new ForbiddenError("Not allowed");
  }
  return ctx;
}

export function withPermission<I, O>(permission: Permission, handler: (input: I, ctx: AuthzContext) => Promise<O>) {
  return async (input: I) => handler(input, await requirePermission(permission));
}

export function scopedPrisma(ctx: AuthzContext) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId: ctx.tenantId };
          return query(args);
        }
      }
    }
  });
}
```

`<Can>` is UX-only. It may hide buttons, explain denial, or improve navigation, but the server must still deny direct calls.

## Resource Scopes

Layer permissions with scope checks:

- tenant: every record belongs to the active tenant
- branch/location: POS, inventory, cash drawer, staff assignment
- customer/supplier: receivables, payables, credit notes
- period: closed periods block mutation unless approved reopen flow passes
- amount: threshold approvals for refunds, purchases, payroll, and discounts
- approval state: no self-approval, no approving drafts you created when policy forbids it

OHADA-specific locks include clôture exercice, TVA declaration, CNPS filing, and journal period reopening.

## Audit Log Spec

Append-only audit logs are required for role changes, denials, critical approvals, exports, period locks, and financial mutations. Use a hash chain for tamper evidence and treat 10-year retention as the OHADA product requirement unless legal counsel changes it.

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  tenantId    String
  actorUserId String?
  action      String
  permission  String?
  resource    String?
  resourceId  String?
  result      String
  beforeJson  Json?
  afterJson   Json?
  reason      String?
  ipAddress   String?
  userAgent   String?
  requestId   String?
  sessionId   String?
  prevHash    String?
  hash        String
  createdAt   DateTime @default(now())

  @@index([tenantId, createdAt])
  @@index([tenantId, action])
}
```

## Anatomy Examples

Each sensitive workflow must be specified across UI, middleware, action/API, and data layer. Include the fraud vector, compliance angle, audit row, and tests. These examples are teaching anchors; do not hand-wave them.

### Accounting: `accounting.period.close` (crit)

Fraud vector: backdated entries hiding losses, inflated revenue, expense shifting, TVA/corporate-tax misstatement, or falsified financial statements.

| Layer | Required control |
| --- | --- |
| UI | Hide "Clôturer l'exercice" except for holders; disable with tooltip when unposted entries, incomplete reconciliation, or undeclared TVA exist. |
| Middleware | `/accounting/periods/close` redirects non-holders. |
| Action/API | `closePeriod(periodId)` re-fetches critical permission, validates preconditions, and closes transactionally. |
| Data | `scopedPrisma(ctx)` enforces tenant; raw SQL is forbidden outside reviewed repository helpers. |

```ts
export const closePeriod = withPermission("accounting.period.close", async ({ periodId }: { periodId: string }, ctx) => {
  const scope = { tenantId: ctx.tenantId, resource: "AccountingPeriod", resourceId: periodId };
  if (!(await can(ctx, "accounting.period.close", scope))) throw new ForbiddenError("Cannot close period");

  return prisma.$transaction(async (tx) => {
    const period = await tx.accountingPeriod.findFirstOrThrow({ where: { id: periodId, tenantId: ctx.tenantId } });
    const [unposted, unreconciled, trialBalance] = await Promise.all([
      tx.journalEntry.count({ where: { tenantId: ctx.tenantId, periodId, status: "draft" } }),
      tx.bankReconciliation.count({ where: { tenantId: ctx.tenantId, periodId, status: { not: "complete" } } }),
      computeTrialBalance(tx, ctx.tenantId, periodId)
    ]);
    if (unposted > 0 || unreconciled > 0 || !trialBalance.balances) throw new DomainError("Period preconditions failed");

    const closed = await tx.accountingPeriod.update({
      where: { id: periodId },
      data: { status: "closed", closedById: ctx.userId, closedAt: new Date(), openingSnapshot: await snapshotNextOpening(tx, ctx.tenantId, periodId) }
    });
    await audit({ tx, ctx, action: "accounting.period.close", permission: "accounting.period.close", resourceId: periodId, result: "allowed", beforeJson: period, afterJson: closed });
    return closed;
  });
});
```

Audit row:

```json
{ "action": "accounting.period.close", "resourceId": "period_2026", "result": "allowed", "beforeJson": { "status": "open" }, "afterJson": { "status": "closed" }, "ipAddress": "203.0.113.10", "sessionId": "sess_1", "requestId": "req_1" }
```

Tests: comptable cannot close; gérant with permission can; close fails with unposted entries; `journal.post` against closed period fails; reopen requires `accounting.period.reopen`, second approver, no self-approval, and mandatory reason. OHADA angle: clôture exercice anchors États Financiers and DSF filings.

### POS: `pos.cash.adjust` (crit)

Fraud vector: cashier adjusts expected cash to match a skimmed till, hides repeated theft, or bypasses refund/void audit trails.

| Layer | Required control |
| --- | --- |
| UI | Plain caissier never sees "Ajuster la caisse"; chef caissier sees disabled manager-approval state; gérant sees enabled action. |
| Middleware | `/pos/sessions/[id]/adjust` requires holder. |
| Action/API | `adjustCashSession(sessionId, delta, reason)` requires permission, branch scope, reason length, and second approver above threshold. |
| Data | Tenant and branch scope filters block cross-branch adjustment. |

```ts
export const adjustCashSession = withPermission("pos.cash.adjust", async (input: { sessionId: string; delta: number; reason: string; approverId?: string }, ctx) => {
  const scope = { tenantId: ctx.tenantId, branchId: ctx.branchId, resource: "CashSession", resourceId: input.sessionId, amount: Math.abs(input.delta) };
  if (!(await can(ctx, "pos.cash.adjust", scope))) throw new ForbiddenError("Cannot adjust cash");
  if (input.reason.trim().length < 20) throw new DomainError("Detailed reason required");

  return prisma.$transaction(async (tx) => {
    const session = await tx.cashSession.findFirstOrThrow({ where: { id: input.sessionId, tenantId: ctx.tenantId, branchId: ctx.branchId } });
    const threshold = await getTenantThreshold(tx, ctx.tenantId, "cashAdjustment");
    if (Math.abs(input.delta) > threshold) {
      if (!input.approverId || input.approverId === ctx.userId) throw new ForbiddenError("Second approver required");
      await assertApproverCan(tx, input.approverId, ctx.tenantId, "pos.cash.adjust.highValue");
    }
    const updated = await tx.cashSession.update({ where: { id: session.id }, data: { countedCash: { increment: input.delta }, adjustmentReason: input.reason } });
    await audit({ tx, ctx, action: "pos.cash.adjust", permission: "pos.cash.adjust", resourceId: session.id, result: "allowed", beforeJson: session, afterJson: updated, reason: input.reason });
    return updated;
  });
});
```

Audit row:

```json
{ "action": "pos.cash.adjust", "resourceId": "cashsess_12", "result": "allowed", "beforeJson": { "countedCash": 125000 }, "afterJson": { "countedCash": 122000 }, "reason": "Correction after manager recount", "actorUserId": "usr_mgr", "ipAddress": "203.0.113.12" }
```

Tests: cashier denied; head cashier denied without approver; cross-branch denied; high-value denied without second approver; short reason denied; allowed and denied attempts are audited. OHADA angle: cash feeds `caisse`; false till adjustments misstate cash on the bilan.

### Inventory: `inventory.adjust.approve` (high)

Fraud vector: write-off hides theft, write-on inflates stock value, or creator approves own adjustment.

| Layer | Required control |
| --- | --- |
| UI | Magasinier can create adjustment with reason/photo; approve only for holders and disabled when creator is current user. |
| Middleware | `/inventory/adjustments/[id]/approve` requires holder. |
| Action/API | Refuse self-approval, double approval, wrong branch, and disabled module. Post inventory move plus journal entry transactionally. |
| Data | Branch-scoped Prisma; raw item updates outside adjustment flow are forbidden. |

```ts
export const approveStockAdjustment = withPermission("inventory.adjust.approve", async ({ id }: { id: string }, ctx) => {
  const scope = { tenantId: ctx.tenantId, branchIds: ctx.branchIds, resource: "StockAdjustment", resourceId: id };
  if (!(await can(ctx, "inventory.adjust.approve", scope))) throw new ForbiddenError("Cannot approve adjustment");

  return prisma.$transaction(async (tx) => {
    const adj = await tx.stockAdjustment.findFirstOrThrow({ where: { id, tenantId: ctx.tenantId, branchId: { in: ctx.branchIds } }, include: { lines: true } });
    if (adj.createdById === ctx.userId) throw new ForbiddenError("Self-approval forbidden");
    if (adj.status !== "pending") throw new DomainError("Adjustment is not pending");

    for (const line of adj.lines) await postInventoryMove(tx, ctx.tenantId, adj.branchId, line);
    await postStockJournalEntry(tx, ctx.tenantId, adj);
    const approved = await tx.stockAdjustment.update({ where: { id }, data: { status: "approved", approvedById: ctx.userId, approvedAt: new Date() } });
    await audit({ tx, ctx, action: "inventory.adjust.approve", permission: "inventory.adjust.approve", resourceId: id, result: "allowed", beforeJson: adj, afterJson: approved });
    return approved;
  });
});
```

Audit row:

```json
{ "action": "inventory.adjust.approve", "resourceId": "adj_44", "result": "allowed", "beforeJson": { "status": "pending", "lineCount": 3 }, "afterJson": { "status": "approved" }, "reason": "Approved cycle count shrinkage with photo evidence" }
```

Tests: creator cannot approve own adjustment; cross-branch denied; double approval denied; module-disabled tenant denied even with permission. OHADA angle: stock changes affect comptes 3 and distort actif circulant when abused.

### Payroll: `payroll.run.approve` (crit)

Fraud vector: ghost employees, salary inflation, CNPS underreporting, unauthorized backdated runs.

| Layer | Required control |
| --- | --- |
| UI | Compute and approve are separate; "Approuver la paie" only for payroll approver, disabled for HR-only roles. |
| Middleware | `/payroll/runs/[id]/approve` requires holder. |
| Action/API | Critical re-fetch, no self-approval, roster-delta check, salary-change check, payment-file hash inside transaction. |
| Data | Tenant scope; salary reads require `payroll.employee.salary.view`. |

```ts
export const approvePayrollRun = withPermission("payroll.run.approve", async ({ runId }: { runId: string }, ctx) => {
  const scope = { tenantId: ctx.tenantId, resource: "PayrollRun", resourceId: runId };
  if (!(await can(ctx, "payroll.run.approve", scope))) throw new ForbiddenError("Cannot approve payroll");

  return prisma.$transaction(async (tx) => {
    const run = await tx.payrollRun.findFirstOrThrow({ where: { id: runId, tenantId: ctx.tenantId }, include: { payslips: true } });
    if (run.createdById === ctx.userId) throw new ForbiddenError("Self-approval forbidden");
    if (await rosterChangedSinceCompute(tx, ctx.tenantId, run.computedAt)) throw new DomainError("Roster changed; recompute required");
    if (await salaryChangedSinceCompute(tx, ctx.tenantId, run.computedAt)) throw new DomainError("Salary changed; recompute required");

    const paymentFile = await buildPaymentInstruction(run);
    const approved = await tx.payrollRun.update({ where: { id: runId }, data: { status: "approved", approvedById: ctx.userId, approvedAt: new Date(), paymentFileHash: paymentFile.hash } });
    await audit({ tx, ctx, action: "payroll.run.approve", permission: "payroll.run.approve", resourceId: runId, result: "allowed", beforeJson: payrollSummary(run), afterJson: { status: approved.status, paymentFileHash: paymentFile.hash } });
    return approved;
  });
});
```

Audit row:

```json
{ "action": "payroll.run.approve", "resourceId": "pay_2026_05", "result": "allowed", "afterJson": { "gross": 4200000, "net": 3375000, "cnps": 410000, "employeeCount": 28, "paymentFileHash": "sha256:abc" } }
```

Tests: HR manager denied; self-approval denied; roster delta denied; salary changed after compute denied; module-disabled tenant denied. OHADA angle: payroll feeds CNPS, IRPP, and charges de personnel; underreporting can be criminal.

### Purchasing: `purchasing.payment.record` (high; crit above threshold)

Fraud vector: phantom supplier plus invoice and payment, duplicate payment, or cross-branch supplier payment.

| Layer | Required control |
| --- | --- |
| UI | "Enregistrer un paiement" only for holders; disabled when invoice fully paid or supplier under review. |
| Middleware | `/purchasing/invoices/[id]/payments/new` requires holder. |
| Action/API | Refuse overpayment, duplicate ref, fresh supplier without fast-track, cross-branch mismatch, and risky bank-account changes. |
| Data | Tenant/branch scope; supplier bank-account update has its own permission and cooldown. |

```ts
export const recordSupplierPayment = withPermission("purchasing.payment.record", async (input: { invoiceId: string; amount: number; method: string; ref: string; approverId?: string }, ctx) => {
  const scope = { tenantId: ctx.tenantId, branchIds: ctx.branchIds, resource: "SupplierInvoice", resourceId: input.invoiceId, amount: input.amount };
  if (!(await can(ctx, "purchasing.payment.record", scope))) throw new ForbiddenError("Cannot record supplier payment");

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.supplierInvoice.findFirstOrThrow({ where: { id: input.invoiceId, tenantId: ctx.tenantId, branchId: { in: ctx.branchIds } }, include: { supplier: true } });
    if (input.amount > invoice.outstandingAmount) throw new DomainError("Payment exceeds outstanding balance");
    if (await paymentRefExists(tx, ctx.tenantId, input.invoiceId, input.method, input.ref)) throw new DomainError("Duplicate payment reference");
    if (daysSince(invoice.supplier.createdAt) < 7 && !(await approverHas(tx, input.approverId, ctx.tenantId, "purchasing.supplier.fastTrack"))) throw new ForbiddenError("Fresh supplier requires fast-track approver");
    if (bankChangedWithin(invoice.supplier, 24) && !input.approverId) throw new ForbiddenError("Recent bank change requires approver");

    const payment = await tx.supplierPayment.create({ data: { tenantId: ctx.tenantId, branchId: invoice.branchId, invoiceId: invoice.id, amount: input.amount, method: input.method, refHash: hashPaymentRef(input.method, input.ref), recordedById: ctx.userId } });
    await postSupplierPaymentJournal(tx, ctx.tenantId, payment);
    await audit({ tx, ctx, action: "purchasing.payment.record", permission: "purchasing.payment.record", resourceId: invoice.id, result: "allowed", beforeJson: { outstanding: invoice.outstandingAmount }, afterJson: { paymentId: payment.id, amount: payment.amount, refHash: payment.refHash } });
    return payment;
  });
});
```

Audit row:

```json
{ "action": "purchasing.payment.record", "resourceId": "inv_400", "result": "allowed", "afterJson": { "supplierId": "sup_7", "amount": 850000, "method": "bank", "refHash": "sha256:def", "bankFingerprint": "bf_22" } }
```

Tests: buyer denied; over-amount denied; duplicate ref denied; fresh supplier denied without fast-track; cross-branch denied; recent bank-account change logs warning and requires approver. OHADA angle: fournisseurs 401 and banque 512 must reconcile; phantom-supplier fraud distorts dettes fournisseurs and trésorerie.

## Required CI Suites

1. Permission matrix suite: role x permission expected allow/deny.
2. Cross-tenant leak suite: tenant A cannot read, mutate, export, or infer tenant B data.
3. Privilege-escalation suite: tenantId mass assignment, role assignment without `admin.role.assign`, stale JWT on critical permission, self-approval, closed-period bypass, and 404-vs-403 leaks all fail.

## Cross-Skill Wiring

Reference these without duplicating them if available:

- `architect` for new authorization surfaces.
- `rbac-hardening` and `auth-authz-hardening` for complementary hardening passes.
- `cybersecurity-review` for finished-feature security review.
- `review` for generic feature review.
- `pro-grade-audit` for project-wide audit.
- `frontend-design` for role-management admin UI.

## Red Flags / Stop And Restart

Stop and re-map the design if you see any of these:

- mass assignment of `tenantId`, `userId`, role, permission, branch, or amount threshold
- trusting JWT claims for critical actions
- treating hidden UI as authorization
- a new endpoint without `requirePermission`
- role assignment endpoint missing `admin.role.assign`
- self-approval in payroll, purchasing, refund, journal, stock adjustment, or period-reopen workflows
- period close without a guarded reopen path
- exporting reports with weaker checks than page views
- 404 vs 403 information leaks that reveal another tenant's records
- hardcoded admin bypasses without audit and explicit product policy
- raw SQL or unscoped Prisma on sensitive resources

## Pre-Ship Checklist

- Permission names are typed, namespaced, and risk-tiered.
- System roles have bilingual display names and least-privilege grants.
- NextAuth claims are enriched but not blindly trusted.
- High-risk permissions re-fetch stale claims; critical permissions always re-fetch.
- Module subscription gating denies disabled modules before permission checks.
- Every touched server action, route handler, service, and export endpoint enforces authorization.
- Data-layer queries include tenant scoping or a verified ownership assertion.
- Closed-period, amount-threshold, branch/location, supplier/customer, and approval-state scopes are enforced where relevant.
- Critical actions and denials are audited with hash chaining.
- CI covers role matrix, cross-tenant leakage, and privilege escalation.
- The final report states what was protected, what remains risky, and which checks passed.
