"use client"
import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { readAlertScanRecoveryAction, recoverAlertScanPageAction } from "@/actions/payments/alert-scan-recovery.actions"
import type { AlertRecoveryCommand, AlertRecoveryView } from "@/services/reconciliation/alert-scan-recovery.contracts"

const copy = {
  en: { title: "Alert scan recovery", help: "Advance one saved scan page (up to 100 source records). This records in-app alerts; it does not settle payments or change accounting. A running checkpoint may be between pages; any active page must finish before recovery can proceed.", refresh: "Check recovery status", confirm: "I reviewed this checkpoint and want to advance one page.", recover: "Advance one scan page", retry: "Retry the same request", current: "Review the current checkpoint", pending: "The result is unknown. Check status before retrying; keep this request reference.", changed: "Another worker or operator changed the checkpoint. Review it before starting a new page request.", done: "This scan is complete.", disabled: "Operator recovery is currently disabled. The checkpoint remains available for review.", escalate: "Escalate this scan to the reconciliation support owner. Do not reset attempts, change its cursor or clear a lease. Provide only the scan ID and safe diagnostic code; omit payloads and lease tokens.", error: "Recovery is unavailable. No outcome is implied; check status before retrying.", restricted: "Current permissions or session are unavailable. Sign in again or contact your administrator.", stale: "The checkpoint changed. Check recovery status.", receipt: "Page recovery recorded", version: "Checkpoint version", examined: "Examined", created: "Alerts recorded", scan: "Scan reference", command: "Request reference", next: "More pages remain. Review the current checkpoint before advancing another page." },
  fr: { title: "Reprise de l’analyse des alertes", help: "Avancez d’une page enregistrée (100 sources au maximum). Cette action enregistre des alertes internes, sans régler de paiement ni modifier la comptabilité. Un point de contrôle en cours peut être entre deux pages ; toute page active doit se terminer avant la reprise.", refresh: "Vérifier la reprise", confirm: "J’ai vérifié ce point de contrôle et souhaite avancer d’une page.", recover: "Avancer d’une page", retry: "Réessayer la même demande", current: "Vérifier le point de contrôle actuel", pending: "Le résultat est inconnu. Vérifiez l’état avant de réessayer et conservez cette référence.", changed: "Un autre traitement a modifié le point de contrôle. Vérifiez-le avant une nouvelle demande.", done: "Cette analyse est terminée.", disabled: "La reprise opérateur est désactivée. Le point de contrôle reste consultable.", escalate: "Transmettez cette analyse au responsable du support rapprochement. Ne réinitialisez pas les tentatives, le curseur ou un bail. Communiquez uniquement l’identifiant et le code de diagnostic, sans contenu brut ni jeton de bail.", error: "La reprise est indisponible. Aucun résultat n’est présumé : vérifiez l’état avant de réessayer.", restricted: "Vos autorisations ou votre session sont indisponibles. Reconnectez-vous ou contactez votre administrateur.", stale: "Le point de contrôle a changé. Vérifiez l’état de la reprise.", receipt: "Reprise de page enregistrée", version: "Version du point de contrôle", examined: "Sources examinées", created: "Alertes enregistrées", scan: "Référence d’analyse", command: "Référence de demande", next: "Il reste des pages. Vérifiez le point de contrôle avant de continuer." },
}

export function AlertScanRecovery({ scanId, locale }: { scanId: string; locale: string }) {
  const queryClient = useQueryClient()
  const t = copy[locale === "fr" ? "fr" : "en"]
  const [view, setView] = useState<AlertRecoveryView | null>(null), [command, setCommand] = useState<AlertRecoveryCommand | null>(null)
  const [busy, setBusy] = useState(false), [unknown, setUnknown] = useState(false), [reviewed, setReviewed] = useState(false), [error, setError] = useState<string | null>(null)
  const alive = useRef(true), working = useRef(false), heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    let active = true; alive.current = true
    setBusy(true)
    void readAlertScanRecoveryAction({ scanId }).then(result => { if (!active) return; if (result.ok) setView(result.data); else setError(result.code) })
      .catch(() => { if (active) setError("UNAVAILABLE") }).finally(() => { if (active) setBusy(false) })
    return () => { active = false; alive.current = false }
  }, [scanId])
  const receipt = view?.receipt
  useEffect(() => { if (receipt) heading.current?.focus() }, [receipt])
  const adopt = (next: AlertRecoveryView) => { if (alive.current) {
    setView(next); setUnknown(false); setReviewed(false)
    if (next.receipt) {
      setCommand(null)
      void queryClient.invalidateQueries({ queryKey: ["payment-reconciliation"] }).catch(() => { /* Receipt still proves the page committed. */ })
      void queryClient.invalidateQueries({ queryKey: ["payment-reconciliation-workbench"] }).catch(() => { /* A later refresh can recover the display. */ })
    }
  } }
  const run = async (work: () => Promise<void>) => {
    if (working.current || busy) return
    working.current = true; setBusy(true); setError(null)
    try { await work() } catch { if (alive.current) setError("UNAVAILABLE") }
    finally { working.current = false; if (alive.current) setBusy(false) }
  }
  const check = () => run(async () => {
    const result = await readAlertScanRecoveryAction({ scanId, ...(command ? { command } : {}) })
    if (!alive.current) return
    if (result.ok) adopt(result.data); else setError(result.code)
  })
  const recover = () => run(async () => {
    if (!view?.eligible || !view.revision || !reviewed || unknown) return
    const request = command ?? { scanId, expectedRevision: view.revision, commandId: crypto.randomUUID() }
    if (command) {
      const status = await readAlertScanRecoveryAction({ scanId, command })
      if (!alive.current) return
      if (!status.ok) { setError(status.code); return }
      if (status.data.receipt || !status.data.eligible || status.data.revision !== command.expectedRevision) { adopt(status.data); return }
    }
    setCommand(request); setUnknown(true)
    const result = await recoverAlertScanPageAction(request)
    if (!alive.current) return
    if (result.ok) adopt(result.data); else setError(result.code)
  })
  const changed = command && !unknown && view?.revision !== command.expectedRevision && !view?.receipt
  const button = "rounded border px-3 py-2 text-xs disabled:opacity-50"
  return <section aria-label={t.title} aria-busy={busy} className="space-y-2 rounded border p-3 text-xs">
    <h3 className="font-semibold">{t.title}</h3><p>{t.help}</p><p className="break-all">{t.scan}: {scanId}</p>
    {view?.progress && <p>{t.version}: {view.progress.version} · {t.examined}: {view.progress.examined} · {t.created}: {view.progress.created}</p>}
    <div role="status" aria-live="polite">
      {unknown && <p>{t.pending}</p>}{command && <p className="break-all">{t.command}: {command.commandId}</p>}
      {error && <p>{error === "RESTRICTED" ? t.restricted : error === "STALE" ? t.stale : t.error}</p>}
      {changed && <p>{t.changed}</p>}
      {view?.reason === "ESCALATE" && <p>{t.escalate}</p>}{view?.reason === "COMPLETE" && <p>{t.done}</p>}{view?.reason === "DISABLED" && <p>{t.disabled}</p>}
    </div>
    {receipt && <div><h4 ref={heading} tabIndex={-1}>{t.receipt}</h4><p>{t.command}: {receipt.commandId} · v{receipt.fromVersion} → v{receipt.toVersion}</p>{receipt.state !== "COMPLETE" && <p>{t.next}</p>}</div>}
    <button className={button} type="button" disabled={busy} onClick={check}>{t.refresh}</button>
    {changed && <button className={button} type="button" disabled={busy} onClick={() => { setCommand(null); setReviewed(false) }}>{t.current}</button>}
    {view?.eligible && !changed && !unknown && <><label className="flex items-start gap-2"><input type="checkbox" checked={reviewed} disabled={busy} onChange={event => setReviewed(event.target.checked)} />{t.confirm}</label><button className={button} type="button" disabled={busy || !reviewed} onClick={recover}>{command ? t.retry : t.recover}</button></>}
  </section>
}
