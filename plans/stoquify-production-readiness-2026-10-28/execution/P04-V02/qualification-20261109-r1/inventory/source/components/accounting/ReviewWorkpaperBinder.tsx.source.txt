"use client"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { getReviewWorkpaperBinderAction, prepareReviewWorkpaperAction, reviewWorkpaperAction, rollForwardWorkpaperAction, exportReviewWorkpapersAction } from "@/actions/accounting/review-workpaper.actions"
import type { ReviewWorkpaperBinder as Binder } from "@/services/accounting/review-workpaper.contract"

const copy = {
  en: { title: "Review workpapers", help: "Inspect four pilot schedules, record preparation, then obtain an independent workpaper review. These are draft workpapers, not a certified close or an audit opinion.",
    refresh: "Load / refresh workpapers", conclusion: "Preparation or review conclusion", prepare: "Record preparation", review: "Record independent review", changes: "Request changes",
    unavailable: "Unavailable — obtain current approved supporting evidence in Close Assurance.", reconciled: "Reconciled", opening: "Opening", additions: "Additions", reductions: "Reductions", closing: "Closing",
    ledger: "Ledger", support: "Support", difference: "Difference", previous: "Earlier period (latest ten)", roll: "Copy headings only", none: "Select an earlier period", rolled: "Headings copied from",
    loading: "Checking current access and evidence…", error: "Unable to confirm the outcome. Retry the saved submission.", denied: "Current access or evidence does not permit this action. Refresh the workpapers and check your client mandate.",
    stale: "Sources or review decisions changed. Refresh and prepare again.", saved: "Recorded. Current workpapers refreshed.", password: "Password", verify: "Verify identity",
    fresh: "Verify your identity, then explicitly retry the saved submission.", verified: "Identity verified. Retry when ready.", retry: "Retry saved submission", required: "Enter a conclusion of 10–2000 characters.",
    outside: "Accounts outside the four pilot schedules", state: "Workpaper review state", current: "Current", historical: "Historical / superseded", scope: "Inclusive UTC period", empty: "Select a period and load the current workpapers.",
    revision: "Source revision", UNPREPARED: "Not prepared", PREPARED: "Prepared", REVIEWED: "Independently reviewed", CHANGES_REQUESTED: "Changes requested", STALE: "Sources changed — review again",
    private: "Do not include personal data in conclusions. Exported conclusions are redacted. Draft text is cleared when this tab is hidden.",
    CASH: "Cash / settlement", RECEIVABLES: "Accounts receivable", PAYABLES: "Accounts payable", INVENTORY: "Inventory",
  },
  fr: { title: "Dossier de travail", help: "Examinez les quatre tableaux pilotes, consignez la préparation, puis obtenez une revue indépendante. Ce brouillon ne constitue ni une clôture certifiée ni une opinion d’audit.",
    refresh: "Charger / actualiser le dossier", conclusion: "Conclusion de préparation ou de revue", prepare: "Consigner la préparation", review: "Consigner la revue indépendante", changes: "Demander des corrections",
    unavailable: "Indisponible — obtenir un justificatif actuel approuvé dans l’assurance de clôture.", reconciled: "Rapproché", opening: "Ouverture", additions: "Augmentations", reductions: "Diminutions", closing: "Clôture",
    ledger: "Grand livre", support: "Justificatif", difference: "Écart", previous: "Période antérieure (dix dernières)", roll: "Copier uniquement les rubriques", none: "Choisir une période antérieure", rolled: "Rubriques copiées depuis",
    loading: "Vérification des accès et justificatifs actuels…", error: "Résultat non confirmé. Réessayez la soumission conservée.", denied: "Les accès ou justificatifs actuels ne permettent pas cette action. Actualisez le dossier et vérifiez le mandat client.",
    stale: "Les sources ou décisions ont changé. Actualisez et préparez à nouveau.", saved: "Enregistré. Dossier actualisé.", password: "Mot de passe", verify: "Vérifier l’identité",
    fresh: "Vérifiez votre identité, puis relancez explicitement la soumission conservée.", verified: "Identité vérifiée. Réessayez lorsque vous êtes prêt.", retry: "Réessayer la soumission", required: "Saisissez une conclusion de 10 à 2000 caractères.",
    outside: "Comptes hors des quatre tableaux pilotes", state: "État de la revue", current: "Actuel", historical: "Historique / remplacé", scope: "Période UTC inclusive", empty: "Sélectionnez une période et chargez le dossier actuel.",
    revision: "Révision des sources", UNPREPARED: "Non préparé", PREPARED: "Préparé", REVIEWED: "Revue indépendante effectuée", CHANGES_REQUESTED: "Corrections demandées", STALE: "Sources modifiées — nouvelle revue requise",
    private: "N’incluez aucune donnée personnelle dans les conclusions. Les exports les masquent. Le brouillon est effacé lorsque cet onglet est masqué.",
    CASH: "Trésorerie / règlements", RECEIVABLES: "Créances clients", PAYABLES: "Dettes fournisseurs", INVENTORY: "Stocks",
  },
}
type Props = { clientOrganizationId?: string; periodId: string; locale?: "en" | "fr" }
type Pending = { kind: "prepare" | "review" | "roll" | "export"; input: Record<string, unknown> }
export function ReviewWorkpaperBinder(props: Props) {
  return <WorkpaperForm key={`${props.clientOrganizationId ?? "home"}:${props.periodId}:${props.locale}`} {...props} />
}
function WorkpaperForm({ clientOrganizationId, periodId, locale = "en" }: Props) {
  const t = copy[locale], scope = { clientOrganizationId, periodId }
  const [binder, setBinder] = useState<Binder | null>(null), [busy, setBusy] = useState(false)
  const [conclusion, setConclusion] = useState(""), [previous, setPrevious] = useState("")
  const [message, setMessage] = useState(""), [pending, setPending] = useState<Pending | null>(null)
  const [fresh, setFresh] = useState(false), [password, setPassword] = useState("")
  const epoch = useRef(0), notice = useRef<HTMLParagraphElement>(null)
  const exportPublication = useRef<{ scope: string; key: string } | null>(null)
  useEffect(() => {
    const hide = () => { if (document.hidden) { epoch.current++; setBinder(null); setConclusion(""); setPassword(""); setPending(null); setFresh(false); setBusy(false); setMessage("") } }
    document.addEventListener("visibilitychange", hide)
    return () => { epoch.current++; document.removeEventListener("visibilitychange", hide) }
  }, [])
  useEffect(() => { if (message) notice.current?.focus() }, [message])
  async function load() {
    const generation = epoch.current
    setBusy(true); setBinder(null); setMessage(""); setPending(null)
    try {
      const result = await getReviewWorkpaperBinderAction(scope)
      if (generation !== epoch.current) return
      if (!result.success || !result.data) { setMessage(t.denied); return }
      setBinder(result.data)
    } catch { if (generation === epoch.current) setMessage(t.error) }
    finally { if (generation === epoch.current) setBusy(false) }
  }
  async function submit(command: Pending) {
    if (busy || fresh) return
    const generation = epoch.current
    setBusy(true); setPending(command); setMessage("")
    try {
      const action = { prepare: prepareReviewWorkpaperAction, review: reviewWorkpaperAction, roll: rollForwardWorkpaperAction, export: exportReviewWorkpapersAction }[command.kind]
      const result = await action(command.input)
      if (generation !== epoch.current) return
      if (!result.success) {
        if (result.code === "FRESH_AUTH_REQUIRED") { setFresh(true); setMessage(t.fresh) }
        else if (["FORBIDDEN", "NOT_FOUND", "CONFLICT", "BUSINESS_RULE_VIOLATION", "SOD_VIOLATION", "VALIDATION_ERROR", "AUTH_REQUIRED", "IDEMPOTENCY_CONFLICT"].includes(result.code ?? "")) {
          setBinder(null); setPending(null); setConclusion(""); setMessage(result.code === "CONFLICT" ? t.stale : t.denied)
        } else setMessage(t.error)
        return
      }
      if (command.kind === "export" && result.data && "contentBase64" in result.data) {
        const bytes = Uint8Array.from(atob(result.data.contentBase64), character => character.charCodeAt(0))
        const url = URL.createObjectURL(new Blob([bytes], { type: result.data.mimeType }))
        const link = document.createElement("a"); link.href = url; link.download = result.data.fileName; link.click(); URL.revokeObjectURL(url)
      }
      setPending(null); setConclusion("")
      const refreshed = await getReviewWorkpaperBinderAction(scope)
      if (generation !== epoch.current) return
      setBinder(refreshed.success && refreshed.data ? refreshed.data : null)
      setMessage(refreshed.success ? t.saved : t.denied)
    } catch { if (generation === epoch.current) setMessage(t.error) }
    finally { if (generation === epoch.current) setBusy(false) }
  }
  function decision(value: "PREPARED" | "REVIEWED" | "CHANGES_REQUESTED") {
    if (!binder) return
    if (conclusion.trim().length < 10) { setMessage(t.required); return }
    void submit({ kind: value === "PREPARED" ? "prepare" : "review", input: { ...scope, expectedSourceHash: binder.sourceHash,
      idempotencyKey: crypto.randomUUID(), conclusion, decision: value, ...(value === "PREPARED" ? {} : { preparationId: binder.decisions[0]?.id }) } })
  }
  function exportBinder(format: "json" | "csv" | "pdf") {
    if (!binder) return
    const binding = `${binder.sourceHash}:${binder.reviewHash}`
    if (exportPublication.current?.scope !== binding) exportPublication.current = { scope: binding, key: crypto.randomUUID() }
    void submit({ kind: "export", input: { ...scope, expectedSourceHash: binder.sourceHash, expectedReviewHash: binder.reviewHash,
      format, idempotencyKey: exportPublication.current.key } })
  }
  async function verify() {
    const generation = epoch.current; setBusy(true)
    try {
      const result = await stepUpWithPasswordAction({ password })
      if (generation === epoch.current) { setFresh(!result.success); setMessage(result.success ? t.verified : t.fresh) }
    } catch { if (generation === epoch.current) setMessage(t.fresh) }
    finally { if (generation === epoch.current) { setPassword(""); setBusy(false) } }
  }
  const button = "dashboard-button-secondary min-h-11"
  return <section id="portal-workpapers" aria-labelledby="workpaper-title" className="dashboard-glass-panel min-w-0 space-y-4 rounded-xl p-4 sm:p-6">
    <h2 id="workpaper-title" className="text-xl font-semibold">{t.title}</h2><p className="text-sm text-[var(--dash-text-muted)]">{t.help}</p>
    <Button className={button} disabled={busy} onClick={() => void load()}>{t.refresh}</Button>
    {busy && <p role="status">{t.loading}</p>}
    {message && <p ref={notice} tabIndex={-1} role="alert">{message}</p>}
    {!binder && !busy && <p>{t.empty}</p>}
    {fresh && <form onSubmit={event => { event.preventDefault(); void verify() }} className="space-y-3">
      <label className="block">{t.password}<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="dashboard-control block min-h-11 w-full" /></label>
      <Button className={button} disabled={busy || !password}>{t.verify}</Button>
    </form>}
    {pending && !fresh && <Button className={button} disabled={busy} onClick={() => void submit(pending)}>{t.retry}</Button>}
    {binder && <>
      <p className="break-words text-sm">{binder.organizationId} · {t.scope}: {binder.periodStart} — {binder.periodEnd}</p>
      <p>{t.state}: <strong>{t[binder.reviewState]}</strong></p>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">{binder.schedules.map(schedule => <section key={schedule.kind} className="dashboard-table-shell min-w-0 rounded-lg p-3">
        <h3 className="font-semibold">{t[schedule.kind]}</h3><p className="my-2 text-sm">{schedule.availability === "RECONCILED" ? t.reconciled : t.unavailable}</p>
        {schedule.accounts.map(account => <div key={`${account.ledgerAccountId}:${account.currency}`} className="my-3 min-w-0 space-y-2">
          <p className="break-words">{account.accountCode} · {account.currency} · {t.revision}: {account.sourceRevision ?? "—"}</p>
          {account.balances ? <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${t[schedule.kind]} ${account.accountCode} ${account.currency}`}>
            <table className="dashboard-data-table w-full text-right text-xs"><caption className="sr-only">{t[schedule.kind]} {account.accountCode} {account.currency}</caption><thead><tr>
              <th scope="col"></th>{[t.opening, t.additions, t.reductions, t.closing].map(label => <th className="p-2" key={label} scope="col">{label}</th>)}</tr></thead>
              <tbody>{(["ledger", "schedule", "differences"] as const).map((basis, index) => <tr key={basis}>
                <th scope="row" className="p-2 text-left">{[t.ledger, t.support, t.difference][index]}</th>
                {(["openingBalance", "additions", "reductions", "closingBalance"] as const).map(column => <td className="p-2 tabular-nums" key={column}>{account.balances![basis][column]}</td>)}
              </tr>)}</tbody></table></div> : <p className="text-sm">{t.unavailable}</p>}
          <p className="text-xs [overflow-wrap:anywhere]">{account.evidenceId ?? "—"} · {account.evidenceHash ?? "—"}</p>
        </div>)}
      </section>)}</div>
      {!!binder.unclassifiedAccounts.length && <details><summary>{t.outside} ({binder.unclassifiedAccounts.length})</summary>
        <ul>{binder.unclassifiedAccounts.map(row => <li key={`${row.ledgerAccountId}:${row.currency}`}>{row.accountCode} · {row.currency} · {row.availability === "RECONCILED" ? t.reconciled : t.unavailable}</li>)}</ul>
      </details>}
      <label className="block" htmlFor="workpaper-conclusion">{t.conclusion}</label>
      <textarea id="workpaper-conclusion" aria-describedby="workpaper-privacy" className="dashboard-control min-h-24 w-full" maxLength={2000} value={conclusion} disabled={busy || !!pending} onChange={event => setConclusion(event.target.value)} />
      <p id="workpaper-privacy" className="text-sm">{t.private}</p>
      <div className="flex flex-wrap gap-2">
        <Button className={button} disabled={busy || !!pending} onClick={() => decision("PREPARED")}>{t.prepare}</Button>
        <Button className={button} disabled={busy || !!pending || binder.decisions[0]?.decision !== "PREPARED" || !binder.decisions[0]?.current} onClick={() => decision("REVIEWED")}>{t.review}</Button>
        <Button className={button} disabled={busy || !!pending || binder.decisions[0]?.decision !== "PREPARED" || !binder.decisions[0]?.current} onClick={() => decision("CHANGES_REQUESTED")}>{t.changes}</Button>
      </div>
      {binder.decisions.slice(0, 10).map(row => <article key={row.id} className="border-t border-[var(--dash-border)] pt-2 text-sm [overflow-wrap:anywhere]">
        <p>{t[row.decision]} · {row.actorId} · {row.at} · {row.current ? t.current : t.historical}</p><p className="whitespace-pre-wrap">{row.conclusion}</p>
      </article>)}
      <label className="block">{t.previous}<select className="dashboard-control block min-h-11 w-full" value={previous} onChange={event => setPrevious(event.target.value)}>
        <option value="">{t.none}</option>{binder.previousPeriods.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <Button className={button} disabled={busy || !!pending || !previous} onClick={() => void submit({ kind: "roll", input: { ...scope, fromPeriodId: previous, idempotencyKey: crypto.randomUUID() } })}>{t.roll}</Button>
      {binder.rolledForwardFrom && <p>{t.rolled}: {binder.rolledForwardFrom}</p>}
      <div className="flex flex-wrap gap-2">{(["json", "csv", "pdf"] as const).map(format => <Button key={format} className={button} disabled={busy || !!pending} onClick={() => exportBinder(format)}>{locale === "fr" ? "Exporter" : "Export"} {format.toUpperCase()}</Button>)}</div>
    </>}
  </section>
}
