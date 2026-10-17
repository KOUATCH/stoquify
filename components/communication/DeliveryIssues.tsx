"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { readDeliveryIssuesAction } from "@/actions/communication/delivery-issues.actions"
import { deliveryStates, type DeliveryIssuesQuery, type DeliveryIssuesResult, type DeliverySource } from "@/services/communication/delivery-issues-contracts"

const copy = {
  en: {
    title: "Delivery issues", intro: "Review recorded statement deliveries and invitation attempts. Provider acceptance does not confirm receipt. Refreshing never sends a message.",
    source: "Source", all: "All", statements: "Customer statements", invitations: "User invitations", state: "Status", issues: "Needs attention", channel: "Channel",
    from: "Recorded from (UTC)", through: "Recorded through (UTC)", apply: "Apply filters", refresh: "Refresh", first: "Newest", next: "Older records", loading: "Loading delivery records…",
    failed: "Delivery records could not be loaded. Check your filters or refresh.", restricted: "Your current permissions or module access do not allow this source.", unavailable: "This source is unavailable. Refresh to try again; other sources remain independent.",
    empty: "No matching records in this window.", limited: "More records remain to inspect. Continue to older records before concluding there are no matching issues.",
    disabled: "Invitation transport is currently disabled. Historical provider acceptance is not proof of recipient delivery.",
    checked: "Checked", recorded: "Recorded", age: "Age", days: "days", attempts: "Attempts", open: "Open source workflow", noLink: "Opening the customer profile requires additional profile access.",
    reasons: { none: "", disabled: "Provider is not configured. Review the source workflow for permitted recovery.", uncertain: "Outcome is unknown. Review evidence before considering another send.", review: "Review the source workflow for the next permitted step.", invalidEvidence: "Delivery evidence could not be verified. Review the invitation history." },
    states: { queued: "Queued", processing: "Processing", accepted: "Provider accepted", failed: "Failed", deferred: "Deferred", unknown: "Unknown outcome", cancelled: "Cancelled" },
  },
  fr: {
    title: "Problèmes de livraison", intro: "Consultez les envois de relevés et les tentatives d’invitation enregistrés. L’acceptation du fournisseur ne confirme pas la réception. L’actualisation n’envoie aucun message.",
    source: "Source", all: "Tous", statements: "Relevés clients", invitations: "Invitations utilisateurs", state: "État", issues: "À examiner", channel: "Canal",
    from: "Enregistré à partir du (UTC)", through: "Enregistré jusqu’au (UTC)", apply: "Appliquer les filtres", refresh: "Actualiser", first: "Les plus récents", next: "Enregistrements antérieurs", loading: "Chargement des envois…",
    failed: "Chargement impossible. Vérifiez les filtres ou actualisez.", restricted: "Vos autorisations ou votre accès au module ne permettent pas de consulter cette source.", unavailable: "Cette source est indisponible. Actualisez pour réessayer ; les autres sources restent indépendantes.",
    empty: "Aucun résultat correspondant dans cette fenêtre.", limited: "D’autres enregistrements restent à examiner. Consultez les enregistrements antérieurs avant de conclure à l’absence de problèmes.",
    disabled: "Le transport des invitations est actuellement désactivé. Une acceptation antérieure du fournisseur ne prouve pas la réception.",
    checked: "Vérifié", recorded: "Enregistré", age: "Ancienneté", days: "jours", attempts: "Tentatives", open: "Ouvrir le parcours source", noLink: "L’ouverture du profil client nécessite un accès supplémentaire au profil.",
    reasons: { none: "", disabled: "Fournisseur non configuré. Consultez le parcours source pour la reprise autorisée.", uncertain: "Résultat inconnu. Examinez les preuves avant tout nouvel envoi.", review: "Consultez le parcours source pour la prochaine étape autorisée.", invalidEvidence: "Les preuves de livraison n’ont pas pu être vérifiées. Consultez l’historique de l’invitation." },
    states: { queued: "En attente", processing: "En cours", accepted: "Accepté par le fournisseur", failed: "Échec", deferred: "Différé", unknown: "Résultat inconnu", cancelled: "Annulé" },
  },
} as const
const defaults: DeliveryIssuesQuery = { source: "all", state: "issues", channel: "all" }

export default function DeliveryIssues({ locale }: { locale: "en" | "fr" }) {
  const t = copy[locale]
  const [draft, setDraft] = useState(defaults)
  const [query, setQuery] = useState(defaults)
  const [result, setResult] = useState<DeliveryIssuesResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC"
  useEffect(() => {
    let current = true
    setResult(null); setLoading(true); setFailed(false)
    readDeliveryIssuesAction(query).then(response => {
      if (!current) return
      if (response.success) setResult(response.data)
      else setFailed(true)
    }).catch(() => { if (current) setFailed(true) })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [query])
  function page(source: DeliverySource, cursor: string | null) {
    setQuery(current => ({ ...current, [source === "statements" ? "statementCursor" : "invitationCursor"]: cursor ?? undefined }))
  }
  return <div className="dashboard-landing-theme min-h-screen p-4 sm:p-6">
    <div className="mx-auto max-w-6xl space-y-6 text-[var(--dash-text)]">
      <header className="space-y-2"><h1 className="text-2xl font-semibold">{t.title}</h1><p className="text-sm text-[var(--dash-text-soft)]">{t.intro}</p></header>
      <form className="grid gap-3 rounded-xl border border-[var(--dash-border-subtle)] p-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={event => { event.preventDefault(); setQuery({ ...draft }) }}>
        <label className="grid gap-1 text-sm">{t.source}<select className="dashboard-control rounded-md p-2" value={draft.source} onChange={event => setDraft({ ...draft, source: event.target.value as DeliveryIssuesQuery["source"] })}>{["all", "statements", "invitations"].map(value => <option key={value} value={value}>{t[value as "all" | "statements" | "invitations"]}</option>)}</select></label>
        <label className="grid gap-1 text-sm">{t.state}<select className="dashboard-control rounded-md p-2" value={draft.state} onChange={event => setDraft({ ...draft, state: event.target.value as DeliveryIssuesQuery["state"] })}><option value="issues">{t.issues}</option><option value="all">{t.all}</option>{deliveryStates.map(value => <option key={value} value={value}>{t.states[value]}</option>)}</select></label>
        <label className="grid gap-1 text-sm">{t.channel}<select className="dashboard-control rounded-md p-2" value={draft.channel} onChange={event => setDraft({ ...draft, channel: event.target.value as DeliveryIssuesQuery["channel"] })}><option value="all">{t.all}</option><option value="EMAIL">Email</option><option value="WHATSAPP">WhatsApp</option></select></label>
        <label className="grid gap-1 text-sm">{t.from}<input className="dashboard-control rounded-md p-2" type="date" value={draft.from ?? ""} onChange={event => setDraft({ ...draft, from: event.target.value || undefined })} /></label>
        <label className="grid gap-1 text-sm">{t.through}<input className="dashboard-control rounded-md p-2" type="date" min={draft.from} value={draft.through ?? ""} onChange={event => setDraft({ ...draft, through: event.target.value || undefined })} /></label>
        <div className="flex flex-wrap items-end gap-2"><button className="dashboard-button-primary rounded-md px-3 py-2" type="submit">{t.apply}</button><button className="dashboard-button-secondary rounded-md px-3 py-2" type="button" onClick={() => setQuery(current => ({ ...current }))}>{t.refresh}</button></div>
      </form>
      <div aria-live="polite" aria-busy={loading}>
        {loading && <p role="status">{t.loading}</p>}
        {failed && <p role="alert">{t.failed}</p>}
        {result && <div className="space-y-6"><p className="text-xs">{t.checked}: {date(result.checkedAt)}</p>{result.pages.map(section => <section key={section.source} aria-labelledby={`delivery-${section.source}`} className="space-y-3 rounded-xl border border-[var(--dash-border-subtle)] p-4">
          <h2 id={`delivery-${section.source}`} className="text-lg font-semibold">{t[section.source]}</h2>
          {section.availability !== "ready" ? <p>{t[section.availability]}</p> : <>
            {section.source === "invitations" && <p className="text-sm">{t.disabled}</p>}
            {!section.rows.length && <p>{t.empty}</p>}
            <ul className="space-y-3">{section.rows.map(row => <li key={row.id} className="space-y-2 rounded-lg border border-[var(--dash-border-subtle)] p-3">
              <div className="flex flex-wrap justify-between gap-2"><h3 className="break-all font-medium">{row.reference}</h3><span className="rounded border px-2 text-sm">{t.states[row.state]}</span></div>
              <p className="break-all text-sm">{row.recipient} · {row.channel}</p>
              <dl className="grid gap-2 text-sm sm:grid-cols-3"><div><dt>{t.recorded}</dt><dd>{date(row.recordedAt)}</dd></div><div><dt>{t.age}</dt><dd>{Math.max(0, Math.floor((Date.parse(result.checkedAt) - Date.parse(row.recordedAt)) / 86400000))} {t.days}</dd></div><div><dt>{t.attempts}</dt><dd>{row.attempts ?? "—"}</dd></div></dl>
              {t.reasons[row.reason] && <p className="text-sm">{t.reasons[row.reason]}</p>}
              {row.sourceHref ? <Link className="inline-block rounded underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={`/${locale}${row.sourceHref}`}>{t.open}<span className="sr-only">: {row.reference}</span></Link> : <p className="text-sm">{t.noLink}</p>}
            </li>)}</ul>
            {section.windowLimited && <p role="status" className="text-sm">{t.limited}</p>}
            <div className="flex flex-wrap gap-2"><button className="dashboard-button-secondary rounded-md px-3 py-2" onClick={() => page(section.source, null)} disabled={!query[section.source === "statements" ? "statementCursor" : "invitationCursor"]}>{t.first}</button><button className="dashboard-button-secondary rounded-md px-3 py-2" onClick={() => page(section.source, section.nextCursor)} disabled={!section.nextCursor}>{t.next}<span className="sr-only">: {t[section.source]}</span></button></div>
          </>}
        </section>)}</div>}
      </div>
    </div>
  </div>
}
