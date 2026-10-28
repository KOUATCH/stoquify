"use client"

import { useQuery } from "@tanstack/react-query"

import {
  getComplianceCenterKernelSnapshotAction,
  type ComplianceCenterKernelSnapshot,
} from "@/actions/compliance/compliance-center.actions"

export type ComplianceCenterQueryInput = {
  countryCode?: string
  limit?: number
}

export type ComplianceCenterQueryError = Error & {
  status?: number
}

export const complianceCenterKeys = {
  all: ["compliance-center"] as const,
  dashboard: (params: ComplianceCenterQueryInput = {}) =>
    [
      ...complianceCenterKeys.all,
      "kernel-snapshot",
      params.countryCode?.toUpperCase() ?? "all",
      params.limit ?? 50,
    ] as const,
}

function toActionError(result: { error?: string | null; status?: number }) {
  const error = new Error(result.error || "Compliance center data is unavailable.") as ComplianceCenterQueryError
  error.status = result.status
  return error
}

export function unwrapComplianceCenterActionResult<T>(
  result:
    | { success: true; data: T; error: null; status: 200 }
    | { success: false; data: null; error: string; status: number },
) {
  if (!result.success || !result.data) {
    throw toActionError(result)
  }

  return result.data
}

export function useComplianceCenter(options: {
  input?: ComplianceCenterQueryInput
  initialData?: ComplianceCenterKernelSnapshot | null
  enabled?: boolean
} = {}) {
  const input = options.input ?? {}

  return useQuery({
    queryKey: complianceCenterKeys.dashboard(input),
    queryFn: async () =>
      unwrapComplianceCenterActionResult(
        await getComplianceCenterKernelSnapshotAction({
          countryCode: input.countryCode,
          limit: input.limit ?? 50,
        }),
      ),
    initialData: options.initialData ?? undefined,
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    refetchInterval: 45_000,
  })
}

export type { ComplianceCenterKernelSnapshot }
