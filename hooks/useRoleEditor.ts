"use client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getRoleEditor } from "@/actions/roles/getRoleEditor"
import createRole from "@/actions/roles/createRole"
import { updateRole } from "@/actions/roles/updateRole"
import type { RoleFormData } from "@/types/types"
import type { RoleCommand } from "@/services/roles/role-command"

export class RoleWorkflowError extends Error {
  constructor(public readonly code: string) { super(code) }
}
export function useRoleEditor(organizationId: string, actorId: string, editingId?: string) {
  return useQuery({
    queryKey: ["role-editor", organizationId, actorId, editingId ?? "new"], staleTime: 0, retry: false,
    queryFn: async () => {
      const result = await getRoleEditor(editingId)
      if (!result.success || !result.data) throw new RoleWorkflowError("code" in result ? result.code : "INTERNAL_ERROR")
      if (result.data.organizationId !== organizationId) throw new RoleWorkflowError("FORBIDDEN")
      return result.data
    },
  })
}
export function useSaveRole(editingId?: string) {
  const client = useQueryClient()
  return useMutation({ retry: false,
    meta: { operation: editingId ? "update" : "create", entity: "Role", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ data, command }: { data: RoleFormData; command: RoleCommand }) => {
      const result = editingId ? await updateRole(editingId, data, command) : await createRole(data, command)
      if (!result.success || !result.data) throw new RoleWorkflowError("code" in result ? result.code : "INTERNAL_ERROR")
      return result.data
    },
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["permissions"] }); await client.invalidateQueries({ queryKey: ["role-editor"] }); await client.invalidateQueries({ queryKey: ["roles"] }) },
  })
}
