import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { SVGProps } from "react"
import { renderToString } from "react-dom/server"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import { COMMERCIAL_MODULE_SLUGS } from "@/services/modules/module-control-contracts"
import type { CompositionHistoryEntry, CompositionLifecycleOperation, ModuleCompositionData, ModuleCompositionPreview } from "@/services/modules/module-composition-contracts"
import { ModuleCompositionWorkbench } from "../ModuleCompositionWorkbench"

const mockPreview = jest.fn()
const mockApply = jest.fn()
const mockSave = jest.fn()
const mockReopen = jest.fn()
const mockGet = jest.fn()
const mockHistory = jest.fn()
const mockResume = jest.fn()
const mockStepUp = jest.fn()
let mockLocale = "en"

jest.mock("lucide-react", () => {
  const icons = new Map<string, (props: SVGProps<SVGSVGElement>) => React.JSX.Element>()
  return new Proxy({ __esModule: true }, { get(target, key: string) {
    if (key in target) return target[key as keyof typeof target]
    if (!icons.has(key)) icons.set(key, (props: SVGProps<SVGSVGElement>) => <svg {...props} />)
    return icons.get(key)
  } })
})

jest.mock("@/actions/modules/module-composition.actions", () => ({
  previewModuleCompositionAction: (...args: unknown[]) => mockPreview(...args),
  applyModuleCompositionAction: (...args: unknown[]) => mockApply(...args),
  saveModuleCompositionDraftAction: (...args: unknown[]) => mockSave(...args),
  reopenModuleCompositionAction: (...args: unknown[]) => mockReopen(...args),
  getModuleCompositionAction: (...args: unknown[]) => mockGet(...args),
  getModuleCompositionHistoryAction: (...args: unknown[]) => mockHistory(...args),
  resumeModuleCompositionAction: (...args: unknown[]) => mockResume(...args),
}))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: (...args: unknown[]) => mockStepUp(...args) }))
jest.mock("next-intl/routing", () => ({ defineRouting: (configuration: unknown) => configuration }))
jest.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  useTranslations: () => (key: string, values: Record<string, string | number> = {}) => {
    const source: unknown = mockLocale === "fr" ? fr.moduleComposition : en.moduleComposition
    const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], source)
    if (typeof value !== "string") throw new Error(`Missing translation: ${key}`)
    return value.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? name))
  },
}))

function fixture(): ModuleCompositionData {
  return {
    organizationId: "org-one", organizationName: "Example organization", revision: 3, activeRevision: 3, newWorkStoppedModules: [], setupInputs: {}, availablePayrollPeriods: [], availableComplianceAdapters: [], lifecycle: null, source: "durable", generatedAt: "2026-09-05T12:00:00.000Z",
    selectedModules: ["sales"], activeModules: ["dashboard", "settings", "administration", "sales"], preservedModules: [...COMMERCIAL_MODULE_SLUGS], limitations: [], drafts: [], history: [], historyNextCursor: null, historyAccessKey: "server-access-one",
    catalog: COMMERCIAL_MODULE_SLUGS.map(slug => ({
      slug, name: slug, description: slug, core: ["dashboard", "settings", "administration"].includes(slug), status: "available", owner: "Platform",
      dependencies: slug === "payment_reconciliation" ? ["finance", "accounting"].map(dependency => ({ moduleSlug: slug, dependsOnSlug: dependency as "finance" | "accounting", dependencyType: "required" as const, reason: "Required business connection" })) : [],
      grantStatus: "active", grantSource: "plan", eligible: true, available: true, selected: slug === "sales", required: false, canOpen: slug === "sales", href: slug === "sales" ? "/dashboard/sales" : null,
      setup: { status: "ready", code: "NO_EXTRA_WORKSPACE_SETUP" }, requirements: [],
    })),
    workspace: [{ moduleSlug: "sales", title: "Sales", href: "/dashboard/sales" }], retainedWorkspace: [], stopOptions: COMMERCIAL_MODULE_SLUGS.map(moduleSlug => ({ moduleSlug, supported: true, newWork: [], continuation: [] })),
  }
}

function preview(): ModuleCompositionPreview {
  return {
    revision: 3, previewHash: "server-bound-hash", selectedModules: ["sales", "finance", "accounting", "reports"], resolvedModules: ["dashboard", "settings", "administration", "sales", "finance", "accounting", "reports"],
    additions: ["finance", "accounting", "reports"], kept: ["sales"], removedFromWorkspace: [], preservedAccess: [...COMMERCIAL_MODULE_SLUGS], requiredBy: [], issues: [], canApply: true, commercial: { status: "no_purchase", messageCode: "EXISTING_ACCESS_ONLY" }, generatedAt: "2026-09-05T12:00:01.000Z",
    stopNewWorkModules: [], setupInputs: {}, setupScope: { payrollPeriod: null, complianceAdapter: null }, requirements: [], stopImpact: { stopNewWorkModules: [], newlyStopped: [], resumed: [], canStop: true, canRetain: true, policyHash: "policy-hash", evidenceHash: "evidence-hash", impacts: [] },
  }
}

function success<T>(data: T) { return { success: true, data, error: null, status: 200 } }
function failure(code = "INTERNAL_ERROR") { return { success: false, code, data: null, error: "Details deliberately not exposed by the component" } }

beforeEach(() => {
  jest.clearAllMocks()
  mockLocale = "en"
  sessionStorage.clear()
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: jest.fn(() => "11111111-1111-4111-8111-111111111111") })
  mockPreview.mockResolvedValue(success(preview()))
  mockGet.mockResolvedValue(success(fixture()))
})

it("keeps server-rendered commands disabled until the client can accept input", () => {
  const html = renderToString(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  const document = new DOMParser().parseFromString(html, "text/html")
  expect(document.querySelector('[data-testid="module-composition-workbench"]')?.getAttribute("data-hydrated")).toBe("false")
  expect(document.querySelector('[role="tab"]')?.hasAttribute("disabled")).toBe(true)
  expect(document.querySelector("#module-search")?.hasAttribute("disabled")).toBe(true)
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  expect(screen.getByTestId("module-composition-workbench")).toHaveAttribute("data-hydrated", "true")
  expect(screen.getByRole("tab", { name: "Change history" })).toBeEnabled()
})

it("uses contrasting retailer and service recipes without changing application state", async () => {
  const user = userEvent
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  await user.click(screen.getByRole("button", { name: /Retailer/ }))
  expect(screen.getByRole("checkbox", { name: "Inventory" })).toBeChecked()
  expect(screen.getByRole("checkbox", { name: "Point of sale" })).toBeChecked()
  await user.click(screen.getByRole("button", { name: /Service business/ }))
  expect(screen.getByRole("checkbox", { name: "Inventory" })).not.toBeChecked()
  expect(screen.getByRole("checkbox", { name: "Reports" })).toBeChecked()
  expect(mockApply).not.toHaveBeenCalled()
  expect(mockPreview).not.toHaveBeenCalled()
})

it("explains automatic dependencies and makes their checkbox non-removable", async () => {
  const user = userEvent
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  await user.click(screen.getByRole("checkbox", { name: "Payment reconciliation" }))
  expect(screen.getByRole("checkbox", { name: "Finance" })).toBeChecked()
  expect(screen.getByRole("checkbox", { name: "Finance" })).toBeDisabled()
  expect(within(screen.getByTestId("module-card-finance")).getByText(/To remove this connection/)).toBeVisible()
  expect(screen.getByRole("checkbox", { name: "Accounting" })).toBeDisabled()
})

it("searches localized outcomes and distinguishes empty search from a failed query", async () => {
  const user = userEvent
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  await user.type(screen.getByRole("textbox", { name: "Find a capability" }), "not-a-capability")
  expect(screen.getByRole("heading", { name: "No matching capabilities" })).toBeVisible()
  await user.click(screen.getByRole("button", { name: "Clear filters" }))
  expect(screen.getByRole("checkbox", { name: "Inventory" })).toBeVisible()
})

it("applies only a server-reviewed revision and preserves the idempotency key through fresh-auth", async () => {
  const user = userEvent
  const next = { ...fixture(), revision: 4, selectedModules: preview().selectedModules }
  mockApply.mockResolvedValueOnce(failure("FRESH_AUTH_REQUIRED")).mockResolvedValueOnce(success({ commandId: "command-1", state: "ACTIVE", revision: 4, alreadyApplied: false, issue: null, data: next }))
  mockStepUp.mockResolvedValue(success({}))
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  await user.click(screen.getByRole("button", { name: /Service business/ }))
  await user.click(screen.getByRole("button", { name: "Review configuration" }))
  const dialog = await screen.findByRole("dialog", { name: "Review your configuration" })
  expect(within(dialog).getByText(/does not revoke access/)).toBeVisible()
  await user.click(within(dialog).getByRole("button", { name: "Apply configuration" }))
  await user.type(await screen.findByLabelText("Current password"), "test-password-only")
  await user.click(screen.getByRole("button", { name: "Verify identity and apply" }))
  await waitFor(() => expect(mockApply).toHaveBeenCalledTimes(2))
  expect(mockApply.mock.calls[0][0]).toEqual(mockApply.mock.calls[1][0])
  expect(mockApply.mock.calls[0][0]).toEqual({ selectedModules: preview().selectedModules, stopNewWorkModules: [], setupInputs: {}, expectedRevision: 3, previewHash: "server-bound-hash", idempotencyKey: "11111111-1111-4111-8111-111111111111" })
  expect(mockStepUp).toHaveBeenCalledWith({ password: "test-password-only" })
  expect(await screen.findByRole("heading", { name: "Your working space" })).toBeVisible()
})

it("blocks apply when the authoritative preview has an unresolved condition", async () => {
  mockPreview.mockResolvedValue(success({ ...preview(), canApply: false, issues: [{ code: "ELIGIBILITY_REQUIRED", moduleSlug: "reports", blocking: true }] }))
  const user = userEvent
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  await user.click(screen.getByRole("button", { name: "Review configuration" }))
  const dialog = await screen.findByRole("dialog")
  expect(within(dialog).getByRole("button", { name: "Apply configuration" })).toBeDisabled()
  expect(within(dialog).getByText(/needs an eligible access grant/)).toBeVisible()
  expect(mockApply).not.toHaveBeenCalled()
})

it("shows a terminal preparation issue and requires another review rather than replaying a failed command", async () => {
  mockApply.mockResolvedValue(success({ commandId: "failed-1", state: "FAILED", revision: 3, alreadyApplied: false, issue: { code: "ELIGIBILITY_REQUIRED", blocking: true }, data: fixture() }))
  const user = userEvent
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  await user.click(screen.getByRole("button", { name: "Review configuration" }))
  await user.click(await screen.findByRole("button", { name: "Apply configuration" }))
  expect(await screen.findByRole("alert")).toHaveTextContent("Your previous workspace is still in place")
  expect(screen.getByRole("button", { name: "Retry reviewed configuration" })).toBeDisabled()
  expect(screen.getByText(/needs an eligible access grant/)).toBeVisible()
})

it("keeps the draft when validation fails and does not expose raw server details", async () => {
  mockPreview.mockResolvedValue(failure())
  const user = userEvent
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  await user.click(screen.getByRole("button", { name: /Retailer/ }))
  await user.click(screen.getByRole("button", { name: "Review configuration" }))
  expect(await screen.findByRole("alert")).toHaveTextContent("Your draft is preserved")
  expect(screen.getByRole("checkbox", { name: "Inventory" })).toBeChecked()
  expect(screen.queryByText(/Details deliberately/)).not.toBeInTheDocument()
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})

it("refreshes a stale snapshot without replacing an edited draft", async () => {
  mockPreview.mockResolvedValue(failure("CONFLICT"))
  mockGet.mockResolvedValue(success({ ...fixture(), revision: 7 }))
  const user = userEvent
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  await user.click(screen.getByRole("button", { name: /Retailer/ }))
  await user.click(screen.getByRole("button", { name: "Review configuration" }))
  await screen.findByText(/configuration or its evidence changed/)
  await user.click(screen.getAllByRole("button", { name: "Refresh current state" })[0]!)
  await screen.findByText(/Current state refreshed/)
  expect(screen.getByRole("checkbox", { name: "Inventory" })).toBeChecked()
  mockPreview.mockResolvedValue(success({ ...preview(), revision: 7 }))
  await user.click(screen.getByRole("button", { name: "Review configuration" }))
  expect(mockPreview.mock.calls[1][0].expectedRevision).toBe(7)
})

it("saves a server-returned history record and reopens it as a draft, not an activation", async () => {
  const entry: CompositionHistoryEntry = { id: "draft-1", state: "DRAFT", revision: 3, selectedModules: ["sales", "finance"], stopNewWorkModules: [], setupInputs: {}, previousModules: ["sales"], createdAt: "2026-09-05T12:01:00.000Z", actorId: "user-one", errorCode: null }
  mockSave.mockResolvedValue(success(entry))
  mockReopen.mockResolvedValue(success({ ...entry, id: "draft-2" }))
  const user = userEvent
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  await user.click(screen.getByRole("button", { name: "Save draft" }))
  await screen.findByText(/Draft saved/)
  await user.click(screen.getByRole("tab", { name: "Change history" }))
  await user.click(screen.getByRole("button", { name: "Reopen as new draft" }))
  expect(await screen.findByText(/Earlier configuration opened/)).toBeVisible()
  expect(screen.getByRole("checkbox", { name: "Finance" })).toBeChecked()
  expect(mockApply).not.toHaveBeenCalled()
  expect(mockReopen).toHaveBeenCalledWith(expect.objectContaining({ commandId: "draft-1", expectedRevision: 3 }))
})

it("renders only the server-authorized workspace destinations", async () => {
  const user = userEvent
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  await user.click(screen.getByRole("tab", { name: "My workspace" }))
  expect(screen.getByRole("link", { name: "Open Sales" })).toHaveAttribute("href", "/en/dashboard/sales")
  expect(screen.queryByRole("link", { name: "Open Finance" })).not.toBeInTheDocument()
})

it.each(["en", "fr"])("keeps the draft and earlier records through history retry and focuses the loaded entry (%s)", async locale => {
  mockLocale = locale
  const copy = locale === "fr" ? fr.moduleComposition : en.moduleComposition
  const current: CompositionHistoryEntry = { id: "current", state: "ACTIVE", revision: 3, selectedModules: ["sales"], stopNewWorkModules: [], setupInputs: {}, previousModules: [], createdAt: "2026-09-05T12:00:00Z", actorId: "user-one", errorCode: null }
  const older = { ...current, id: "earlier", createdAt: "2026-09-04T12:00:00Z" }
  mockHistory.mockRejectedValueOnce(new Error("network unavailable")).mockResolvedValueOnce(success({ entries: [older], nextCursor: null }))
  render(<ModuleCompositionWorkbench initialData={{ ...fixture(), history: [current], historyNextCursor: "current" }} userId="user-one" />)
  await userEvent.click(screen.getByRole("checkbox", { name: locale === "fr" ? "Stock" : "Inventory" }))
  await userEvent.click(screen.getByRole("tab", { name: locale === "fr" ? "Historique" : "Change history" }))
  await userEvent.click(screen.getByRole("button", { name: copy.historyOlder }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.historyLoadFailed)
  expect(document.getElementById("module-history-current")).toBeInTheDocument()
  await userEvent.click(screen.getByRole("button", { name: copy.historyRetry }))
  await waitFor(() => expect(document.getElementById("module-history-earlier")).toHaveFocus())
  expect(screen.getByRole("status")).toHaveTextContent(copy.historyLoaded.replace("{count}", "1"))
  expect(screen.queryByTestId("module-history-older")).not.toBeInTheDocument()
  expect(mockHistory).toHaveBeenNthCalledWith(2, { beforeId: "current" })
  await userEvent.click(screen.getByRole("tab", { name: locale === "fr" ? "Configurer" : "Configure" }))
  expect(screen.getByRole("checkbox", { name: locale === "fr" ? "Stock" : "Inventory" })).toBeChecked()
  expect(mockApply).not.toHaveBeenCalled()
})

it("localizes labels and the dialog close control in French", async () => {
  mockLocale = "fr"
  const user = userEvent
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  expect(screen.getByRole("heading", { name: "Composez votre espace de travail" })).toBeVisible()
  await user.click(screen.getByRole("button", { name: /Entreprise de services/ }))
  expect(screen.getByRole("checkbox", { name: "Stock" })).not.toBeChecked()
  await user.click(screen.getByRole("button", { name: "Examiner la configuration" }))
  expect(await screen.findByRole("button", { name: "Fermer" })).toBeVisible()
  expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument()
})

it("does not restore another user's locally stored selection", () => {
  sessionStorage.setItem("stoquify:module-draft:org-one:other-user", JSON.stringify({ selected: ["inventory"] }))
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  expect(screen.getByRole("checkbox", { name: "Inventory" })).not.toBeChecked()
  fireEvent.click(screen.getByRole("checkbox", { name: "Inventory" }))
  expect(JSON.parse(sessionStorage.getItem("stoquify:module-draft:org-one:user-one") ?? "{}").selected).toContain("inventory")
})

function operation(): CompositionLifecycleOperation {
  return { id: "operation-4", commandId: "command-4", state: "REQUESTED", desiredRevision: 4, activeRevision: 3, createdAt: "2026-09-05T12:10:00.000Z", updatedAt: "2026-09-05T12:11:00.000Z", errorCode: null, canResume: true, steps: [
    { moduleSlug: "accounting", stepKey: "accounting-setup", status: "SUCCEEDED", code: "SETUP_VERIFIED", href: null, checkedAt: "2026-09-05T12:10:00.000Z", evidenceHash: "accounting-evidence", attempts: 1 },
    { moduleSlug: "payment_reconciliation", stepKey: "provider-setup", status: "WAITING_INPUT", code: "PROVIDER_SETUP_REQUIRED", href: "/dashboard/finance/reconciliation", checkedAt: "2026-09-05T12:11:00.000Z", evidenceHash: "provider-observation", attempts: 1 },
  ] }
}

it("shows a recorded request and the previous active workspace without announcing activation", async () => {
  const next = { ...fixture(), revision: 4, lifecycle: operation(), selectedModules: preview().selectedModules }
  mockApply.mockResolvedValue(success({ commandId: "command-4", state: "REQUESTED", revision: 4, alreadyApplied: false, issue: null, data: next }))
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  await userEvent.click(screen.getByRole("button", { name: "Review configuration" }))
  await userEvent.click(await screen.findByRole("button", { name: "Apply configuration" }))
  expect(await screen.findByText(/Request recorded. Preparation is not complete/)).toBeVisible()
  expect(screen.queryByText(/Configuration applied. Your workspace/)).not.toBeInTheDocument()
  const panel = screen.getByTestId("module-lifecycle")
  expect(within(panel).getByText(/Requested revision 4 · Active workspace revision 3/)).toBeVisible()
  expect(within(panel).getByText("Input needed")).toBeVisible()
  expect(within(panel).getByRole("link", { name: "Open setup" })).toHaveAttribute("href", "/en/dashboard/finance/reconciliation")
  expect(screen.getByText("Prepare").closest("li")).toHaveAttribute("aria-current", "step")
  await userEvent.click(screen.getByRole("tab", { name: "My workspace" }))
  expect(screen.getByRole("link", { name: "Open Sales" })).toBeVisible()
  expect(screen.queryByRole("link", { name: "Open Accounting" })).not.toBeInTheDocument()
})

it("resumes the recorded operation with the same command through identity verification", async () => {
  const data = { ...fixture(), revision: 4, lifecycle: operation() }
  mockResume.mockResolvedValueOnce(failure("FRESH_AUTH_REQUIRED")).mockResolvedValueOnce(success({ commandId: "command-4", state: "ACTIVE", revision: 4, alreadyApplied: false, issue: null, data: { ...data, activeRevision: 4, lifecycle: { ...operation(), state: "ACTIVE", activeRevision: 4, canResume: false } } }))
  mockStepUp.mockResolvedValue(success({}))
  render(<ModuleCompositionWorkbench initialData={data} userId="user-one" />)
  await userEvent.click(screen.getByRole("button", { name: "Check inputs and resume preparation" }))
  expect(await screen.findByRole("dialog", { name: "Resume recorded preparation" })).toBeVisible()
  await userEvent.type(screen.getByLabelText("Current password"), "test-password-only")
  await userEvent.click(screen.getByRole("button", { name: "Verify identity and resume" }))
  await waitFor(() => expect(mockResume).toHaveBeenCalledTimes(2))
  expect(mockResume.mock.calls[0][0]).toEqual(mockResume.mock.calls[1][0])
  expect(mockResume.mock.calls[0][0]).toEqual({ operationId: "operation-4", expectedRevision: 4, idempotencyKey: "11111111-1111-4111-8111-111111111111" })
  expect(mockApply).not.toHaveBeenCalled()
  expect(await screen.findByRole("heading", { name: "Your working space" })).toBeVisible()
})

it("keeps explicit stopping separate from workspace selection and blocks an unsupported preview", async () => {
  const rejected = { ...preview(), stopNewWorkModules: ["reports"], stopImpact: { ...preview().stopImpact, stopNewWorkModules: ["reports"], newlyStopped: ["reports"], canStop: false, canRetain: false, impacts: [{ moduleSlug: "reports", supported: false, newWork: [], continuation: [], dependentModules: [], observations: [], pendingCount: 0 }] } }
  mockPreview.mockResolvedValue(success(rejected))
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  await userEvent.click(screen.getByText("Control new business operations", { selector: "summary" }))
  await userEvent.click(screen.getByRole("checkbox", { name: "Stop new work in Reports" }))
  expect(screen.getByRole("checkbox", { name: "Sales" })).toBeChecked()
  expect(screen.getByRole("checkbox", { name: "Reports" })).not.toBeChecked()
  await userEvent.click(screen.getByRole("button", { name: "Review configuration" }))
  const dialog = await screen.findByRole("dialog")
  expect(mockPreview).toHaveBeenCalledWith({ selectedModules: ["sales"], stopNewWorkModules: ["reports"], setupInputs: {}, expectedRevision: 3 })
  expect(within(dialog).getByText("This stop is unsupported. It cannot be applied.")).toBeVisible()
  expect(within(dialog).getByRole("button", { name: "Apply configuration" })).toBeDisabled()
  expect(mockApply).not.toHaveBeenCalled()
})

it("reopens stopped work only as a reactivation draft and localizes its lifecycle in French", async () => {
  mockLocale = "fr"
  const data = { ...fixture(), newWorkStoppedModules: ["sales" as const], lifecycle: { ...operation(), state: "RETAINED" as const, canResume: false, steps: [] } }
  render(<ModuleCompositionWorkbench initialData={data} userId="user-one" />)
  expect(within(screen.getByTestId("module-lifecycle")).getByText("Documents conservés", { exact: true })).toBeVisible()
  await userEvent.click(screen.getByRole("tab", { name: "Mon espace" }))
  await userEvent.click(screen.getByRole("button", { name: "Préparer la réactivation de Ventes" }))
  expect(await screen.findByText(/La réactivation est proposée dans votre brouillon/)).toBeVisible()
  expect(mockApply).not.toHaveBeenCalled()
  expect(mockResume).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole("button", { name: "Examiner la configuration" }))
  expect(mockPreview).toHaveBeenCalledWith({ selectedModules: ["sales"], stopNewWorkModules: [], setupInputs: {}, expectedRevision: 3 })
})

it("announces the actual draft and review steps instead of fixing Configure as current", async () => {
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  expect(screen.getByText("Choose outcomes").closest("li")).toHaveAttribute("aria-current", "step")
  await userEvent.click(screen.getByRole("button", { name: /Retailer/ }))
  expect(screen.getByText("Configure", { selector: "li" })).toHaveAttribute("aria-current", "step")
  await userEvent.click(screen.getByRole("button", { name: "Review configuration" }))
  await screen.findByRole("dialog")
  expect(screen.getByText("Review impact").closest("li")).toHaveAttribute("aria-current", "step")
})

it("explains a disabled offline stop and preserves the ability to remove a saved unsupported stop", async () => {
  const data = fixture()
  data.newWorkStoppedModules = ["sales"]
  data.stopOptions = data.stopOptions.map(option => option.moduleSlug === "sales" || option.moduleSlug === "pos" ? { ...option, supported: false, unsupportedReason: "OFFLINE_CONTINUATION_UNAVAILABLE" as const } : option)
  render(<ModuleCompositionWorkbench initialData={data} userId="user-one" />)
  await userEvent.click(screen.getByText("Control new business operations", { selector: "summary" }))
  expect(screen.getByRole("checkbox", { name: "Stop new work in Point of sale" })).toBeDisabled()
  expect(screen.getByRole("checkbox", { name: "Stop new work in Sales" })).toBeEnabled()
  expect(screen.getAllByText(/accepted offline sales still need a verified continuation process/)).toHaveLength(2)
  await userEvent.click(screen.getByRole("checkbox", { name: "Stop new work in Sales" }))
  expect(screen.getByRole("checkbox", { name: "Stop new work in Sales" })).not.toBeChecked()
  expect(mockApply).not.toHaveBeenCalled()
})

it("shows only server-authorized historical links while the capability remains stopped", async () => {
  const data = fixture()
  data.newWorkStoppedModules = ["sales", "finance"]
  data.retainedWorkspace = [{ moduleSlug: "sales", title: "Sales", href: "/dashboard/sales" }]
  render(<ModuleCompositionWorkbench initialData={data} userId="user-one" />)
  await userEvent.click(screen.getByRole("tab", { name: "My workspace" }))
  expect(within(screen.getByRole("link", { name: "Open Sales" })).getByText("New work is currently stopped")).toBeVisible()
  expect(screen.getByRole("link", { name: "Open authorized Sales records" })).toHaveAttribute("href", "/en/dashboard/sales")
  expect(screen.queryByRole("link", { name: "Open authorized Finance records" })).not.toBeInTheDocument()
  expect(mockApply).not.toHaveBeenCalled()
  expect(mockResume).not.toHaveBeenCalled()
})

it("submits an existing tenant payroll period as reviewed scope and preserves it in the browser draft", async () => {
  const data = fixture()
  data.availablePayrollPeriods = [{ id: "period-one", name: "September payroll", countryCode: "CM", periodStart: "2026-09-01T00:00:00.000Z", periodEnd: "2026-09-30T00:00:00.000Z", payDate: "2026-09-30T00:00:00.000Z" }]
  mockPreview.mockResolvedValue(success({ ...preview(), setupInputs: { payrollPeriodId: "period-one" }, setupScope: { payrollPeriod: { ...data.availablePayrollPeriods[0], name: "September payroll — current source" }, complianceAdapter: null } }))
  render(<ModuleCompositionWorkbench initialData={data} userId="user-one" />)
  await userEvent.click(screen.getByRole("checkbox", { name: "Payroll" }))
  await userEvent.selectOptions(screen.getByLabelText("Payroll period to verify"), "period-one")
  await userEvent.click(screen.getByRole("button", { name: "Review configuration" }))
  expect(mockPreview).toHaveBeenCalledWith(expect.objectContaining({ selectedModules: ["sales", "payroll"], setupInputs: { payrollPeriodId: "period-one" } }))
  expect(within(await screen.findByRole("dialog")).getByText(/September payroll — current source/)).toBeVisible()
  expect(JSON.parse(sessionStorage.getItem("stoquify:module-draft:org-one:user-one") ?? "{}").setupInputs).toEqual({ payrollPeriodId: "period-one" })
})

it("shows sandbox scope as a test environment and keeps its verified limitation visible", async () => {
  const data = fixture()
  data.availableComplianceAdapters = [{ id: "adapter-sandbox", countryCode: "CM", authorityChannel: "DGI", environment: "SANDBOX", status: "ACTIVE" }]
  data.lifecycle = { ...operation(), state: "ACTIVE", canResume: false, steps: [{ moduleSlug: "compliance", stepKey: "scope", status: "SUCCEEDED", code: "COMPLIANCE_SANDBOX_VERIFIED", href: "/dashboard/compliance", checkedAt: "2026-09-05T12:11:00.000Z", evidenceHash: "sandbox-evidence", attempts: 1 }] }
  data.catalog = data.catalog.map(item => item.slug === "compliance" ? { ...item, requirements: data.lifecycle!.steps } : item)
  render(<ModuleCompositionWorkbench initialData={data} userId="user-one" />)
  expect(within(screen.getByTestId("module-lifecycle")).getByText(/This is a test environment; production submission is not established/)).toBeVisible()
  expect(within(screen.getByTestId("module-card-compliance")).getByText(/This is a test environment; production submission is not established/)).toBeVisible()
  await userEvent.click(screen.getByRole("checkbox", { name: "Compliance" }))
  expect(screen.getByRole("option", { name: "CM · DGI · Sandbox — test environment" })).toBeInTheDocument()
  await userEvent.selectOptions(screen.getByLabelText("Authority connection to verify"), "adapter-sandbox")
  await userEvent.click(screen.getByRole("button", { name: "Review configuration" }))
  expect(mockPreview).toHaveBeenCalledWith(expect.objectContaining({ setupInputs: { complianceAdapterId: "adapter-sandbox" } }))
})

it("confirms fresh identity before saving the exact draft request without applying it", async () => {
  const entry: CompositionHistoryEntry = { id: "draft-auth", state: "DRAFT", revision: 3, selectedModules: ["sales"], stopNewWorkModules: [], setupInputs: {}, previousModules: ["sales"], createdAt: "2026-09-05T12:01:00.000Z", actorId: "user-one", errorCode: null }
  mockSave.mockResolvedValueOnce(failure("FRESH_AUTH_REQUIRED")).mockResolvedValueOnce(success(entry))
  mockStepUp.mockResolvedValue(success({}))
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  const origin = screen.getByRole("button", { name: "Save draft" })
  await userEvent.click(origin)
  expect(await screen.findByRole("dialog", { name: "Confirm identity to save this draft" })).toBeVisible()
  expect(screen.queryByText(/configuration or its evidence changed/)).not.toBeInTheDocument()
  await userEvent.type(screen.getByLabelText("Current password"), "test-password-only")
  await userEvent.click(screen.getByRole("button", { name: "Verify identity and save draft" }))
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2))
  expect(mockSave.mock.calls[0][0]).toEqual(mockSave.mock.calls[1][0])
  expect(await screen.findByText(/Draft saved/)).toBeVisible()
  expect(origin).toHaveFocus()
  expect(mockApply).not.toHaveBeenCalled()
})

it("confirms identity to reopen a recorded French draft without substituting a new command", async () => {
  mockLocale = "fr"
  const entry: CompositionHistoryEntry = { id: "earlier-draft", state: "DRAFT", revision: 3, selectedModules: ["finance"], stopNewWorkModules: [], setupInputs: {}, previousModules: ["sales"], createdAt: "2026-09-05T12:01:00.000Z", actorId: "user-one", errorCode: null }
  mockReopen.mockResolvedValueOnce(failure("FRESH_AUTH_REQUIRED")).mockResolvedValueOnce(success({ ...entry, id: "reopened-draft" }))
  mockStepUp.mockResolvedValue(success({}))
  render(<ModuleCompositionWorkbench initialData={{ ...fixture(), drafts: [entry] }} userId="user-one" />)
  await userEvent.click(screen.getByRole("tab", { name: "Historique" }))
  await userEvent.click(screen.getByRole("button", { name: "Rouvrir dans un nouveau brouillon" }))
  expect(await screen.findByRole("dialog", { name: "Confirmer l’identité pour rouvrir ce brouillon" })).toBeVisible()
  await userEvent.type(screen.getByLabelText("Mot de passe actuel"), "test-password-only")
  await userEvent.click(screen.getByRole("button", { name: "Vérifier l’identité et rouvrir le brouillon" }))
  await waitFor(() => expect(mockReopen).toHaveBeenCalledTimes(2))
  expect(mockReopen.mock.calls[0][0]).toEqual(mockReopen.mock.calls[1][0])
  expect(screen.getByRole("checkbox", { name: "Finance" })).toBeChecked()
  expect(mockApply).not.toHaveBeenCalled()
})

it("preserves paged history through fresh server props and reopens the still-visible record", async () => {
  const old: CompositionHistoryEntry = { id: "old-applied", state: "ACTIVE", revision: 2, selectedModules: ["finance"], stopNewWorkModules: [], setupInputs: {}, previousModules: ["sales"], createdAt: "2026-09-01T12:00:00.000Z", actorId: "user-one", errorCode: null }
  const data = { ...fixture(), historyNextCursor: "first-page" }
  mockHistory.mockResolvedValue(success({ entries: [old], nextCursor: "older-page" }))
  mockReopen.mockResolvedValue(success({ ...old, id: "new-draft", state: "DRAFT", revision: 3 }))
  const { rerender } = render(<ModuleCompositionWorkbench initialData={data} userId="user-one" />)
  await userEvent.click(screen.getByRole("tab", { name: "Change history" }))
  await userEvent.click(screen.getByTestId("module-history-older"))
  await waitFor(() => expect(document.getElementById("module-history-old-applied")).toBeVisible())
  rerender(<ModuleCompositionWorkbench initialData={{ ...data, generatedAt: "2026-09-05T12:02:00.000Z" }} userId="user-one" />)
  const row = document.getElementById("module-history-old-applied")!
  expect(row).toBeVisible()
  await userEvent.click(within(row).getByRole("button", { name: "Reopen as new draft" }))
  await waitFor(() => expect(mockReopen).toHaveBeenCalledWith(expect.objectContaining({ commandId: old.id, expectedRevision: 3 })))
  expect(mockApply).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole("tab", { name: "Change history" }))
  await userEvent.click(screen.getByTestId("module-history-older"))
  expect(mockHistory).toHaveBeenLastCalledWith({ beforeId: "older-page" })
})

it.each(["authority", "organization", "revision", "lifecycle"])("discards cached history when server %s changes", async change => {
  const old: CompositionHistoryEntry = { id: "private-old", state: "ACTIVE", revision: 2, selectedModules: ["payroll"], stopNewWorkModules: [], setupInputs: { payrollPeriodId: "private-period" }, previousModules: [], createdAt: "2026-09-01T12:00:00.000Z", actorId: "user-one", errorCode: null }
  const data = { ...fixture(), historyNextCursor: "first-page" }
  mockHistory.mockResolvedValue(success({ entries: [old], nextCursor: null }))
  const { rerender } = render(<ModuleCompositionWorkbench initialData={data} userId="user-one" />)
  await userEvent.click(screen.getByRole("tab", { name: "Change history" }))
  await userEvent.click(screen.getByTestId("module-history-older"))
  await waitFor(() => expect(document.getElementById("module-history-private-old")).toBeVisible())
  const updated = { ...data,
    ...(change === "authority" ? { historyAccessKey: "different-permissions" } : {}),
    ...(change === "organization" ? { organizationId: "org-two" } : {}),
    ...(change === "revision" ? { revision: 4 } : {}),
    ...(change === "lifecycle" ? { lifecycle: operation() } : {}),
  }
  rerender(<ModuleCompositionWorkbench initialData={updated} userId="user-one" />)
  expect(document.getElementById("module-history-private-old")).not.toBeInTheDocument()
})

it("resets paged history when a refreshed head is disjoint so newer records are not skipped", async () => {
  const record: CompositionHistoryEntry = { id: "current", state: "ACTIVE", revision: 3, selectedModules: ["sales"], stopNewWorkModules: [], setupInputs: {}, previousModules: [], createdAt: "2026-09-01T12:00:00.000Z", actorId: "user-one", errorCode: null }
  const data = { ...fixture(), history: [record], historyNextCursor: "first-page" }
  mockHistory.mockResolvedValue(success({ entries: [{ ...record, id: "earlier" }], nextCursor: "deep-page" }))
  const { rerender } = render(<ModuleCompositionWorkbench initialData={data} userId="user-one" />)
  await userEvent.click(screen.getByRole("tab", { name: "Change history" }))
  await userEvent.click(screen.getByTestId("module-history-older"))
  await waitFor(() => expect(document.getElementById("module-history-earlier")).toBeVisible())
  rerender(<ModuleCompositionWorkbench initialData={{ ...data, history: [{ ...record, id: "new-head" }], historyNextCursor: "new-head-page" }} userId="user-one" />)
  expect(document.getElementById("module-history-earlier")).not.toBeInTheDocument()
  await userEvent.click(screen.getByTestId("module-history-older"))
  expect(mockHistory).toHaveBeenLastCalledWith({ beforeId: "new-head-page" })
})

it("ignores a history page arriving after its access scope changed", async () => {
  let finish!: (value: ReturnType<typeof success>) => void
  mockHistory.mockReturnValue(new Promise(resolve => { finish = resolve }))
  const data = { ...fixture(), historyNextCursor: "first-page" }
  const { rerender } = render(<ModuleCompositionWorkbench initialData={data} userId="user-one" />)
  await userEvent.click(screen.getByRole("tab", { name: "Change history" }))
  await userEvent.click(screen.getByTestId("module-history-older"))
  rerender(<ModuleCompositionWorkbench initialData={{ ...data, historyAccessKey: "revoked-scope" }} userId="user-one" />)
  await act(async () => { finish(success({ entries: [{ id: "late-private", state: "ACTIVE" }], nextCursor: null })) })
  expect(document.getElementById("module-history-late-private")).not.toBeInTheDocument()
  expect(screen.queryByRole("status")).not.toBeInTheDocument()
})

it("does not announce an older command's success as completion of a newer pending request", async () => {
  const latest = { ...fixture(), revision: 5, activeRevision: 4, lifecycle: { ...operation(), id: "new-operation", commandId: "new-command", desiredRevision: 5, activeRevision: 4 } }
  mockApply.mockResolvedValue(success({ commandId: "earlier-command", state: "ACTIVE", revision: 4, alreadyApplied: true, issue: null, data: latest }))
  render(<ModuleCompositionWorkbench initialData={fixture()} userId="user-one" />)
  await userEvent.click(screen.getByRole("button", { name: "Review configuration" }))
  await userEvent.click(await screen.findByRole("button", { name: "Apply configuration" }))
  expect(await screen.findByText(/A newer configuration request is now current/)).toBeVisible()
  expect(screen.queryByText(/Configuration applied. Your workspace now reflects/)).not.toBeInTheDocument()
  expect(within(screen.getByTestId("module-lifecycle")).getByText(/Requested revision 5 · Active workspace revision 4/)).toBeVisible()
})
