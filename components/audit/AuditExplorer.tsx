"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { readAuditExplorerAction } from "@/actions/audit/audit-explorer.actions"
import { auditActions, type AuditExplorerResult, type AuditQuery } from "@/services/audit/audit-explorer-contracts"

const copy = {
  en: {
    title: "Audit explorer", intro: "Investigate recorded member access changes, item permission decisions and stock adjustments.",
    coverage: "Coverage is limited to these event families. Item permission approval does not prove an edit was saved. Item metadata changes, login activity, invitations, financial details and exports are not included. Missing events do not prove that no action occurred; this view does not certify completeness or tamper resistance.",
    help: "Filter by date, action or a reference from a record below. Open safe details to compare permitted fields, then follow the source workflow for context.",
    family: "Event family", all: "All", access: "Member access", items: "Items", action: "Action", actor: "Actor reference", entity: "Entity reference", from: "Recorded from (UTC)", through: "Recorded through (UTC)",
    apply: "Apply filters", refresh: "New snapshot", older: "Older events", newest: "Snapshot start", loading: "Loading audit events…", empty: "No authorized events match this snapshot and its filters.",
    restricted: "Audit access is no longer available. Refresh your session or contact your administrator.", snapshot: "The snapshot or cursor is no longer available under your current access. Start a new snapshot.", unavailable: "Audit events could not be loaded. Check the filters and try a new snapshot.",
    accessScope: "Member access changes", itemScope: "Item permission decisions", stockScope: "Stock adjustment changes", included: "Included under current authority", excluded: "Outside current scope or access",
    snapshotAt: "Snapshot upper bound", checked: "Checked", recorded: "Recorded", actorHidden: "Actor hidden or unavailable", source: "Open source workflow", details: "Safe event details", limited: "Only reviewed fields are shown. Reasons, role identifiers, network information and raw change payloads are withheld.", noDetails: "No reviewed detail fields are available for this event. The recorded action remains visible.",
    operations: { roles: "Role assignment change", reactivate: "Member reactivation", deactivate: "Member deactivation", delta: "Quantity adjustment request", set: "Target quantity request" },
    fields: { operation: "Operation", addedRoles: "Roles added", removedRoles: "Roles removed", beforeActive: "Previously active", afterActive: "Active after change", permission: "Permission checked", requiresApproval: "Approval required", adjustmentType: "Adjustment category" }, yes: "Yes", no: "No",
    adjustmentTypes: { CYCLE_COUNT: "Cycle count", PHYSICAL_COUNT: "Physical count", DAMAGED: "Damaged", EXPIRED: "Expired", THEFT: "Theft", WRITE_OFF: "Write-off", FOUND: "Found", CORRECTION: "Correction", OTHER: "Other" },
    actorHelp: "Actor identity and filtering require member read access.",
    actions: { MEMBER_ACCESS_CHANGED: "Member access changed", DEACTIVATE_USER: "Member deactivated", PERMISSION_GRANTED: "Item permission allowed", PERMISSION_DENIED: "Item permission denied", REQUEST_MANUAL_ITEM_STOCK_ADJUSTMENT: "Stock adjustment requested", POST_STOCK_ADJUSTMENT: "Stock adjustment posted", REVERSE_STOCK_ADJUSTMENT: "Stock adjustment reversed" },
  },
  fr: {
    title: "Explorateur d’audit", intro: "Examinez les changements d’accès des membres, les décisions d’autorisation des articles et les ajustements de stock enregistrés.",
    coverage: "La couverture se limite à ces familles. Une autorisation sur un article ne prouve pas que la modification a été enregistrée. Les modifications des fiches articles, connexions, invitations, détails financiers et exports ne sont pas inclus. L’absence d’événements ne prouve pas l’absence d’action ; cette vue ne certifie ni l’exhaustivité ni l’intégrité de l’historique.",
    help: "Filtrez par date, action ou référence d’un enregistrement ci-dessous. Consultez les détails autorisés, puis ouvrez le parcours source pour le contexte.",
    family: "Famille d’événements", all: "Tous", access: "Accès des membres", items: "Articles", action: "Action", actor: "Référence de l’acteur", entity: "Référence de l’entité", from: "Enregistré à partir du (UTC)", through: "Enregistré jusqu’au (UTC)",
    apply: "Appliquer les filtres", refresh: "Nouvel instantané", older: "Événements antérieurs", newest: "Début de l’instantané", loading: "Chargement des événements…", empty: "Aucun événement autorisé ne correspond à cet instantané et à ses filtres.",
    restricted: "L’accès à l’audit n’est plus disponible. Actualisez votre session ou contactez votre administrateur.", snapshot: "L’instantané ou le curseur n’est plus disponible avec vos accès actuels. Créez un nouvel instantané.", unavailable: "Chargement impossible. Vérifiez les filtres et créez un nouvel instantané.",
    accessScope: "Changements d’accès des membres", itemScope: "Décisions d’autorisation des articles", stockScope: "Ajustements de stock", included: "Inclus selon les autorisations actuelles", excluded: "Hors du périmètre ou des accès actuels",
    snapshotAt: "Borne supérieure de l’instantané", checked: "Vérifié", recorded: "Enregistré", actorHidden: "Acteur masqué ou indisponible", source: "Ouvrir le parcours source", details: "Détails autorisés", limited: "Seuls les champs examinés sont affichés. Les motifs, identifiants des rôles, informations réseau et données brutes sont masqués.", noDetails: "Aucun champ détaillé autorisé n’est disponible. L’action enregistrée reste visible.",
    operations: { roles: "Modification des rôles", reactivate: "Réactivation du membre", deactivate: "Désactivation du membre", delta: "Demande d’ajustement de quantité", set: "Demande de quantité cible" },
    fields: { operation: "Opération", addedRoles: "Rôles ajoutés", removedRoles: "Rôles retirés", beforeActive: "Actif auparavant", afterActive: "Actif après modification", permission: "Autorisation vérifiée", requiresApproval: "Approbation requise", adjustmentType: "Catégorie d’ajustement" }, yes: "Oui", no: "Non",
    adjustmentTypes: { CYCLE_COUNT: "Inventaire tournant", PHYSICAL_COUNT: "Inventaire physique", DAMAGED: "Endommagé", EXPIRED: "Périmé", THEFT: "Vol", WRITE_OFF: "Mise au rebut", FOUND: "Retrouvé", CORRECTION: "Correction", OTHER: "Autre" },
    actorHelp: "L’identité et le filtre des acteurs nécessitent l’accès en lecture aux membres.",
    actions: { MEMBER_ACCESS_CHANGED: "Accès du membre modifié", DEACTIVATE_USER: "Membre désactivé", PERMISSION_GRANTED: "Autorisation sur l’article accordée", PERMISSION_DENIED: "Autorisation sur l’article refusée", REQUEST_MANUAL_ITEM_STOCK_ADJUSTMENT: "Ajustement de stock demandé", POST_STOCK_ADJUSTMENT: "Ajustement de stock comptabilisé", REVERSE_STOCK_ADJUSTMENT: "Ajustement de stock extourné" },
  },
} as const
const defaults: AuditQuery = { family: "all" }
const control = "dashboard-control min-w-0 rounded-md p-2"

export default function AuditExplorer({ locale }: { locale: "en" | "fr" }) {
  const t = copy[locale]
  const [draft, setDraft] = useState<AuditQuery>(defaults)
  const [query, setQuery] = useState<AuditQuery>(defaults)
  const [data, setData] = useState<AuditExplorerResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<"restricted" | "snapshot" | "unavailable" | null>(null)
  useEffect(() => {
    let current = true
    setData(null); setLoading(true); setError(null)
    readAuditExplorerAction(query).then(result => {
      if (!current) return
      if (result.success) setData(result.data)
      else setError(result.reason)
    }).catch(() => { if (current) setError("unavailable") }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [query])
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC"
  return <div className="dashboard-landing-theme min-h-screen p-4 sm:p-6"><div className="mx-auto max-w-6xl space-y-5 text-[var(--dash-text)]">
    <header className="space-y-2"><h1 className="text-2xl font-semibold">{t.title}</h1><p>{t.intro}</p><p className="text-sm text-[var(--dash-text-soft)]">{t.help}</p></header>
    <aside className="rounded-lg border border-[var(--dash-border-subtle)] p-4 text-sm">{t.coverage}</aside>
    <form className="grid gap-3 rounded-xl border border-[var(--dash-border-subtle)] p-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={event => { event.preventDefault(); setQuery({ ...draft }) }}>
      <label className="grid gap-1 text-sm">{t.family}<select className={control} value={draft.family} onChange={event => setDraft({ ...draft, family: event.target.value as AuditQuery["family"] })}>{["all", "access", "items"].map(value => <option key={value} value={value}>{t[value as "all" | "access" | "items"]}</option>)}</select></label>
      <label className="grid gap-1 text-sm">{t.action}<select className={control} value={draft.action ?? ""} onChange={event => setDraft({ ...draft, action: event.target.value as AuditQuery["action"] || undefined })}><option value="">{t.all}</option>{auditActions.map(action => <option value={action} key={action}>{t.actions[action]}</option>)}</select></label>
      <label className="grid gap-1 text-sm">{t.actor}<input className={control} value={draft.actorId ?? ""} disabled={data?.canFilterActor === false} maxLength={191} onChange={event => setDraft({ ...draft, actorId: event.target.value || undefined })} /></label>
      <label className="grid gap-1 text-sm">{t.entity}<input className={control} value={draft.entityId ?? ""} maxLength={191} onChange={event => setDraft({ ...draft, entityId: event.target.value || undefined })} /></label>
      <label className="grid gap-1 text-sm">{t.from}<input className={control} type="date" value={draft.from ?? ""} onChange={event => setDraft({ ...draft, from: event.target.value || undefined })} /></label>
      <label className="grid gap-1 text-sm">{t.through}<input className={control} type="date" min={draft.from} value={draft.through ?? ""} onChange={event => setDraft({ ...draft, through: event.target.value || undefined })} /></label>
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3"><button type="submit" className="dashboard-button-primary rounded-md px-3 py-2">{t.apply}</button><button type="button" className="dashboard-button-secondary rounded-md px-3 py-2" onClick={() => setQuery(current => ({ ...current, throughId: undefined, beforeId: undefined }))}>{t.refresh}</button></div>
    </form>
    <div aria-live="polite" aria-busy={loading} className="space-y-4">
      {loading && <p role="status">{t.loading}</p>}{error && <p role="alert">{t[error]}</p>}
      {data && <>
        {!data.canFilterActor && <p className="text-sm">{t.actorHelp}</p>}
        <ul className="text-sm">{[[t.accessScope, data.accessAvailable], [t.itemScope, data.itemDecisionsAvailable], [t.stockScope, data.stockChangesAvailable]].map(([label, allowed]) => <li key={String(label)}>{label}: {allowed ? t.included : t.excluded}</li>)}</ul>
        <p className="text-xs">{t.checked}: {date(data.checkedAt)}{data.recordedThrough && <> · {t.snapshotAt}: {date(data.recordedThrough)}</>}</p>
        {!data.entries.length && <p role="status">{t.empty}</p>}
        <ol className="space-y-3">{data.entries.map(entry => <li key={entry.id} className="space-y-2 rounded-lg border border-[var(--dash-border-subtle)] p-4">
          <h2 className="font-semibold">{t.actions[entry.action]}</h2><p className="break-all font-medium">{entry.reference}</p><p className="text-sm">{t.recorded}: {date(entry.recordedAt)}</p>
          <p className="break-all text-sm">{t.entity}: {entry.entityId}</p><p className="break-all text-sm">{t.actor}: {entry.actorId ?? t.actorHidden}</p>
          <details className="rounded border border-[var(--dash-border-subtle)] p-3"><summary className="cursor-pointer rounded focus-visible:outline focus-visible:outline-2">{t.details}<span className="sr-only">: {entry.id}</span></summary>
            <p className="my-2 text-sm">{entry.detailState === "limited" ? t.limited : t.noDetails}</p>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">{Object.entries(entry.details).map(([key, value]) => <div key={key}><dt>{t.fields[key as keyof typeof t.fields]}</dt><dd>{typeof value === "boolean" ? value ? t.yes : t.no : key === "operation" ? t.operations[value as keyof typeof t.operations] : key === "adjustmentType" ? t.adjustmentTypes[value as keyof typeof t.adjustmentTypes] : value}</dd></div>)}</dl>
          </details>
          <Link href={`/${locale}${entry.sourceHref}`} className="inline-block rounded text-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-2">{t.source}<span className="sr-only">: {entry.entityId}</span></Link>
        </li>)}</ol>
        <nav aria-label={t.title} className="flex flex-wrap gap-2"><button className="dashboard-button-secondary rounded-md px-3 py-2" disabled={!query.beforeId} onClick={() => setQuery(current => ({ ...current, beforeId: undefined }))}>{t.newest}</button><button className="dashboard-button-secondary rounded-md px-3 py-2" disabled={!data.nextCursor} onClick={() => setQuery(current => ({ ...current, throughId: data.throughId ?? undefined, beforeId: data.nextCursor ?? undefined }))}>{t.older}</button></nav>
      </>}
    </div>
  </div></div>
}
