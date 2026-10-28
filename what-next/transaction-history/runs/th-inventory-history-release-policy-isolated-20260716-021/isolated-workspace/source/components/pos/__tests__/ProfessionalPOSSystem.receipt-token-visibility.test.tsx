import { render } from "@testing-library/react"

const mockNotifications = {
  warning: jest.fn(),
  info: jest.fn(() => "notification-1"),
  removeNotification: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
}
const mockReceiptTokenHistoryPanel = jest.fn(() => <div data-testid="receipt-token-history-panel" />)
const mockReceiptTokenControlStrip = jest.fn(() => <div data-testid="receipt-token-control-strip" />)

jest.mock("lucide-react", () => {
  const Icon = (props: Record<string, unknown>) => <svg {...props} />

  return new Proxy({}, { get: () => Icon })
})

jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}))

jest.mock("@/components/notifications/NotificationProvider", () => ({
  useNotifications: () => mockNotifications,
}))

jest.mock("@/components/pos/ReceiptTokenHistoryPanel", () => ({
  ReceiptTokenHistoryPanel: (props: unknown) => mockReceiptTokenHistoryPanel(props),
}))

jest.mock("@/components/pos/ReceiptTokenControlStrip", () => ({
  ReceiptTokenControlStrip: (props: unknown) => mockReceiptTokenControlStrip(props),
}))

jest.mock("@/components/pos/offline/OfflineSyncStatusStrip", () => ({
  OfflineSyncStatusStrip: () => <div data-testid="offline-sync-status" />,
}))

jest.mock("@/hooks/posHooks/usePosOperations", () => ({
  useActivePOSCart: jest.fn(),
  useActivePOSShift: jest.fn(),
  useAddPOSCartLine: jest.fn(),
  useClosePOSShift: jest.fn(),
  useCommitPOSSale: jest.fn(),
  useOpenPOSShift: jest.fn(),
  usePOSCatalog: jest.fn(),
  usePOSCustomers: jest.fn(),
  usePOSLocations: jest.fn(),
  usePOSTerminals: jest.fn(),
  usePublicReceiptAccessTokens: jest.fn(),
  usePublicReceiptSalesSearch: jest.fn(),
  usePublicReceiptTokenManagementCapability: jest.fn(),
  useRemovePOSCartLine: jest.fn(),
  useRevokePublicReceiptAccessToken: jest.fn(),
  useUpdatePOSCartLine: jest.fn(),
}))

import * as posHooks from "@/hooks/posHooks/usePosOperations"
import ProfessionalPOSSystem from "../ProfessionalPOSSystem"

const mockHooks = posHooks as jest.Mocked<typeof posHooks>

type CapabilityState = {
  data?: unknown
  isLoading?: boolean
  isFetching?: boolean
  isError?: boolean
  error?: unknown
}

function actionSuccess<T>(data: T) {
  return { success: true, data, error: null, status: 200 }
}

function mutationState() {
  return {
    isPending: false,
    variables: undefined,
    mutateAsync: jest.fn(),
  }
}

function setupHooks(capability: CapabilityState) {
  mockHooks.usePOSLocations.mockReturnValue({ data: actionSuccess([]) } as never)
  mockHooks.usePOSTerminals.mockReturnValue({ data: actionSuccess([]) } as never)
  mockHooks.useActivePOSShift.mockReturnValue({ data: actionSuccess(null) } as never)
  mockHooks.usePOSCustomers.mockReturnValue({ data: actionSuccess([]) } as never)
  mockHooks.usePOSCatalog.mockReturnValue({ data: actionSuccess({ categories: [], items: [] }) } as never)
  mockHooks.useActivePOSCart.mockReturnValue({ data: actionSuccess(null) } as never)
  mockHooks.useOpenPOSShift.mockReturnValue(mutationState() as never)
  mockHooks.useClosePOSShift.mockReturnValue(mutationState() as never)
  mockHooks.useAddPOSCartLine.mockReturnValue(mutationState() as never)
  mockHooks.useUpdatePOSCartLine.mockReturnValue(mutationState() as never)
  mockHooks.useRemovePOSCartLine.mockReturnValue(mutationState() as never)
  mockHooks.useCommitPOSSale.mockReturnValue(mutationState() as never)
  mockHooks.useRevokePublicReceiptAccessToken.mockReturnValue(mutationState() as never)
  mockHooks.usePublicReceiptAccessTokens.mockReturnValue({ data: actionSuccess([]), isFetching: false } as never)
  mockHooks.usePublicReceiptSalesSearch.mockReturnValue({ data: actionSuccess([]), isFetching: false } as never)
  mockHooks.usePublicReceiptTokenManagementCapability.mockReturnValue({
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    ...capability,
  } as never)
}

function latestHistoryPanelProps() {
  return mockReceiptTokenHistoryPanel.mock.calls.at(-1)?.[0] as Record<string, unknown>
}

describe("ProfessionalPOSSystem receipt-token visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupHooks({
      data: actionSuccess({
        canManageReceiptTokens: true,
        moduleSlug: "pos",
        permission: "pos.receipts.revoke",
      }),
    })
  })

  it("passes allowed receipt-token capability into the management panel", () => {
    render(<ProfessionalPOSSystem />)

    expect(latestHistoryPanelProps()).toEqual(expect.objectContaining({
      canManage: true,
      capabilityLoading: false,
      capabilityUnavailable: false,
      capabilityErrorMessage: null,
    }))
  })

  it("passes safe RBAC denial into the management panel and suppresses searches", () => {
    setupHooks({
      data: {
        success: false,
        data: null,
        error: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      },
    })

    render(<ProfessionalPOSSystem />)

    expect(latestHistoryPanelProps()).toEqual(expect.objectContaining({
      canManage: false,
      capabilityLoading: false,
      capabilityUnavailable: false,
      capabilityErrorMessage: "Forbidden",
    }))
    expect(mockHooks.usePublicReceiptSalesSearch).toHaveBeenCalledWith(null)
  })

  it("passes loading capability state into the management panel", () => {
    setupHooks({ data: undefined, isLoading: true, isFetching: true })

    render(<ProfessionalPOSSystem />)

    expect(latestHistoryPanelProps()).toEqual(expect.objectContaining({
      canManage: false,
      capabilityLoading: true,
      capabilityUnavailable: false,
    }))
  })

  it("passes unavailable capability state into the management panel", () => {
    setupHooks({ data: undefined, isError: true, error: new Error("network unavailable") })

    render(<ProfessionalPOSSystem />)

    expect(latestHistoryPanelProps()).toEqual(expect.objectContaining({
      canManage: false,
      capabilityLoading: false,
      capabilityUnavailable: true,
      capabilityErrorMessage: "network unavailable",
    }))
  })
})