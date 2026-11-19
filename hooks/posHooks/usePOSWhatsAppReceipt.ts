"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  getPOSWhatsAppReceiptCapabilityAction,
  getPOSWhatsAppReceiptStatusAction,
  queuePOSWhatsAppReceiptAction,
} from "@/actions/pos/whatsapp-receipt.actions"

type ReceiptScope = { salesOrderId: string; locationId: string }
type ConfirmedReceipt = ReceiptScope & { orderNumber: string }
type QueueRequest = ReceiptScope & {
  destination: string
  locale: "EN" | "FR"
  whatsAppCustomerOptInConfirmed: true
}
type Intent = { commitId: string; request: QueueRequest }
type DeliveryState = "REQUESTING" | "REQUEST_UNCONFIRMED" | "UNAVAILABLE" | "QUEUED" | "RETRYING" | "ACCEPTED" | "UNCERTAIN" | "FAILED"
type Feedback = ConfirmedReceipt & { status: DeliveryState }

const emptyDraft = { selected: false, destination: "", consent: false }

function normalizeDestination(destination: string) {
  const compact = destination.trim().replace(/[\s().-]/g, "")
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact
}

export function usePOSWhatsAppReceipt({ allow, draftKey, locale }: { allow: boolean; draftKey: string; locale: string }) {
  const [available, setAvailable] = useState(false)
  const [draftState, setDraft] = useState({ key: "", ...emptyDraft })
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [checking, setChecking] = useState(false)
  const [statusUnavailable, setStatusUnavailable] = useState(false)
  const intent = useRef<Intent | null>(null)
  const retryRequest = useRef<QueueRequest | null>(null)
  const activeRequest = useRef<ConfirmedReceipt | null>(null)
  const draft = draftState.key === draftKey ? draftState : emptyDraft
  const destination = normalizeDestination(draft.destination)
  const enabled = allow && available
  const validDestination = /^\+[1-9]\d{7,14}$/.test(destination)
  const incomplete = enabled && draft.selected && (!validDestination || !draft.consent)

  useEffect(() => {
    setDraft(current => current.key === draftKey ? current : { key: draftKey, ...emptyDraft })
  }, [draftKey])

  useEffect(() => {
    if (!allow) {
      setAvailable(false)
      return
    }
    let current = true
    void getPOSWhatsAppReceiptCapabilityAction().then(result => {
      if (current) setAvailable(result.success && result.data.available)
    }).catch(() => { if (current) setAvailable(false) })
    return () => { current = false }
  }, [allow])

  function updateDraft(patch: Partial<typeof emptyDraft>) {
    setDraft(current => ({ ...(current.key === draftKey ? current : emptyDraft), ...patch, key: draftKey }))
  }

  function rememberIntent(commitId: string, scope: ReceiptScope) {
    intent.current = enabled && draft.selected && !incomplete ? {
      commitId,
      request: { ...scope, destination, locale: locale === "fr" ? "FR" : "EN", whatsAppCustomerOptInConfirmed: true },
    } : null
    setDraft({ key: "", ...emptyDraft })
  }

  function clearIntent(commitId?: string) {
    if (commitId && intent.current?.commitId === commitId) intent.current = null
  }

  const requestQueue = useCallback(async (request: QueueRequest, orderNumber: string) => {
    const { salesOrderId, locationId } = request
    const scope = { salesOrderId, locationId, orderNumber }
    activeRequest.current = scope
    retryRequest.current = null
    setStatusUnavailable(false)
    setChecking(false)
    setFeedback({ ...scope, status: "REQUESTING" })
    try {
      const result = await queuePOSWhatsAppReceiptAction(request)
      if (activeRequest.current !== scope) return
      if (result.success) {
        setFeedback({ ...scope, status: result.data.status })
      } else if (result.status >= 500) {
        retryRequest.current = request
        setFeedback({ ...scope, status: "REQUEST_UNCONFIRMED" })
      } else {
        setFeedback({ ...scope, status: "UNAVAILABLE" })
      }
    } catch {
      if (activeRequest.current !== scope) return
      retryRequest.current = request
      setFeedback({ ...scope, status: "REQUEST_UNCONFIRMED" })
    }
  }, [])

  const queueAfterConfirmation = useCallback((commitId: string, scope: ConfirmedReceipt) => {
    const pending = intent.current
    if (!pending || pending.commitId !== commitId || pending.request.salesOrderId !== scope.salesOrderId ||
      pending.request.locationId !== scope.locationId) return
    intent.current = null
    void requestQueue(pending.request, scope.orderNumber)
  }, [requestQueue])

  function retryQueueRequest() {
    const request = retryRequest.current
    if (allow && request && activeRequest.current) void requestQueue(request, activeRequest.current.orderNumber)
  }

  async function checkStatus() {
    const scope = activeRequest.current
    if (!allow || !scope || checking || feedback?.status === "REQUESTING") return
    setChecking(true)
    setStatusUnavailable(false)
    try {
      const result = await getPOSWhatsAppReceiptStatusAction({ salesOrderId: scope.salesOrderId, locationId: scope.locationId })
      if (activeRequest.current !== scope) return
      if (!result.success) setStatusUnavailable(true)
      else if (result.data) {
        retryRequest.current = null
        setFeedback({ ...scope, status: result.data.status })
      } else if (!retryRequest.current) {
        setStatusUnavailable(true)
      }
    } catch {
      if (activeRequest.current === scope) setStatusUnavailable(true)
    } finally {
      if (activeRequest.current === scope) setChecking(false)
    }
  }

  return {
    enabled, draft, validDestination, incomplete, feedback, checking, statusUnavailable, updateDraft, rememberIntent, clearIntent,
    queueAfterConfirmation, retryQueueRequest, checkStatus,
  }
}
