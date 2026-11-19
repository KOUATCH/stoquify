/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { cleanup, render, screen } from "@testing-library/react"
import { AccountantInvitationDelivery } from "../AccountantInvitationDelivery"
import { getAccountantInvitationDeliveryAction } from "@/actions/accounting/firm-engagement.actions"
jest.mock("@/actions/accounting/firm-engagement.actions", () => ({ getAccountantInvitationDeliveryAction: jest.fn() }))
afterEach(cleanup)
it.each(["en", "fr"] as const)("separates failed delivery from acceptance in %s", async locale => {
  ;(getAccountantInvitationDeliveryAction as jest.Mock).mockResolvedValue({ success: true, data: { partial: false, rows: [
    { id: "invite", email: "s***@example.invalid", scope: "READ_ONLY", acceptance: "REQUESTED", delivery: "FAILED", attempts: 2, maxAttempts: 5, retryAt: "2027-01-01", expiresAt: "2028-01-01" },
  ] } })
  render(<AccountantInvitationDelivery locale={locale} />)
  await screen.findByText(/s\*\*\*@example.invalid/)
  expect(screen.getByText(/Delivery is not acceptance|Un envoi ne vaut pas acceptation/)).toBeInTheDocument()
  expect(screen.getByText(/Failed — retry scheduled|Échec — nouvelle tentative prévue/)).toBeInTheDocument()
  expect(screen.getByText(/Requested|Demandée/)).toBeInTheDocument()
})
