"use client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { changeMemberAccessAction, getMemberAccessAction } from "@/actions/users/memberAccess"
import type { MemberAccessCommand } from "@/services/users/member-access-input"

export class MemberAccessError extends Error { constructor(public code: string) { super(code) } }

export function useMemberAccess(organizationId: string, actorId: string, memberId: string) {
  const client = useQueryClient()
  const key = ["member-access", organizationId, actorId, memberId]
  const query = useQuery({ queryKey: key, retry: false, staleTime: 0, queryFn: async () => {
    const result = await getMemberAccessAction(memberId)
    if (!result.success || !result.data) throw new MemberAccessError(result.code ?? "INTERNAL_ERROR")
    if (result.data.organizationId !== organizationId) throw new MemberAccessError("FORBIDDEN")
    return result.data
  } })
  const mutation = useMutation({ retry: false, meta: { suppressSuccessNotification: true, suppressErrorNotification: true }, mutationFn: async (command: MemberAccessCommand) => {
    const result = await changeMemberAccessAction(memberId, command)
    if (!result.success || !result.data) throw new MemberAccessError(result.code ?? "INTERNAL_ERROR")
    return result.data
  }, onSuccess: () => { void client.invalidateQueries({ queryKey: ["permissions"] }); void client.invalidateQueries({ queryKey: key }) } })
  return { query, mutation }
}
