import type { SVGProps } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { CreateItemWizard } from "../CreateItemWizard"
import { deletePhoto } from "@/actions/storage/photo-upload-actions"
jest.mock("@/actions/storage/photo-upload-actions", () => ({ deletePhoto: jest.fn() }))

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockBack = jest.fn()
const mockNotifications = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  operationStart: jest.fn(() => "operation-1"),
  operationComplete: jest.fn(),
}

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
    return Icon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})


jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: mockBack,
  }),
}))

jest.mock("@/components/notifications/NotificationProvider", () => ({
  useNotifications: () => mockNotifications,
}))




async function reachPricingStep() {
  fireEvent.change(
    screen.getByLabelText(/Product Name \(English\)/),
    { target: { value: "Rice" } },
  )

  fireEvent.click(screen.getByRole("button", { name: "Next Step" }))
  await screen.findByRole("heading", { name: "Product Details" })

  fireEvent.change(
    screen.getByLabelText(/SKU \(Stock Keeping Unit\)/),
    { target: { value: "RICE-001" } },
  )

  fireEvent.click(screen.getByRole("button", { name: "Next Step" }))
  await screen.findByRole("heading", { name: "Pricing & Units" })
}

async function reachMediaStep() {
  await reachPricingStep()


  fireEvent.click(screen.getByRole("button", { name: "Next Step" }))
  await screen.findByRole("heading", { name: "Inventory Settings" })

  fireEvent.click(screen.getByRole("button", { name: "Next Step" }))
  await screen.findByRole("heading", { name: "Product Media" })
}

const imageUrl = "/api/media/11111111-1111-4111-8111-111111111111"
const mockUpload = jest.fn()
const originalFetch = global.fetch
function mount() {
  const action = jest.fn().mockResolvedValue({ success: true, redirect: "/dashboard/inventory/items" })
  render(<CreateItemWizard action={action} organizationId="org-1" currency="XAF" locale="en" locations={[{id:"loc-1",name:"Main",code:"MAIN"}]} />)
  return action
}
beforeEach(() => {
  jest.clearAllMocks()
  mockUpload.mockResolvedValue({success:true,url:imageUrl})
  global.fetch=jest.fn().mockImplementation(async()=>{
    const result=await mockUpload()
    return {ok:result.success,json:async()=>result}
  })
  ;(deletePhoto as jest.Mock).mockResolvedValue({success:true})
})
afterEach(()=>{global.fetch=originalFetch})
it("uses the real uploader through all steps and creates only after explicit confirmation", async () => {
  const action = mount(); await reachMediaStep()
  const save = screen.getByRole("button",{name:"Create Product"}); expect(save).toBeDisabled()
  fireEvent.change(screen.getByLabelText("Choose image"), {target:{files:[new File(["picture"],"rice.png",{type:"image/png"})]}})
  await waitFor(() => expect(save).toBeEnabled())
  expect(global.fetch).toHaveBeenCalledWith("/api/media/upload",expect.objectContaining({method:"POST",body:expect.any(FormData),signal:expect.any(AbortSignal),credentials:"same-origin",headers:{"x-organization-id":"org-1"}}))
  expect(screen.getByRole("img",{name:"Upload Product Image"})).toHaveAttribute("src",imageUrl)
  expect(action).not.toHaveBeenCalled()
  fireEvent.click(save); fireEvent.click(save)
  await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
  expect((action.mock.calls[0][0] as FormData).get("imageUrls")).toBe(imageUrl)
})
it("recovers a failed upload without losing the item fields", async () => {
  mockUpload.mockResolvedValueOnce({success:false,error:"Unavailable"})
  const action=mount(); await reachMediaStep()
  fireEvent.change(screen.getByLabelText("Choose image"), {target:{files:[new File(["picture"],"rice.png",{type:"image/png"})]}})
  await screen.findByRole("button",{name:"Retry upload"})
  expect(screen.getByRole("button",{name:"Create Product"})).toBeDisabled()
  fireEvent.click(screen.getByRole("button",{name:"Retry upload"}))
  await waitFor(() => expect(screen.getByRole("button",{name:"Create Product"})).toBeEnabled())
  fireEvent.click(screen.getByRole("button",{name:"Create Product"}))
  await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
  expect((action.mock.calls[0][0] as FormData).get("nameEn")).toBe("Rice")
})
it("can reach media after disabling incomplete opening stock", async () => {
  mount(); await reachPricingStep()
  fireEvent.click(screen.getByRole("button",{name:"Next Step"})); await screen.findByRole("heading",{name:"Inventory Settings"})
  fireEvent.click(screen.getByRole("switch",{name:"Add Opening Stock"}))
  fireEvent.click(screen.getByRole("button",{name:"Next Step"}))
  await waitFor(() => expect(screen.getByRole("heading",{name:"Inventory Settings"})).toBeInTheDocument())
  fireEvent.click(screen.getByRole("switch",{name:"Add Opening Stock"}))
  fireEvent.click(screen.getByRole("button",{name:"Next Step"}))
  await screen.findByRole("heading",{name:"Product Media"})
})
it("blocks an invalid stock range and advances after correction without requiring the future image", async () => {
  mount(); await reachPricingStep(); fireEvent.click(screen.getByRole("button",{name:"Next Step"}))
  await screen.findByRole("heading",{name:"Inventory Settings"})
  fireEvent.change(screen.getByLabelText("Minimum Stock Level"),{target:{value:"10"}})
  fireEvent.change(screen.getByLabelText("Maximum Stock Level"),{target:{value:"5"}})
  fireEvent.click(screen.getByRole("button",{name:"Next Step"}))
  await screen.findAllByText("Maximum stock level must be greater than or equal to minimum stock level")
  fireEvent.change(screen.getByLabelText("Maximum Stock Level"),{target:{value:"20"}})
  fireEvent.click(screen.getByRole("button",{name:"Next Step"}))
  await screen.findByRole("heading",{name:"Product Media"})
})
it("ignores a late cancelled upload and cleans up its unclaimed object", async () => {
  let finish: (value: unknown) => void = () => {}
  mockUpload.mockImplementationOnce(() => new Promise(resolve => { finish=resolve }))
  const action=mount(); await reachMediaStep()
  fireEvent.change(screen.getByLabelText("Choose image"),{target:{files:[new File(["picture"],"rice.png",{type:"image/png"})]}})
  fireEvent.click(await screen.findByRole("button",{name:"Cancel upload"}))
  expect((global.fetch as jest.Mock).mock.calls[0][1].signal.aborted).toBe(true)
  finish({success:true,url:imageUrl})
  await waitFor(() => expect(deletePhoto).toHaveBeenCalledWith(imageUrl,"org-1"))
  expect(screen.getByRole("button",{name:"Create Product"})).toBeDisabled(); expect(action).not.toHaveBeenCalled()
})
it("recovers from a timed-out upload without permitting creation", async () => {
  const action=mount(); await reachMediaStep()
  const originalTimeout=global.setTimeout
  let expire=()=>{}
  const timer=jest.spyOn(global,"setTimeout").mockImplementation(((callback: () => void, delay: number, ...args: unknown[])=>{
    if(delay===90000) expire=callback
    return originalTimeout(callback,delay,...args)
  }) as typeof setTimeout)
  mockUpload.mockImplementationOnce(()=>new Promise(()=>{}))
  try {
    fireEvent.change(screen.getByLabelText("Choose image"),{target:{files:[new File(["picture"],"rice.png",{type:"image/png"})]}})
    act(()=>expire())
    expect((global.fetch as jest.Mock).mock.calls[0][1].signal.aborted).toBe(true)
    expect(screen.getByRole("alert")).toHaveTextContent("timed out")
    expect(screen.getByRole("button",{name:"Create Product"})).toBeDisabled()
    expect(action).not.toHaveBeenCalled()
  } finally {timer.mockRestore()}
})
it("retains the uploaded picture after a save failure and allows an explicit retry",async()=>{
  const action=mount(); action.mockResolvedValueOnce({success:false,error:"Please retry"})
  await reachMediaStep()
  fireEvent.change(screen.getByLabelText("Choose image"),{target:{files:[new File(["picture"],"rice.png",{type:"image/png"})]}})
  const save=await screen.findByRole("button",{name:"Create Product"})
  await waitFor(()=>expect(save).toBeEnabled())
  fireEvent.click(save)
  await waitFor(()=>expect(mockNotifications.error).toHaveBeenCalledWith("Creation Failed","Please retry"))
  expect(screen.getByRole("img",{name:"Upload Product Image"})).toHaveAttribute("src",imageUrl)
  await waitFor(()=>expect(save).toBeEnabled())
  fireEvent.click(save)
  await waitFor(()=>expect(action).toHaveBeenCalledTimes(2))
  expect(mockUpload).toHaveBeenCalledTimes(1)
})
