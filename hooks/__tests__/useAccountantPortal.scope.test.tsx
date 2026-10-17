jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn(options => options), useMutation: jest.fn(options => options), useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })) }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: jest.fn(() => ({ success: jest.fn(), error: jest.fn() })) }))
jest.mock("@/actions/accounting/data-trust.actions", () => ({ getAccountantPortalAction: jest.fn(), exportAccountantTrustPackAction: jest.fn() }))
import { useQuery, useMutation } from "@tanstack/react-query"
import { getAccountantPortalAction, exportAccountantTrustPackAction } from "@/actions/accounting/data-trust.actions"
import { accountantPortalKeys, useAccountantPortal, useExportAccountantTrustPack } from "../useAccountantPortal"

beforeEach(() => jest.clearAllMocks())
it("keeps client evidence in distinct cache entries", () => {
  expect(accountantPortalKeys.dashboard({ clientOrganizationId: "a" })).not.toEqual(accountantPortalKeys.dashboard({ clientOrganizationId: "b" }))
  expect(accountantPortalKeys.dashboard({ clientOrganizationId: "a", limit: 12 })).not.toEqual(accountantPortalKeys.dashboard({ clientOrganizationId: "a", limit: 24 }))
})
it("retains the selected client and period on refresh", async () => {
  ;(getAccountantPortalAction as jest.Mock).mockResolvedValue({ success: true, data: {} })
  useAccountantPortal({ clientOrganizationId: "client", periodId: "period" })
  await (useQuery as jest.Mock).mock.calls[0][0].queryFn()
  expect(getAccountantPortalAction).toHaveBeenCalledWith(expect.objectContaining({ clientOrganizationId: "client", periodId: "period" }))
})
it("retains the selected client on authoritative export", async () => {
  ;(exportAccountantTrustPackAction as jest.Mock).mockResolvedValue({ success: true, data: {} })
  useExportAccountantTrustPack("en", { clientOrganizationId: "client", periodId: "period" })
  await (useMutation as jest.Mock).mock.calls[0][0].mutationFn({ includeLedgerRows: true })
  expect(exportAccountantTrustPackAction).toHaveBeenCalledWith(expect.objectContaining({ clientOrganizationId: "client", periodId: "period", includeLedgerRows: true }))
})
