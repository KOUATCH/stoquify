import { useState } from "react"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { POSCheckoutShell } from "../POSCheckoutShell"

let desktop = true
let mediaListeners: Set<(event: MediaQueryListEvent) => void>

function setDesktop(matches: boolean) {
  desktop = matches
  act(() => {
    mediaListeners.forEach(listener => listener({ matches } as MediaQueryListEvent))
  })
}

function Harness({ locale = "en", initialOpen = false, onReturnToSearch, onCloseAutoFocus }: { locale?: string; initialOpen?: boolean; onReturnToSearch?: () => void; onCloseAutoFocus?: (event: Event) => void }) {
  const [open, setOpen] = useState(initialOpen)
  const [quantity, setQuantity] = useState("3")
  return (
    <POSCheckoutShell locale={locale} lineCount={2} formattedTotal="FCFA 4,500" open={open} onOpenChange={setOpen} onReturnToSearch={onReturnToSearch} onCloseAutoFocus={onCloseAutoFocus}>
      <div data-testid="checkout-content" className="flex min-h-0 flex-col">
        <label htmlFor="quantity">Quantity</label>
        <input id="quantity" value={quantity} onChange={event => setQuantity(event.target.value)} />
        <button type="button" disabled>Charge FCFA 4,500</button>
      </div>
    </POSCheckoutShell>
  )
}

beforeEach(() => {
  desktop = true
  mediaListeners = new Set()
  window.matchMedia = jest.fn(() => ({
      get matches() { return desktop },
      media: "(min-width: 1280px)",
      onchange: null,
      addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => mediaListeners.add(listener),
      removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => mediaListeners.delete(listener),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))
})

it("shows one desktop checkout without a tablet summary", () => {
  render(<Harness />)
  expect(screen.getByTestId("pos-desktop-checkout")).toBeInTheDocument()
  expect(screen.getAllByTestId("checkout-content")).toHaveLength(1)
  expect(screen.queryByTestId("pos-cart-summary")).not.toBeInTheDocument()
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Charge FCFA 4,500" })).toBeDisabled()
})

it("opens tablet checkout from a persistent summary and restores trigger focus when closed", async () => {
  desktop = false
  render(<Harness />)
  const summary = screen.getByTestId("pos-cart-summary")
  expect(within(summary).getByText("2 lines")).toBeInTheDocument()
  expect(within(summary).getByText("FCFA 4,500")).toBeInTheDocument()
  expect(screen.queryByTestId("checkout-content")).not.toBeInTheDocument()
  const trigger = screen.getByRole("button", { name: "View cart" })
  expect(trigger).toHaveAttribute("data-pos-cart-trigger")
  fireEvent.click(trigger)
  expect(await screen.findByRole("dialog", { name: "Cart and checkout" })).toBeInTheDocument()
  expect(screen.getAllByTestId("checkout-content")).toHaveLength(1)
  fireEvent.click(screen.getByRole("button", { name: "Close cart" }))
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  await waitFor(() => expect(trigger).toHaveFocus())
})

it("preserves parent-owned cart edits while changing between desktop and tablet", async () => {
  render(<Harness initialOpen />)
  fireEvent.change(screen.getByRole("textbox", { name: "Quantity" }), { target: { value: "8" } })
  setDesktop(false)
  expect(await screen.findByRole("dialog", { name: "Cart and checkout" })).toBeInTheDocument()
  expect(screen.getAllByTestId("checkout-content")).toHaveLength(1)
  expect(screen.getByRole("textbox", { name: "Quantity" })).toHaveValue("8")
  setDesktop(true)
  expect(screen.getByTestId("pos-desktop-checkout")).toBeInTheDocument()
  expect(screen.getAllByTestId("checkout-content")).toHaveLength(1)
  expect(screen.getByRole("textbox", { name: "Quantity" })).toHaveValue("8")
})

it("uses French checkout labels and returns explicitly to scanning", async () => {
  desktop = false
  const onReturnToSearch = jest.fn()
  render(<Harness locale="fr" initialOpen onReturnToSearch={onReturnToSearch} />)
  expect(screen.getByRole("dialog", { name: "Panier et paiement" })).toBeInTheDocument()
  expect(within(screen.getByTestId("pos-cart-summary")).getByText("2 lignes")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Continuer la saisie" }))
  await waitFor(() => expect(onReturnToSearch).toHaveBeenCalledTimes(1))
})

it("lets recovery restore focus instead of returning to the summary trigger", async () => {
  desktop = false
  const onCloseAutoFocus = jest.fn((event: Event) => {
    event.preventDefault()
    document.getElementById("recovery-focus-target")?.focus()
  })
  render(<>
    <button id="recovery-focus-target" type="button">Review recovered sale</button>
    <Harness initialOpen onCloseAutoFocus={onCloseAutoFocus} />
  </>)
  fireEvent.click(screen.getByRole("button", { name: "Close cart" }))
  await waitFor(() => expect(onCloseAutoFocus).toHaveBeenCalledTimes(1))
  expect(onCloseAutoFocus.mock.calls[0][0].defaultPrevented).toBe(true)
  await waitFor(() => expect(screen.getByRole("button", { name: "Review recovered sale" })).toHaveFocus())
})

it("keeps desktop checkout above the visible shortcut footer", () => {
  const originalHeight = Object.getOwnPropertyDescriptor(window, "innerHeight")
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 800 })
  const header = document.createElement("header")
  header.setAttribute("data-pos-header", "")
  const shortcuts = document.createElement("div")
  shortcuts.setAttribute("data-pos-shortcuts", "")
  shortcuts.style.position = "fixed"
  document.body.append(header, shortcuts)
  const bounds = (top: number, height: number) => ({ x: 0, y: top, top, bottom: top + height, left: 0, right: 380, width: 380, height, toJSON: () => ({}) })
  const rects = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this === header) return bounds(0, 80)
    if (this === shortcuts) return bounds(767, 33)
    if (this.tagName === "ASIDE") return bounds(100, 500)
    return bounds(0, 0)
  })
  try {
    render(<Harness />)
    const checkout = screen.getByTestId("pos-desktop-checkout")
    const effectiveTop = Math.max(100, Number.parseFloat(checkout.style.top))
    expect(effectiveTop + Number.parseFloat(checkout.style.height)).toBeLessThanOrEqual(755)
  } finally {
    rects.mockRestore()
    header.remove()
    shortcuts.remove()
    if (originalHeight) Object.defineProperty(window, "innerHeight", originalHeight)
  }
})

