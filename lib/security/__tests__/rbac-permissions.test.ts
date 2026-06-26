import {
  expandPermissions,
  hasAllRbacPermissions,
  hasAnyRbacPermission,
  hasRbacPermission,
  isKnownPermission,
  permissionCandidates,
  permissionRisk,
} from "@/lib/security/rbac-permissions"

describe("rbac permission compatibility", () => {
  it("allows old uppercase role permissions to satisfy canonical dot-style checks", () => {
    expect(hasRbacPermission(["READ_ROLES"], "roles.read")).toBe(true)
    expect(hasRbacPermission(["CREATE_USERS"], "users.create")).toBe(true)
    expect(hasRbacPermission(["READ_SUPPLIERS"], "purchases.suppliers.read")).toBe(true)
  })

  it("allows canonical dot-style permissions to satisfy older uppercase checks", () => {
    expect(hasRbacPermission(["roles.update"], "UPDATE_ROLES")).toBe(true)
    expect(hasRbacPermission(["customers.read"], "READ_CUSTOMERS")).toBe(true)
  })

  it("does not let wildcard grants bypass high-risk or critical permissions", () => {
    expect(hasRbacPermission(["*"], "dashboard.read")).toBe(true)
    expect(hasRbacPermission(["*"], "roles.permissions.assign")).toBe(false)
    expect(hasRbacPermission(["*"], "accounting.period.close")).toBe(false)
    expect(hasAnyRbacPermission(["*"], ["users.delete", "roles.delete"])).toBe(false)
    expect(hasAllRbacPermissions(["*"], ["users.delete", "roles.delete"])).toBe(false)
    expect(hasRbacPermission(["*", "roles.permissions.assign"], "roles.permissions.assign")).toBe(true)
  })

  it("fails closed for unknown permission keys", () => {
    expect(isKnownPermission("purchases.orders.receive")).toBe(true)
    expect(isKnownPermission("unknown.module.action")).toBe(false)
    expect(hasRbacPermission(["unknown.module.action"], "unknown.module.action")).toBe(false)
    expect(hasRbacPermission(["*"], "unknown.module.action")).toBe(false)
  })

  it("expands stored permissions into effective permission candidates", () => {
    expect(expandPermissions(["ASSIGN_ROLES"])).toEqual(
      expect.arrayContaining(["ASSIGN_ROLES", "roles.permissions.assign"]),
    )
    expect(permissionCandidates("roles.read")).toEqual(
      expect.arrayContaining(["roles.read", "READ_ROLES"]),
    )
  })

  it("keeps accounting permissions compatible with legacy finance grants", () => {
    expect(hasRbacPermission(["POST_JOURNAL_ENTRIES"], "accounting.journal.post")).toBe(true)
    expect(hasRbacPermission(["accounting.reports.read"], "VIEW_FINANCIAL_REPORTS")).toBe(true)
  })

  it("does not let reconciliation run permission imply certified evidence powers", () => {
    expect(hasRbacPermission(["payments.reconciliation.run"], "payments.reconciliation.import")).toBe(false)
    expect(hasRbacPermission(["payments.reconciliation.run"], "payments.reconciliation.sign")).toBe(false)
    expect(hasRbacPermission(["payments.reconciliation.run"], "payments.reconciliation.suspense.post")).toBe(false)
  })

  it("allows reconciliation read without granting elevated reconciliation operations", () => {
    const elevatedPermissions = [
      "payments.reconciliation.import",
      "payments.reconciliation.run",
      "payments.reconciliation.match",
      "payments.reconciliation.override",
      "payments.reconciliation.exception.assign",
      "payments.reconciliation.exception.resolve",
      "payments.reconciliation.suspense.propose",
      "payments.reconciliation.suspense.post",
      "payments.reconciliation.sign",
      "payments.reconciliation.certificate.export",
    ]

    expect(hasRbacPermission(["payments.reconciliation.read"], "payments.reconciliation.read")).toBe(true)
    for (const permission of elevatedPermissions) {
      expect(hasRbacPermission(["payments.reconciliation.read"], permission)).toBe(false)
    }
  })
  it("keeps AP controls compatible with legacy purchasing and supplier payment grants", () => {
    expect(hasRbacPermission(["SUPPLIER_PAYABLES_READ"], "purchasing.ap.invoice.view")).toBe(true)
    expect(hasRbacPermission(["SUPPLIER_PAYMENTS_MANAGE"], "purchasing.ap.payment.release")).toBe(true)
    expect(hasRbacPermission(["MANAGE_FINANCIAL_CONTROLS"], "purchasing.supplier.bank.approve")).toBe(true)
  })

  it("recognizes enterprise sensitive workflow permissions through existing grants", () => {
    expect(hasRbacPermission(["ASSIGN_ROLES"], "admin.role.assign")).toBe(true)
    expect(hasRbacPermission(["CREATE_USERS"], "admin.user.invite")).toBe(true)
    expect(hasRbacPermission(["MANAGE_CASH_TRANSACTIONS"], "pos.cash.adjust")).toBe(true)
    expect(hasRbacPermission(["PROCESS_REFUNDS"], "pos.sale.refund")).toBe(true)
    expect(hasRbacPermission(["PROCESS_REFUNDS"], "pos.sale.void")).toBe(true)
    expect(hasRbacPermission(["APPROVE_STOCK_ADJUSTMENTS"], "inventory.adjust.approve")).toBe(true)
    expect(hasRbacPermission(["APPROVE_STOCK_TRANSFERS"], "inventory.transfer.approve")).toBe(true)
    expect(hasRbacPermission(["APPROVE_PURCHASE_ORDERS"], "purchasing.purchaseOrder.approve")).toBe(true)
    expect(hasRbacPermission(["SUPPLIER_PAYMENTS_MANAGE"], "purchasing.payment.record")).toBe(true)
    expect(hasRbacPermission(["PAYROLL_APPROVE"], "payroll.run.approve")).toBe(true)
    expect(hasRbacPermission(["FINANCIAL_REPORTS_EXPORT"], "reports.financial.export")).toBe(true)
    expect(hasRbacPermission(["VIEW_AUDIT_LOGS"], "reports.audit.view")).toBe(true)
  })

  it("requires the canonical purchase order receiving permission without aliases", () => {
    expect(hasRbacPermission(["purchases.orders.receive"], "purchases.orders.receive")).toBe(true)
    expect(hasRbacPermission(["RECEIVE_GOODS"], "purchases.orders.receive")).toBe(false)
    expect(hasRbacPermission(["po:receive"], "purchases.orders.receive")).toBe(false)
    expect(hasRbacPermission(["purchases.orders.receive"], "po:receive")).toBe(false)
    expect(hasRbacPermission(["READ_PURCHASE_ORDERS"], "purchases.orders.receive")).toBe(false)
    expect(hasRbacPermission(["UPDATE_PURCHASE_ORDERS"], "purchases.orders.receive")).toBe(false)
    expect(hasRbacPermission(["APPROVE_PURCHASE_ORDERS"], "purchases.orders.receive")).toBe(false)
  })

  it("keeps payroll controls compatible with legacy payroll and finance grants", () => {
    expect(hasRbacPermission(["PAYROLL_READ"], "payroll.command.read")).toBe(false)
    expect(hasRbacPermission(["PAYROLL_REPORTS_READ"], "payroll.command.read")).toBe(true)
    expect(hasRbacPermission(["PAYROLL_READ"], "payroll.payslips.self.read")).toBe(true)
    expect(hasRbacPermission(["EMPLOYEE_SALARY_READ"], "payroll.payslips.self.read")).toBe(true)
    expect(hasRbacPermission(["PAYROLL_APPROVE"], "payroll.runs.approve")).toBe(true)
    expect(hasRbacPermission(["PAYROLL_PROCESS"], "payroll.runs.calculate")).toBe(true)
    expect(hasRbacPermission(["MANAGE_FINANCIAL_CONTROLS"], "payroll.payments.release")).toBe(true)
    expect(hasRbacPermission(["MANAGE_FINANCIAL_CONTROLS"], "payroll.payments.reconcile")).toBe(true)
    expect(hasRbacPermission(["PAYROLL_APPROVE"], "payroll.declarations.manage")).toBe(true)
    expect(hasRbacPermission(["EMPLOYEE_SALARY_READ"], "payroll.payslips.read")).toBe(true)
  })

  it("classifies role mutation permissions as critical", () => {
    expect(permissionRisk("roles.permissions.assign")).toBe("crit")
  })

  it("classifies critical accounting and export permissions explicitly", () => {
    expect(permissionRisk("accounting.journal.post")).toBe("crit")
    expect(permissionRisk("POST_JOURNAL_ENTRIES")).toBe("crit")
    expect(permissionRisk("accounting.period.close")).toBe("crit")
    expect(permissionRisk("accounting.exports.create")).toBe("crit")
    expect(permissionRisk("FINANCIAL_REPORTS_EXPORT")).toBe("crit")
    expect(permissionRisk("purchasing.ap.payment.release")).toBe("crit")
    expect(permissionRisk("purchasing.supplier.bank.approve")).toBe("crit")
    expect(permissionRisk("payroll.runs.approve")).toBe("crit")
    expect(permissionRisk("admin.role.assign")).toBe("crit")
    expect(permissionRisk("inventory.adjust.approve")).toBe("crit")
    expect(permissionRisk("reports.financial.export")).toBe("crit")
    expect(permissionRisk("reports.audit.view")).toBe("high")
    expect(permissionRisk("payroll.payments.release")).toBe("crit")
    expect(permissionRisk("payroll.payments.reconcile")).toBe("crit")
    expect(permissionRisk("payroll.declarations.manage")).toBe("crit")
  })
})
