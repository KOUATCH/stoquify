"use client"

import { useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { clonePurchaseOrder } from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"
import { localizePath } from "@/i18n/routing"
import type { Locale } from "@/types/bilingual"
import { notify } from "@/lib/notifications/notify"
import { getModuleOperationErrorReason } from "@/lib/modules/module-operation-error"

export function usePurchaseOrderClone(input: { id: string; organizationId: string; actorId: string; allowed: boolean; locale: Locale }) {
  const router = useRouter()
  const client = useQueryClient()
  const t = useTranslations("purchaseOrderClone")
  const requestInFlight = useRef(false)
  const requestId = useRef<string | null>(null)
  const storageKey = `purchase-clone:${input.organizationId}:${input.actorId}:${input.id}`
  const requestScope = useRef(storageKey)
  if (requestScope.current !== storageKey) { requestScope.current = storageKey; requestId.current = null }
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<"denied" | "unavailable" | "stopped" | "unknown" | null>(null)
  const mutation = useMutation({ mutationFn: (params: Parameters<typeof clonePurchaseOrder>[0]) => clonePurchaseOrder(params), retry: false })

  async function clone() {
    if (requestInFlight.current) return
    if (!input.allowed || !input.actorId) { setFailure("denied"); return }
    requestInFlight.current = true
    setPending(true)
    setFailure(null)
    let confirmed = false
    let uncertain = false
    try {
      // Store only an opaque identity, never purchasing content or credentials.
      // A previous unknown result must be resolved before any command is sent.
      const retained = sessionStorage.getItem(storageKey)
      requestId.current ??= retained ?? crypto.randomUUID()
      sessionStorage.setItem(storageKey, requestId.current)
      const result = await mutation.mutateAsync({ id: input.id, organizationId: input.organizationId, requestId: requestId.current, ...(retained ? { recoverOnly: true } : {}) })
      if (!result.success || !result.data?.id || !retained && result.data.status !== "DRAFT") {
        const reason = retained ? "unknown" : getModuleOperationErrorReason(result) ? "stopped" : result.failure ?? "unknown"
        uncertain = reason === "unknown"
        if (!uncertain) sessionStorage.removeItem(storageKey)
        setFailure(reason)
        return
      }
      confirmed = true
      sessionStorage.removeItem(storageKey)
      void client.invalidateQueries({ queryKey: ["purchase-orders", "list"] })
      void client.invalidateQueries({ queryKey: ["purchase-orders", "summary", input.organizationId] })
      notify.success(t("created"))
      const destination = `/dashboard/purchase-orders/${result.data.id}${result.canEdit && result.data.status === "DRAFT" ? "/edit" : ""}`
      router.push(localizePath(destination, input.locale))
      router.refresh()
    } catch {
      uncertain = true
      setFailure("unknown")
    } finally {
      if (!confirmed || uncertain) setPending(false)
      if (!confirmed) requestInFlight.current = false
    }
  }

  return { clone, pending, failure, retryBlocked: false }
}
