"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { createCorrelationId } from "@/lib/error-handling/canonical"

import {
  approveCloseWaiverAction,
  assignCloseFindingAction,
  commentOnCloseFindingAction,
  exportCertifiedClosePackAction,
  exportDraftClosePackAction,
  listClosePackExportsAction,
  getRetainedClosePackExportAction,
  getCloseAssuranceDashboardAction,
  getCloseEvidenceGraphAction,
  requestCloseWaiverAction,
  runCloseAssuranceAction,
  updateAccountantReviewAction,
  type CloseAssuranceDashboardData,
  type CloseEvidenceGraphDto,
} from "@/actions/accounting/close-assurance.actions"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import type { Locale } from "@/types/bilingual"

export const closeAssuranceKeys = {
  all: ["accounting-close-assurance"] as const,
  dashboard: (organizationId = "unavailable", periodId = "current", locale: Locale = "en", actorId = "unavailable") =>
    [...closeAssuranceKeys.all, "dashboard", actorId, organizationId, periodId, locale] as const,
  evidence: (organizationId = "unavailable", periodId = "current", closeRunId = "live", findingId = "all", actorId = "unavailable") =>
    [...closeAssuranceKeys.all, "evidence", actorId, organizationId, periodId, closeRunId, findingId] as const,
  exports: (organizationId: string, actorId: string, periodId: string, closeRunId: string) =>
    [...closeAssuranceKeys.all, "exports", actorId, organizationId, periodId, closeRunId] as const,
}

export type CloseAssuranceClientScope = {
  actorId?: string | null
  organizationId?: string | null
  periodId?: string | null
  enabled?: boolean
}
type UseCloseAssuranceOptions = CloseAssuranceClientScope & {
  locale?: Locale
  initialData?: CloseAssuranceDashboardData | null
}

function changedScope() { return Object.assign(new Error("The workspace context changed. Refresh before continuing."), { code: "CLIENT_SCOPE_CHANGED" }) }
function useClientScope(scope?: CloseAssuranceClientScope) {
  const active = Boolean(scope?.actorId && scope.organizationId && scope.enabled !== false)
  const key = JSON.stringify([scope?.actorId, scope?.organizationId, scope?.periodId, active])
  const current = useRef({ key, revision: 0, active })
  const mounted = useRef(true)
  if (current.current.key !== key) current.current = { key, revision: current.current.revision + 1, active }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; current.current.revision++ } }, [])
  const capture = () => { if (!mounted.current || !current.current.active) throw changedScope(); return current.current.revision }
  const accepts = (revision: number | undefined) => mounted.current && current.current.active && revision === current.current.revision
  return { active, capture, accepts, async run<T>(work: () => Promise<T>) {
    const revision = capture(); const value = await work(); if (!accepts(revision)) throw changedScope(); return value
  } }
}
function usePrivateQueryLifetime(key: readonly string[], active: boolean) {
  const client = useQueryClient(), identity = JSON.stringify(key)
  const revision = useRef(0), latestIdentity = useRef(identity)
  latestIdentity.current = identity
  useEffect(() => {
    revision.current++
    const clear = () => { void client.cancelQueries({ queryKey: key, exact: true }); client.removeQueries({ queryKey: key, exact: true }) }
    if (!active) clear()
    return () => {
      const stopped = ++revision.current
      // Strict Mode may immediately restore this same observer. A genuine
      // unmount or changed scope still removes its private query record.
      void Promise.resolve().then(() => { if (revision.current === stopped || latestIdentity.current !== identity) clear() })
    }
    // Keys contain only primitive scope fields; their serialized identity is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, identity, active])
}

const copy = {
  en: {
    fetchError: "Close assurance data is unavailable.",
    runStartedTitle: "Close assessment started",
    runStartedBody: "Checking ledger, reconciliation, suspense, and data-trust evidence.",
    runSuccessTitle: "Close assessment complete",
    runErrorTitle: "Close assessment failed",
    assignSuccessTitle: "Finding assigned",
    assignRequestConflict: "This finding has an evidence request. Continue it in the evidence workbench. Ordinary assignment cannot change the response owner or restart review.",
    commentSuccessTitle: "Comment added",
    waiverRequestedTitle: "Waiver requested",
    waiverApprovedTitle: "Waiver approved",
    reviewUpdatedTitle: "Review updated",
    exportDraftTitle: "Draft close pack exported",
    exportCertifiedTitle: "Certified close pack exported",
    setupIncomplete: "Complete accounting setup, then run a new assessment before certifying this close pack.",
    certificationBlocked: "Certification was refused. Review current close evidence and resolve the reported conditions. If evidence is missing, changed or unavailable, run a new assessment. Then a different authorized person can certify it.",
    freshAuthRequired: "Confirm your identity on this page, then retry certification.",
    assessmentChanged: "A newer assessment exists. Refresh the latest assessment and review its evidence before trying certification again.",
    assessmentAmbiguous: "The latest assessments have the same creation time. Run a new assessment, then review its evidence before certification.",
    assessmentVoided: "This assessment has been voided. Run a new assessment before certification.",
    assessmentClock: "The assessment could not be published with a reliable time. Wait briefly and retry. Contact support if this continues.",
    mutationErrorTitle: "Close action failed",
  },
  fr: {
    fetchError: "Les donnees de cloture sont indisponibles.",
    runStartedTitle: "Evaluation lancee",
    runStartedBody: "Verification du ledger, de la reconciliation, du suspense et des preuves.",
    runSuccessTitle: "Evaluation terminee",
    runErrorTitle: "Evaluation impossible",
    assignSuccessTitle: "Blocage assigne",
    assignRequestConflict: "Ce blocage comporte une demande de justificatifs. Poursuivez-la dans l’espace de traitement des justificatifs. L’attribution ordinaire ne peut pas changer le responsable de la réponse ni relancer la revue.",
    commentSuccessTitle: "Commentaire ajoute",
    waiverRequestedTitle: "Derogation demandee",
    waiverApprovedTitle: "Derogation approuvee",
    reviewUpdatedTitle: "Revue mise a jour",
    exportDraftTitle: "Pack de cloture brouillon exporte",
    exportCertifiedTitle: "Pack de cloture certifie exporte",
    setupIncomplete: "Terminez la configuration comptable, puis lancez une nouvelle évaluation avant de certifier ce dossier de clôture.",
    certificationBlocked: "Certification refusée. Examinez les preuves et corrigez les causes signalées. Si des preuves manquent, ont changé ou sont indisponibles, lancez une nouvelle évaluation. Une autre personne autorisée pourra certifier.",
    freshAuthRequired: "Confirmez votre identité sur cette page, puis réessayez la certification.",
    assessmentChanged: "Une évaluation plus récente existe. Actualisez la dernière évaluation et examinez ses preuves avant de réessayer la certification.",
    assessmentAmbiguous: "Les dernières évaluations ont la même date de création. Lancez une nouvelle évaluation, puis examinez ses preuves avant la certification.",
    assessmentVoided: "Cette évaluation a été annulée. Lancez une nouvelle évaluation avant la certification.",
    assessmentClock: "L’évaluation n’a pas pu être publiée avec une date fiable. Patientez un instant et réessayez. Contactez l’assistance si le problème persiste.",
    mutationErrorTitle: "Action de cloture impossible",
  },
} as const

function unwrap<T>(result: { success: boolean; data: T | null; error: string | null; code?: string | null }): T {
  if (!result.success || !result.data) {
    throw Object.assign(new Error(result.error || copy.en.fetchError), { code: result.code })
  }
  return result.data
}

function needsIdentityVerification(error: Error) {
  return "code" in error && error.code === "FRESH_AUTH_REQUIRED"
}

function unwrapAssessment<T>(result: { success: boolean; data: T | null; error: string | null; code?: string | null }, locale: Locale): T {
  if (!result.success) {
    const messages: Record<string, string> = {
      "This close assessment is no longer current. Open the latest assessment before certification.": copy[locale].assessmentChanged,
      "The latest close assessments have the same creation time. Run a new assessment before certification.": copy[locale].assessmentAmbiguous,
      "This close assessment has been voided. Run a new assessment before certification.": copy[locale].assessmentVoided,
      "The database clock has not advanced beyond the latest assessment. Wait briefly and retry; contact support if this persists.": copy[locale].assessmentClock,
      "The assessment publication time is unavailable. Retry after the database clock is available.": copy[locale].assessmentClock,
    }
    const message = result.error && messages[result.error]
    if (message) throw Object.assign(new Error(message), { code: result.code })
  }
  return unwrap(result)
}

function organizationKey(options?: UseCloseAssuranceOptions) {
  return options?.organizationId || "unavailable"
}

function periodKey(options?: UseCloseAssuranceOptions) {
  return options?.periodId || "current"
}

export function useCloseAssurance(options: UseCloseAssuranceOptions = {}) {
  const locale = options.locale ?? "en"
  const organizationId = organizationKey(options)
  const periodId = periodKey(options)
  const scope = useClientScope(options), key = closeAssuranceKeys.dashboard(organizationId, periodId, locale, options.actorId || "unavailable")
  usePrivateQueryLifetime(key, scope.active)
  const query = useQuery({
    queryKey: key,
    queryFn: () => scope.run(async () => {
      const data = unwrap(await getCloseAssuranceDashboardAction({ periodId: options.periodId ?? undefined }))
      if (data.organizationId !== organizationId || data.actorId !== options.actorId) throw changedScope()
      return data
    }),
    enabled: scope.active,
    staleTime: 45_000,
    gcTime: 5 * 60_000,
  })
  return { ...query, data: scope.active && query.data?.organizationId === organizationId && query.data.actorId === options.actorId ? query.data : undefined }
}

export function useCloseEvidenceGraph(options: UseCloseAssuranceOptions & { closeRunId?: string | null; findingId?: string | null } = {}) {
  const organizationId = organizationKey(options)
  const periodId = periodKey(options)
  const closeRunId = options.closeRunId || "live"
  const findingId = options.findingId || "all"
  const scope = useClientScope(options), key = closeAssuranceKeys.evidence(organizationId, periodId, closeRunId, findingId, options.actorId || "unavailable")
  usePrivateQueryLifetime(key, scope.active)
  const query = useQuery<CloseEvidenceGraphDto>({
    queryKey: key,
    queryFn: () => scope.run(async () => unwrap(
        await getCloseEvidenceGraphAction({
          periodId: options.periodId ?? undefined,
          closeRunId: options.closeRunId ?? undefined,
          findingId: options.findingId ?? undefined,
        }),
      )),
    enabled: scope.active && Boolean(options.periodId || options.closeRunId),
    staleTime: 45_000,
    gcTime: 5 * 60_000,
  })
  return { ...query, data: scope.active ? query.data : undefined }
}

export function useRunCloseAssurance(locale: Locale = "en", clientScope?: CloseAssuranceClientScope) {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]
  const scope = useClientScope(clientScope)

  return useMutation({
    onMutate: scope.capture,
    retry: false,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: async (input: { periodId: string; correlationId?: string }) => {
      notifications.info(t.runStartedTitle, t.runStartedBody)
      return scope.run(async () => {
        const data = unwrapAssessment(await runCloseAssuranceAction(input), locale)
        if (data.organizationId !== clientScope?.organizationId || data.actorId !== clientScope?.actorId) throw changedScope()
        return data
      })
    },
    onSuccess: (data, _input, revision) => {
      if (!scope.accepts(revision)) return
      queryClient.setQueryData(
        closeAssuranceKeys.dashboard(clientScope!.organizationId!, data.period?.id ?? "current", locale, clientScope!.actorId!),
        data,
      )
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.dashboard(clientScope!.organizationId!, data.period?.id ?? "current", locale, clientScope!.actorId!) })
      notifications.success(t.runSuccessTitle, `${data.run.status} - ${data.run.readinessScore}%`)
    },
    onError: (error: Error, _input, revision) => {
      if (!scope.accepts(revision)) return
      if (!needsIdentityVerification(error)) notifications.error(t.runErrorTitle, error.message)
    },
  })
}

export function useAssignCloseFinding(locale: Locale = "en", clientScope?: CloseAssuranceClientScope) {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]
  const scope = useClientScope(clientScope)

  return useMutation({
    retry: false,
    onMutate: scope.capture,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: (input: { findingId: string; assignedToId?: string; correlationId?: string }) => scope.run(async () => {
      const result = await assignCloseFindingAction(input)
      if (!result.success && result.code === "CONFLICT") {
        throw Object.assign(new Error(t.assignRequestConflict), { code: result.code })
      }
      return unwrap(result)
    }),
    onSuccess: (_data, _input, revision) => {
      if (!scope.accepts(revision)) return
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.assignSuccessTitle, "")
    },
    onError: (error: Error, _input, revision) => { if (scope.accepts(revision) && !needsIdentityVerification(error)) notifications.error(t.mutationErrorTitle, error.message) },
  })
}

export function useCommentOnCloseFinding(locale: Locale = "en", clientScope?: CloseAssuranceClientScope) {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]
  const scope = useClientScope(clientScope)

  return useMutation({
    retry: false,
    onMutate: scope.capture,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: async (input: {
      closeRunId?: string
      findingId?: string
      evidenceItemId?: string
      reviewId?: string
      body: string
      correlationId?: string
    }) => scope.run(async () => unwrap(await commentOnCloseFindingAction(input))),
    onSuccess: (_data, _input, revision) => {
      if (!scope.accepts(revision)) return
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.commentSuccessTitle, "")
    },
    onError: (error: Error, _input, revision) => { if (scope.accepts(revision) && !needsIdentityVerification(error)) notifications.error(t.mutationErrorTitle, error.message) },
  })
}

export function useCloseWaiver(locale: Locale = "en", clientScope?: CloseAssuranceClientScope) {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]
  const scope = useClientScope(clientScope)

  const request = useMutation({
    retry: false,
    onMutate: scope.capture,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: async (input: { findingId: string; reason: string; correlationId?: string }) =>
      scope.run(async () => unwrap(await requestCloseWaiverAction(input))),
    onSuccess: (_data, _input, revision) => {
      if (!scope.accepts(revision)) return
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.waiverRequestedTitle, "")
    },
    onError: (error: Error, _input, revision) => { if (scope.accepts(revision) && !needsIdentityVerification(error)) notifications.error(t.mutationErrorTitle, error.message) },
  })

  const approve = useMutation({
    retry: false,
    onMutate: scope.capture,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: async (input: { findingId: string; correlationId?: string }) =>
      scope.run(async () => unwrap(await approveCloseWaiverAction(input))),
    onSuccess: (_data, _input, revision) => {
      if (!scope.accepts(revision)) return
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.waiverApprovedTitle, "")
    },
    onError: (error: Error, _input, revision) => { if (scope.accepts(revision) && !needsIdentityVerification(error)) notifications.error(t.mutationErrorTitle, error.message) },
  })

  return { request, approve }
}

export function useUpdateAccountantReview(locale: Locale = "en", clientScope?: CloseAssuranceClientScope) {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]
  const scope = useClientScope(clientScope)

  return useMutation({
    retry: false,
    onMutate: scope.capture,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: async (input: {
      closeRunId: string
      status: "OPEN" | "CHANGES_REQUESTED" | "READY_TO_CLOSE" | "APPROVED_FOR_CLOSE" | "REJECTED" | "CANCELLED"
      decisionNotes?: string
      correlationId?: string
    }) => scope.run(async () => unwrap(await updateAccountantReviewAction(input))),
    onSuccess: (_data, _input, revision) => {
      if (!scope.accepts(revision)) return
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.reviewUpdatedTitle, "")
    },
    onError: (error: Error, _input, revision) => { if (scope.accepts(revision) && !needsIdentityVerification(error)) notifications.error(t.mutationErrorTitle, error.message) },
  })
}

export function useExportClosePack(locale: Locale = "en", clientScope?: CloseAssuranceClientScope) {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]
  const scope = useClientScope(clientScope)
  const attempts = useRef(new Map<string, string>())
  const correlation = (input: { closeRunId: string; correlationId?: string }, mode: string) => {
    if (input.correlationId) return input
    const key = JSON.stringify([clientScope?.actorId, clientScope?.organizationId, clientScope?.periodId, input.closeRunId, mode])
    if (!attempts.current.has(key)) attempts.current.set(key, createCorrelationId("close_export"))
    return { ...input, correlationId: attempts.current.get(key)! }
  }
  useEffect(() => { attempts.current.clear() }, [scope.active, clientScope?.actorId, clientScope?.organizationId, clientScope?.periodId])

  const draft = useMutation({
    retry: false,
    onMutate: scope.capture,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: async (input: { closeRunId: string; correlationId?: string }) =>
      scope.run(async () => unwrap(await exportDraftClosePackAction({ ...correlation(input, "DRAFT_NOT_CERTIFIED"), mode: "DRAFT_NOT_CERTIFIED" }))),
    onSuccess: (data, _input, revision) => {
      if (!scope.accepts(revision)) return
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.exportDraftTitle, data.contentHash)
    },
    onError: (error: Error, _input, revision) => { if (scope.accepts(revision) && !needsIdentityVerification(error)) notifications.error(t.mutationErrorTitle, error.message) },
  })

  const certified = useMutation({
    onMutate: scope.capture,
    retry: false,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: (input: { closeRunId: string; correlationId?: string }) => scope.run(async () => {
      const result = await exportCertifiedClosePackAction({ ...correlation(input, "CERTIFIED"), mode: "CERTIFIED" })
      if (!result.success && result.code === "FRESH_AUTH_REQUIRED") {
        throw Object.assign(new Error(t.freshAuthRequired), { code: result.code })
      }
      if (!result.success && result.error === "Certified close pack requires enabled accounting with READY or LOCKED setup. Complete accounting setup and run a new assessment.") {
        throw new Error(t.setupIncomplete)
      }
      if (!result.success && result.error?.startsWith("Certified close pack is blocked:")) {
        throw Object.assign(new Error(t.certificationBlocked), { code: result.code })
      }
      return unwrapAssessment(result, locale)
    }),
    onSuccess: (data, _input, revision) => {
      if (!scope.accepts(revision)) return
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.exportCertifiedTitle, data.contentHash)
    },
    onError: async (error: Error, _input, revision) => {
      if (!scope.accepts(revision)) return
      // A refused certification can persist evidence invalidation. Reload the
      // read models before allowing another deliberate certification attempt.
      await queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      if (scope.accepts(revision) && !needsIdentityVerification(error)) notifications.error(t.mutationErrorTitle, error.message)
    },
  })

  const recover = useMutation({
    onMutate: scope.capture, retry: false,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: (input: { exportId: string; mode: "CERTIFIED" | "DRAFT_NOT_CERTIFIED" }) =>
      scope.run(async () => unwrap(await getRetainedClosePackExportAction(input))),
  })
  return { draft, certified, recover }
}

export function useClosePackExports(options: CloseAssuranceClientScope & { closeRunId?: string | null }) {
  const scope = useClientScope(options), key = closeAssuranceKeys.exports(options.organizationId || "unavailable", options.actorId || "unavailable", options.periodId || "current", options.closeRunId || "unavailable")
  const active = scope.active && Boolean(options.closeRunId)
  usePrivateQueryLifetime(key, active)
  const query = useQuery({ queryKey: key, enabled: active, retry: false,
    queryFn: () => scope.run(async () => unwrap(await listClosePackExportsAction({ closeRunId: options.closeRunId! }))),
    staleTime: 0, meta: { suppressErrorNotification: true },
  })
  return { ...query, data: active && !query.error ? query.data : undefined }
}
