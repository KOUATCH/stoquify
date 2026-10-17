import { revalidatePath } from "next/cache"
import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { reverseJournalEntry } from "@/services/accounting/posting.service"
import { reverseJournalEntryAction } from "../journals.actions"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {}, requireFreshAuth: jest.fn(),
}))
jest.mock("@/lib/security/rbac", () => {
  class ErrorWithCode extends Error {
    constructor(message: string, public code: string, public status: number) { super(message) }
  }
  return { RbacError: ErrorWithCode, isRbacError: (error: unknown) => error instanceof ErrorWithCode,
    requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }
})
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/accounting/journals.service", () => ({ createManualJournalEntry: jest.fn(), listJournalEntries: jest.fn(), listJournals: jest.fn() }))
jest.mock("@/services/accounting/posting.service", () => ({ postJournalEntry: jest.fn(), reverseJournalEntry: jest.fn() }))

const fresh = requireFreshAuth as jest.Mock, permission = requirePermission as jest.Mock
const moduleAccess = observeModuleAccess as jest.Mock, reverse = reverseJournalEntry as jest.Mock
const context = () => ({ userId: "checker", orgId: "org", permissions: ["accounting.journal.reverse"], roles: [], isSuperUser: false })
const claims = (lastAuthAt: number) => ({ userId: "checker", tenantId: "org", lastAuthAt })

describe("manual reversal action authority", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    permission.mockResolvedValue(context())
    moduleAccess.mockResolvedValue({ allowed: true })
    fresh.mockResolvedValue({ claims: claims(Date.now() - 90_000) })
    reverse.mockImplementation(async (_org, _entry, _actor, _reason, _date, control) => {
      await control.assertCurrentAuthority()
      return { id: "reversal", status: "POSTED" }
    })
  })

  it("preserves verified authentication age and accepts authority only from the server context", async () => {
    const at = Date.now() - 299_000, forged = jest.fn()
    fresh.mockResolvedValue({ claims: claims(at) })
    const reversalDate = new Date("2026-10-01T12:00:00Z")
    expect(await reverseJournalEntryAction({ journalEntryId: "entry", reason: "Correct duplicate", reversalDate,
      actorId: "forged", actorPermissions: ["*"], lastAuthAt: Date.now(), assertCurrentAuthority: forged }))
      .toMatchObject({ success: true, data: { id: "reversal" } })
    expect(reverse).toHaveBeenCalledWith("org", "entry", "checker", "Correct duplicate", reversalDate,
      expect.objectContaining({ actorPermissions: ["accounting.journal.reverse"], lastAuthAt: new Date(at), assertCurrentAuthority: expect.any(Function) }))
    expect(fresh).toHaveBeenCalledTimes(2)
    expect(fresh).toHaveBeenLastCalledWith(300)
    expect(permission).toHaveBeenLastCalledWith("accounting.journal.reverse", { resource: "JournalEntry", resourceId: "entry", auditAllowed: false })
    expect(moduleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org", userId: "checker", moduleSlug: "accounting", accessIntent: "write", mode: "enforce" }))
    expect(forged).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalled()
  })

  it.each(["userId", "tenantId"])("refuses mismatched initial %s before reversal", async key => {
    fresh.mockResolvedValue({ claims: { ...claims(Date.now()), [key]: "foreign" } })
    expect(await reverseJournalEntryAction({ journalEntryId: "entry" })).toMatchObject({ success: false, code: "AUTH_REQUIRED", status: 401 })
    expect(reverse).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each(["freshness", "permission", "session-tenant", "session-actor", "rbac-tenant", "rbac-actor"])("refuses changed %s after waits before effects", async reason => {
    const effect = jest.fn()
    reverse.mockImplementation(async (_org, _entry, _actor, _reason, _date, control) => {
      if (reason === "freshness") fresh.mockRejectedValue(new FreshAuthRequiredError())
      if (reason === "permission") permission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))
      if (reason === "session-tenant") fresh.mockResolvedValue({ claims: { ...claims(Date.now()), tenantId: "foreign" } })
      if (reason === "session-actor") fresh.mockResolvedValue({ claims: { ...claims(Date.now()), userId: "other" } })
      if (reason === "rbac-tenant") permission.mockResolvedValue({ ...context(), orgId: "foreign" })
      if (reason === "rbac-actor") permission.mockResolvedValue({ ...context(), userId: "other" })
      await control.assertCurrentAuthority()
      effect()
    })
    expect(await reverseJournalEntryAction({ journalEntryId: "entry" })).toMatchObject({ success: false })
    expect(effect).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("does not admit reversal without current writable Accounting even with wildcard and forged grant input", async () => {
    permission.mockResolvedValue({ ...context(), permissions: ["*"] })
    moduleAccess.mockResolvedValue({ allowed: false })
    expect(await reverseJournalEntryAction({ journalEntryId: "entry", moduleSlug: "finance", mode: "observe", explicitEntitlements: [{ moduleSlug: "accounting", status: "active" }] }))
      .toMatchObject({ success: false, code: "FORBIDDEN", status: 403 })
    expect(moduleAccess).toHaveBeenCalledWith(expect.objectContaining({ moduleSlug: "accounting", mode: "enforce", accessIntent: "write" }))
    expect(reverse).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("fails closed when the module authority store cannot be read", async () => {
    moduleAccess.mockRejectedValue(new Error("Authority read unavailable"))
    expect(await reverseJournalEntryAction({ journalEntryId: "entry" })).toMatchObject({ success: false })
    expect(reverse).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("refuses missing reversal permission before the service", async () => {
    permission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))
    expect(await reverseJournalEntryAction({ journalEntryId: "entry" })).toMatchObject({ success: false, status: 403 })
    expect(reverse).not.toHaveBeenCalled()
  })
})
