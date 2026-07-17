import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"

import Page, { dynamic } from "../page"

jest.mock("@/components/Forms/ResetPasswordForm", () => ({
  __esModule: true,
  default: function ResetPasswordFormMock() {
    return <div data-testid="reset-password-form" />
  },
}))

jest.mock("@/components/reusable-ui/grid-background", () => ({
  GridBackground: ({ children }: { children: ReactNode }) => (
    <div data-testid="grid-background">{children}</div>
  ),
}))

describe("reset password page", () => {
  it("is dynamic and renders the client reset form inside the auth shell", () => {
    expect(dynamic).toBe("force-dynamic")

    render(<Page />)

    expect(screen.getByTestId("grid-background")).toBeInTheDocument()
    expect(screen.getByTestId("reset-password-form")).toBeInTheDocument()
  })
})