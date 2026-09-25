"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { acquirePOSCheckoutAction, changePOSCheckoutCartAction } from "@/actions/pos/checkout.actions"
import type { CommitSaleInput } from "@/services/pos/pos.schemas"

type Scope = { organizationId?: string | null; actorId?: string; locationId: string; terminalId: string; sessionId?: string }
type Snapshot = { pendingRequest: CommitSaleInput | null; historicalRequests: CommitSaleInput[]; parked: { id: string; orderNumber: string; sessionId: string | null }[]; settled: boolean; recoveredSales: { salesOrderId: string; orderNumber: string; total: number }[] }

export function usePOSCheckoutLifecycle(scope: Scope) {
  const queryClient = useQueryClient()
  const [leaseId, setLeaseId] = useState("")
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [acceptedCartId, setAcceptedCartId] = useState<string | null>(null)
  const refreshRef = useRef<() => Promise<void>>(async () => {})
  const generation = useRef(0)
  const authorityVersion = useRef(0)
  const readyRef = useRef(false)
  const commandRef = useRef<symbol | null>(null)
  const { organizationId, actorId, locationId, terminalId, sessionId } = scope

  useEffect(() => {
    generation.current++
    readyRef.current = false
    commandRef.current = null
    refreshRef.current = async () => {}
    setReady(false); setBusy(false); setLeaseId(""); setSnapshot(null); setAcceptedCartId(null); setError(null)
    if (!organizationId || !actorId || !sessionId || !locationId || !terminalId) return
    let alive = true, inFlight = false, ownsBrowserLock = false, acquiring = false
    let release: (() => void) | undefined
    let interval: ReturnType<typeof setInterval> | undefined
    let expiry: ReturnType<typeof setTimeout> | undefined
    let online = navigator.onLine !== false
    const invalidateOwnership = (reason: string) => {
      authorityVersion.current++
      readyRef.current = false
      clearTimeout(expiry)
      setReady(false); setAcceptedCartId(null); setError(reason)
    }
    const key = `stoquify:pos:checkout:${organizationId}:${actorId}:${sessionId}`
    async function run() {
      if (acquiring || !alive || !online) return
      if (!navigator.locks) { if (alive) setError("POS_CHECKOUT_BROWSER_UNSUPPORTED"); return }
      acquiring = true
      void navigator.locks.request(key, { ifAvailable: true }, async lock => {
        if (!alive) return
        if (!lock) { setError("POS_CHECKOUT_OWNED_ELSEWHERE"); return }
        ownsBrowserLock = true
        let id: string
        try {
          id = sessionStorage.getItem(key) || crypto.randomUUID()
          sessionStorage.setItem(key, id)
        } catch { id = crypto.randomUUID() }
        setLeaseId(id)
        const refresh = async () => {
          if (!alive || inFlight || !online) return
          inFlight = true
          const requestedAt = Date.now()
          const requestedVersion = authorityVersion.current
          try {
            const response = await acquirePOSCheckoutAction({ locationId, terminalId, sessionId, checkoutLeaseId: id })
            if (!alive || requestedVersion !== authorityVersion.current) return
            if (!response.success) { invalidateOwnership(response.error); return }
            // Count response latency against the lease; the server started it before replying.
            const remaining = 55_000 - (Date.now() - requestedAt)
            if (remaining <= 0) { invalidateOwnership("POS_CHECKOUT_OWNERSHIP_REQUIRED"); return }
            readyRef.current = true
            setSnapshot(previous => ({ ...response.data, recoveredSales: response.data.recoveredSales.length ? response.data.recoveredSales : previous?.recoveredSales ?? [] })); setReady(true); setError(null)
            // Re-read the active identity after reconnect or a lost lifecycle-command response.
            void queryClient.invalidateQueries({ queryKey: ["pos-operations", "cart", locationId, terminalId, sessionId] })
            clearTimeout(expiry)
            expiry = setTimeout(() => { if (alive) invalidateOwnership("POS_CHECKOUT_OWNERSHIP_REQUIRED") }, remaining)
          } catch { if (alive && requestedVersion === authorityVersion.current) invalidateOwnership("POS_CHECKOUT_CONNECTION_LOST") }
          finally { inFlight = false }
        }
        refreshRef.current = refresh
        await refresh()
        if (!alive) return
        interval = setInterval(() => { void refresh() }, 20_000)
        await new Promise<void>(resolve => { release = resolve })
      }).catch(() => { if (alive) invalidateOwnership("POS_CHECKOUT_CONNECTION_LOST") }).finally(() => { acquiring = false })
    }
    const retry = async () => { if (ownsBrowserLock) await refreshRef.current(); else await run() }
    refreshRef.current = retry
    const reconnect = () => { online = navigator.onLine !== false; void retry() }
    const offline = () => { online = false; invalidateOwnership("POS_CHECKOUT_CONNECTION_LOST") }
    window.addEventListener("online", reconnect)
    window.addEventListener("focus", reconnect)
    window.addEventListener("offline", offline)
    void run()
    return () => {
      alive = false
      generation.current++
      readyRef.current = false
      clearInterval(interval); clearTimeout(expiry); release?.()
      window.removeEventListener("online", reconnect); window.removeEventListener("focus", reconnect); window.removeEventListener("offline", offline)
    }
  }, [organizationId, actorId, locationId, terminalId, sessionId, queryClient])

  const refresh = useCallback(() => refreshRef.current(), [])
  const command = useCallback(async (command: "RESUME" | "PARK", salesOrderId: string) => {
    if (!ready || !readyRef.current || commandRef.current) return null
    const token = Symbol(command)
    commandRef.current = token
    const requestedGeneration = generation.current
    const requestedVersion = authorityVersion.current
    const isCurrent = () => generation.current === requestedGeneration && authorityVersion.current === requestedVersion && readyRef.current
    setBusy(true); setError(null)
    try {
      const response = await changePOSCheckoutCartAction({ command, salesOrderId, locationId, terminalId, sessionId, checkoutLeaseId: leaseId })
      if (!isCurrent()) return null
      if (!response.success) {
        setError(response.error)
        if (["POS_CHECKOUT_OWNERSHIP_REQUIRED", "POS_CHECKOUT_OWNED_ELSEWHERE", "POS_CHECKOUT_SHIFT_UNAVAILABLE"].includes(response.error ?? "")) { readyRef.current = false; authorityVersion.current++; setReady(false); setAcceptedCartId(null) }
        return null
      }
      setAcceptedCartId(response.data.activeCartId)
      await queryClient.invalidateQueries({ queryKey: ["pos-operations"] })
      if (!isCurrent()) return null
      await refresh()
      return isCurrent() ? response.data : null
    } catch {
      if (isCurrent()) { readyRef.current = false; authorityVersion.current++; setReady(false); setAcceptedCartId(null); setError("POS_CHECKOUT_CONNECTION_LOST") }
      return null
    } finally { if (commandRef.current === token) { commandRef.current = null; setBusy(false) } }
  }, [ready, locationId, terminalId, sessionId, leaseId, queryClient, refresh])

  return { ready, busy, leaseId, error, snapshot, acceptedCartId, acceptCart: setAcceptedCartId, refresh, command }
}
