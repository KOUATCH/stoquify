import type { ReactNode } from "react"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useRegisterWorkflow } from "../useRegisterWorkflow"
import { registerUser } from "@/actions/auth"
import type { RegisterUserProps } from "@/types/types"
const mockSuccess = jest.fn(), mockError = jest.fn()
jest.mock("@/actions/auth", () => ({ registerUser: jest.fn() }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ success: mockSuccess, error: mockError }) }))
const input: RegisterUserProps = { firstName: "Synthetic", lastName: "Owner", email: "synthetic@example.invalid", phone: "+237600000029", companyName: "Synthetic Retail", companySize: "1-10", password: "Local!Credential-79", confirmPassword: "Local!Credential-79", termsAccepted: true }
function mount(locale: "en" | "fr") { const client = new QueryClient({ defaultOptions: { mutations: { retry: 2, retryDelay: 0 } } }), wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>; return { ...renderHook(() => useRegisterWorkflow(locale), { wrapper }), client } }
beforeEach(() => jest.clearAllMocks())
it.each(["en", "fr"] as const)("preserves structured %s rejection and does not retry or claim creation", async locale => {
  ;(registerUser as jest.Mock).mockResolvedValue({ success: false, code: "VALIDATION_ERROR", error: "private raw detail", fieldErrors: { termsAccepted: ["private raw detail"] } })
  const { result, client } = mount(locale)
  await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toMatchObject({ code: "VALIDATION_ERROR", fieldErrors: { termsAccepted: ["private raw detail"] } }) })
  expect(registerUser).toHaveBeenCalledTimes(1); expect(mockSuccess).not.toHaveBeenCalled(); expect(JSON.stringify(mockError.mock.calls)).not.toContain("private raw detail"); client.clear()
})
it.each(["en", "fr"] as const)("does not infer %s workspace creation from an incomplete success or network failure", async locale => {
  const { result, client } = mount(locale)
  for (const reply of [undefined, { userId: "user" }, { userId: "user", organizationId: "org", verificationRequired: true, email: "foreign@example.invalid" }]) {
    ;(registerUser as jest.Mock).mockResolvedValue({ success: true, data: reply })
    await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toMatchObject({ code: "OUTCOME_UNCONFIRMED" }) })
  }
  ;(registerUser as jest.Mock).mockRejectedValue(new Error("private transport detail"))
  await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toMatchObject({ code: "OUTCOME_UNCONFIRMED" }) })
  expect(registerUser).toHaveBeenCalledTimes(4); expect(mockSuccess).not.toHaveBeenCalled(); expect(JSON.stringify(mockError.mock.calls)).not.toContain("private transport detail"); client.clear()
})
it("confirms only a complete verification handoff for the submitted account", async () => {
  ;(registerUser as jest.Mock).mockResolvedValue({ success: true, data: { userId: "user", organizationId: "org", verificationRequired: true, email: input.email } })
  const { result, client } = mount("en")
  await act(async () => { await expect(result.current.mutateAsync(input)).resolves.toMatchObject({ success: true }) })
  expect(mockSuccess).toHaveBeenCalledTimes(1); client.clear()
})
it.each(["en", "fr"] as const)("explains the actual %s retry interval without automatic resubmission", async locale => {
  ;(registerUser as jest.Mock).mockResolvedValue({ success: false, code: "RATE_LIMITED", retryAfterSeconds: 121 })
  const { result, client } = mount(locale)
  await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toMatchObject({ code: "RATE_LIMITED", message: expect.stringContaining("3 minutes") }) })
  expect(registerUser).toHaveBeenCalledTimes(1); expect(mockSuccess).not.toHaveBeenCalled(); client.clear()
})
