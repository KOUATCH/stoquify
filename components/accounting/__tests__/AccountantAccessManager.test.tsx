jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)
  return { Search: Icon, X: Icon, Check: Icon, ChevronDown: Icon, ChevronUp: Icon }
})

import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import {
  inviteAccountantAccessAction,
  revokeAccountantAccessAction,
} from "@/actions/accounting/accountant-access.actions"
import { AccountantAccessManager } from "@/components/accounting/AccountantAccessManager"
import type { AccountantAccessGrantDto } from "@/services/accounting/accountant-access.service"

const mockRefresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock("@/actions/accounting/accountant-access.actions", () => ({
  inviteAccountantAccessAction: jest.fn(),
  revokeAccountantAccessAction: jest.fn(),
}))

const mockGrantAction = inviteAccountantAccessAction as jest.Mock
const mockRevokeAction = revokeAccountantAccessAction as jest.Mock

function grant(
  id: string,
  status: AccountantAccessGrantDto["status"],
): AccountantAccessGrantDto {
  return {
    id,
    organizationId: "client-org",
    accountantUserId: "accountant-1",
    accountantFirmName: `Firm ${id}`,
    accountantFirmRegistrationNumber: null,
    role: "REVIEWER",
    status,
    consentGrantedById: "client-owner",
    consentGrantedAt: "2026-08-02T08:00:00.000Z",
    consentEvidenceHash: `sha256:${"a".repeat(64)}`,
    effectiveFrom: "2026-08-03T08:00:00.000Z",
    expiresAt: "2026-12-31T23:59:59.000Z",
    revokedById: status === "REVOKED" ? "client-owner" : null,
    revokedAt: status === "REVOKED" ? "2026-08-02T09:00:00.000Z" : null,
    revocationReason: status === "REVOKED" ? "Engagement ended" : null,
  }
}

describe("AccountantAccessManager", () => {
  afterEach(() => jest.restoreAllMocks())

  it("localizes grants without broadening revocation or changing expiry evidence", () => {
    render(<AccountantAccessManager locale="fr" initialGrants={[grant("active", "ACTIVE"), grant("scheduled", "SCHEDULED"), grant("expired", "EXPIRED"), grant("revoked", "REVOKED")]} />)
    expect(screen.getByRole("heading", { name: "Inviter un comptable" })).toBeInTheDocument()
    expect(screen.getByLabelText("Empreinte du justificatif de consentement signé")).toBeRequired()
    expect(screen.getByLabelText("Expiration")).toBeRequired()
    expect(screen.getByRole("option", { name: "Lecture seule" })).toHaveValue("READ_ONLY")
    expect(screen.getByRole("option", { name: "Réviseur" })).toHaveValue("REVIEWER")
    expect(screen.getByText("Planifié")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Révoquer" })).toHaveLength(2)
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Planifié" } })
    expect(screen.getByText("Firm scheduled")).toBeVisible()
    expect(screen.queryByText("Firm active")).not.toBeInTheDocument()
    expect(document.querySelector("time")).toHaveAttribute("datetime", "2026-12-31T23:59:59.000Z")
    expect(mockGrantAction).not.toHaveBeenCalled()
    expect(mockRevokeAction).not.toHaveBeenCalled()
  })

  it("reports an expiry race in French without claiming revocation", async () => {
    const prompt = jest.spyOn(window, "prompt").mockReturnValue("Fin du mandat")
    mockRevokeAction.mockResolvedValue({ success: true, data: grant("active", "EXPIRED") })
    render(<AccountantAccessManager locale="fr" initialGrants={[grant("active", "ACTIVE")]} />)
    fireEvent.click(screen.getByRole("button", { name: "Révoquer" }))
    expect(prompt).toHaveBeenCalledWith("Motif de révocation")
    expect(await screen.findByRole("status")).toHaveTextContent("L’accès comptable avait déjà expiré.")
    expect(screen.queryByText("Accès comptable révoqué.")).not.toBeInTheDocument()
    expect(mockRevokeAction).toHaveBeenCalledWith({ grantId: "active", reason: "Fin du mandat" })
  })
  beforeEach(() => {
    jest.clearAllMocks()
    mockGrantAction.mockResolvedValue({
      success: true,
      data: {
        outcome: "GRANTED",
        grant: grant("new", "SCHEDULED"),
        invite: null,
      },
      error: null,
      status: 200,
    })
    mockRevokeAction.mockResolvedValue({
      success: true,
      data: grant("scheduled", "REVOKED"),
      error: null,
      status: 200,
    })
  })

  it("offers revocation for active and scheduled grants only", () => {
    render(
      <AccountantAccessManager
        initialGrants={[
          grant("active", "ACTIVE"),
          grant("scheduled", "SCHEDULED"),
          grant("expired", "EXPIRED"),
          grant("revoked", "REVOKED"),
        ]}
      />,
    )

    expect(screen.getByText("Scheduled")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Revoke" })).toHaveLength(2)
  })

  it("submits browser-local consent times as absolute ISO instants", async () => {
    const effectiveFrom = "2026-08-03T10:30"
    const expiresAt = "2026-12-31T18:45"
    render(<AccountantAccessManager initialGrants={[]} />)

    fireEvent.change(screen.getByLabelText("Accountant email"), {
      target: { value: "accountant@example.test" },
    })
    fireEvent.change(screen.getByLabelText("Firm name"), {
      target: { value: "Trusted Ledger LLP" },
    })
    fireEvent.change(screen.getByLabelText("Effective from"), {
      target: { value: effectiveFrom },
    })
    fireEvent.change(screen.getByLabelText("Expires at"), {
      target: { value: expiresAt },
    })
    fireEvent.change(screen.getByLabelText("Signed consent evidence hash"), {
      target: { value: `sha256:${"b".repeat(64)}` },
    })
    fireEvent.click(screen.getByRole("button", { name: "Invite or grant access" }))

    await waitFor(() =>
      expect(mockGrantAction).toHaveBeenCalledWith(
        expect.objectContaining({
          effectiveFrom: new Date(effectiveFrom).toISOString(),
          expiresAt: new Date(expiresAt).toISOString(),
        }),
      ),
    )
  })
  it("reports an expiry race without claiming that revocation occurred", async () => {
    jest.spyOn(window, "prompt").mockReturnValue("Engagement ended")
    mockRevokeAction.mockResolvedValue({
      success: true,
      data: grant("active", "EXPIRED"),
      error: null,
      status: 200,
    })
    render(
      <AccountantAccessManager initialGrants={[grant("active", "ACTIVE")]} />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Revoke" }))

    expect(
      await screen.findByText("Accountant access had already expired."),
    ).toBeInTheDocument()
    expect(screen.queryByText("Accountant access revoked.")).not.toBeInTheDocument()
    expect(mockRefresh).toHaveBeenCalled()
  })

  it("renders the expiry as an exact machine-readable instant", () => {
    render(
      <AccountantAccessManager
        initialGrants={[grant("scheduled", "SCHEDULED")]}
      />,
    )

    const expiry = screen.getByText(
      (_content, element) => element?.tagName === "TIME",
    )
    expect(expiry).toHaveAttribute("datetime", "2026-12-31T23:59:59.000Z")
    expect(expiry).toHaveAttribute("title", "2026-12-31T23:59:59.000Z")
  })
})
