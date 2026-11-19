"use client"

import type { FormEvent } from "react"
import { useId, useRef, useState } from "react"
import { MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"

import { getPOSWhatsAppReceiptStatusAction, queuePOSWhatsAppReceiptAction } from "@/actions/pos/whatsapp-receipt.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { posActivityCopy, type POSActivityWhatsAppStatus } from "./pos-activity-copy"

type RequestState =
  | { kind: "idle" | "busy" | "invalid" | "rejected" | "unconfirmed" | "check_failed" | "retryable" }
  | { kind: "recorded"; status: POSActivityWhatsAppStatus }

export function POSActivityReceiptDelivery({ language, salesOrderId, locationId }: {
  language: keyof typeof posActivityCopy
  salesOrderId: string
  locationId: string
}) {
  const copy = posActivityCopy[language]
  const router = useRouter()
  const numberId = useId()
  const numberHelpId = `${numberId}-help`
  const [state, setState] = useState<RequestState>({ kind: "idle" })
  const [checking, setChecking] = useState(false)
  const operationPending = useRef(false)
  const destination = useRef<string | null>(null)
  const scope = { salesOrderId, locationId }

  function record(status: POSActivityWhatsAppStatus) {
    destination.current = null
    setState({ kind: "recorded", status })
    router.refresh()
  }

  async function requestReceipt(phone: string) {
    if (operationPending.current) return
    operationPending.current = true
    destination.current = phone
    setState({ kind: "busy" })
    try {
      const result = await queuePOSWhatsAppReceiptAction({
        ...scope,
        destination: phone,
        locale: language === "fr" ? "FR" : "EN",
        whatsAppCustomerOptInConfirmed: true,
      })
      if (result.success) {
        record(result.data.status)
      } else if (result.status >= 500 || result.status === 409) {
        // The first request may have been recorded. Read its state before offering a retry.
        setState({ kind: "unconfirmed" })
      } else {
        destination.current = null
        setState({ kind: "rejected" })
      }
    } catch {
      setState({ kind: "unconfirmed" })
    } finally {
      operationPending.current = false
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const phone = String(form.get("whatsappNumber") ?? "").trim()
    if (event.currentTarget.checkValidity() && form.get("whatsappConsent") === "on") {
      const compact = phone.replace(/[\s().-]/g, "").replace(/^00/, "+")
      if (!/^\+[1-9]\d{7,14}$/.test(compact)) {
        setState({ kind: "invalid" })
        return
      }
      void requestReceipt(compact)
    }
  }

  async function checkStatus() {
    if (operationPending.current) return
    operationPending.current = true
    setChecking(true)
    try {
      const result = await getPOSWhatsAppReceiptStatusAction(scope)
      if (!result.success) setState({ kind: "check_failed" })
      else if (result.data) record(result.data.status)
      else setState({ kind: "retryable" })
    } catch {
      setState({ kind: "check_failed" })
    } finally {
      operationPending.current = false
      setChecking(false)
    }
  }

  if (state.kind === "recorded") {
    return (
      <div role="status" className="space-y-1 text-sm">
        <p className="font-medium">{copy.whatsAppStatuses[state.status]}</p>
        <p className="text-[var(--dash-text-soft)]">{copy.whatsAppHelp[state.status]}</p>
      </div>
    )
  }

  if (state.kind === "unconfirmed" || state.kind === "check_failed" || state.kind === "retryable") {
    const retryable = state.kind === "retryable"
    return (
      <div className="space-y-2 text-sm">
        <p role="status">
          {retryable ? copy.retryHelp : state.kind === "check_failed" ? copy.statusUnavailable : copy.requestUnconfirmed}
        </p>
        <Button
          type="button"
          variant="outline"
          className="dashboard-button-secondary min-h-11 whitespace-normal rounded-lg"
          disabled={checking}
          onClick={() => {
            if (retryable && destination.current) void requestReceipt(destination.current)
            else void checkStatus()
          }}
        >
          {checking ? copy.checkingStatus : retryable ? copy.retryRequest : copy.checkStatus}
        </Button>
      </div>
    )
  }

  return (
    <details className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">
        <MessageCircle className="size-4" aria-hidden="true" />
        {copy.sendWhatsApp}
      </summary>
      <form method="post" onSubmit={submit} className="grid gap-3 border-t border-[var(--dash-border-subtle)] p-3">
        <div className="grid min-w-0 gap-1.5 text-sm font-medium">
          <label htmlFor={numberId}>{copy.number}</label>
          <Input
            id={numberId} name="whatsappNumber" type="tel" inputMode="tel" autoComplete="off" maxLength={64} required disabled={state.kind === "busy"}
            aria-describedby={numberHelpId}
            aria-invalid={state.kind === "invalid" ? true : undefined}
            className="dashboard-control min-h-11 rounded-lg bg-[var(--dash-surface)]"
          />
          <span id={numberHelpId} className="text-sm font-normal text-[var(--dash-text-soft)]">{copy.numberHelp}</span>
        </div>
        <label className="flex min-h-11 items-start gap-2.5 py-2 text-sm">
          <input type="checkbox" name="whatsappConsent" required disabled={state.kind === "busy"} className="mt-0.5 size-5 shrink-0 accent-[var(--dash-brand)]" />
          <span>{copy.consent}</span>
        </label>
        {state.kind === "invalid" && <p role="alert" className="text-sm text-[var(--dash-text-soft)]">{copy.invalidNumber}</p>}
        {state.kind === "rejected" && <p role="alert" className="text-sm text-[var(--dash-text-soft)]">{copy.requestRejected}</p>}
        <Button type="submit" disabled={state.kind === "busy"} className="dashboard-button-primary min-h-11 justify-self-start whitespace-normal rounded-lg text-left">
          {state.kind === "busy" ? copy.requestSending : copy.queueWhatsApp}
        </Button>
      </form>
    </details>
  )
}

