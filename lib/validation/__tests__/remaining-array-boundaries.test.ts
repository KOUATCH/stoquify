import { z } from "zod"
import { CustomerExportRequestSchema } from "@/services/customer/customer.schemas"
import { importOperationalTime, createTimeFoundation, createTimeFoundationInputSchema } from "@/services/hris/operational-time.service"
import { previewModuleCompositionAction } from "@/actions/modules/module-composition.actions"
import { previewModuleComposition } from "@/services/modules/module-composition.service"
import { prepareCommandAgentReleaseAction } from "@/actions/agents/agent-release-control.actions"
import { prepareCommandAgentActivationPackage } from "@/services/agents/agent-release-control.service"
import { prepareSupplierManagementExport } from "@/actions/suppliers/supplier-management-actions"
import { requirePermission } from "@/lib/security/rbac"
import { requireFreshAuth } from "@/lib/security/auth-session"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { evaluateExportSafety, buildExportWatermark } from "@/services/security/export-safety.service"
import { auditSupplierExportDecision } from "@/services/supplier/supplier-export.service"

jest.mock("server-only", () => ({}), { virtual: true })
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/hris/org.service", () => ({ resolveHrisPeopleAccessScope: jest.fn() }))
jest.mock("@/services/events/business-event.service", () => ({ recordBusinessEventInTx: jest.fn(), markBusinessEventAppliedInTx: jest.fn() }))
jest.mock("@/services/_shared/protect", () => ({ protect: (_options: unknown, handler: Function) => (input: unknown) => handler(input, { orgId: "org-session", userId: "user-session", permissions: ["MANAGE_SYSTEM_SETTINGS"] }) }))
jest.mock("@/services/modules/module-composition.service", () => ({ getModuleCompositionData: jest.fn(), getModuleCompositionHistory: jest.fn(), previewModuleComposition: jest.fn(), saveModuleCompositionDraft: jest.fn(), reopenModuleComposition: jest.fn(), applyModuleComposition: jest.fn(), resumeModuleComposition: jest.fn() }))
jest.mock("@/services/agents/agent-release-control.service", () => ({ AgentReleaseControlError: class extends Error {}, prepareCommandAgentActivationPackage: jest.fn(), acceptCommandAgentActivationOwnership: jest.fn(), activateCommandAgentInternal: jest.fn(), assignCommandAgentActivationOwner: jest.fn(), provisionCommandAgentShadow: jest.fn(), recordCommandAgentActivationApproval: jest.fn(), retireCommandAgentRelease: jest.fn(), reviewCommandAgentActivationPackage: jest.fn(), suspendCommandAgentRelease: jest.fn() }))
jest.mock("@/services/agents/agent-release-contracts", () => ({ REQUIRED_AGENT_OWNER_RESPONSIBILITIES: ["ROLLOUT", "ROLLBACK"], agentReleaseIdempotencyKeySchema: require("zod").z.string().min(8) }))
jest.mock("@/actions/_shared/safe-action-responses", () => ({ safeLoggedActionErrorMessage: (_error: unknown, _options: unknown, fallback: string) => fallback || "Invalid export input" }))
jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/services/_shared/require-org", () => ({ requireOrg: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/purchasing/ap-history.service", () => ({ readAPHistory: jest.fn() }))
jest.mock("@/services/security/export-safety.service", () => ({ buildExportWatermark: jest.fn(), evaluateExportSafety: jest.fn() }))
jest.mock("@/services/supplier/supplier-export.service", () => ({ auditSupplierExportDecision: jest.fn() }))
jest.mock("@/services/supplier/supplier.service", () => ({ createSupplierForManagement: jest.fn(), getSupplierDetailAnalyticsForOrg: jest.fn(), getSupplierManagementDataForOrg: jest.fn(), removeSupplierForManagement: jest.fn(), updateSupplierForManagement: jest.fn() }))

function unreadableArray(length: number) {
  const values = new Array(length)
  Object.defineProperty(values, 0, { get() { throw new Error("Element was visited before the length check") } })
  return values
}
const selection = { selectedModules: ["sales"], expectedRevision: 0 }
const release = { releaseVersion: "test-release", environment: "test", commitSha: "a".repeat(40), allowedRoleCodes: ["ADMIN"], activationStartsAt: "2026-10-16", activationEndsAt: "2026-10-17" }
const entry = { sourceRecordId: "row-1", employeeId: "employee", workDate: "2026-10-16", scheduledMinutes: 60, workedMinutes: 60, sourceHash: "synthetic-row-hash" }
const attendance = { organizationId: "org-session", actorId: "user-session", actorPermissions: ["hris.people.manage"], sourceSystem: "test", sourceHash: "synthetic-file-hash", idempotencyKey: "import-test-1", entries: [entry] }

beforeEach(() => {
  jest.clearAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-session", userId: "user-session", permissions: ["reports.export"], isSuperUser: false })
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { lastAuthAt: new Date() } })
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  ;(evaluateExportSafety as jest.Mock).mockReturnValue({ allowed: true })
  ;(buildExportWatermark as jest.Mock).mockReturnValue("synthetic-watermark")
})

const foundation = { organizationId: "org-session", actorId: "user-session", actorPermissions: ["hris.people.manage"], countryCode: "CM", calendarCode: "test", calendarName: "Test", timezone: "Africa/Douala", effectiveFrom: "2026-01-01", calendarSourceHash: "synthetic-calendar-hash", holidays: [], leavePolicyCode: "test", leavePolicyName: "Test", annualEntitlementMinutes: 0, accrualRule: {}, leavePolicySourceHash: "synthetic-policy-hash" }
describe("remaining request array boundaries", () => {
  it("rejects oversized holiday calendars before item parsing or transaction entry", async () => {
    const client = { $transaction: jest.fn() }
    await expect(createTimeFoundation({ ...foundation, holidays: unreadableArray(101) }, client as never)).rejects.toBeInstanceOf(z.ZodError)
    expect(client.$transaction).not.toHaveBeenCalled()
  })
  it("accepts 100 holidays, allows empty calendars and retains date/default handling", () => {
    const holiday = { date: "2026-10-16", name: " Holiday ", sourceHash: "synthetic-holiday-hash" }
    const parsed = createTimeFoundationInputSchema.parse({ ...foundation, holidays: Array.from({ length: 100 }, () => holiday) })
    expect(parsed.holidays).toHaveLength(100)
    expect(parsed.holidays[0]).toEqual({ ...holiday, date: new Date("2026-10-16"), name: "Holiday", paid: true })
    expect(createTimeFoundationInputSchema.parse({ ...foundation, holidays: [] }).holidays).toEqual([])
  })
  it.each([5001, 1_000_000])("rejects %i HR entries before element parsing or database work", async length => {
    const client = { payrollEmployee: { findMany: jest.fn() }, $transaction: jest.fn() }
    await expect(importOperationalTime({ ...attendance, entries: unreadableArray(length) }, client as never)).rejects.toBeInstanceOf(z.ZodError)
    expect(client.payrollEmployee.findMany).not.toHaveBeenCalled()
    expect(client.$transaction).not.toHaveBeenCalled()
  })
  it("accepts the HR maximum and retains its minimum, permission check and tenant scope", async () => {
    const stop = new Error("stop at mocked database boundary")
    const client = { payrollEmployee: { findMany: jest.fn().mockRejectedValue(stop) } }
    await expect(importOperationalTime({ ...attendance, entries: Array.from({ length: 5000 }, () => entry) }, client as never)).rejects.toBe(stop)
    expect(client.payrollEmployee.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-session", id: { in: ["employee"] }, deletedAt: null } }))
    client.payrollEmployee.findMany.mockClear()
    await expect(importOperationalTime({ ...attendance, entries: [] }, client as never)).rejects.toBeInstanceOf(z.ZodError)
    await expect(importOperationalTime({ ...attendance, actorPermissions: [] }, client as never)).rejects.toThrow()
    expect(client.payrollEmployee.findMany).not.toHaveBeenCalled()
  })
  it.each(["selectedModules", "stopNewWorkModules"])("rejects oversized %s before module service work", async field => {
    await expect(previewModuleCompositionAction({ ...selection, [field]: unreadableArray(31) })).rejects.toBeInstanceOf(z.ZodError)
    expect(previewModuleComposition).not.toHaveBeenCalled()
  })
  it("accepts both module maxima, optional stop list and server-owned actor context", async () => {
    const values = Array.from({ length: 30 }, (_, i) => `module-${i}`)
    await previewModuleCompositionAction({ ...selection, selectedModules: values, stopNewWorkModules: values, organizationId: "forged" })
    expect(previewModuleComposition).toHaveBeenCalledWith({ organizationId: "org-session", actorId: "user-session", actorPermissions: ["MANAGE_SYSTEM_SETTINGS"] }, { ...selection, selectedModules: values, stopNewWorkModules: values })
    await previewModuleCompositionAction(selection)
    expect(previewModuleComposition).toHaveBeenLastCalledWith(expect.any(Object), selection)
    await expect(previewModuleCompositionAction({ ...selection, selectedModules: "sales" })).rejects.toBeInstanceOf(z.ZodError)
  })
  it("rejects oversized release roles before a release command", async () => {
    await expect(prepareCommandAgentReleaseAction({ ...release, allowedRoleCodes: unreadableArray(21) })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    expect(prepareCommandAgentActivationPackage).not.toHaveBeenCalled()
  })
  it("accepts the release role maximum, preserves trimming/dates and rejects empty roles", async () => {
    const roles = Array.from({ length: 20 }, (_, i) => ` ROLE_${i} `)
    await prepareCommandAgentReleaseAction({ ...release, allowedRoleCodes: roles })
    expect(prepareCommandAgentActivationPackage).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-session", requestedById: "user-session", allowedRoleCodes: roles.map(r => r.trim()), activationStartsAt: new Date("2026-10-16") }))
    ;(prepareCommandAgentActivationPackage as jest.Mock).mockClear()
    await expect(prepareCommandAgentReleaseAction({ ...release, allowedRoleCodes: [] })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    expect(prepareCommandAgentActivationPackage).not.toHaveBeenCalled()
  })
  it("rejects oversized supplier fields before auth, export evaluation or audit", async () => {
    const visit = jest.fn(() => "name")
    const fields = new Array(33).fill("name")
    Object.defineProperty(fields, 0, { get: visit })
    const result = await prepareSupplierManagementExport("org-session", { rowCount: 1, fields })
    expect(visit).not.toHaveBeenCalled()
    expect(result.success).toBe(false)
    expect(requirePermission).not.toHaveBeenCalled()
    expect(evaluateExportSafety).not.toHaveBeenCalled()
    expect(auditSupplierExportDecision).not.toHaveBeenCalled()
  })
  it("accepts the supplier maximum and preserves its authorization and minimum", async () => {
    const fields = Array.from({ length: 32 }, (_, i) => ` field-${i} `)
    const result = await prepareSupplierManagementExport("org-session", { rowCount: 1, fields })
    expect(result.success).toBe(true)
    expect(result.data?.includedFields).toEqual(fields.map(v => v.trim()).sort())
    expect(requirePermission).toHaveBeenCalledWith("reports.export", expect.any(Object))
    expect(requireFreshAuth).toHaveBeenCalledWith(300)
    expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ mode: "enforce", organizationId: "org-session" }))
    jest.clearAllMocks()
    expect((await prepareSupplierManagementExport("org-session", { rowCount: 1, fields: [] })).success).toBe(false)
    expect(requirePermission).not.toHaveBeenCalled()
  })
  it("retains supplier cross-tenant and sensitive-field denials", async () => {
    expect((await prepareSupplierManagementExport("different-org", { rowCount: 1, fields: ["name"] })).success).toBe(false)
    expect((await prepareSupplierManagementExport("org-session", { rowCount: 1, fields: ["name"], includeSensitiveFields: true })).success).toBe(false)
    expect(auditSupplierExportDecision).not.toHaveBeenCalled()
  })
  it.each([5001, 1_000_000])("rejects %i customer IDs before reading any element, sync and async", async length => {
    const input = { customerIds: unreadableArray(length) }
    const result = CustomerExportRequestSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues).toEqual([expect.objectContaining({ path: ["customerIds"], fatal: true })])
    expect((await CustomerExportRequestSchema.safeParseAsync(input)).success).toBe(false)
  })
  it("accepts the customer maximum and preserves defaults, optionality and scope validation", () => {
    const ids = Array.from({ length: 5000 }, (_, i) => ` customer-${i} `)
    expect(CustomerExportRequestSchema.parse({ customerIds: ids }).customerIds).toEqual(ids.map(v => v.trim()))
    expect(CustomerExportRequestSchema.parse({}).customerIds).toBeUndefined()
    expect(CustomerExportRequestSchema.parse({ customerIds: [] }).customerIds).toEqual([])
    expect(CustomerExportRequestSchema.parse({}).fileType).toBe("csv")
    expect(CustomerExportRequestSchema.safeParse({ scope: "customer" }).success).toBe(false)
    expect(CustomerExportRequestSchema.safeParse({ customerIds: "customer" }).success).toBe(false)
  })
})


