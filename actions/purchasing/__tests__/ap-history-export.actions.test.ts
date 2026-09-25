/** @jest-environment node */
jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requireAnyPermission: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/purchasing/ap-history.service", () => ({ readAPHistory: jest.fn() }))
jest.mock("@/services/purchasing/ap-history-export.service", () => ({ ...jest.requireActual("@/services/purchasing/ap-history-export.service"), prepareAPHistoryExport: jest.fn() }))
jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("server-only", () => ({}))
import { requireFreshAuth } from "@/lib/security/auth-session"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { prepareAPHistoryExport } from "@/services/purchasing/ap-history-export.service"
import { prepareAPHistoryExportAction, getAPHistoryAction } from "../ap-history.actions"
import { requireAnyPermission } from "@/lib/security/rbac"
import { readAPHistory } from "@/services/purchasing/ap-history.service"
import { ConflictError } from "@/services/_shared/action-errors"
import { HistoryCursorError } from "@/services/history/transaction-history.types"
const verified = () => ({ ctx: { orgId: "org-1", userId: "u1", permissions: ["reports.export", "finance.payables.read"] }, claims: { sessionId: "session-1", lastAuthAt: Date.now() } })
beforeEach(() => { jest.clearAllMocks(); (requireFreshAuth as jest.Mock).mockResolvedValue(verified()); (observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true }); (prepareAPHistoryExport as jest.Mock).mockResolvedValue({ organizationId: "org-1", actorId: "u1", content: "private CSV" }) })
it("uses actual assurance and checks authority twice before releasing bytes", async () => { const v=verified(); (requireFreshAuth as jest.Mock).mockResolvedValue(v); const result=await prepareAPHistoryExportAction({ locale: "fr" }); expect(result.success).toBe(true); expect(requireFreshAuth).toHaveBeenCalledTimes(2); expect(prepareAPHistoryExport).toHaveBeenCalledWith({ locale: "fr" }, expect.objectContaining({ organizationId: "org-1", actorId: "u1", lastAuthAt: v.claims.lastAuthAt })) })
it.each(["permissions", "organization", "session"])("withholds bytes after %s changes during generation", async kind => { const next=verified(); if(kind==='permissions')next.ctx.permissions=[];if(kind==='organization')next.ctx.orgId='other';if(kind==='session')next.claims.sessionId='other'; (requireFreshAuth as jest.Mock).mockResolvedValueOnce(verified()).mockResolvedValueOnce(next); const result=await prepareAPHistoryExportAction({}); expect(result.success).toBe(false);expect(result.data).toBeNull() })
it("module denial prevents generation", async () => { (observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false }); expect((await prepareAPHistoryExportAction({})).success).toBe(false); expect(prepareAPHistoryExport).not.toHaveBeenCalled() })
it("transfers the exact BOM-bearing bytes without exposing a text transport field", async () => { const content='\uFEFF"é","1.25"\r\n'; (prepareAPHistoryExport as jest.Mock).mockResolvedValue({organizationId:'org-1',actorId:'u1',content}); const result=await prepareAPHistoryExportAction({}); expect(result.success).toBe(true); if(result.success){expect(result.data).not.toHaveProperty('content');expect(Buffer.from(result.data.contentBase64,'base64').equals(Buffer.from(content,'utf8'))).toBe(true)} })
it("rejects caller-supplied organization and row count", async () => { expect((await prepareAPHistoryExportAction({ organizationId: "other", rowCount: 0 })).success).toBe(false); expect(requireFreshAuth).not.toHaveBeenCalled() })
it.each([
  [new ConflictError("Sources changed"), "CONFLICT"],
  [new HistoryCursorError("bad_signature", "Private cursor diagnostics"), "VALIDATION_ERROR"],
])("returns a machine-readable recovery code for history errors", async (error, code) => {
  ;(requireAnyPermission as jest.Mock).mockResolvedValue(verified().ctx)
  ;(readAPHistory as jest.Mock).mockRejectedValue(error)
  const result = await getAPHistoryAction({})
  expect(result).toEqual(expect.objectContaining({ success: false, data: null, code }))
  expect(result.error).not.toContain("Private cursor diagnostics")
})
