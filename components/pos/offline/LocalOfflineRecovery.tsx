"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { inspectOfflineLocalQueues, type OfflineLocalQueueSummary } from "@/lib/pos/offline-local-queue"
import { useFlushOfflinePOSQueue } from "@/hooks/posHooks/useOfflineSync"

export const localOfflineCopy = {
  en: {
    title: "Offline evidence on this browser", checking: "Checking local evidence…",
    unavailable: "Local evidence cannot be verified. Keep this browser's data and ask a manager for recovery before closing the shift.",
    unsupported: "Offline checkout is not available in this pilot. Keep pending evidence, reconnect and check the original operation. Do not take a second payment or clear browser data.",
    pending: "awaiting server acknowledgement", uncertain: "unconfirmed attempts", conflicts: "requiring review",
    acknowledged: "acknowledged evidence — not a confirmed sale or payment",
    empty: "No pending evidence found on this browser. Other browsers and server readiness require their own checks.",
    send: "Send retained evidence", sending: "Sending retained evidence…", refresh: "Check local evidence",
    offline: "Reconnect to send retained evidence.", otherSession: "Return to the original cashier session to send this evidence; ask a manager if it is no longer available.",
    sessionUnknown: "Waiting for the original cashier session to be verified. Reconnect or restore access before sending.",
    review: "A manager must review the original device, policy and conflict history. Review does not clear the blocker; do not rewrite or discard this evidence.",
    failed: "Server outcome is unconfirmed. Evidence is retained. Restore access and reconnect, then retry the original evidence.",
    closeBlocked: "Shift close is blocked while local offline evidence is pending or cannot be verified. Reconnect and review the original operation.",
  },
  fr: {
    title: "Preuves hors ligne dans ce navigateur", checking: "Vérification des preuves locales…",
    unavailable: "Les preuves locales ne peuvent pas être vérifiées. Conservez les données du navigateur et demandez une reprise à un responsable avant de clôturer la session.",
    unsupported: "La vente hors ligne n'est pas disponible dans ce pilote. Conservez les preuves, reconnectez-vous et vérifiez l'opération d'origine. N'encaissez pas un second paiement et n'effacez pas les données du navigateur.",
    pending: "en attente d'accusé de réception", uncertain: "tentatives non confirmées", conflicts: "à examiner",
    acknowledged: "preuves reçues — vente et paiement non confirmés",
    empty: "Aucune preuve en attente dans ce navigateur. Les autres navigateurs et le serveur nécessitent leurs propres vérifications.",
    send: "Envoyer les preuves conservées", sending: "Envoi des preuves conservées…", refresh: "Vérifier les preuves locales",
    offline: "Reconnectez-vous pour envoyer les preuves conservées.", otherSession: "Revenez à la session de caisse d'origine pour envoyer ces preuves ; demandez à un responsable si elle n'est plus disponible.",
    sessionUnknown: "En attente de vérification de la session de caisse d'origine. Rétablissez la connexion ou l'accès avant l'envoi.",
    review: "Un responsable doit examiner l'appareil, la politique et l'historique des conflits d'origine. L'examen ne lève pas le blocage ; ne modifiez ni ne supprimez ces preuves.",
    failed: "Le résultat du serveur n'est pas confirmé. Les preuves sont conservées. Rétablissez l'accès et la connexion, puis renvoyez les preuves d'origine.",
    closeBlocked: "La clôture est bloquée tant que des preuves hors ligne restent en attente ou invérifiables. Reconnectez-vous et examinez l'opération d'origine.",
  },
} as const

function QueueRecovery({ queue, sessionId, online, canSend, locale, refresh }: {
  queue: OfflineLocalQueueSummary; sessionId?: string | null; online: boolean; canSend: boolean
  locale: "en" | "fr"; refresh: () => Promise<void>
}) {
  const t = localOfflineCopy[locale]
  const flush = useFlushOfflinePOSQueue(queue.config, locale)
  const sameSession = Boolean(sessionId && queue.config.sessionId === sessionId)
  return <li className="space-y-2 rounded-lg border border-[var(--dash-border-subtle)] p-3" data-testid="local-offline-queue">
    <p className="break-all text-xs">{queue.config.deviceId}</p>
    <p role="status">{queue.pendingCount} {t.pending}; {queue.uncertainCount} {t.uncertain}; {queue.conflictCount} {t.conflicts}.</p>
    {queue.acknowledgedCount > 0 && <p>{queue.acknowledgedCount} {t.acknowledged}.</p>}
    {queue.pendingCount > 0 && <>
      {!sameSession && <p>{sessionId ? t.otherSession : t.sessionUnknown}</p>}
      {!online && <p>{t.offline}</p>}
      {queue.conflictCount > 0 && <p>{t.review}</p>}
      {flush.isError && <p role="alert">{t.failed}</p>}
      <Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal py-2"
        disabled={!online || !canSend || !sameSession || queue.conflictCount > 0 || flush.isPending}
        onClick={async () => { try { await flush.mutateAsync() } catch { /* Retained by hook; localized recovery above. */ } finally { await refresh() } }}>
        {flush.isPending ? t.sending : t.send}
      </Button>
    </>}
  </li>
}

// Outside remote-read error states: server counts cannot substitute for unsent
// evidence. Scope changes remount the inventory and cannot show old tenant data.
export function LocalOfflineRecovery(props: {
  organizationId?: string; userId?: string; locationId?: string | null; terminalId?: string | null
  sessionId?: string | null; canRead: boolean; canSend: boolean; locale: "en" | "fr"
}) {
  if (!props.organizationId || !props.userId || !props.canRead) return null
  return <LocalInventory key={`${props.organizationId}:${props.userId}:${props.locationId}:${props.terminalId}`} {...props} organizationId={props.organizationId} />
}

function LocalInventory(props: Parameters<typeof LocalOfflineRecovery>[0] & { organizationId: string }) {
  const { organizationId, locationId, terminalId, sessionId, canSend, locale } = props
  const t = localOfflineCopy[locale]
  const [queues, setQueues] = useState<OfflineLocalQueueSummary[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [online, setOnline] = useState(true)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(async () => { setRevision(value => value + 1) }, [])
  useEffect(() => {
    let alive = true, reading = false
    const read = async () => {
      if (reading) return
      reading = true
      setOnline(navigator.onLine)
      try {
        const result = await inspectOfflineLocalQueues({ organizationKey: organizationId, locationId, terminalId })
        if (alive) { setQueues(result); setFailed(false) }
      } catch { if (alive) { setQueues(null); setFailed(true) } }
      finally { reading = false }
    }
    void read()
    const tick = window.setInterval(() => void read(), 2000)
    const events = ["online", "offline", "focus", "storage"] as const
    events.forEach(event => window.addEventListener(event, read))
    return () => { alive = false; window.clearInterval(tick); events.forEach(event => window.removeEventListener(event, read)) }
  }, [organizationId, locationId, terminalId, revision])
  return <section aria-label={t.title} data-testid="local-offline-recovery" className="dashboard-landing-theme dark space-y-3 rounded-lg border border-[var(--dash-warning)] bg-[var(--dash-surface)] p-4 text-sm text-[var(--dash-text)]">
    <h2 className="font-semibold">{t.title}</h2>
    <p>{t.unsupported}</p>
    {failed ? <p role="alert">{t.unavailable}</p> : queues === null ? <p role="status">{t.checking}</p> : <>
      {!queues.some(queue => queue.pendingCount > 0) && <p>{t.empty}</p>}
      <ul className="space-y-2">{queues.filter(queue => queue.pendingCount || queue.acknowledgedCount).map(queue => <QueueRecovery key={queue.config.deviceId} queue={queue} sessionId={sessionId} online={online} canSend={canSend} locale={locale} refresh={refresh} />)}</ul>
    </>}
    <Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal py-2" onClick={refresh}>{t.refresh}</Button>
  </section>
}
