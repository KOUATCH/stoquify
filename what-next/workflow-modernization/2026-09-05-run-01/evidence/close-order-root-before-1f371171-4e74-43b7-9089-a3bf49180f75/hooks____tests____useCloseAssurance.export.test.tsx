import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { QueryProvider } from "@/lib/providers/query-provider"
import { CRUD_MUTATION_NOTIFICATION_EVENT } from "@/lib/error-handling/crud-notifications"
import { act, renderHook, waitFor } from "@testing-library/react"
import { exportCertifiedClosePackAction, exportDraftClosePackAction, getCloseAssuranceDashboardAction, getCloseEvidenceGraphAction, updateAccountantReviewAction } from "@/actions/accounting/close-assurance.actions"
import { closeAssuranceKeys, useCloseAssurance, useCloseEvidenceGraph, useExportClosePack, useUpdateAccountantReview } from "../accounting/useCloseAssurance"

const notifyError = jest.fn()
const notifySuccess = jest.fn()
jest.mock("@/actions/accounting/close-assurance.actions", () => ({ exportCertifiedClosePackAction: jest.fn(), exportDraftClosePackAction: jest.fn(), getCloseAssuranceDashboardAction: jest.fn(), getCloseEvidenceGraphAction: jest.fn(), updateAccountantReviewAction: jest.fn() }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ error: notifyError, success: notifySuccess }) }))

const serverMessage = "Certified close pack requires enabled accounting with READY or LOCKED setup. Complete accounting setup and run a new assessment."
const blockedMessage = "Certified close pack is blocked: Inventory valuation annex evidence is stale."
function wrapper({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>
}

describe("close export setup recovery", () => {
  const globalNotification = jest.fn()
  beforeEach(() => { jest.clearAllMocks(); window.addEventListener(CRUD_MUTATION_NOTIFICATION_EVENT, globalNotification) })
  afterEach(() => { window.removeEventListener(CRUD_MUTATION_NOTIFICATION_EVENT, globalNotification); expect(globalNotification).not.toHaveBeenCalled() })
  it.each([
    ["en", "Complete accounting setup, then run a new assessment before certifying this close pack."],
    ["fr", "Terminez la configuration comptable, puis lancez une nouvelle évaluation avant de certifier ce dossier de clôture."],
  ] as const)("shows actionable %s guidance without a success notification", async (locale, expected) => {
    ;(exportCertifiedClosePackAction as jest.Mock).mockResolvedValue({ success: false, data: null, error: serverMessage })
    const { result } = renderHook(() => useExportClosePack(locale), { wrapper })
    await act(async () => { await expect(result.current.certified.mutateAsync({ closeRunId: "owned-run" })).rejects.toThrow(expected) })
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(expect.any(String), expected))
    expect(notifyError).toHaveBeenCalledTimes(1)
    expect(notifySuccess).not.toHaveBeenCalled()
    expect(exportCertifiedClosePackAction).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["en", "Confirm your identity on this page, then retry certification."],
    ["fr", "Confirmez votre identité sur cette page, puis réessayez la certification."],
  ] as const)("preserves the fresh-auth code with localized %s guidance", async (locale, message) => {
    ;(exportCertifiedClosePackAction as jest.Mock).mockResolvedValue({ success: false, data: null, code: "FRESH_AUTH_REQUIRED", error: "Fresh authentication required" })
    const { result } = renderHook(() => useExportClosePack(locale), { wrapper })
    await act(async () => { await expect(result.current.certified.mutateAsync({ closeRunId: "owned-run" })).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED", message }) })
    expect(notifyError).not.toHaveBeenCalled()
    expect(notifySuccess).not.toHaveBeenCalled()
  })

  it("preserves unrelated server errors", async () => {
    ;(exportCertifiedClosePackAction as jest.Mock).mockResolvedValue({ success: false, data: null, error: "Refresh changed evidence." })
    const { result } = renderHook(() => useExportClosePack("fr"), { wrapper })
    await act(async () => { await expect(result.current.certified.mutateAsync({ closeRunId: "owned-run" })).rejects.toThrow() })
    expect(notifyError).toHaveBeenCalledWith(expect.any(String), "Refresh changed evidence.")
    expect(notifyError).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["en", "Certification was refused. Review current close evidence and resolve the reported conditions. If evidence is missing, changed or unavailable, run a new assessment. Then a different authorized person can certify it."],
    ["fr", "Certification refusée. Examinez les preuves et corrigez les causes signalées. Si des preuves manquent, ont changé ou sont indisponibles, lancez une nouvelle évaluation. Une autre personne autorisée pourra certifier."],
  ] as const)("explains blocked certification recovery in %s without claiming a successful refresh", async (locale, message) => {
    ;(exportCertifiedClosePackAction as jest.Mock).mockResolvedValue({ success: false, data: null, code: "BUSINESS_RULE_VIOLATION", error: blockedMessage })
    const { result } = renderHook(() => useExportClosePack(locale), { wrapper })
    await act(async () => { await expect(result.current.certified.mutateAsync({ closeRunId: "owned-run" })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION", message }) })
    expect(notifyError).toHaveBeenCalledWith(expect.any(String), message)
    expect(notifySuccess).not.toHaveBeenCalled()
  })

  it.each(["blocked", "transport", "fresh-auth"] as const)("awaits fresh dashboard and evidence after a %s denial without retrying certification", async (failure) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 2, retryDelay: 1 } } })
    client.setQueryData(closeAssuranceKeys.dashboard("owned-org", "owned-period", "en"), { run: { id: "owned-run" }, currentProof: { grade: "operational" } })
    client.setQueryData(closeAssuranceKeys.evidence("owned-org", "owned-period", "owned-run"), { nodes: [{ id: "retained-proof" }] })
    let releaseDashboard!: (value: unknown) => void
    let releaseEvidence!: (value: unknown) => void
    ;(getCloseAssuranceDashboardAction as jest.Mock).mockImplementation(() => new Promise((resolve) => { releaseDashboard = resolve }))
    ;(getCloseEvidenceGraphAction as jest.Mock).mockImplementation(() => new Promise((resolve) => { releaseEvidence = resolve }))
    const code = failure === "fresh-auth" ? "FRESH_AUTH_REQUIRED" : "BUSINESS_RULE_VIOLATION"
    if (failure === "transport") (exportCertifiedClosePackAction as jest.Mock).mockRejectedValue(new Error("Connection interrupted"))
    else (exportCertifiedClosePackAction as jest.Mock).mockResolvedValue({ success: false, data: null, code, error: blockedMessage })
    const { result, unmount } = renderHook(() => ({
      dashboard: useCloseAssurance({ organizationId: "owned-org", periodId: "owned-period" }),
      evidence: useCloseEvidenceGraph({ organizationId: "owned-org", periodId: "owned-period", closeRunId: "owned-run" }),
      export: useExportClosePack("en"),
    }), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
    let attempt: Promise<unknown> = Promise.resolve()
    act(() => { attempt = result.current.export.certified.mutateAsync({ closeRunId: "owned-run" }).catch((error: unknown) => error) })
    await waitFor(() => {
      expect(getCloseAssuranceDashboardAction).toHaveBeenCalledTimes(1)
      expect(getCloseEvidenceGraphAction).toHaveBeenCalledTimes(1)
      expect(result.current.export.certified.isPending).toBe(true)
    })
    expect(notifyError).not.toHaveBeenCalled()
    await act(async () => {
      releaseDashboard({ success: true, data: { run: { id: "owned-run" }, currentProof: { grade: "blocked" } }, error: null })
      releaseEvidence({ success: true, data: { nodes: [{ id: "retained-proof", status: "INVALIDATED" }] }, error: null })
      await attempt
    })
    await waitFor(() => {
      expect(result.current.dashboard.data?.currentProof?.grade).toBe("blocked")
      expect(result.current.export.certified.isPending).toBe(false)
    })
    expect(result.current.evidence.data?.nodes).toEqual([{ id: "retained-proof", status: "INVALIDATED" }])
    expect(exportCertifiedClosePackAction).toHaveBeenCalledTimes(1)
    expect(notifySuccess).not.toHaveBeenCalled()
    if (failure === "fresh-auth") expect(notifyError).not.toHaveBeenCalled()
    else expect(notifyError).toHaveBeenCalledTimes(1)
    unmount()
    client.clear()
  })

  it("keeps the certification error when the evidence refresh also fails", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    const retained = { run: { id: "owned-run" }, currentProof: { grade: "operational" } }
    client.setQueryData(closeAssuranceKeys.dashboard("owned-org", "owned-period", "en"), retained)
    ;(getCloseAssuranceDashboardAction as jest.Mock).mockResolvedValue({ success: false, data: null, error: "Close evidence unavailable" })
    ;(exportCertifiedClosePackAction as jest.Mock).mockResolvedValue({ success: false, data: null, code: "BUSINESS_RULE_VIOLATION", error: blockedMessage })
    const { result, unmount } = renderHook(() => ({
      dashboard: useCloseAssurance({ organizationId: "owned-org", periodId: "owned-period" }),
      export: useExportClosePack("en"),
    }), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
    await act(async () => {
      await expect(result.current.export.certified.mutateAsync({ closeRunId: "owned-run" })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
    })
    await waitFor(() => expect(result.current.dashboard.isError).toBe(true))
    expect(result.current.dashboard.data).toEqual(retained)
    expect(result.current.dashboard.error?.message).toBe("Close evidence unavailable")
    expect(exportCertifiedClosePackAction).toHaveBeenCalledTimes(1)
    expect(notifySuccess).not.toHaveBeenCalled()
    expect(notifyError).toHaveBeenCalledTimes(1)
    unmount()
    client.clear()
  })

  it("preserves review fresh-auth recovery without an overlapping popup", async () => {
    ;(updateAccountantReviewAction as jest.Mock).mockResolvedValue({ success: false, data: null, error: "Fresh authentication required", code: "FRESH_AUTH_REQUIRED" })
    const { result } = renderHook(() => useUpdateAccountantReview("fr"), { wrapper })
    await act(async () => { await expect(result.current.mutateAsync({ closeRunId: "owned-run", status: "READY_TO_CLOSE" })).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" }) })
    expect(notifyError).not.toHaveBeenCalled()
    expect(notifySuccess).not.toHaveBeenCalled()
  })

  it.each(["draft", "certified"] as const)("emits one successful %s export notification", async (mode) => {
    const action = mode === "draft" ? exportDraftClosePackAction : exportCertifiedClosePackAction
    ;(action as jest.Mock).mockResolvedValue({ success: true, data: { contentHash: "verified-content" }, error: null })
    const { result } = renderHook(() => useExportClosePack("fr"), { wrapper })
    await act(async () => { await result.current[mode].mutateAsync({ closeRunId: "owned-run" }) })
    expect(notifySuccess).toHaveBeenCalledTimes(1)
    expect(notifyError).not.toHaveBeenCalled()
  })
})
