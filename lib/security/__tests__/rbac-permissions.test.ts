import {
  expandPermissions,
  hasAllRbacPermissions,
  hasAnyRbacPermission,
  hasRbacPermission,
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

  it("preserves wildcard semantics", () => {
    expect(hasRbacPermission(["*"], "roles.permissions.assign")).toBe(true)
    expect(hasAnyRbacPermission(["*"], ["users.delete", "roles.delete"])).toBe(true)
    expect(hasAllRbacPermissions(["*"], ["users.delete", "roles.delete"])).toBe(true)
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

  it("keeps AP controls compatible with legacy purchasing and supplier payment grants", () => {
    expect(hasRbacPermission(["SUPPLIER_PAYABLES_READ"], "purchasing.ap.invoice.view")).toBe(true)
    expect(hasRbacPermission(["SUPPLIER_PAYMENTS_MANAGE"], "purchasing.ap.payment.release")).toBe(true)
    expect(hasRbacPermission(["MANAGE_FINANCIAL_CONTROLS"], "purchasing.supplier.bank.approve")).toBe(true)
  })

  it("keeps payroll controls compatible with legacy payroll and finance grants", () => {
    expect(hasRbacPermission(["PAYROLL_APPROVE"], "payroll.runs.approve")).toBe(true)
    expect(hasRbacPermission(["PAYROLL_PROCESS"], "payroll.runs.calculate")).toBe(true)
    expect(hasRbacPermission(["MANAGE_FINANCIAL_CONTROLS"], "payroll.payments.release")).toBe(true)
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
    expect(permissionRisk("payroll.payments.release")).toBe("crit")
  })
})
