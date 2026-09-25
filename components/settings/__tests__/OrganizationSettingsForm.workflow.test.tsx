import type { ReactNode, SVGProps } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import OrganizationSettingsForm from "../OrganizationSettingsForm"
import { organizationQueryKeys } from "@/hooks/useOrganizationSettings"
import { getOrganizationSettings, updateOrganizationSettings } from "@/actions/organization/organization-settings-actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
jest.mock("@/actions/organization/organization-settings-actions", () => ({ getOrganizationSettings: jest.fn(), updateOrganizationSettings: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ success: jest.fn(), error: jest.fn() }) }))
jest.mock("@/i18n/navigation", () => ({ Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }))
jest.mock("lucide-react", () => new Proxy({ __esModule: true }, { get(target, prop: string) { if (prop in target) return target[prop as keyof typeof target]; return (props: SVGProps<SVGSVGElement>) => <svg {...props} /> } }))
const original = { id: "org-1", name: "Saved company", slug: "saved-company", currency: "XAF", timezone: "Africa/Douala", defaultLocale: "EN", address: "Original address", industry: "Retail", country: "CM", state: "", fiscalYearStart: "01-01", inventoryStartDate: null, isActive: true, createdAt: new Date("2026-09-01"), updatedAt: new Date("2026-09-01"), canUpdate: true }
const words = { en: { name: "Organization name", review: /Review Confirm/, save: "Save organization", load: "Load latest for comparison", keep: "Keep my edits and review", password: "Current password", verify: "Confirm identity", identity: /Identity Legal/ }, fr: { name: "Nom de l'organisation", review: /Revue Confirmer/, save: "Enregistrer l'organisation", load: "Charger la dernière version pour comparer", keep: "Conserver mes modifications et vérifier", password: "Mot de passe actuel", verify: "Confirmer mon identité", identity: /Identité Nom/ } }
function mount(locale: "en" | "fr", data = original) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 3, retryDelay: 0 } } })
  client.setQueryData(organizationQueryKeys.settings(data.id), data)
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { ...render(<OrganizationSettingsForm organizationId={data.id} locale={locale} />, { wrapper }), client }
}
beforeEach(() => {
  jest.clearAllMocks()
  ;(getOrganizationSettings as jest.Mock).mockResolvedValue({ success: true, data: original })
})
it.each(["en", "fr"] as const)("preserves the %s draft across background refresh and explicitly compares, authenticates and saves only edited fields", async locale => {
  const { client } = mount(locale), t = words[locale]
  fireEvent.change(await screen.findByLabelText(t.name), { target: { value: "My unsaved company" } })
  const latest = { ...original, address: "Concurrent saved address", updatedAt: new Date("2026-09-02") }
  ;(getOrganizationSettings as jest.Mock).mockResolvedValue({ success: true, data: latest })
  await act(async () => { client.setQueryData(organizationQueryKeys.settings("org-1"), latest) })
  expect(screen.getByLabelText(t.name)).toHaveValue("My unsaved company")
  fireEvent.click(await screen.findByRole("button", { name: t.load }))
  await screen.findByRole("button", { name: t.keep })
  fireEvent.click(screen.getByRole("button", { name: t.keep }))
  expect(screen.getByText("Concurrent saved address")).toBeVisible()
  ;(updateOrganizationSettings as jest.Mock).mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED" })
  fireEvent.click(screen.getByRole("button", { name: t.save }))
  await screen.findByLabelText(t.password)
  expect(screen.getByRole("alert")).toHaveFocus()
  expect(screen.getByRole("button", { name: t.save })).toBeDisabled()
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true, data: { method: "password", assuranceLevel: 1, verifiedAt: new Date().toISOString() } })
  fireEvent.change(screen.getByLabelText(t.password), { target: { value: "Local!Test-Password-7" } })
  fireEvent.click(screen.getByRole("button", { name: t.verify }))
  await waitFor(() => expect(screen.queryByLabelText(t.password)).not.toBeInTheDocument())
  const saved = { ...latest, name: "My unsaved company", updatedAt: new Date("2026-09-03") }
  ;(updateOrganizationSettings as jest.Mock).mockResolvedValueOnce({ success: true, data: saved })
  ;(getOrganizationSettings as jest.Mock).mockResolvedValue({ success: true, data: saved })
  fireEvent.click(screen.getByRole("button", { name: t.save }))
  await waitFor(() => expect(screen.getByRole("button", { name: t.save })).toBeDisabled())
  expect(updateOrganizationSettings).toHaveBeenLastCalledWith("org-1", { name: "My unsaved company" }, latest.updatedAt.toISOString())
  expect(stepUpWithPasswordAction).toHaveBeenCalledTimes(1)
  expect(updateOrganizationSettings).toHaveBeenCalledTimes(2); client.clear()
})
it.each(["en", "fr"] as const)("shows a read-only %s profile without a save action", async locale => {
  const { client } = mount(locale, { ...original, canUpdate: false }), t = words[locale]
  expect(await screen.findByLabelText(t.name)).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: t.review }))
  expect(screen.queryByRole("button", { name: t.save })).not.toBeInTheDocument()
  expect(updateOrganizationSettings).not.toHaveBeenCalled(); client.clear()
})
it("keeps the draft and prevents duplicate or blind retry after a lost save response", async () => {
  let reject!: (reason: Error) => void
  ;(updateOrganizationSettings as jest.Mock).mockReturnValue(new Promise((_, failure) => { reject = failure }))
  const { client } = mount("en"), t = words.en
  fireEvent.change(await screen.findByLabelText(t.name), { target: { value: "Retained draft" } })
  fireEvent.click(screen.getByRole("button", { name: t.review }))
  fireEvent.click(screen.getByRole("button", { name: t.save })); fireEvent.click(screen.getByRole("button", { name: t.save }))
  await waitFor(() => expect(updateOrganizationSettings).toHaveBeenCalledTimes(1))
  await act(async () => reject(new Error("private transport detail")))
  expect(screen.getByRole("alert")).toHaveFocus()
  expect(screen.getByRole("button", { name: t.save })).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: t.identity }))
  expect(screen.getByLabelText(t.name)).toHaveValue("Retained draft"); client.clear()
})
it("does not carry an unsaved profile across an organization switch", async () => {
  const { client, rerender } = mount("en")
  fireEvent.change(await screen.findByLabelText(words.en.name), { target: { value: "Private old draft" } })
  client.setQueryData(organizationQueryKeys.settings("org-2"), { ...original, id: "org-2", name: "New organization" })
  rerender(<OrganizationSettingsForm organizationId="org-2" locale="en" />)
  expect(await screen.findByLabelText(words.en.name)).toHaveValue("New organization"); client.clear()
})
