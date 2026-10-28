"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  approveCloseWaiverAction,
  assignCloseFindingAction,
  commentOnCloseFindingAction,
  exportCertifiedClosePackAction,
  exportDraftClosePackAction,
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
  dashboard: (organizationId = "current", periodId = "current", locale: Locale = "en") =>
    [...closeAssuranceKeys.all, "dashboard", organizationId, periodId, locale] as const,
  evidence: (organizationId = "current", periodId = "current", closeRunId = "live", findingId = "all") =>
    [...closeAssuranceKeys.all, "evidence", organizationId, periodId, closeRunId, findingId] as const,
}

type UseCloseAssuranceOptions = {
  organizationId?: string | null
  periodId?: string | null
  locale?: Locale
  initialData?: CloseAssuranceDashboardData | null
  enabled?: boolean
}

const copy = {
  en: {
    fetchError: "Close assurance data is unavailable.",
    runStartedTitle: "Close assessment started",
    runStartedBody: "Checking ledger, reconciliation, suspense, and data-trust evidence.",
    runSuccessTitle: "Close assessment complete",
    runErrorTitle: "Close assessment failed",
    assignSuccessTitle: "Finding assigned",
    commentSuccessTitle: "Comment added",
    waiverRequestedTitle: "Waiver requested",
    waiverApprovedTitle: "Waiver approved",
    reviewUpdatedTitle: "Review updated",
    exportDraftTitle: "Draft close pack exported",
    exportCertifiedTitle: "Certified close pack exported",
    mutationErrorTitle: "Close action failed",
  },
  fr: {
    fetchError: "Les donnees de cloture sont indisponibles.",
    runStartedTitle: "Evaluation lancee",
    runStartedBody: "Verification du ledger, de la reconciliation, du suspense et des preuves.",
    runSuccessTitle: "Evaluation terminee",
    runErrorTitle: "Evaluation impossible",
    assignSuccessTitle: "Blocage assigne",
    commentSuccessTitle: "Commentaire ajoute",
    waiverRequestedTitle: "Derogation demandee",
    waiverApprovedTitle: "Derogation approuvee",
    reviewUpdatedTitle: "Revue mise a jour",
    exportDraftTitle: "Pack de cloture brouillon exporte",
    exportCertifiedTitle: "Pack de cloture certifie exporte",
    mutationErrorTitle: "Action de cloture impossible",
  },
} as const

function unwrap<T>(result: { success: boolean; data: T | null; error: string | null }): T {
  if (!result.success || !result.data) {
    throw new Error(result.error || copy.en.fetchError)
  }
  return result.data
}

function organizationKey(options?: UseCloseAssuranceOptions) {
  return options?.organizationId || "current"
}

function periodKey(options?: UseCloseAssuranceOptions) {
  return options?.periodId || options?.initialData?.period?.id || "current"
}

export function useCloseAssurance(options: UseCloseAssuranceOptions = {}) {
  const locale = options.locale ?? "en"
  const organizationId = organizationKey(options)
  const periodId = periodKey(options)

  return useQuery({
    queryKey: closeAssuranceKeys.dashboard(organizationId, periodId, locale),
    queryFn: async () => unwrap(await getCloseAssuranceDashboardAction({ periodId: options.periodId ?? undefined })),
    initialData: options.initialData ?? undefined,
    enabled: options.enabled ?? true,
    staleTime: 45_000,
    gcTime: 5 * 60_000,
  })
}

export function useCloseEvidenceGraph(options: UseCloseAssuranceOptions & { closeRunId?: string | null; findingId?: string | null } = {}) {
  const organizationId = organizationKey(options)
  const periodId = periodKey(options)
  const closeRunId = options.closeRunId || "live"
  const findingId = options.findingId || "all"

  return useQuery<CloseEvidenceGraphDto>({
    queryKey: closeAssuranceKeys.evidence(organizationId, periodId, closeRunId, findingId),
    queryFn: async () =>
      unwrap(
        await getCloseEvidenceGraphAction({
          periodId: options.periodId ?? undefined,
          closeRunId: options.closeRunId ?? undefined,
          findingId: options.findingId ?? undefined,
        }),
      ),
    enabled: options.enabled ?? Boolean(options.periodId || options.closeRunId),
    staleTime: 45_000,
    gcTime: 5 * 60_000,
  })
}

export function useRunCloseAssurance(locale: Locale = "en", organizationId = "current") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    mutationFn: async (input: { periodId: string; correlationId?: string }) => {
      notifications.info(t.runStartedTitle, t.runStartedBody)
      return unwrap(await runCloseAssuranceAction(input))
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.dashboard(organizationId, data.period?.id ?? "current", locale) })
      notifications.success(t.runSuccessTitle, `${data.run.status} - ${data.run.readinessScore}%`)
    },
    onError: (error: Error) => {
      notifications.error(t.runErrorTitle, error.message)
    },
  })
}

export function useAssignCloseFinding(locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    mutationFn: async (input: { findingId: string; assignedToId?: string; correlationId?: string }) =>
      unwrap(await assignCloseFindingAction(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.assignSuccessTitle, "")
    },
    onError: (error: Error) => notifications.error(t.mutationErrorTitle, error.message),
  })
}

export function useCommentOnCloseFinding(locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    mutationFn: async (input: {
      closeRunId?: string
      findingId?: string
      evidenceItemId?: string
      reviewId?: string
      body: string
      correlationId?: string
    }) => unwrap(await commentOnCloseFindingAction(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.commentSuccessTitle, "")
    },
    onError: (error: Error) => notifications.error(t.mutationErrorTitle, error.message),
  })
}

export function useCloseWaiver(locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  const request = useMutation({
    mutationFn: async (input: { findingId: string; reason: string; correlationId?: string }) =>
      unwrap(await requestCloseWaiverAction(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.waiverRequestedTitle, "")
    },
    onError: (error: Error) => notifications.error(t.mutationErrorTitle, error.message),
  })

  const approve = useMutation({
    mutationFn: async (input: { findingId: string; correlationId?: string }) =>
      unwrap(await approveCloseWaiverAction(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.waiverApprovedTitle, "")
    },
    onError: (error: Error) => notifications.error(t.mutationErrorTitle, error.message),
  })

  return { request, approve }
}

export function useUpdateAccountantReview(locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    mutationFn: async (input: {
      closeRunId: string
      status: "OPEN" | "CHANGES_REQUESTED" | "READY_TO_CLOSE" | "APPROVED_FOR_CLOSE" | "REJECTED" | "CANCELLED"
      decisionNotes?: string
      correlationId?: string
    }) => unwrap(await updateAccountantReviewAction(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.reviewUpdatedTitle, "")
    },
    onError: (error: Error) => notifications.error(t.mutationErrorTitle, error.message),
  })
}

export function useExportClosePack(locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  const draft = useMutation({
    mutationFn: async (input: { closeRunId: string; correlationId?: string }) =>
      unwrap(await exportDraftClosePackAction({ ...input, mode: "DRAFT_NOT_CERTIFIED" })),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.exportDraftTitle, data.contentHash)
    },
    onError: (error: Error) => notifications.error(t.mutationErrorTitle, error.message),
  })

  const certified = useMutation({
    mutationFn: async (input: { closeRunId: string; correlationId?: string }) =>
      unwrap(await exportCertifiedClosePackAction({ ...input, mode: "CERTIFIED" })),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeAssuranceKeys.all })
      notifications.success(t.exportCertifiedTitle, data.contentHash)
    },
    onError: (error: Error) => notifications.error(t.mutationErrorTitle, error.message),
  })

  return { draft, certified }
}
