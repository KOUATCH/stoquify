"use client"
import { useEffect, useRef, useState } from "react"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AccountSessionsError, useAccountSessions } from "@/hooks/useAccountSessions"
import { readAccountSessionRequest, saveAccountSessionRequest } from "@/hooks/account-session-recovery"
import type { AccountSessionCommand, AccountSessionReceipt } from "@/services/security/account-session-input"

export const accountSessionsCopy = {
  en: { open: "Review other sessions", title: "Sign out reviewed sessions", description: "Review the other active sessions for your account. This session stays signed in. Sessions created after this review are not included.", loading: "Loading current sessions…", failed: "Sessions could not be loaded. Their status is unknown.", empty: "No other active sessions.", count: "Other active sessions", checked: "Checked", device: "Device not recorded", started: "Started", expires: "Expires", confirm: "Sign out reviewed sessions", busy: "Confirming sign-out…", retry: "Recover the same sign-out request", uncertain: "The result is not confirmed. Recover the same request to check its saved result without signing out newly created sessions.", stale: "Your sessions changed. Reload and review the current list before continuing.", denied: "Your current session or permission no longer allows this action. Sign in again or contact your administrator.", storage: "Recovery storage is unavailable. Allow storage for this site before signing out other sessions.", reload: "Reload current sessions", success: "Other sessions signed out", kept: "This session was preserved.", history: "Recent sign-out records", noHistory: "No sign-out records from this workflow yet.", close: "Close session review", identity: "Your account changed. Refresh this page before managing sessions.", recovered: "Saved result recovered", historyLimit: "The latest 10 recorded requests are shown.", liveLimit: "A page already open on another device may remain visible. Some older application routes may still accept cached authentication briefly; immediate rejection across all routes is not yet verified." },
  fr: { open: "Vérifier les autres sessions", title: "Déconnecter les sessions vérifiées", description: "Vérifiez les autres sessions actives de votre compte. Cette session reste connectée. Les sessions créées après cette vérification ne sont pas incluses.", loading: "Chargement des sessions actuelles…", failed: "Les sessions n’ont pas pu être chargées. Leur état est inconnu.", empty: "Aucune autre session active.", count: "Autres sessions actives", checked: "Vérifié le", device: "Appareil non renseigné", started: "Début", expires: "Expiration", confirm: "Déconnecter les sessions vérifiées", busy: "Confirmation de la déconnexion…", retry: "Retrouver la même demande de déconnexion", uncertain: "Le résultat n’est pas confirmé. Retrouvez la même demande pour vérifier son résultat enregistré sans déconnecter les sessions créées depuis.", stale: "Vos sessions ont changé. Rechargez et vérifiez la liste actuelle avant de continuer.", denied: "Votre session ou vos droits actuels ne permettent plus cette action. Reconnectez-vous ou contactez votre administrateur.", storage: "Le stockage de reprise est indisponible. Autorisez le stockage pour ce site avant de déconnecter les autres sessions.", reload: "Recharger les sessions actuelles", success: "Autres sessions déconnectées", kept: "Cette session a été conservée.", history: "Déconnexions récentes", noHistory: "Aucune déconnexion enregistrée par ce parcours.", close: "Fermer la vérification des sessions", identity: "Votre compte a changé. Actualisez cette page avant de gérer les sessions.", recovered: "Résultat enregistré retrouvé", historyLimit: "Les 10 dernières demandes enregistrées sont affichées.", liveLimit: "Une page déjà ouverte sur un autre appareil peut rester visible. Certaines anciennes pages peuvent encore accepter temporairement une authentification en cache ; le refus immédiat sur toutes les pages n’est pas encore vérifié." },
} as const
type Props = { organizationId: string; actorId: string; sessionId: string; locale: "en" | "fr" }
export default function AccountSessions(props: Props) {
  const { data: session, isPending } = useSession()
  if (isPending) return <p role="status">{accountSessionsCopy[props.locale].loading}</p>
  if (session?.user?.id !== props.actorId || session?.session?.id !== props.sessionId) return <p role="alert">{accountSessionsCopy[props.locale].identity}</p>
  return <AccountSessionsForActor key={`${props.actorId}:${props.sessionId}`} {...props} />
}
function AccountSessionsForActor({ organizationId, actorId, sessionId, locale }: Props) {
  const t = accountSessionsCopy[locale], { query, mutation } = useAccountSessions(organizationId, actorId, sessionId)
  const [open, setOpen] = useState(false), [pending, setPending] = useState<AccountSessionCommand | null>(null), [ready, setReady] = useState(false), [code, setCode] = useState<string | null>(null), [receipt, setReceipt] = useState<(AccountSessionReceipt & { replayed: boolean }) | null>(null), [busy, setBusy] = useState(false)
  const lock = useRef(false), status = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    try { const recovered = readAccountSessionRequest(sessionStorage, organizationId, actorId, sessionId); setPending(recovered); if (recovered) setCode("UNCERTAIN"); setReady(true) }
    catch { setCode("STORAGE") }
  }, [organizationId, actorId, sessionId])
  const date = (value: string) => new Date(value).toLocaleString(locale)
  const definitive = code !== null && ["CONFLICT", "VALIDATION_ERROR", "FORBIDDEN", "AUTH_REQUIRED", "UNAUTHENTICATED", "IDEMPOTENCY_CONFLICT"].includes(code)
  const unknown = Boolean(pending && code && !definitive && code !== "STORAGE")
  const run = async () => {
    if (lock.current || !ready || (!pending && (!query.data || query.isError || query.isFetching))) return
    const command = pending ?? { requestId: crypto.randomUUID(), expectedHash: query.data!.snapshotHash }
    lock.current = true; setBusy(true)
    try {
      try { saveAccountSessionRequest(sessionStorage, organizationId, actorId, sessionId, command) } catch { setCode("STORAGE"); return }
      setPending(command); setReceipt(null)
      const result = await mutation.mutateAsync(command)
      setReceipt(result); setCode(null); setPending(null)
      try { saveAccountSessionRequest(sessionStorage, organizationId, actorId, sessionId, null) } catch { /* The retained command replays the same saved result. */ }
      void query.refetch()
    } catch (error) { setCode(error instanceof AccountSessionsError ? error.code : "UNCERTAIN") }
    finally { lock.current = false; setBusy(false); requestAnimationFrame(() => status.current?.focus()) }
  }
  const reload = () => {
    try { saveAccountSessionRequest(sessionStorage, organizationId, actorId, sessionId, null); setReady(true); setPending(null); setCode(null); setReceipt(null); void query.refetch() }
    catch { setCode("STORAGE") }
  }
  const message = code === "STORAGE" ? t.storage : ["CONFLICT", "VALIDATION_ERROR", "IDEMPOTENCY_CONFLICT"].includes(code ?? "") ? t.stale : ["FORBIDDEN", "AUTH_REQUIRED", "UNAUTHENTICATED"].includes(code ?? "") ? t.denied : t.uncertain
  const current = query.data && !query.isError ? query.data : null
  return <div className="mt-4 space-y-4">
    {query.isError ? <p role="alert">{t.failed}</p> : !current ? <p role="status">{t.loading}</p> : <p>{t.count}: <strong>{current.others.length}</strong><span className="mt-1 block text-xs text-[var(--dash-text-soft)]">{t.checked}: {date(current.checkedAt)}</span></p>}
    <p className="text-sm text-[var(--dash-text-soft)]">{t.liveLimit}</p>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button type="button" variant="outline" className="dashboard-button-secondary h-auto whitespace-normal">{t.open}</Button></DialogTrigger>
      <DialogContent closeLabel={t.close} className="dashboard-landing-theme dark max-h-[90dvh] overflow-y-auto border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)] sm:max-w-2xl">
        <DialogHeader><DialogTitle>{t.title}</DialogTitle><DialogDescription className="text-[var(--dash-text-soft)]">{t.description}</DialogDescription></DialogHeader>
        {(pending || receipt) && <p className="rounded border border-[var(--dash-border-subtle)] p-3 text-sm">{locale === "fr" ? "La liste correspond à l’heure de vérification affichée. Un résultat retrouvé concerne la demande initiale et ne déconnecte pas les sessions créées depuis." : "The list reflects the check time shown. A recovered result belongs to the original request and does not sign out sessions created afterwards."}</p>}
        {!current ? <p role={query.isError ? "alert" : "status"}>{query.isError ? t.failed : t.loading}</p> : <>
          <p className="text-xs">{t.checked}: {date(current.checkedAt)}</p>
          {!current.others.length ? <p>{t.empty}</p> : <ul className="max-h-64 space-y-3 overflow-y-auto">{current.others.map(item => <li key={item.id} className="break-words rounded-lg border border-[var(--dash-border-subtle)] p-3 text-sm"><p className="[overflow-wrap:anywhere]">{item.device || t.device}</p><p className="text-xs text-[var(--dash-text-soft)]">{t.started}: {date(item.createdAt)} · {t.expires}: {date(item.expiresAt)}</p></li>)}</ul>}
        </>}
        {(code || receipt) && <p ref={status} tabIndex={-1} role={code ? "alert" : "status"} className={`rounded border p-3 text-sm focus-visible:outline focus-visible:outline-2 ${code ? "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)]" : "border-[var(--dash-success)] bg-[var(--dash-success-soft)]"}`}>{code ? message : `${receipt!.replayed ? t.recovered + ". " : ""}${t.success}: ${receipt!.revokedCount}. ${t.kept}`}</p>}
        {!receipt && <Button type="button" onClick={run} disabled={busy || !ready || definitive || code === "STORAGE" || (!pending && (!current?.others.length || query.isFetching))} className="h-auto whitespace-normal border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)] hover:bg-[var(--dash-danger-soft)]">{busy ? t.busy : unknown ? t.retry : t.confirm}</Button>}
        <Button type="button" variant="outline" onClick={reload} disabled={busy || unknown || query.isFetching} className="dashboard-button-secondary h-auto whitespace-normal">{t.reload}</Button>
      </DialogContent>
    </Dialog>
    <div className="space-y-2 border-t border-[var(--dash-border-subtle)] pt-3"><h3 className="font-medium">{t.history}</h3><p className="text-xs text-[var(--dash-text-soft)]">{t.historyLimit}</p>{current && (current.history.length ? <ul className="space-y-2 text-sm">{current.history.map(item => <li key={item.id}>{date(item.completedAt)} — {t.success}: {item.revokedCount}<span className="block break-all text-xs text-[var(--dash-text-soft)]">{item.id}</span></li>)}</ul> : <p className="text-sm">{t.noHistory}</p>)}</div>
  </div>
}
