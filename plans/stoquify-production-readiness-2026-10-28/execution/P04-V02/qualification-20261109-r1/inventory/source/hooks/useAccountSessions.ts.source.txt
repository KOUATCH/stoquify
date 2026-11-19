"use client"
import { useMutation, useQuery } from "@tanstack/react-query"
import { getAccountSessionPreviewAction, revokeReviewedAccountSessionsAction } from "@/actions/security/account-session.actions"
import type { AccountSessionCommand } from "@/services/security/account-session-input"

export class AccountSessionsError extends Error { constructor(public readonly code: string) { super(code) } }
export function useAccountSessions(organizationId: string, actorId: string, sessionId: string) {
  const query = useQuery({ queryKey: ["account-sessions", organizationId, actorId, sessionId], staleTime: 0, retry: false, meta: { suppressErrorNotification: true }, queryFn: async () => {
    const result = await getAccountSessionPreviewAction()
    if (!result.success) throw new AccountSessionsError(result.code ?? "INTERNAL_ERROR")
    if (result.data.actorId !== actorId || result.data.organizationId !== organizationId || result.data.sessionId !== sessionId) throw new AccountSessionsError("FORBIDDEN")
    return result.data
  } })
  const mutation = useMutation({ retry: false, meta: { suppressErrorNotification: true, suppressSuccessNotification: true }, mutationFn: async (command: AccountSessionCommand) => {
    const result = await revokeReviewedAccountSessionsAction(command)
    if (!result.success) throw new AccountSessionsError(result.code ?? "INTERNAL_ERROR")
    if (result.data.actorId !== actorId || result.data.organizationId !== organizationId || result.data.requestId !== command.requestId) throw new AccountSessionsError("FORBIDDEN")
    return result.data
  } })
  return { query, mutation }
}
