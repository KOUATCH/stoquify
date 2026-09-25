import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { NotificationProvider } from "../NotificationProvider"
import { NotificationSystem, type NotificationData } from "../NotificationSystem"
import NotificationsSettingsClient from "@/app/[locale]/(dashboard)/dashboard/settings/notifications/NotificationsSettingsClient"
import { notificationCategoryLabel, notificationDateTime, notificationStateLabel } from "@/lib/notifications/presentation"

jest.unmock("@/components/notifications/NotificationProvider")
jest.mock("@/lib/error-handling/notification-integration", () => ({ setupErrorNotificationIntegration: () => ({ teardown: () => {} }) }))
let mockPathname = "/en/dashboard"
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }))
jest.mock("lucide-react", () => new Proxy({ __esModule: true }, { get(target, key) { if (key in target) return target[key as keyof typeof target]; return (props: Record<string, unknown>) => <svg aria-hidden="true" {...props} /> } }))
beforeEach(() => { localStorage.clear(); mockPathname = "/en/dashboard" })
afterEach(() => { jest.useRealTimers() })

it.each(["en", "fr"] as const)("%s local example never presents a business effect or external delivery", locale => {
  mockPathname = `/${locale}/dashboard/settings/notifications`
  const en = locale === "en", title = en ? "Local example — no business action" : "Exemple local — aucune action métier"
  render(<NotificationProvider><NotificationsSettingsClient locale={locale} /></NotificationProvider>)
  const main = within(screen.getByRole("region", { name: "Notifications", exact: true }))
  expect(main.queryByRole("button", { name: en ? "Payment update" : "Paiement", exact: true })).not.toBeInTheDocument()
  expect(main.queryByRole("button", { name: en ? "Security alert" : "Alerte securite", exact: true })).not.toBeInTheDocument()
  fireEvent.click(main.getByRole("button", { name: en ? "Show local example" : "Afficher un exemple local" }))
  const row = within(main.getByRole("article", { name: title }))
  expect(row.getByText(en ? "This is a display example. No payment, approval or external message was created." : "Ceci est un exemple d’affichage. Aucun paiement, aucune approbation et aucun message externe n’ont été créés.")).toBeInTheDocument()
  expect(row.queryByText(/^(Delivered|Livrée|Displayed in this tab|Affichée dans cet onglet)$/)).not.toBeInTheDocument()
  expect(screen.queryByRole("region", { name: en ? "Temporary notifications" : "Notifications temporaires" })).not.toBeInTheDocument()
})

it.each(["en", "fr"] as const)("%s acknowledges, filters and dismisses only the local messages", locale => {
  mockPathname = `/${locale}/dashboard/settings/notifications`
  const en = locale === "en", title = en ? "Local example — no business action" : "Exemple local — aucune action métier"
  render(<NotificationProvider><NotificationsSettingsClient locale={locale} /></NotificationProvider>)
  const main = within(screen.getByRole("region", { name: "Notifications", exact: true }))
  const sample = main.getByRole("button", { name: en ? "Show local example" : "Afficher un exemple local" })
  fireEvent.click(sample)
  fireEvent.click(main.getByRole("button", { name: `${en ? "Mark read" : "Marquer comme lue"}: ${title}` }))
  expect(main.getByText(en ? "Message marked read in this tab." : "Message marqué comme lu dans cet onglet.")).toHaveAttribute("role", "status")
  fireEvent.click(main.getByRole("button", { name: en ? "Unread" : "Non lues", exact: true }))
  expect(main.getByRole("button", { name: en ? "Unread" : "Non lues", exact: true })).toHaveAttribute("aria-pressed", "true")
  expect(main.queryByRole("article")).not.toBeInTheDocument()
  fireEvent.click(main.getByRole("button", { name: en ? "All" : "Toutes", exact: true }))
  expect(main.getByRole("article", { name: title })).toBeInTheDocument()
  fireEvent.click(main.getByRole("button", { name: `${en ? "Dismiss" : "Masquer"}: ${title}` }))
  expect(main.queryByRole("article")).not.toBeInTheDocument()
  fireEvent.click(sample); fireEvent.click(sample)
  expect(main.getAllByRole("article")).toHaveLength(2)
  fireEvent.click(main.getByRole("button", { name: en ? "Mark all read" : "Tout marquer comme lu", exact: true }))
  expect(main.getByRole("button", { name: en ? "Mark all read" : "Tout marquer comme lu", exact: true })).toBeDisabled()
  fireEvent.click(main.getByRole("button", { name: en ? "Dismiss all" : "Tout masquer", exact: true }))
  expect(main.queryByRole("article")).not.toBeInTheDocument()
  expect(main.getByText(en ? /Business records are unchanged/ : /Les données métier sont inchangées/)).toHaveAttribute("role", "status")
})

const notice: NotificationData = { id: "owned-example", type: "info", title: "A local notice", message: "Inspect the underlying record.", duration: 1000, createdAt: "2026-01-02T13:00:00Z", channel: "in_app", deliveryState: "delivered", category: "system" }
const tree = (notifications: NotificationData[], onRemove = jest.fn(), onMarkRead = jest.fn()) => <NotificationSystem notifications={notifications} onRemove={onRemove} onMarkRead={onMarkRead} soundEnabled={false} onToggleSound={jest.fn()} showSoundControl={false} />

it("localizes shared notice controls and pauses their expiry on the review page without duplicating the visible list", () => {
  jest.useFakeTimers(); mockPathname = "/fr/dashboard"
  const remove = jest.fn(), view = render(tree([notice], remove))
  const toast = within(screen.getByRole("region", { name: "Notifications temporaires" }))
  expect(toast.getByRole("button", { name: "Marquer comme lue", exact: true })).toBeInTheDocument()
  expect(toast.getByRole("button", { name: `Masquer: ${notice.title}` })).toBeInTheDocument()
  expect(toast.getByText("Affichée dans cet onglet")).toBeInTheDocument()
  mockPathname = "/fr/dashboard/settings/notifications"; view.rerender(tree([notice], remove))
  expect(screen.queryByRole("region", { name: "Notifications temporaires" })).not.toBeInTheDocument()
  act(() => jest.advanceTimersByTime(5000)); expect(remove).not.toHaveBeenCalled()
  mockPathname = "/fr/dashboard"; view.rerender(tree([notice], remove))
  act(() => jest.advanceTimersByTime(1000)); act(() => jest.advanceTimersByTime(250))
  expect(remove).toHaveBeenCalledWith(notice.id)
})

it("announces inserted and updated message text, but does not reannounce read-state changes", () => {
  const view = render(tree([]))
  view.rerender(tree([notice]))
  expect(screen.getByRole("status")).toHaveTextContent("A local notice. Inspect the underlying record.")
  view.rerender(tree([{ ...notice, readAt: "2026-01-02T13:01:00Z" }]))
  expect(screen.getByRole("status")).toHaveTextContent("A local notice. Inspect the underlying record.")
  view.rerender(tree([{ ...notice, type: "error", title: "Could not load", message: "Retry the read." }]))
  expect(screen.getByRole("status")).toBeEmptyDOMElement()
  expect(screen.getByRole("alert")).toHaveTextContent("Could not load. Retry the read.")
  view.rerender(tree([]))
  expect(screen.getByRole("status")).toBeEmptyDOMElement()
  expect(screen.getByRole("alert")).toBeEmptyDOMElement()
})

it.each(["pointer", "keyboard"])("keeps a timed notice while %s interaction is active", interaction => {
  jest.useFakeTimers()
  const remove = jest.fn(); render(tree([notice], remove))
  const card = screen.getByRole("group", { name: notice.title })
  if (interaction === "pointer") fireEvent.mouseEnter(card)
  else fireEvent.focus(card)
  act(() => jest.advanceTimersByTime(5000))
  expect(remove).not.toHaveBeenCalled()
  if (interaction === "pointer") fireEvent.mouseLeave(card)
  else fireEvent.blur(card, { relatedTarget: document.body })
  act(() => jest.advanceTimersByTime(1000))
  act(() => jest.advanceTimersByTime(250))
  expect(remove).toHaveBeenCalledWith(notice.id)
})

it("keeps focus on the message when its read button disappears", () => {
  const mark = jest.fn(), view = render(tree([notice], jest.fn(), mark))
  fireEvent.click(screen.getByRole("button", { name: "Mark read", exact: true }))
  expect(mark).toHaveBeenCalledWith(notice.id)
  view.rerender(tree([{ ...notice, readAt: "2026-01-02T13:01:00Z" }], jest.fn(), mark))
  expect(screen.queryByRole("button", { name: "Mark read", exact: true })).not.toBeInTheDocument()
  expect(screen.getByRole("group", { name: notice.title })).toHaveFocus()
})

it("resumes dismissal when removing a hovered read button suppresses mouseleave", () => {
  jest.useFakeTimers()
  const remove = jest.fn(), view = render(tree([notice], remove))
  fireEvent.mouseEnter(screen.getByRole("group", { name: notice.title }))
  view.rerender(tree([{ ...notice, readAt: "2026-01-02T13:01:00Z" }], remove))
  fireEvent.pointerMove(document.body)
  act(() => jest.advanceTimersByTime(1250))
  expect(remove).toHaveBeenCalledWith(notice.id)
})

it("keeps local display distinct from an explicitly external delivery state", () => {
  expect(notificationStateLabel(notice, "en")).toBe("Displayed in this tab")
  expect(notificationStateLabel({ ...notice, channel: "email" }, "en")).toBe("Delivered")
  expect(notificationStateLabel({ ...notice, deliveryState: "read" }, "fr")).toBe("Lue dans cet onglet")
  expect(notificationStateLabel({ ...notice, deliveryState: undefined }, "en")).toBe("")
})

it("does not invent the current time for malformed or missing dates, and localizes category names", () => {
  expect(notificationDateTime(undefined, "en")).toBe("Time unavailable")
  expect(notificationDateTime("bad", "fr")).toBe("Heure indisponible")
  expect(notificationCategoryLabel("purchase_order", "fr")).toBe("Commande fournisseur")
})
