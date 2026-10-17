import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { postJournalEntry } from "@/services/accounting/posting.service"
import { postJournalEntryAction } from "../journals.actions"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { revalidatePath } from "next/cache"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {}, requireFreshAuth: jest.fn(),
}))
jest.mock("@/lib/security/rbac", () => {
  class ErrorWithCode extends Error {
    constructor(message: string, public code: string, public status: number) { super(message) }
  }
  return { RbacError: ErrorWithCode, isRbacError: (e: unknown) => e instanceof ErrorWithCode,
    requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }
})
jest.mock("@/services/accounting/journals.service", () => ({ createManualJournalEntry: jest.fn(), listJournalEntries: jest.fn(), listJournals: jest.fn() }))
jest.mock("@/services/accounting/posting.service", () => ({ postJournalEntry: jest.fn(), reverseJournalEntry: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))

const fresh = requireFreshAuth as jest.Mock, permission = requirePermission as jest.Mock, post = postJournalEntry as jest.Mock
const moduleAccess = observeModuleAccess as jest.Mock
const context = () => ({ userId: "reviewer", orgId: "org", permissions: ["accounting.journal.post"], roles: [], isSuperUser: false })
const claims = (lastAuthAt: number) => ({ userId: "reviewer", tenantId: "org", lastAuthAt })

describe("manual posting action authority", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    permission.mockResolvedValue(context())
    moduleAccess.mockResolvedValue({ allowed: true })
    fresh.mockResolvedValue({ claims: claims(Date.now() - 90_000) })
    post.mockImplementation(async (_org, _entry, _actor, control) => {
      await control.assertCurrentAuthority()
      return { id: "entry", status: "POSTED" }
    })
  })

  it("retains verified assurance age and derives identity/authority solely from server context", async () => {
    const at = Date.now() - 90_000
    fresh.mockResolvedValue({ claims: claims(at) })
    const forged = jest.fn()
    const result = await postJournalEntryAction({ journalEntryId: "entry", actorId: "attacker", lastAuthAt: Date.now(), assertCurrentAuthority: forged })
    expect(result.success).toBe(true)
    expect(post).toHaveBeenCalledWith("org", "entry", "reviewer", expect.objectContaining({ lastAuthAt: new Date(at), assertCurrentAuthority: expect.any(Function) }))
    expect(fresh).toHaveBeenCalledTimes(2)
    expect(permission).toHaveBeenLastCalledWith("accounting.journal.post", { resource: "JournalEntry", resourceId: "entry", auditAllowed: false })
    expect(forged).not.toHaveBeenCalled()
    expect(moduleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org", userId: "reviewer", moduleSlug: "accounting",
      surface: "accounting.journal.post", accessIntent: "write", mode: "enforce",
    }))
  })

  it("refuses mismatched initial fresh-session identity before the posting owner", async () => {
    fresh.mockResolvedValue({ claims: { ...claims(Date.now()), tenantId: "foreign" } })
    expect(await postJournalEntryAction({ journalEntryId: "entry" })).toMatchObject({ success: false, status: 401 })
    expect(post).not.toHaveBeenCalled()
  })

  it.each(["freshness", "permission", "tenant", "actor"])("refuses changed %s after preparation before effects", async reason => {
    const effects = jest.fn()
    post.mockImplementation(async (_org, _entry, _actor, control) => {
      if (reason === "freshness") fresh.mockRejectedValue(new FreshAuthRequiredError())
      if (reason === "permission") permission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))
      if (reason === "tenant") fresh.mockResolvedValue({ claims: { ...claims(Date.now()), tenantId: "foreign" } })
      if (reason === "actor") permission.mockResolvedValue({ ...context(), userId: "different" })
      await control.assertCurrentAuthority()
      effects()
      return { id: "entry" }
    })
    expect(await postJournalEntryAction({ journalEntryId: "entry" })).toMatchObject({ success: false })
    expect(effects).not.toHaveBeenCalled()
  })

  it("rejects missing entry permission before calling the posting owner", async () => {
    permission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))
    expect(await postJournalEntryAction({ journalEntryId: "entry" })).toMatchObject({ success: false, status: 403 })
    expect(post).not.toHaveBeenCalled()
  })

  it("refuses unavailable module write access despite wildcard permission and forged input", async () => {
    permission.mockResolvedValue({ ...context(), permissions: ["*"] })
    moduleAccess.mockResolvedValue({ allowed: false })
    expect(await postJournalEntryAction({ journalEntryId: "entry", moduleSlug: "finance", mode: "observe", explicitEntitlements: [{ moduleSlug: "accounting", status: "active" }] }))
      .toMatchObject({ success: false, code: "FORBIDDEN", status: 403 })
    expect(moduleAccess).toHaveBeenCalledWith(expect.objectContaining({ moduleSlug: "accounting", mode: "enforce", accessIntent: "write" }))
    expect(post).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("does not report success or post when the authority read fails", async () => {
    moduleAccess.mockRejectedValue(new Error("Authority storage unavailable"))
    expect(await postJournalEntryAction({ journalEntryId: "entry" })).toMatchObject({ success: false })
    expect(post).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
