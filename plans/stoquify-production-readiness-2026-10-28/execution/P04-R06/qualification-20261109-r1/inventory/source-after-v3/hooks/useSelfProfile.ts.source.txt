"use client"
import { useMutation, useQuery } from "@tanstack/react-query"
import { getSelfProfileAction, updateSelfProfileAction } from "@/actions/users/self-profile.actions"
import type { SelfProfileCommand } from "@/services/users/self-profile-input"

export class SelfProfileError extends Error { constructor(public readonly code: string) { super(code) } }
export function useSelfProfile(organizationId: string, actorId: string) {
  const query = useQuery({ queryKey: ["self-profile", organizationId, actorId], staleTime: 0, retry: false, meta: { suppressErrorNotification: true }, queryFn: async () => {
    const result = await getSelfProfileAction()
    if (!result.success) throw new SelfProfileError(result.code ?? "INTERNAL_ERROR")
    if (result.data.actorId !== actorId || result.data.organizationId !== organizationId) throw new SelfProfileError("FORBIDDEN")
    return result.data
  } })
  const mutation = useMutation({ retry: false, meta: { suppressErrorNotification: true, suppressSuccessNotification: true }, mutationFn: async (command: SelfProfileCommand) => {
    const result = await updateSelfProfileAction(command)
    if (!result.success) throw new SelfProfileError(result.code ?? "INTERNAL_ERROR")
    if (result.data.actorId !== actorId || result.data.organizationId !== organizationId || result.data.requestId !== command.requestId) throw new SelfProfileError("FORBIDDEN")
    return result.data
  } })
  return { query, mutation }
}
