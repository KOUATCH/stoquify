"use client"
import { useMutation, useQuery } from "@tanstack/react-query"
import { exportMemberHistoryAction, getMemberHistoryAction } from "@/actions/users/memberHistory"
import { MemberAccessError } from "./useMemberAccess"
import type { MemberHistoryExportInput, MemberHistoryInput } from "@/services/users/member-history-input"
import type { MemberHistoryPage } from "@/services/users/member-history.service"

export function useMemberHistory(organizationId: string, actorId: string, memberId: string, page: MemberHistoryInput, initial?: MemberHistoryPage) {
  return useQuery({ queryKey: ["member-access-history", organizationId, actorId, memberId, page], staleTime: 0, retry: false, initialData: !page.beforeId && !page.throughId ? initial : undefined, queryFn: async () => {
    const result = await getMemberHistoryAction(memberId, page)
    if (!result.success || !result.data) throw new MemberAccessError(result.code ?? "INTERNAL_ERROR")
    return result.data
  } })
}

export function useExportMemberHistory(memberId: string) {
  return useMutation({ retry: false, meta: { suppressSuccessNotification: true, suppressErrorNotification: true }, mutationFn: async (input: MemberHistoryExportInput) => {
    const result = await exportMemberHistoryAction(memberId, input)
    if (!result.success || !result.data) throw new MemberAccessError(result.code ?? "INTERNAL_ERROR")
    return result.data
  } })
}
