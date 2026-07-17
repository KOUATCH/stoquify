const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  buildAPFraudControlReadiness,
  parseArgs,
  renderMarkdown,
} = require("../ap-fraud-control-readiness")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ap-fraud-control-readiness-"))
}

function writeFile(root, relativePath, content) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content, "utf8")
}

function writeCompleteFixture(root) {
  writeFile(
    root,
    "actions/purchasing/ap-control.actions.ts",
    `
    const requestBankChange = protect({ permission: "purchasing.supplier.bank.request", tenantGuard: "handler-derived" }, async (input, ctx) => {
      const parsed = { organizationId: ctx.orgId, requestedById: ctx.userId }
      return requestSupplierBankChange(parsed)
    })
    const approveBankChange = protect({ permission: "purchasing.supplier.bank.approve", freshAuth: true, tenantGuard: "handler-derived" }, async (input, ctx) => {
      const parsed = { organizationId: ctx.orgId, approvedById: ctx.userId }
      return approveSupplierBankChangeWithControls(parsed, { actorPermissions: ctx.permissions })
    })
    const approvePayment = protect({ permission: "purchasing.ap.payment.approve", freshAuth: true, tenantGuard: "handler-derived" }, async (input, ctx) => {
      return approveSupplierPaymentWithControls({ organizationId: ctx.orgId, approvedById: ctx.userId }, { actorPermissions: ctx.permissions })
    })
    const releasePayment = protect({ permission: "purchasing.ap.payment.release", freshAuth: true, tenantGuard: "handler-derived" }, async (input, ctx) => {
      const parsed = { organizationId: ctx.orgId, supplierPaymentId: raw.supplierPaymentId, releasedById: ctx.userId }
      return releaseSupplierPaymentWithControls(parsed, { actorPermissions: ctx.permissions })
    })
    `,
  )
  writeFile(
    root,
    "actions/purchasing/__tests__/ap-control.actions.test.ts",
    `
    it("requires fresh auth before approving supplier bank changes", () => {})
    it("delegates supplier bank approval to the AP service with trusted actor controls", () => {})
    it("injects the approver ID for supplier payment approval", () => {})
    it("injects only the releaser ID for supplier payment release", () => {})
    `,
  )
  writeFile(
    root,
    "services/purchasing/ap-control.schemas.ts",
    `
    export const requestSupplierBankChangeInputSchema = z.object({ requestedById: idSchema })
    `,
  )
  writeFile(
    root,
    "services/controls/sensitive-action.service.ts",
    `
    "supplier.bank-change.approve": { action: "supplier.bank-change.approve", permission: "purchasing.supplier.bank.approve", riskTier: "critical", freshAuthMaxAgeSeconds: 300, blockSelfApproval: true, auditAction: "SUPPLIER_BANK_CHANGE_APPROVE_CONTROL" }
    "supplier.payment.approve": { action: "supplier.payment.approve", permission: "purchasing.ap.payment.approve", riskTier: "critical", freshAuthMaxAgeSeconds: 300, blockSelfApproval: true, auditAction: "SUPPLIER_PAYMENT_APPROVE_CONTROL" }
    "supplier.payment.release": { action: "supplier.payment.release", permission: "purchasing.ap.payment.release", riskTier: "critical", freshAuthMaxAgeSeconds: 300, blockSelfApproval: true, auditAction: "SUPPLIER_PAYMENT_RELEASE_CONTROL" }
    `,
  )
  writeFile(
    root,
    "services/controls/__tests__/sensitive-action.service.test.ts",
    `
    it("blocks self-approval for supplier bank changes", () => {})
    it("requires fresh release authority for supplier payments", () => {})
    `,
  )
  writeFile(
    root,
    "lib/security/rbac-permissions.ts",
    `
    "purchasing.supplier.bank.approve": "crit"
    "purchasing.ap.payment.approve": "crit"
    "purchasing.ap.payment.release": "crit"
    `,
  )
  writeFile(
    root,
    "config/permissions.ts",
    `
    "purchasing.supplier.bank.approve"
    "purchasing.ap.payment.approve"
    "purchasing.ap.payment.release"
    `,
  )
  writeFile(
    root,
    "services/purchasing/ap-control.service.ts",
    `
    async function approveSupplierBankChangeWithControls() {
      const controlInput = { action: "supplier.bank-change.approve", subjectActorId: change?.requestedById }
      await auditDeniedSensitiveAction(client, controlInput)
      await auditAllowedSensitiveAction(tx, controlInput)
      throw new Error("A separate approver is required for supplier bank changes.")
      eventType: "supplier.bank_change.approved"
      action: "SUPPLIER_BANK_CHANGE_APPROVED"
    }
    async function approveSupplierPaymentWithControls() {
      const controlInput = { action: "supplier.payment.approve", subjectActorId: parsed.requestedById }
      await auditDeniedSensitiveAction(client, controlInput)
      await auditAllowedSensitiveAction(tx, controlInput)
    }
    async function releaseSupplierPaymentWithControls() {
      const controlInput = { action: "supplier.payment.release", subjectActorId: subject?.requestedById }
      await auditDeniedSensitiveAction(client, controlInput)
      await auditAllowedSensitiveAction(tx, controlInput)
      throw new Error("A separate approver is required before releasing supplier payments.")
      throw new Error("A separate releaser is required before releasing supplier payments.")
      throw new Error("A separate releaser is required from the supplier payment approver before release.")
      throw new Error("Supplier payment must be approved before release.")
      throw new Error("Payment is blocked while a supplier bank change is pending approval.")
      throw new Error("Payment is blocked until the supplier bank destination is approved.")
      eventType: "supplier.payment.released"
      queueOutboundSupplierPaymentReconciliation()
      action: "SUPPLIER_PAYMENT_RELEASED"
    }
    `,
  )
  writeFile(
    root,
    "services/purchasing/__tests__/ap-control.service.test.ts",
    `
    it("audits and blocks supplier bank self-approval in AP service controls", () => {})
    it("audits and blocks supplier payment self-release in AP service controls", () => {})
    it("blocks supplier payment release by the stored approver", () => {})
    it("blocks supplier payment release when a bank change is pending", () => {})
    it("creates approved supplier payment evidence without release side effects", () => {})
    it("releases approved supplier payments with bank evidence, allocations, event evidence, and ledger blocker", () => {})
    it("rejects mutated supplier payment idempotency replays before release side effects", () => {})
    `,
  )
}
describe("ap fraud control readiness", () => {
  it("reports the current repo supplier payment approval boundary as ready in report mode", () => {
    const report = buildAPFraudControlReadiness(process.cwd(), { mode: "report" })
    const approval = report.checks.find((check) => check.id === "supplier-payment-approval.action-boundary")

    expect(report.summary.totalChecks).toBe(8)
    expect(report.summary.gaps).toBe(0)
    expect(report.summary.criticalGaps).toBe(0)
    expect(approval).toMatchObject({
      risk: "critical",
      status: "ready",
    })
    expect(approval.missing).toHaveLength(0)
    expect(renderMarkdown(report)).toContain("supplier-payment-approval.action-boundary")
  })

  it("marks all checks ready when the approval boundary exists", () => {
    const root = makeTempRepo()
    writeCompleteFixture(root)

    const report = buildAPFraudControlReadiness(root, { mode: "report" })

    expect(report.summary.gaps).toBe(0)
    expect(report.checks.every((check) => check.status === "ready")).toBe(true)
  })

  it("parses report output arguments", () => {
    expect(parseArgs(["node", "script", "--mode", "report", "--out", "x.md", "--json-out", "x.json"])).toEqual({
      mode: "report",
      out: "x.md",
      jsonOut: "x.json",
    })
  })
})
