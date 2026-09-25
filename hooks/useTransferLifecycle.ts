"use client"

import { useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { executeTransferCommand, getTransferDetail } from "@/actions/inventory/transferLifecycleActions"
import { TransferKeys } from "./useTransferQueries"
import type { TransferCommand, TransferDetail } from "@/types/transferLifecycle"

function message(error: unknown) {
  const value = error as { userMessage?: string; message?: string } | undefined
  return value?.userMessage || value?.message || "The transfer could not be updated."
}

export function useTransferWorkflow(organizationId: string, transferId: string) {
  return useQuery<TransferDetail>({
    queryKey: [...TransferKeys.detail(transferId, organizationId), "workflow"],
    queryFn: async () => {
      const response = await getTransferDetail({ organizationId, transferId })
      if (!response.success || !response.data) throw new Error(message(response.error))
      return response.data
    },
    enabled: Boolean(organizationId && transferId),
    retry: false,
  })
}

export function useTransferCommand() {
  const client = useQueryClient()
  const pendingRequests = useRef(new Map<string, string>())
  return useMutation({
    meta: { operation: "update", entity: "Transfer", suppressErrorNotification: true },
    retry: false,
    mutationFn: async (command: Omit<TransferCommand, "requestId">) => {
      const signature = JSON.stringify(command)
      const requestId = pendingRequests.current.get(signature) ?? crypto.randomUUID()
      pendingRequests.current.set(signature, requestId)
      const response = await executeTransferCommand({ ...command, requestId })
      if (!response.success) throw new Error(message(response.error))
      pendingRequests.current.delete(signature)
      return response.data
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: TransferKeys.all }),
        client.invalidateQueries({ queryKey: ["inventory"] }),
      ])
    },
  })
}
