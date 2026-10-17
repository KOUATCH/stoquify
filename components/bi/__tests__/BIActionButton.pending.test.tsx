import { render, screen } from "@testing-library/react"
import { useLinkStatus } from "next/link"
import { BIActionButton } from "../BIActionButton"

jest.mock("next/link", () => ({ ...jest.requireActual("next/link"), useLinkStatus: jest.fn() }))
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("lucide-react", () => new Proxy({ __esModule: true }, {
  get: (_target, key) => key === "__esModule" ? true : function Icon() { return <svg aria-hidden="true" /> },
}))

it.each([["en", "Opening…"], ["fr", "Ouverture…"]])("shows real router progress without losing destination or context (%s)", (locale, progress) => {
  const mockStatus = useLinkStatus as jest.Mock
  mockStatus.mockReturnValue({ pending: true })
  const action = { label: "Open", href: "/dashboard/purchase-orders", disabled: false, disabledReason: null }
  const view = render(<BIActionButton action={action} locale={locale} context="Supplier delay" />)
  expect(screen.getByRole("status")).toHaveTextContent(progress)
  expect(screen.getByRole("link")).toHaveAttribute("href", `/${locale}/dashboard/purchase-orders`)
  expect(screen.getByRole("link")).toHaveTextContent("Supplier delay")
  mockStatus.mockReturnValue({ pending: false })
  view.rerender(<BIActionButton action={action} locale={locale} context="Supplier delay" />)
  expect(screen.queryByRole("status")).not.toBeInTheDocument()
})
