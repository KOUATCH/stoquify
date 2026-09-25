"use client"
import { useMutation, useQuery } from "@tanstack/react-query"
import { exportOrganizationDirectoryAction, getOrganizationDirectoryExportPreviewAction } from "@/actions/organization/organization-directory-export.actions"
import type { DirectoryExportInput, DirectoryPreviewInput } from "@/services/organization/organization-directory-input"

export class OrganizationDirectoryExportError extends Error { constructor(public readonly code: string) { super(code) } }
export function useOrganizationDirectoryExport(organizationId: string, actorId: string, input: DirectoryPreviewInput, open: boolean) {
  const query = useQuery({ queryKey: ["organization-directory-export-preview", organizationId, actorId, input], enabled: open, staleTime: 0, retry: false, meta: { suppressErrorNotification: true }, queryFn: async () => {
    const result = await getOrganizationDirectoryExportPreviewAction(organizationId, input)
    if (!result.success || !result.data) throw new OrganizationDirectoryExportError(result.code ?? "INTERNAL_ERROR")
    if (result.data.organizationId !== organizationId || result.data.actorId !== actorId) throw new OrganizationDirectoryExportError("FORBIDDEN")
    return result.data
  } })
  const mutation = useMutation({ retry: false, meta: { suppressErrorNotification: true, suppressSuccessNotification: true }, mutationFn: async (command: DirectoryExportInput) => {
    const result = await exportOrganizationDirectoryAction(organizationId, command)
    if (!result.success || !result.data) throw new OrganizationDirectoryExportError(result.code ?? "INTERNAL_ERROR")
    return result.data
  } })
  return { query, mutation }
}
