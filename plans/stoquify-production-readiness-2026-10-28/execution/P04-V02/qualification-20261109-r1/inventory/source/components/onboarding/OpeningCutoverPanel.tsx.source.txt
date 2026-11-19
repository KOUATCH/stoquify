"use client"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { getOpeningPositionWorkspaceAction } from "@/actions/onboarding/opening-position.actions"
import { getOpeningCutoverWorkspaceAction, approveOpeningCutoverAction, applyOpeningCutoverAction, cancelOpeningCutoverAction } from "@/actions/onboarding/opening-cutover.actions"
import type { OpeningWorkspace } from "@/services/onboarding/opening-position.contract"
import type { OpeningCutoverWorkspace } from "@/services/onboarding/opening-cutover.contract"

const copy = {
  en: {
    title: "Controlled opening apply", intro: "Financial initialization for an empty CM / XAF client at 1 October 2026. The latest independently reviewed source and an unchanged open period are required. Approval lasts 30 minutes.",
    load: "Load / recover cutover", pending: "Checking current authority and retained results…", empty: "No financial approval recorded.",
    firm: "Firm access permits inspection. Approval and apply require a client operator with current journal, stock approval, payable and customer permissions.",
    conclusion: "Financial approval conclusion", approve: "Approve financial cutover", confirm: "I confirm posting the reviewed opening journal, stock, receivables and payables.",
    apply: "Apply approved opening", cancel: "Cancel unapplied approval", reason: "Cancellation reason", retry: "Retry the same financial command",
    unknown: "Outcome not confirmed. Load the recovery view or retry the same saved command; do not start another cutover.",
    denied: "Access or source conditions changed. Refresh and review the current source, approval and period.",
    saved: "Command recorded. Current results are shown below.", fresh: "Verify your identity, then explicitly retry the saved command.",
    password: "Password for financial confirmation", verify: "Verify financial identity", verified: "Identity verified. Retry when ready.",
    approved: "Approved — financial apply pending", active: "Opening applied and reconciled", cancelled: "Approval cancelled — no financial apply",
    source: "Reviewed source", expires: "Approval expires", digest: "Source digest", receipt: "Retained reconciliation", operations: "Retained domain operations",
    noReview: "Stage and independently review the opening preview above before approving financial apply.",
    activeNote: "This is the retained cutover result. Later transactions can change current balances. Applied history cannot be cancelled; corrections require the controlled domain workflow.",
    privacy: "Private results and saved commands clear when this tab is hidden. Reload recovery to inspect the committed result.",
    totals: "Reviewed control totals (XAF)", expired: "Expired — cancel and approve again", period: "Accounting period version",
  },
  fr: {
    title: "Application contrôlée de l’ouverture", intro: "Initialisation financière d’un client CM / XAF sans activité au 1 octobre 2026. La dernière source revue indépendamment et une période ouverte inchangée sont requises. L’approbation dure 30 minutes.",
    load: "Charger / récupérer la reprise", pending: "Vérification des droits actuels et des résultats conservés…", empty: "Aucune approbation financière enregistrée.",
    firm: "Le cabinet peut consulter les résultats. L’approbation et l’application exigent un opérateur du client disposant des droits actuels de comptabilisation, d’approbation du stock, de fournisseurs et de clients.",
    conclusion: "Conclusion de l’approbation financière", approve: "Approuver la reprise financière", confirm: "Je confirme la comptabilisation du journal d’ouverture, du stock, des créances et des dettes revus.",
    apply: "Appliquer l’ouverture approuvée", cancel: "Annuler l’approbation non appliquée", reason: "Motif d’annulation", retry: "Réessayer la même commande financière",
    unknown: "Résultat non confirmé. Chargez la récupération ou réessayez la commande conservée ; ne démarrez pas une autre reprise.",
    denied: "Les droits ou conditions sources ont changé. Actualisez et vérifiez la source, l’approbation et la période.",
    saved: "Commande enregistrée. Les résultats actuels sont affichés ci-dessous.", fresh: "Vérifiez votre identité, puis réessayez explicitement la commande conservée.",
    password: "Mot de passe pour confirmation financière", verify: "Vérifier l’identité financière", verified: "Identité vérifiée. Réessayez lorsque vous êtes prêt.",
    approved: "Approuvé — application financière en attente", active: "Ouverture appliquée et rapprochée", cancelled: "Approbation annulée — aucune application financière",
    source: "Source revue", expires: "Expiration de l’approbation", digest: "Empreinte source", receipt: "Rapprochement conservé", operations: "Opérations par domaine conservées",
    noReview: "Préparez et faites examiner indépendamment l’aperçu ci-dessus avant l’approbation financière.",
    activeNote: "Il s’agit du résultat conservé de la reprise. Des opérations ultérieures peuvent modifier les soldes actuels. L’historique appliqué ne peut être annulé ; les corrections suivent le circuit contrôlé du domaine.",
    privacy: "Les résultats privés et commandes conservées sont effacés lorsque cet onglet est masqué. Rechargez la récupération pour consulter le résultat validé.",
    totals: "Totaux de contrôle revus (XAF)", expired: "Expiré — annulez et approuvez à nouveau", period: "Version de la période comptable",
  },
}
type Props = { locale: "en" | "fr"; clientOrganizationId?: string }
type Command = { kind: "approve" | "apply" | "cancel"; input: Record<string, unknown> }
export function OpeningCutoverPanel(props: Props) {
  return <CutoverForm key={`${props.clientOrganizationId ?? "home"}:${props.locale}`} {...props} />
}
function CutoverForm({ locale, clientOrganizationId }: Props) {
  const t = copy[locale], scope = { clientOrganizationId }, button = "dashboard-button-secondary min-h-11 px-4 py-2"
  const [workspace, setWorkspace] = useState<OpeningCutoverWorkspace | null>(null), [preview, setPreview] = useState<OpeningWorkspace["current"]>(null)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [pending, setPending] = useState<Command | null>(null)
  const [conclusion, setConclusion] = useState(""), [reason, setReason] = useState(""), [confirmed, setConfirmed] = useState(false)
  const [fresh, setFresh] = useState(false), [password, setPassword] = useState("")
  const epoch = useRef(0), notice = useRef<HTMLParagraphElement>(null)
  function clear() { setWorkspace(null); setPreview(null); setConclusion(""); setReason(""); setConfirmed(false); setPassword("") }
  useEffect(() => {
    const hidden = () => { if (document.hidden) { epoch.current++; clear(); setPending(null); setFresh(false); setBusy(false); setMessage("") } }
    document.addEventListener("visibilitychange", hidden)
    return () => { epoch.current++; document.removeEventListener("visibilitychange", hidden) }
  }, [])
  useEffect(() => { if (message) notice.current?.focus() }, [message])
  async function refresh(generation: number) {
    const result = await getOpeningCutoverWorkspaceAction(scope)
    if (epoch.current !== generation) return
    if (!result.success) { clear(); setPending(null); setFresh(false); setMessage(t.denied); return }
    setWorkspace(result.data)
    const source = await getOpeningPositionWorkspaceAction(scope)
    if (epoch.current !== generation) return
    setPreview(source.success ? source.data.current : null)
  }
  async function load() {
    const generation = epoch.current; setBusy(true); clear(); setMessage("")
    try { await refresh(generation) }
    catch { if (epoch.current === generation) setMessage(t.unknown) }
    finally { if (epoch.current === generation) setBusy(false) }
  }
  async function submit(command: Command) {
    if (busy || fresh) return
    const generation = epoch.current; setBusy(true); setPending(command); setMessage("")
    try {
      const action = command.kind === "approve" ? approveOpeningCutoverAction : command.kind === "apply" ? applyOpeningCutoverAction : cancelOpeningCutoverAction
      const result = await action(command.input)
      if (epoch.current !== generation) return
      if (!result.success) {
        if (result.code === "FRESH_AUTH_REQUIRED") { setFresh(true); setMessage(t.fresh) }
        else if (["FORBIDDEN", "AUTH_REQUIRED", "CONFLICT", "SOD_VIOLATION", "IDEMPOTENCY_CONFLICT", "VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION"].includes(result.code ?? "")) {
          clear(); setPending(null); setMessage(t.denied)
        } else setMessage(t.unknown)
        return
      }
      setPending(null); setConclusion(""); setReason(""); setConfirmed(false); setMessage(t.saved)
      await refresh(generation)
    } catch { if (epoch.current === generation) setMessage(t.unknown) }
    finally { if (epoch.current === generation) setBusy(false) }
  }
  const live = workspace?.executions.find(row => row.status !== "CANCELLED")
  const expired = live ? new Date(live.expiresAt).getTime() <= Date.now() : false
  return <section className="dashboard-glass-panel min-w-0 space-y-4 rounded-lg p-4 sm:p-6" aria-label={t.title} aria-busy={busy}>
    <h2 className="text-lg font-semibold">{t.title}</h2><p className="text-sm text-[var(--dash-text-soft)]">{t.intro}</p>
    <Button className={button} disabled={busy} onClick={load}>{t.load}</Button>
    {busy && <p role="status">{t.pending}</p>}
    {message && <p role="status" tabIndex={-1} ref={notice}>{message}</p>}
    {workspace && <>
      {!workspace.clientOperator && <p>{t.firm}</p>}
      {!workspace.executions.length && <p>{t.empty}</p>}
      {preview && <div className="space-y-2"><h3 className="font-medium">{t.source} #{preview.revision}</h3>
        <p className="break-all text-xs">{t.digest}: {preview.preview.digest}</p>
        <p>{t.totals}: AR {preview.controls.ar} · AP {preview.controls.ap} · {locale === "fr" ? "Stock" : "Stock"} {preview.controls.stock} · {locale === "fr" ? "Débit / crédit" : "Debit / credit"} {preview.controls.debit} / {preview.controls.credit}</p>
      </div>}
      {workspace.clientOperator && !live && <>
        {preview?.reviewState !== "REVIEWED" ? <p>{t.noReview}</p> : <>
          <label className="block space-y-1"><span>{t.conclusion}</span><textarea aria-label={t.conclusion} className="dashboard-control min-h-24 w-full" maxLength={2000} disabled={busy || !!pending} value={conclusion} onChange={event => setConclusion(event.target.value)} /></label>
          <Button className={button} disabled={busy || !!pending || conclusion.trim().length < 10} onClick={() => submit({ kind: "approve", input: { ...scope, revisionId: preview.id, expectedDigest: preview.preview.digest, conclusion, idempotencyKey: crypto.randomUUID() } })}>{t.approve}</Button>
        </>}
      </>}
      {workspace.executions.map(row => <article key={row.id} className="space-y-3 rounded-lg border p-4">
        <h3 className="font-semibold">{row.status === "ACTIVE" ? t.active : row.status === "CANCELLED" ? t.cancelled : t.approved}</h3>
        <p className="break-all text-xs">{row.id}</p><p>{t.period}: {row.periodId} / {row.periodVersion}</p>
        {row.status === "APPROVED" && <p>{t.expires}: <time dateTime={row.expiresAt}>{new Date(row.expiresAt).toLocaleString(locale)}</time>{expired && ` · ${t.expired}`}</p>}
        {row.status === "APPROVED" && workspace.clientOperator && <div className="space-y-3">
          <label className="flex min-h-11 items-center gap-3"><input type="checkbox" disabled={busy || !!pending} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />{t.confirm}</label>
          <Button className="dashboard-button-primary min-h-11 px-4 py-2" disabled={busy || !!pending || !confirmed || expired} onClick={() => submit({ kind: "apply", input: { ...scope, executionId: row.id, confirmFinancialApply: true, idempotencyKey: crypto.randomUUID() } })}>{t.apply}</Button>
          <label className="block space-y-1"><span>{t.reason}</span><textarea aria-label={t.reason} className="dashboard-control min-h-20 w-full" maxLength={2000} disabled={busy || !!pending} value={reason} onChange={event => setReason(event.target.value)} /></label>
          <Button className={button} disabled={busy || !!pending || reason.trim().length < 10} onClick={() => submit({ kind: "cancel", input: { ...scope, executionId: row.id, reason } })}>{t.cancel}</Button>
        </div>}
        {row.status === "ACTIVE" && <><p>{t.activeNote}</p><p className="break-all text-xs">{t.receipt}: {row.reconciliationHash}</p>
          <details><summary className="min-h-11 cursor-pointer py-3">{t.operations} ({row.operations.length})</summary><ul className="space-y-2">{row.operations.map(operation => <li className="break-all text-xs" key={`${operation.domain}:${operation.sourceId}`}>{operation.domain} · {operation.sourceId} · {operation.receiptHash}</li>)}</ul></details></>}
        {row.cancellationReason && <p>{row.cancellationReason}</p>}
      </article>)}
    </>}
    {fresh && <div className="space-y-2"><label className="block">{t.password}<input aria-label={t.password} type="password" autoComplete="current-password" className="dashboard-control min-h-11 w-full" value={password} onChange={event => setPassword(event.target.value)} /></label>
      <Button className={button} disabled={busy || !password} onClick={async () => {
        const generation = epoch.current; setBusy(true)
        try { const result = await stepUpWithPasswordAction({ password }); if (generation !== epoch.current) return
          setPassword(""); if (result.success) { setFresh(false); setMessage(t.verified) } else setMessage(t.fresh)
        } catch { if (generation === epoch.current) setMessage(t.unknown) }
        finally { if (generation === epoch.current) setBusy(false) }
      }}>{t.verify}</Button></div>}
    {pending && <Button className={button} disabled={busy || fresh} onClick={() => submit(pending)}>{t.retry}</Button>}
    <p className="text-xs text-[var(--dash-text-soft)]">{t.privacy}</p>
  </section>
}
