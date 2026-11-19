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

export function usePurchaseOrderClone(input: { id: string; organizationId: string; allowed: boolean; locale: Locale }) {
  const router = useRouter()
  const client = useQueryClient()
  const t = useTranslations("purchaseOrderClone")
  const requestInFlight = useRef(false)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<"denied" | "unavailable" | "stopped" | "unknown" | null>(null)
  const mutation = useMutation({ mutationFn: (params: Parameters<typeof clonePurchaseOrder>[0]) => clonePurchaseOrder(params), retry: false })

  async function clone() {
    if (requestInFlight.current) return
    if (!input.allowed) { setFailure("denied"); return }
    requestInFlight.current = true
    setPending(true)
    setFailure(null)
    let confirmed = false
    let uncertain = false
    try {
      const result = await mutation.mutateAsync({ id: input.id, organizationId: input.organizationId })
      if (!result.success || !result.data?.id || result.data.status !== "DRAFT") {
        const reason = getModuleOperationErrorReason(result) ? "stopped" : result.failure ?? "unknown"
        uncertain = reason === "unknown"
        setFailure(reason)
        return
      }
      confirmed = true
      void client.invalidateQueries({ queryKey: ["purchase-orders", "list"] })
      void client.invalidateQueries({ queryKey: ["purchase-orders", "summary", input.organizationId] })
      notify.success(t("created"))
      const destination = `/dashboard/purchase-orders/${result.data.id}${result.canEdit ? "/edit" : ""}`
      router.push(localizePath(destination, input.locale))
      router.refresh()
    } catch {
      uncertain = true
      setFailure("unknown")
    } finally {
      // There is no durable clone-command idempotency key. Do not resend an
      // uncertain request: the user must inspect saved orders first.
      if (!confirmed || uncertain) setPending(false)
      if (!confirmed && !uncertain) requestInFlight.current = false
    }
  }

  return { clone, pending, failure, retryBlocked: failure === "unknown" }
}
