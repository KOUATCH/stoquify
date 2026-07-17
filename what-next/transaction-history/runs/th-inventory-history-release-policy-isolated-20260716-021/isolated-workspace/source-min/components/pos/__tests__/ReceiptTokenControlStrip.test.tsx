import type { SVGProps } from "react"
import { fireEvent, render, screen } from "@testing-library/react"

jest.mock("lucide-react", () => ({
  Receipt: (props: SVGProps<SVGSVGElement>) => <svg data-testid="receipt-icon" {...props} />,
  ShieldCheck: (props: SVGProps<SVGSVGElement>) => <svg data-testid="shield-icon" {...props} />,
  Trash2: (props: SVGProps<SVGSVGElement>) => <svg data-testid="trash-icon" {...props} />,
}))

import { ReceiptTokenControlStrip, type ReceiptTokenControlItem } from "../ReceiptTokenControlStrip"

const labels = {
  title: "Public receipt access",
  loading: "Checking receipt links",
  empty: "No public receipt link recorded",
  active: "Active",
  revoked: "Revoked",
  expired: "Expired",
  accessed: (count: number) => `${count} accesses`,
  expires: (date: string) => `Expires ${date}`,
  revoke: "Revoke",
}

function token(overrides: Partial<ReceiptTokenControlItem> = {}): ReceiptTokenControlItem {
  return {
    id: "token-row-active-12345678",
    tokenIdSuffix: "12345678",
    salesOrderId: "sale-1",
    status: "ACTIVE",
    isActive: true,
    issuedAt: "2026-07-03T12:00:00.000Z",
    expiresAt: "2026-08-02T12:00:00.000Z",
    lastAccessedAt: null,
    accessCount: 2,
    revokedAt: null,
    revocationReason: null,
    ...overrides,
  }
}

describe("ReceiptTokenControlStrip", () => {
  it("renders active and revoked token metadata without token secrets", () => {
    const onRevoke = jest.fn()

    render(
      <ReceiptTokenControlStrip
        tokens={[
          token(),
          token({
            id: "token-row-revoked-87654321",
            tokenIdSuffix: "87654321",
            status: "REVOKED",
            isActive: false,
            revokedAt: "2026-07-03T12:05:00.000Z",
            revocationReason: "operator-revoked-from-pos",
          }),
        ]}
        labels={labels}
        onRevoke={onRevoke}
      />,
    )

    expect(screen.getByText("Public receipt access")).toBeInTheDocument()
    expect(screen.getByText("#12345678")).toBeInTheDocument()
    expect(screen.getByText("#87654321")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText("Revoked")).toBeInTheDocument()
    expect(screen.getAllByText("2 accesses")).toHaveLength(2)
    expect(screen.queryByText(/tokenHash/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/jtiHash/i)).not.toBeInTheDocument()

    const activeButton = screen.getByRole("button", { name: "Revoke #12345678" })
    const revokedButton = screen.getByRole("button", { name: "Revoke #87654321" })
    expect(activeButton).toBeEnabled()
    expect(revokedButton).toBeDisabled()

    fireEvent.click(activeButton)
    expect(onRevoke).toHaveBeenCalledWith("token-row-active-12345678")
  })

  it("renders loading and empty states", () => {
    const onRevoke = jest.fn()
    const { rerender } = render(
      <ReceiptTokenControlStrip tokens={[]} isLoading labels={labels} onRevoke={onRevoke} />,
    )

    expect(screen.getByText("Checking receipt links")).toBeInTheDocument()

    rerender(<ReceiptTokenControlStrip tokens={[]} labels={labels} onRevoke={onRevoke} />)

    expect(screen.getByText("No public receipt link recorded")).toBeInTheDocument()
  })
})
