jest.mock("lucide-react", () => {
  const createIcon = () => () => null
  return new Proxy({ __esModule: true }, { get(target, prop: string) { return prop in target ? target[prop as keyof typeof target] : createIcon() } })
})

jest.mock("@/actions/inventory/inventoryMovementHistoryActions", () => ({
  getInventoryMovementHistoryAction: jest.fn(),
  exportInventoryMovementHistoryAction: jest.fn(),
}))
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn() }))
jest.mock("next/navigation", () => {
  const params = new URLSearchParams()
  return { useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), usePathname: () => "/en/dashboard/inventory/movements", useSearchParams: () => params }
})

import { createElement, type ReactNode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { usePermissions } from "@/hooks/usePermissions"
import { exportInventoryMovementHistoryAction, getInventoryMovementHistoryAction } from "@/actions/inventory/inventoryMovementHistoryActions"
import { buildInventoryMovementHistoryHref, downloadInventoryHistoryArtifact, filtersForInventoryMovementHistoryAction, filtersForInventoryMovementHistoryExport, parseInventoryMovementHistorySearchParams, useInventoryMovementHistoryWorkbench } from "../useInventoryMovementHistoryWorkbench"

describe("useInventoryMovementHistoryWorkbench helpers", () => {
  it("downloads the exact protected artifact and releases its URL", () => {
    jest.useFakeTimers()
    const createUrl = jest.fn().mockReturnValue("blob:history")
    const revokeUrl = jest.fn()
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createUrl })
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeUrl })
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("history.json")
      expect(this.href).toBe("blob:history")
    })
    downloadInventoryHistoryArtifact({ content: '{"rows":[{"id":"tx-1"}]}', fileType: "application/json", fileName: "history.json" } as Parameters<typeof downloadInventoryHistoryArtifact>[0])
    expect(createUrl).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalledTimes(1)
    expect(document.querySelector('a[download="history.json"]')).toBeNull()
    jest.runAllTimers()
    expect(revokeUrl).toHaveBeenCalledWith("blob:history")
    click.mockRestore()
    jest.useRealTimers()
  })
  it("parses URL filters and sanitizes invalid page size and type", () => {
    const filters = parseInventoryMovementHistorySearchParams(new URLSearchParams("type=NOPE&pageSize=999&dateFrom=2026-07-15&selected=row-1"))

    expect(filters).toMatchObject({ pageSize: 50, dateFrom: "2026-07-15", selected: "row-1" })
    expect(filters.type).toBeUndefined()
  })

  it("resets cursor and selected row when a server filter changes", () => {
    const href = buildInventoryMovementHistoryHref("/en/dashboard/inventory/movements", new URLSearchParams("cursor=c1&selected=row-1&pageSize=50"), { type: "SALE" })

    expect(href).toBe("/en/dashboard/inventory/movements?pageSize=50&type=SALE")
  })

  it("keeps server search in export scope while excluding cursor and selected row", () => {
    const filters = parseInventoryMovementHistorySearchParams(new URLSearchParams("cursor=c1&selected=row-1&search=rice&type=SALE&pageSize=100"))

    expect(filtersForInventoryMovementHistoryAction(filters)).toMatchObject({ cursor: "c1", search: "rice", type: "SALE", pageSize: 100 })
    expect(filtersForInventoryMovementHistoryExport(filters)).toEqual({ search: "rice", type: "SALE", pageSize: 100 })
  })

  it("restores previous-page URLs and resets traversal when changing filters", () => {
    const filters = parseInventoryMovementHistorySearchParams(new URLSearchParams("cursor=c1&direction=previous&selected=row-1&search=rice"))
    expect(filtersForInventoryMovementHistoryAction(filters)).toMatchObject({ cursor: "c1", direction: "previous", search: "rice" })
    expect(filtersForInventoryMovementHistoryExport(filters)).toEqual({ search: "rice", pageSize: 50 })
    expect(buildInventoryMovementHistoryHref("/movements", new URLSearchParams("cursor=c1&direction=previous&selected=row-1"), { search: "coffee" })).toBe("/movements?search=coffee")
  })

  it("preserves supported legacy bookmarks and drops invalid calendar dates", () => {
    expect(parseInventoryMovementHistorySearchParams(new URLSearchParams("type=RESERVED&dateFrom=2026-02-30"))).toMatchObject({ type: "RESERVATION", dateFrom: undefined })
  })
})

it("discards an export that completes after the organization changes", async () => {
  const permission = (organizationId: string) => ({ user: { id: "actor-1" }, organizationId, permissionState: "ready", hasPermission: () => true })
  jest.mocked(usePermissions).mockReturnValue(permission("org-1") as ReturnType<typeof usePermissions>)
  jest.mocked(getInventoryMovementHistoryAction).mockResolvedValue({ success: true, data: { rows: [], pageInfo: { hasMore: false } } } as Awaited<ReturnType<typeof getInventoryMovementHistoryAction>>)
  let completeExport!: (value: Awaited<ReturnType<typeof exportInventoryMovementHistoryAction>>) => void
  jest.mocked(exportInventoryMovementHistoryAction).mockImplementation(() => new Promise((resolve) => { completeExport = resolve }))
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  const { result, rerender, unmount } = renderHook(() => useInventoryMovementHistoryWorkbench(), { wrapper })
  act(() => result.current.exportHistory())
  await waitFor(() => expect(exportInventoryMovementHistoryAction).toHaveBeenCalled())
  jest.mocked(usePermissions).mockReturnValue(permission("org-2") as ReturnType<typeof usePermissions>)
  rerender()
  await act(async () => completeExport({ success: true, data: { fileName: "history.json", fileType: "application/json", content: "{}", manifest: { rowCount: 1 } } } as Awaited<ReturnType<typeof exportInventoryMovementHistoryAction>>))
  await waitFor(() => expect(result.current.isExporting).toBe(false))
  expect(click).not.toHaveBeenCalled()
  expect(result.current.exportStatus).toBeNull()
  unmount()
  client.clear()
  click.mockRestore()
})
