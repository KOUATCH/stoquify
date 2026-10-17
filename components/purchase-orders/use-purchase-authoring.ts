"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPurchaseOrderFromAuthoringAction, discardPurchaseAuthoringAction, getPurchaseAuthoringAction, listPurchaseAuthoringAction, preparePurchaseAuthoringAction, savePurchaseAuthoringAction } from "@/actions/purchaseOrderWorkflow/purchase-order-authoring.actions"
import type { PurchaseAuthoringContent, PurchaseAuthoringView } from "@/services/purchase-order/purchase-order-authoring-contracts"

type List = Extract<Awaited<ReturnType<typeof listPurchaseAuthoringAction>>, { ok: true }>["data"]
type Save = { id: string; expectedRevision: number; title: string; content: PurchaseAuthoringContent }
type Reply<T> = { ok: true; data: T } | { ok: false; code: string }
class ActionRejected extends Error {}
// The enclosing form is keyed by server actor + organization. Nothing is stored
// in local/session storage; only acknowledged server saves survive navigation.
export function usePurchaseAuthoring(getContent: () => PurchaseAuthoringContent, restore: (content: PurchaseAuthoringContent) => void) {
  const [current, setCurrent] = useState<PurchaseAuthoringView | null>(null)
  const [list, setList] = useState<List | null>(null)
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [code, setCode] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const alive = useRef(true), working = useRef(false), pendingSave = useRef<Save | null>(null)
  const callbacks = useRef({ getContent, restore }); callbacks.current = { getContent, restore }
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const run = useCallback(async (work: () => Promise<void>) => {
    if (working.current) return
    working.current = true; setBusy(true); setCode(null)
    try { await work() } catch (error) { if (alive.current && !(error instanceof ActionRejected)) setCode("UNAVAILABLE") }
    finally { working.current = false; if (alive.current) setBusy(false) }
  }, [])
  const accept = <T,>(reply: Reply<T>): T => {
    if (!reply.ok) { if (alive.current) setCode(reply.code); throw new ActionRejected() }
    return reply.data
  }
  const adopt = (value: PurchaseAuthoringView, restoreContent = false) => {
    if (!alive.current) return
    setCurrent(value); setTitle(value.title); setUncertain(false); pendingSave.current = null
    if (restoreContent) callbacks.current.restore(value.content)
  }
  const refresh = useCallback((beforeId?: string) => run(async () => {
    const reply = await listPurchaseAuthoringAction(beforeId ? { beforeId } : {})
    if (!alive.current) return
    if (reply.ok) setList(reply.data); else { setCode(reply.code); setList(null) }
  }), [run])
  useEffect(() => { void refresh() }, [refresh])
  const save = async () => {
    if (!list?.writesEnabled || (current && current.status !== "ACTIVE")) throw new Error("UNAVAILABLE")
    const input = pendingSave.current ?? { id: current?.id ?? crypto.randomUUID(), expectedRevision: current?.revision ?? 0, title, content: callbacks.current.getContent() }
    // Preserve this exact save input while its result is unknown. Edits lock until
    // lookup or a same-input retry resolves it; no replacement key is generated.
    pendingSave.current = structuredClone(input); setUncertain(true)
    const reply = await savePurchaseAuthoringAction(input)
    if (!reply.ok && reply.code === "INVALID_INPUT" && alive.current) { pendingSave.current = null; setUncertain(false) }
    const value = accept(reply); adopt(value); return value
  }
  const saveNow = () => run(async () => { await save() })
  const resume = (id: string) => run(async () => {
    const value = accept(await getPurchaseAuthoringAction({ id })); adopt(value, true)
  })
  const check = () => run(async () => {
    const id = pendingSave.current?.id ?? current?.id
    if (!id) return
    const reply = await getPurchaseAuthoringAction({ id })
    if (!reply.ok && reply.code === "NOT_FOUND" && pendingSave.current) { if (alive.current) setCode("SAVE_NOT_FOUND"); return }
    adopt(accept(reply), true)
  })
  const create = () => run(async () => {
    let value = current
    if (uncertain) return
    if (!value || value.status === "ACTIVE") {
      value = await save()
      if (!alive.current) return
      setUncertain(true)
      value = accept(await preparePurchaseAuthoringAction({ id: value.id, expectedRevision: value.revision }))
      adopt(value)
    } else {
      // Every explicit retry resolves status before retrying the same command.
      value = accept(await getPurchaseAuthoringAction({ id: value.id })); adopt(value, true)
    }
    if (!alive.current || value.status !== "PREPARED") return
    setUncertain(true)
    const result = accept(await createPurchaseOrderFromAuthoringAction({ id: value.id, expectedRevision: value.revision }))
    adopt(result)
  })
  const discard = () => run(async () => {
    if (!current || uncertain) return
    setUncertain(true)
    const value = accept(await discardPurchaseAuthoringAction({ id: current.id, expectedRevision: current.revision }))
    adopt(value)
    if (alive.current && value.status === "DISCARDED") { setCurrent(null); setTitle(""); setList(null); callbacks.current.restore({ supplierId: "", locationId: "", date: "", expectedDeliveryDate: "", paymentTerms: "Net 30 days", notes: "", shippingCost: "", orderLines: [] }) }
  })
  return { current, list, busy, uncertain, code, title, setTitle, refresh, save: saveNow, resume, check, create, discard,
    canSave: !!list?.writesEnabled && (!current || current.status === "ACTIVE") && !busy,
    locked: busy || uncertain || (!!current && current.status !== "ACTIVE"), requestReference: pendingSave.current?.id ?? current?.id }
}
