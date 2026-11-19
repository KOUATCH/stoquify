import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { QueryProvider } from "@/lib/providers/query-provider"
import { CRUD_MUTATION_NOTIFICATION_EVENT } from "@/lib/error-handling/crud-notifications"
import { act, renderHook, waitFor } from "@testing-library/react"
import { assignCloseFindingAction, exportCertifiedClosePackAction, exportDraftClosePackAction, getCloseAssuranceDashboardAction, getCloseEvidenceGraphAction, runCloseAssuranceAction, updateAccountantReviewAction, listClosePackExportsAction, getRetainedClosePackExportAction } from "@/actions/accounting/close-assurance.actions"
import { closeAssuranceKeys, useAssignCloseFinding, useCloseAssurance, useCloseEvidenceGraph, useExportClosePack, useRunCloseAssurance, useUpdateAccountantReview, useClosePackExports } from "../accounting/useCloseAssurance"

const notifyError = jest.fn()
const notifySuccess = jest.fn()
jest.mock("@/actions/accounting/close-assurance.actions", () => ({ assignCloseFindingAction: jest.fn(), exportCertifiedClosePackAction: jest.fn(), exportDraftClosePackAction: jest.fn(), getCloseAssuranceDashboardAction: jest.fn(), getCloseEvidenceGraphAction: jest.fn(), runCloseAssuranceAction: jest.fn(), updateAccountantReviewAction: jest.fn(), listClosePackExportsAction: jest.fn(), getRetainedClosePackExportAction: jest.fn() }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ error: notifyError, success: notifySuccess, info: jest.fn() }) }))

const serverMessage = "Certified close pack requires enabled accounting with READY or LOCKED setup. Complete accounting setup and run a new assessment."
const clientScope = { actorId: "owned-actor", organizationId: "owned-org", periodId: "owned-period", enabled: true }
const blockedMessage = "Certified close pack is blocked: Inventory valuation annex evidence is stale."
function wrapper({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>
}

describe("close export setup recovery", () => {
  const globalNotification = jest.fn()
  beforeEach(() => { jest.clearAllMocks(); window.addEventListener(CRUD_MUTATION_NOTIFICATION_EVENT, globalNotification) })
  afterEach(() => { window.removeEventListener(CRUD_MUTATION_NOTIFICATION_EVENT, globalNotification); expect(globalNotification).not.toHaveBeenCalled() })
  it.each([
    ["en", "This finding has an evidence request. Continue it in the evidence workbench. Ordinary assignment cannot change the response owner or restart review."],
    ["fr", "Ce blocage comporte une demande de justificatifs. Poursuivez-la dans l’espace de traitement des justificatifs. L’attribution ordinaire ne peut pas changer le responsable de la réponse ni relancer la revue."],
  ] as const)("explains %s assignment refusal without reporting a successful reassignment", async (locale, message) => {
    ;(assignCloseFindingAction as jest.Mock).mockResolvedValue({ success: false, data: null, code: "CONFLICT", error: "Existing evidence request" })
    const { result } = renderHook(() => useAssignCloseFinding(locale, clientScope), { wrapper })
    await act(async () => { await expect(result.current.mutateAsync({ findingId: "owned-finding" })).rejects.toMatchObject({ code: "CONFLICT", message }) })
    expect(notifyError).toHaveBeenCalledWith(expect.any(String), message)
    expect(notifyError).toHaveBeenCalledTimes(1)
    expect(notifySuccess).not.toHaveBeenCalled()
    expect(assignCloseFindingAction).toHaveBeenCalledTimes(1)
  })
  it.each([
    ["en", "Complete accounting setup, then run a new assessment before certifying this close pack."],
    ["fr", "Terminez la configuration comptable, puis lancez une nouvelle évaluation avant de certifier ce dossier de clôture."],
  ] as const)("shows actionable %s guidance without a success notification", async (locale, expected) => {
    ;(exportCertifiedClosePackAction as jest.Mock).mockResolvedValue({ success: false, data: null, error: serverMessage })
    const { result } = renderHook(() => useExportClosePack(locale, clientScope), { wrapper })
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
    const { result } = renderHook(() => useExportClosePack(locale, clientScope), { wrapper })
    await act(async () => { await expect(result.current.certified.mutateAsync({ closeRunId: "owned-run" })).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED", message }) })
    expect(notifyError).not.toHaveBeenCalled()
    expect(notifySuccess).not.toHaveBeenCalled()
  })

  it("preserves unrelated server errors", async () => {
    ;(exportCertifiedClosePackAction as jest.Mock).mockResolvedValue({ success: false, data: null, error: "Refresh changed evidence." })
    const { result } = renderHook(() => useExportClosePack("fr", clientScope), { wrapper })
    await act(async () => { await expect(result.current.certified.mutateAsync({ closeRunId: "owned-run" })).rejects.toThrow() })
    expect(notifyError).toHaveBeenCalledWith(expect.any(String), "Refresh changed evidence.")
    expect(notifyError).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["en", "The assessment could not be published with a reliable time. Wait briefly and retry. Contact support if this continues."],
    ["fr", "L’évaluation n’a pas pu être publiée avec une date fiable. Patientez un instant et réessayez. Contactez l’assistance si le problème persiste."],
  ] as const)("explains %s publication-clock conflicts without automatically repeating an assessment", async (locale, message) => {
    ;(runCloseAssuranceAction as jest.Mock).mockResolvedValue({ success: false, data: null, code: "CONFLICT", error: "The database clock has not advanced beyond the latest assessment. Wait briefly and retry; contact support if this persists." })
    const { result } = renderHook(() => useRunCloseAssurance(locale, clientScope), { wrapper })
    await act(async () => { await expect(result.current.mutateAsync({ periodId: "owned-period" })).rejects.toMatchObject({ code: "CONFLICT", message }) })
    expect(notifyError).toHaveBeenCalledWith(expect.any(String), message)
    expect(notifySuccess).not.toHaveBeenCalled()
    expect(runCloseAssuranceAction).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["en", "CONFLICT", "This close assessment is no longer current. Open the latest assessment before certification.", "A newer assessment exists. Refresh the latest assessment and review its evidence before trying certification again."],
    ["fr", "CONFLICT", "This close assessment is no longer current. Open the latest assessment before certification.", "Une évaluation plus récente existe. Actualisez la dernière évaluation et examinez ses preuves avant de réessayer la certification."],
    ["en", "CONFLICT", "The latest close assessments have the same creation time. Run a new assessment before certification.", "The latest assessments have the same creation time. Run a new assessment, then review its evidence before certification."],
    ["fr", "CONFLICT", "The latest close assessments have the same creation time. Run a new assessment before certification.", "Les dernières évaluations ont la même date de création. Lancez une nouvelle évaluation, puis examinez ses preuves avant la certification."],
    ["en", "INVALID_TRANSITION", "This close assessment has been voided. Run a new assessment before certification.", "This assessment has been voided. Run a new assessment before certification."],
    ["fr", "INVALID_TRANSITION", "This close assessment has been voided. Run a new assessment before certification.", "Cette évaluation a été annulée. Lancez une nouvelle évaluation avant la certification."],
  ] as const)("preserves %s %s admission refusal and manual recovery", async (locale, code, error, message) => {
    ;(exportCertifiedClosePackAction as jest.Mock).mockResolvedValue({ success: false, data: null, code, error })
    const { result } = renderHook(() => useExportClosePack(locale, clientScope), { wrapper })
    await act(async () => { await expect(result.current.certified.mutateAsync({ closeRunId: "older-owned-run" })).rejects.toMatchObject({ code, message }) })
    expect(notifyError).toHaveBeenCalledWith(expect.any(String), message)
    expect(notifyError).toHaveBeenCalledTimes(1)
    expect(notifySuccess).not.toHaveBeenCalled()
    expect(exportCertifiedClosePackAction).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["en", "Certification was refused. Review current close evidence and resolve the reported conditions. If evidence is missing, changed or unavailable, run a new assessment. Then a different authorized person can certify it."],
    ["fr", "Certification refusée. Examinez les preuves et corrigez les causes signalées. Si des preuves manquent, ont changé ou sont indisponibles, lancez une nouvelle évaluation. Une autre personne autorisée pourra certifier."],
  ] as const)("explains blocked certification recovery in %s without claiming a successful refresh", async (locale, message) => {
    ;(exportCertifiedClosePackAction as jest.Mock).mockResolvedValue({ success: false, data: null, code: "BUSINESS_RULE_VIOLATION", error: blockedMessage })
    const { result } = renderHook(() => useExportClosePack(locale, clientScope), { wrapper })
    await act(async () => { await expect(result.current.certified.mutateAsync({ closeRunId: "owned-run" })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION", message }) })
    expect(notifyError).toHaveBeenCalledWith(expect.any(String), message)
    expect(notifySuccess).not.toHaveBeenCalled()
  })

  it.each(["blocked", "transport", "fresh-auth"] as const)("awaits fresh dashboard and evidence after a %s denial without retrying certification", async (failure) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 2, retryDelay: 1 } } })
    client.setQueryData(closeAssuranceKeys.dashboard("owned-org", "owned-period", "en", "owned-actor"), { run: { id: "owned-run" }, currentProof: { grade: "operational" } })
    client.setQueryData(closeAssuranceKeys.evidence("owned-org", "owned-period", "owned-run", "all", "owned-actor"), { nodes: [{ id: "retained-proof" }] })
    let releaseDashboard!: (value: unknown) => void
    let releaseEvidence!: (value: unknown) => void
    ;(getCloseAssuranceDashboardAction as jest.Mock).mockImplementation(() => new Promise((resolve) => { releaseDashboard = resolve }))
    ;(getCloseEvidenceGraphAction as jest.Mock).mockImplementation(() => new Promise((resolve) => { releaseEvidence = resolve }))
    const code = failure === "fresh-auth" ? "FRESH_AUTH_REQUIRED" : "BUSINESS_RULE_VIOLATION"
    if (failure === "transport") (exportCertifiedClosePackAction as jest.Mock).mockRejectedValue(new Error("Connection interrupted"))
    else (exportCertifiedClosePackAction as jest.Mock).mockResolvedValue({ success: false, data: null, code, error: blockedMessage })
    const { result, unmount } = renderHook(() => ({
      dashboard: useCloseAssurance({ actorId: "owned-actor", organizationId: "owned-org", periodId: "owned-period" }),
      evidence: useCloseEvidenceGraph({ actorId: "owned-actor", organizationId: "owned-org", periodId: "owned-period", closeRunId: "owned-run" }),
      export: useExportClosePack("en", clientScope),
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
      releaseDashboard({ success: true, data: { organizationId: "owned-org", actorId: "owned-actor", run: { id: "owned-run" }, currentProof: { grade: "blocked" } }, error: null })
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
    const retained = { organizationId: "owned-org", actorId: "owned-actor", run: { id: "owned-run" }, currentProof: { grade: "operational" } }
    client.setQueryData(closeAssuranceKeys.dashboard("owned-org", "owned-period", "en", "owned-actor"), retained)
    ;(getCloseAssuranceDashboardAction as jest.Mock).mockResolvedValue({ success: false, data: null, error: "Close evidence unavailable" })
    ;(exportCertifiedClosePackAction as jest.Mock).mockResolvedValue({ success: false, data: null, code: "BUSINESS_RULE_VIOLATION", error: blockedMessage })
    const { result, unmount } = renderHook(() => ({
      dashboard: useCloseAssurance({ actorId: "owned-actor", organizationId: "owned-org", periodId: "owned-period" }),
      export: useExportClosePack("en", clientScope),
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
    const { result } = renderHook(() => useUpdateAccountantReview("fr", clientScope), { wrapper })
    await act(async () => { await expect(result.current.mutateAsync({ closeRunId: "owned-run", status: "READY_TO_CLOSE" })).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" }) })
    expect(notifyError).not.toHaveBeenCalled()
    expect(notifySuccess).not.toHaveBeenCalled()
  })

  it.each(["draft", "certified"] as const)("emits one successful %s export notification", async (mode) => {
    const action = mode === "draft" ? exportDraftClosePackAction : exportCertifiedClosePackAction
    ;(action as jest.Mock).mockResolvedValue({ success: true, data: { contentHash: "verified-content" }, error: null })
    const { result } = renderHook(() => useExportClosePack("fr", clientScope), { wrapper })
    await act(async () => { await result.current[mode].mutateAsync({ closeRunId: "owned-run" }) })
    expect(notifySuccess).toHaveBeenCalledTimes(1)
    expect(notifyError).not.toHaveBeenCalled()
  })

  it("reuses one export correlation after an uncertain transport result", async () => {
    ;(exportCertifiedClosePackAction as jest.Mock).mockRejectedValueOnce(new Error("Connection interrupted")).mockResolvedValue({ success: true, data: { contentHash: "same-file" }, error: null })
    const { result } = renderHook(() => useExportClosePack("en", clientScope), { wrapper })
    await act(async () => { await expect(result.current.certified.mutateAsync({ closeRunId: "owned-run" })).rejects.toThrow("Connection interrupted") })
    await act(async () => { await result.current.certified.mutateAsync({ closeRunId: "owned-run" }) })
    const calls = (exportCertifiedClosePackAction as jest.Mock).mock.calls
    expect(calls[0][0].correlationId).toBeTruthy(); expect(calls[1][0].correlationId).toBe(calls[0][0].correlationId)
  })

  it.each(["actor", "organization", "period", "authority"])("fences a late export across a changed %s", async changed => {
    let release!: (value: unknown) => void
    ;(exportDraftClosePackAction as jest.Mock).mockImplementation(() => new Promise(resolve => { release = resolve }))
    const { result, rerender } = renderHook(({ scope }) => useExportClosePack("en", scope), { wrapper, initialProps: { scope: clientScope } })
    let attempt!: Promise<unknown>
    act(() => { attempt = result.current.draft.mutateAsync({ closeRunId: "owned-run" }).catch(error => error) })
    await waitFor(() => expect(exportDraftClosePackAction).toHaveBeenCalledTimes(1))
    rerender({ scope: { ...clientScope, ...(changed === "actor" ? { actorId: "next-actor" } : changed === "organization" ? { organizationId: "next-org" } : changed === "period" ? { periodId: "next-period" } : { enabled: false }) } })
    await act(async () => { release({ success: true, data: { contentHash: "old-private-file" }, error: null }); expect(await attempt).toMatchObject({ code: "CLIENT_SCOPE_CHANGED" }) })
    expect(notifySuccess).not.toHaveBeenCalled(); expect(notifyError).not.toHaveBeenCalled()
  })

  it("binds dashboard cache to actor and organization and removes unavailable private data", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(closeAssuranceKeys.dashboard("owned-org", "owned-period", "en", "owned-actor"), { organizationId: "owned-org", actorId: "owned-actor", private: "actor-A" })
    ;(getCloseAssuranceDashboardAction as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "owned-org", actorId: "other-actor", private: "actor-B" }, error: null })
    const { result, rerender, unmount } = renderHook(({ actorId, enabled }) => useCloseAssurance({ ...clientScope, actorId, enabled }), {
      initialProps: { actorId: "owned-actor", enabled: true }, wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    expect((result.current.data as any)?.private).toBe("actor-A")
    rerender({ actorId: "other-actor", enabled: true })
    await waitFor(() => expect((result.current.data as any)?.private).toBe("actor-B"))
    expect(client.getQueryData(closeAssuranceKeys.dashboard("owned-org", "owned-period", "en", "owned-actor"))).toBeUndefined()
    rerender({ actorId: "other-actor", enabled: false })
    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(client.getQueryData(closeAssuranceKeys.dashboard("owned-org", "owned-period", "en", "other-actor"))).toBeUndefined())
    unmount(); client.clear()
  })

  it("lists private receipts in the actor/run scope and recovers through the protected action", async () => {
    const receipt = { exportId: "receipt", closeRunId: "owned-run", documentDigest: "original-byte-digest", retained: true }
    ;(listClosePackExportsAction as jest.Mock).mockResolvedValue({ success: true, data: [receipt], error: null })
    ;(getRetainedClosePackExportAction as jest.Mock).mockResolvedValue({ success: true, data: { content: "original", documentDigest: "original-byte-digest", historicalNotice: "Historical" }, error: null })
    const { result } = renderHook(() => ({ receipts: useClosePackExports({ ...clientScope, closeRunId: "owned-run" }), exports: useExportClosePack("en", clientScope) }), { wrapper })
    await waitFor(() => expect(result.current.receipts.data).toEqual([receipt]))
    await act(async () => { await expect(result.current.exports.recover.mutateAsync({ exportId: "receipt", mode: "CERTIFIED" })).resolves.toMatchObject({ content: "original", historicalNotice: "Historical" }) })
    expect(getRetainedClosePackExportAction).toHaveBeenCalledWith({ exportId: "receipt", mode: "CERTIFIED" })
  })

  it("discards unbound SSR data and a late dashboard response after a same-organization actor transition", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }), pending: Array<(value: unknown) => void> = []
    ;(getCloseAssuranceDashboardAction as jest.Mock).mockImplementation(() => new Promise(resolve => pending.push(resolve)))
    const unbound = { organizationId: "owned-org", actorId: "owned-actor", private: "unbound-SSR" } as any
    const { result, rerender, unmount } = renderHook(({ actorId }) => useCloseAssurance({ ...clientScope, actorId, initialData: unbound }), {
      initialProps: { actorId: "owned-actor" }, wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    expect(result.current.data).toBeUndefined(); await waitFor(() => expect(pending).toHaveLength(1))
    rerender({ actorId: "other-actor" }); await waitFor(() => expect(pending).toHaveLength(2))
    await act(async () => {
      pending[0]({ success: true, data: { organizationId: "owned-org", actorId: "owned-actor", private: "old-actor-response" }, error: null })
      pending[1]({ success: true, data: { organizationId: "owned-org", actorId: "other-actor", private: "current-actor-response" }, error: null })
    })
    await waitFor(() => expect((result.current.data as any)?.private).toBe("current-actor-response"))
    expect(client.getQueryData(closeAssuranceKeys.dashboard("owned-org", "owned-period", "en", "owned-actor"))).toBeUndefined()
    unmount(); client.clear()
  })

  it("keeps reads, private cache and writes unavailable while parent authority is unverified", async () => {
    const { result } = renderHook(() => ({ dashboard: useCloseAssurance({ ...clientScope, enabled: false, initialData: { organizationId: "owned-org" } as any }),
      exports: useExportClosePack("en", { ...clientScope, enabled: false }) }), { wrapper })
    expect(result.current.dashboard.data).toBeUndefined()
    await act(async () => { await expect(result.current.exports.draft.mutateAsync({ closeRunId: "owned-run" })).rejects.toMatchObject({ code: "CLIENT_SCOPE_CHANGED" }) })
    expect(getCloseAssuranceDashboardAction).not.toHaveBeenCalled(); expect(exportDraftClosePackAction).not.toHaveBeenCalled()
    expect(notifySuccess).not.toHaveBeenCalled(); expect(notifyError).not.toHaveBeenCalled()
  })

  it("does not retry an old assignment intent under another actor despite a retry2 client default", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: 2, retryDelay: 1 } } })
    let reject!: (error: Error) => void
    ;(assignCloseFindingAction as jest.Mock).mockImplementation(() => new Promise((_resolve, failed) => { reject = failed }))
    const { result, rerender, unmount } = renderHook(({ actorId }) => useAssignCloseFinding("en", { ...clientScope, actorId }), {
      initialProps: { actorId: "owned-actor" }, wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    let attempt!: Promise<unknown>
    act(() => { attempt = result.current.mutateAsync({ findingId: "old-actor-finding" }).catch(error => error) })
    await waitFor(() => expect(assignCloseFindingAction).toHaveBeenCalledTimes(1))
    rerender({ actorId: "new-actor" })
    await act(async () => { reject(new Error("Connection interrupted")); expect(await attempt).toMatchObject({ message: "Connection interrupted" }) })
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(assignCloseFindingAction).toHaveBeenCalledTimes(1)
    expect(notifySuccess).not.toHaveBeenCalled(); expect(notifyError).not.toHaveBeenCalled()
    unmount(); client.clear()
  })

  it("refuses a dashboard envelope belonging to another actor in the same organization", async () => {
    ;(getCloseAssuranceDashboardAction as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "owned-org", actorId: "different-actor", private: "wrong-actor-body" }, error: null })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result, unmount } = renderHook(() => useCloseAssurance(clientScope), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
    await waitFor(() => expect(result.current.error).toMatchObject({ code: "CLIENT_SCOPE_CHANGED" }))
    expect(result.current.data).toBeUndefined()
    expect(client.getQueryData(closeAssuranceKeys.dashboard("owned-org", "owned-period", "en", "owned-actor"))).toBeUndefined()
    unmount(); client.clear()
  })
})
