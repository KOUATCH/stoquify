import type { InputHTMLAttributes, SVGProps } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { VerifyV2Form } from "../VerifyV2Form"
import { resendVerificationCode } from "@/actions/users/resendVerificationCode"
import verifyOTP from "@/actions/users/verifyOtp"

jest.mock("@/actions/users/resendVerificationCode", () => ({ resendVerificationCode: jest.fn() }))
jest.mock("@/actions/users/verifyOtp", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/i18n/routing", () => ({ localizePath: (href: string, locale: string) => `/${locale}${href}` }))
jest.mock("lucide-react", () => new Proxy({ __esModule: true }, {
  get(target, prop: string) {
    if (prop in target) return target[prop as keyof typeof target]
    return (props: SVGProps<SVGSVGElement>) => <svg {...props} aria-hidden="true" />
  },
}))
const mockPush = jest.fn()
const mockError = jest.fn()
const mockSuccess = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ error: mockError, success: mockSuccess }) }))
// Test state/transport behavior here; the installed OTP component is exercised in browser evidence.
jest.mock("@/components/ui/input-otp", () => ({
  InputOTP: ({ value, onChange, children: _children, containerClassName: _container, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & { onChange: (value: string) => void; containerClassName?: string }) => <input {...props} value={value} onChange={(event) => onChange(event.target.value)} />,
  InputOTPGroup: () => null, InputOTPSeparator: () => null, InputOTPSlot: () => null,
}))

beforeEach(() => { jest.clearAllMocks(); (resendVerificationCode as jest.Mock).mockResolvedValue({ status: 200 }) })

describe("verification recovery", () => {
  it.each([
    ["en", "Registration email", "Request verification code", /Request received/],
    ["fr", "Email d’inscription", "Demander un code de vérification", /Demande reçue/],
  ] as const)("offers honest resend recovery in %s", async (locale, label, button, confirmation) => {
    render(<VerifyV2Form locale={locale} userId="user-1" email="" />)
    expect(screen.queryByText(/We sent|Nous avons envoye|The account is active/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(label), { target: { value: "owner@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: button }))
    await waitFor(() => expect(resendVerificationCode).toHaveBeenCalledWith("user-1", "owner@example.com"))
    expect(await screen.findByText(confirmation)).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("prevents overlapping resend requests and preserves code and email after a network failure", async () => {
    let rejectRequest!: (error: Error) => void
    ;(resendVerificationCode as jest.Mock).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRequest = reject }))
    render(<VerifyV2Form locale="en" userId="user-1" email="owner@example.com" />)
    fireEvent.change(screen.getByLabelText("Verification code"), { target: { value: "654321" } })
    const form = screen.getByRole("button", { name: "Request verification code" }).closest("form")!
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(resendVerificationCode).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Verify and continue" })).toBeDisabled()
    rejectRequest(new Error("network"))
    await waitFor(() => expect(mockError).toHaveBeenCalled())
    expect(screen.getByLabelText("Verification code")).toHaveValue("654321")
    expect(screen.getByLabelText("Registration email")).toHaveValue("owner@example.com")
    expect(screen.getByRole("button", { name: "Request verification code" })).toBeEnabled()
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("announces an invalid code and keeps the user on the form", async () => {
    ;(verifyOTP as jest.Mock).mockResolvedValue({ status: 403 })
    render(<VerifyV2Form locale="en" userId="user-1" email="owner@example.com" />)
    fireEvent.change(screen.getByLabelText("Verification code"), { target: { value: "654321" } })
    fireEvent.click(screen.getByRole("button", { name: "Verify and continue" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid or expired code")
    expect(screen.getByLabelText("Verification code")).toHaveAttribute("aria-invalid", "true")
    expect(mockPush).not.toHaveBeenCalled()
  })
})
