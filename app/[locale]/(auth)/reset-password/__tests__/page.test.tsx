import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"

import Page, { dynamic, metadata } from "../page"

jest.mock("@/components/Forms/ResetPasswordForm", () => ({
  __esModule: true,
  default: function ResetPasswordFormMock() {
    return <div data-testid="reset-password-form" />
  },
}))

jest.mock("@/i18n/routing", () => ({ pickLocale: (locale: string) => locale === "fr" ? "fr" : "en" }))
jest.mock("@/components/auth/v2/AuthV2Shell", () => ({
  AuthV2Shell: ({ children, locale, variant, alternatePath }: { children: ReactNode; locale: string; variant: string; alternatePath: string }) => (
    <div data-testid="auth-shell" data-locale={locale} data-variant={variant} data-alternate={alternatePath}>{children}</div>
  ),
}))

describe("reset password page", () => {
  it("is dynamic and keeps the current link across localized auth-shell navigation", async () => {
    expect(dynamic).toBe("force-dynamic")

    render(await Page({ params: Promise.resolve({ locale: "fr" }), searchParams: Promise.resolve({ email: "synthetic@example.invalid", token: "a".repeat(32) }) }))

    expect(screen.getByTestId("auth-shell")).toHaveAttribute("data-locale", "fr")
    expect(screen.getByTestId("auth-shell")).toHaveAttribute("data-variant", "recovery")
    expect(screen.getByTestId("auth-shell").getAttribute("data-alternate")).toContain("token=" + "a".repeat(32))
    expect(metadata.referrer).toBe("no-referrer")
    expect(screen.getByTestId("reset-password-form")).toBeInTheDocument()
  })
})
