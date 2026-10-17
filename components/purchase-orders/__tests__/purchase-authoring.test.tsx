jest.mock("@/actions/purchaseOrderWorkflow/purchase-order-authoring.actions", () => ({ createPurchaseOrderFromAuthoringAction: jest.fn(), discardPurchaseAuthoringAction: jest.fn(), getPurchaseAuthoringAction: jest.fn(), listPurchaseAuthoringAction: jest.fn(), preparePurchaseAuthoringAction: jest.fn(), savePurchaseAuthoringAction: jest.fn() }))
import { act, renderHook, waitFor, render, screen, fireEvent } from "@testing-library/react"
import * as actions from "@/actions/purchaseOrderWorkflow/purchase-order-authoring.actions"
import { emptyPurchaseAuthoring, type PurchaseAuthoringView } from "@/services/purchase-order/purchase-order-authoring-contracts"
import { usePurchaseAuthoring } from "../use-purchase-authoring"
import { PurchaseAuthoringPanel } from "../PurchaseAuthoringPanel"
const id = "550e8400-e29b-41d4-a716-446655440000"
const saved = (overrides: Partial<PurchaseAuthoringView> = {}): PurchaseAuthoringView => ({ id, revision: 1, title: "Work", status: "ACTIVE", content: emptyPurchaseAuthoring(), savedAt: "2026-10-04T12:00:00Z", preparedAt: null, receipt: null, ...overrides })
const receipt = { requestReference: id, orderId: "po", orderNumber: "PO-001", createdAt: "2026-10-04T12:00:00Z" }
const mock = (action: unknown) => action as jest.Mock
beforeEach(() => {
  jest.resetAllMocks()
  Object.defineProperty(globalThis, "structuredClone", { configurable: true, value: (value: unknown) => JSON.parse(JSON.stringify(value)) })
  Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => id })
  mock(actions.listPurchaseAuthoringAction).mockResolvedValue({ ok: true, data: { entries: [], nextCursor: null, writesEnabled: true } })
  mock(actions.savePurchaseAuthoringAction).mockResolvedValue({ ok: true, data: saved() })
  mock(actions.preparePurchaseAuthoringAction).mockResolvedValue({ ok: true, data: saved({ revision: 2, status: "PREPARED" }) })
  mock(actions.createPurchaseOrderFromAuthoringAction).mockResolvedValue({ ok: true, data: saved({ revision: 3, status: "CREATED", receipt }) })
})
async function mount() {
  const restore = jest.fn(), getContent = jest.fn(() => emptyPurchaseAuthoring())
  const hook = renderHook(() => usePurchaseAuthoring(getContent, restore))
  await waitFor(() => expect(hook.result.current.canSave).toBe(true))
  return { ...hook, restore, getContent }
}
it("saves incomplete work without preparing or creating an order", async () => {
  const { result } = await mount()
  await act(() => result.current.save())
  expect(result.current.current?.status).toBe("ACTIVE")
  expect(actions.preparePurchaseAuthoringAction).not.toHaveBeenCalled()
  expect(actions.createPurchaseOrderFromAuthoringAction).not.toHaveBeenCalled()
})
it("retains the exact save input and key after an unknown response, including after attempted edits", async () => {
  const { result, getContent } = await mount()
  mock(actions.savePurchaseAuthoringAction).mockRejectedValueOnce(new Error("lost response"))
  await act(() => result.current.save())
  const first = mock(actions.savePurchaseAuthoringAction).mock.calls[0][0]
  expect(result.current.locked).toBe(true); expect(result.current.requestReference).toBe(id)
  mock(actions.getPurchaseAuthoringAction).mockResolvedValue({ ok: false, code: "NOT_FOUND" })
  await act(() => result.current.check())
  expect(result.current.code).toBe("SAVE_NOT_FOUND")
  getContent.mockReturnValue({ ...emptyPurchaseAuthoring(), notes: "edited after unknown" })
  await act(() => result.current.save())
  expect(mock(actions.savePurchaseAuthoringAction).mock.calls[1][0]).toEqual(first)
})
it("checks status before retrying the same prepared creation command", async () => {
  const { result } = await mount()
  mock(actions.createPurchaseOrderFromAuthoringAction).mockRejectedValueOnce(new Error("lost response"))
  await act(() => result.current.create())
  expect(result.current.uncertain).toBe(true)
  expect(result.current.current?.status).toBe("PREPARED")
  await act(() => result.current.create())
  expect(actions.createPurchaseOrderFromAuthoringAction).toHaveBeenCalledTimes(1)
  mock(actions.getPurchaseAuthoringAction).mockResolvedValue({ ok: true, data: saved({ revision: 2, status: "PREPARED" }) })
  await act(() => result.current.check())
  await act(() => result.current.create())
  expect(actions.getPurchaseAuthoringAction).toHaveBeenCalledTimes(2)
  expect(mock(actions.createPurchaseOrderFromAuthoringAction).mock.calls.map(([input]) => input)).toEqual([{ id, expectedRevision: 2 }, { id, expectedRevision: 2 }])
  expect(result.current.current?.receipt).toEqual(receipt)
})
it("recovers a committed response without a second create", async () => {
  const { result } = await mount()
  mock(actions.createPurchaseOrderFromAuthoringAction).mockRejectedValueOnce(new Error("lost response"))
  await act(() => result.current.create())
  mock(actions.getPurchaseAuthoringAction).mockResolvedValue({ ok: true, data: saved({ revision: 3, status: "CREATED", receipt }) })
  await act(() => result.current.check())
  expect(result.current.current?.receipt).toEqual(receipt)
  expect(actions.createPurchaseOrderFromAuthoringAction).toHaveBeenCalledTimes(1)
})
it("does not continue creating when the form unmounts after saving", async () => {
  const { result, unmount } = await mount()
  let finish!: (value: unknown) => void
  mock(actions.savePurchaseAuthoringAction).mockImplementation(() => new Promise(resolve => { finish = resolve }))
  let pending!: Promise<void>
  act(() => { pending = result.current.create() })
  unmount()
  await act(async () => { finish({ ok: true, data: saved() }); await pending })
  expect(actions.preparePurchaseAuthoringAction).not.toHaveBeenCalled()
})
it("suppresses duplicate clicks while an operation is running", async () => {
  const { result } = await mount()
  let finish!: (value: unknown) => void
  mock(actions.savePurchaseAuthoringAction).mockImplementation(() => new Promise(resolve => { finish = resolve }))
  let pending!: Promise<void>
  act(() => { pending = result.current.save() })
  await act(() => result.current.save())
  expect(actions.savePurchaseAuthoringAction).toHaveBeenCalledTimes(1)
  await act(async () => { finish({ ok: true, data: saved() }); await pending })
})
it("keeps a revision conflict explicit until current work is loaded", async () => {
  const { result, restore } = await mount()
  mock(actions.savePurchaseAuthoringAction).mockResolvedValue({ ok: false, code: "STALE" })
  await act(() => result.current.save())
  expect(result.current.code).toBe("STALE"); expect(result.current.uncertain).toBe(true)
  mock(actions.getPurchaseAuthoringAction).mockResolvedValue({ ok: true, data: saved({ revision: 5 }) })
  await act(() => result.current.check())
  expect(result.current.current?.revision).toBe(5); expect(restore).toHaveBeenCalledWith(emptyPurchaseAuthoring())
})
it("restores a server draft after remounting without browser storage", async () => {
  const { result, restore } = await mount()
  const content = { ...emptyPurchaseAuthoring(), shippingCost: "12." }
  mock(actions.getPurchaseAuthoringAction).mockResolvedValue({ ok: true, data: saved({ content }) })
  await act(() => result.current.resume(id))
  expect(restore).toHaveBeenCalledWith(content)
})
it("shows French recovery guidance and suppresses unauthorized destination links", async () => {
  const { result } = await mount()
  mock(actions.getPurchaseAuthoringAction).mockResolvedValue({ ok: true, data: saved({ status: "CREATED", receipt }) })
  await act(() => result.current.resume(id))
  render(<PurchaseAuthoringPanel controller={result.current} locale="fr" canReadOrders={false} />)
  expect(screen.getByRole("heading", { name: "Bon créé" })).toHaveFocus()
  expect(screen.getByText(/Numéro du bon: PO-001/)).toBeInTheDocument()
  expect(screen.queryByRole("link")).not.toBeInTheDocument()
})
it("requires an explicit replace decision before loading saved work", async () => {
  const { result } = await mount()
  const controller = { ...result.current, list: { entries: [{ id, revision: 1, title: "Draft", status: "ACTIVE" as const, savedAt: "today" }], nextCursor: null, writesEnabled: true }, resume: jest.fn() }
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false)
  render(<PurchaseAuthoringPanel controller={controller} locale="en" canReadOrders />)
  fireEvent.click(screen.getByRole("button", { name: "Resume" })); expect(controller.resume).not.toHaveBeenCalled()
  confirm.mockReturnValue(true)
  fireEvent.click(screen.getByRole("button", { name: "Resume" })); expect(controller.resume).toHaveBeenCalledWith(id)
  confirm.mockRestore()
})
