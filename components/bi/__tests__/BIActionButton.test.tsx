import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
import { BIActionButton } from "../BIActionButton"
import { BIActionPriorityBoard } from "../BIActionPriorityBoard"

jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("lucide-react", () => new Proxy({ __esModule: true }, {
  get: (_target, key) => key === "__esModule" ? true : function Icon() { return <svg aria-hidden="true" /> },
}))

const action = { label: "Open", href: "/dashboard/finance/payments?location=west&status=open&status=pending#exceptions", disabled: false, disabledReason: null }

it.each(["en", "fr"])("retains every query and anchor while localizing an unprefixed handoff (%s)", locale => {
  render(<BIActionButton action={action} locale={locale} context="Payment suspense" />)
  const link = screen.getByRole("link", { name: locale === "fr" ? "Ouvrir : Payment suspense" : "Open: Payment suspense" })
  expect(link).toHaveAttribute("href", `/${locale}${action.href}`)
  link.focus()
  expect(link).toHaveFocus()
})

it.each(["/fr/dashboard/finance?period=2026-10#review", "https://example.test/help#review", "#evidence"])("preserves an explicit destination: %s", href => {
  render(<BIActionButton action={{ ...action, href, label: "Review evidence" }} locale="en" context="Other heading" />)
  expect(screen.getByRole("link", { name: "Review evidence" })).toHaveAttribute("href", href)
})

it.each([false, true])("explains a disabled action visibly and by accessible description (primary=%s)", primary => {
  render(<BIActionButton primary={primary} action={{ ...action, disabled: true, disabledReason: "Approval access is required." }} />)
  const button = screen.getByRole("button", { name: "Open" })
  expect(button).toBeDisabled()
  expect(button).toHaveAccessibleDescription("Approval access is required.")
  expect(screen.getByText("Approval access is required.")).toBeVisible()
  expect(screen.queryByRole("link")).not.toBeInTheDocument()
})

it.each(["", "   "])("does not navigate to the current page when the destination is missing (%j)", href => {
  render(<BIActionButton action={{ ...action, href }} locale="fr" />)
  expect(screen.getByRole("button", { name: "Ouvrir" })).toBeDisabled()
  expect(screen.getByRole("button")).toHaveAccessibleDescription("Cette action est indisponible pour le moment.")
  expect(screen.queryByRole("link")).not.toBeInTheDocument()
})

it("gives repeated generic actions distinct names and associates each disabled reason with its own control", () => {
  render(<>
    <BIActionButton action={{ ...action, disabled: true, disabledReason: "Cash review is locked." }} context="Cash review" />
    <BIActionButton action={{ ...action, disabled: true, disabledReason: "Close review is locked." }} context="Close review" />
  </>)
  expect(screen.getByRole("button", { name: "Open: Cash review" })).toHaveAccessibleDescription("Cash review is locked.")
  expect(screen.getByRole("button", { name: "Open: Close review" })).toHaveAccessibleDescription("Close review is locked.")
})

it("integrates with the action queue without turning disabled items into links or altering the ranking", () => {
  render(<BIActionPriorityBoard locale="fr" items={[
    { id: "cash", title: "Trésorerie à examiner", nextStep: "Consulter les preuves", severity: "critical", state: "blocked", actionLink: { ...action, id: "cash-link", requiredPermission: "finance.read", moduleSlug: "finance" } },
    { id: "close", title: "Clôture", nextStep: "Demander un accès", severity: "high", state: "permission_denied", actionLink: { ...action, id: "close-link", requiredPermission: "finance.read", moduleSlug: "finance", disabled: true, disabledReason: "Accès requis" } },
  ]} />)
  expect(screen.getAllByRole("heading", { level: 3 }).map(node => node.textContent)).toEqual(["Trésorerie à examiner", "Clôture"])
  expect(screen.getByRole("link", { name: "Ouvrir : Trésorerie à examiner" })).toHaveAttribute("href", `/fr${action.href}`)
  expect(screen.getByRole("button", { name: "Ouvrir : Clôture" })).toHaveAccessibleDescription("Accès requis")
})
