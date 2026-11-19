"use client"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { getOpeningPositionWorkspaceAction, stageOpeningPositionAction, reviewOpeningPositionAction } from "@/actions/onboarding/opening-position.actions"
import { OPENING_MAX_BYTES, openingSourceSchema, openingControlsSchema, type OpeningSource, type OpeningMappings, type OpeningWorkspace } from "@/services/onboarding/opening-position.contract"

const copy = {
  en: {
    title: "Opening position preview", intro: "CM · XAF · 1 October 2026 at 00:00 Africa/Douala. Stage and independently review evidence only. No journals, stock or balances are applied.",
    load: "Load / refresh preview", source: "Source position JSON", controls: "Independent control totals JSON", map: "Map source keys to client records",
    accounts: "Accounts", customers: "Customers", suppliers: "Suppliers", items: "Items", locations: "Locations", select: "Select a client record",
    stage: "Stage a new preview", review: "Record independent preview review", changes: "Request corrections", conclusion: "Review conclusion",
    pending: "Checking current access and evidence…", saved: "Recorded. Preview refreshed.", duplicate: "Duplicate dataset detected; no new revision was created.",
    error: "Outcome not confirmed. Retry the saved submission.", denied: "Current access or evidence does not permit this action. Refresh and check the client mandate.",
    invalid: "Use the documented JSON format, within 100,000 bytes and 100 total source rows.", documents: "Upload both documents before mapping. Controls must come from a separately prepared source.",
    empty: "No opening position staged.", evidence: "Current evidence", proposed: "Proposed", control: "Independent control", difference: "Difference",
    problems: "Differences and mapping issues", writers: "Financial apply requires separate approval", writersNote: "A balanced preview does not authorize financial apply. Use Controlled opening apply below for a separately authorized, source-bound cutover.",
    history: "Retained revisions", retry: "Retry saved submission", password: "Password", verify: "Verify identity",
    fresh: "Verify your identity, then explicitly retry.", verified: "Identity verified. Retry when ready.",
    STAGED: "Staged — awaiting independent review", REVIEWED: "Independently reviewed preview", CHANGES_REQUESTED: "Corrections requested", STALE: "Mapped records changed — stage a fresh revision", SUPERSEDED: "Superseded",
    schema: "Pilot file contract", privacy: "Files and conclusions are cleared when this tab is hidden. Save your source documents securely before leaving.",
    useCurrent: "Revise retained source and mappings", unavailable: "Unavailable",
  },
  fr: {
    title: "Aperçu de la situation d’ouverture", intro: "CM · XAF · 1 octobre 2026 à 00 h Africa/Douala. Préparation et revue indépendante des justificatifs uniquement. Aucune écriture, aucun stock ni solde appliqué.",
    load: "Charger / actualiser l’aperçu", source: "Situation source JSON", controls: "Totaux de contrôle indépendants JSON", map: "Associer les références aux données du client",
    accounts: "Comptes", customers: "Clients", suppliers: "Fournisseurs", items: "Articles", locations: "Sites", select: "Sélectionner une donnée client",
    stage: "Préparer un nouvel aperçu", review: "Consigner la revue indépendante", changes: "Demander des corrections", conclusion: "Conclusion de la revue",
    pending: "Vérification des accès et justificatifs…", saved: "Enregistré. Aperçu actualisé.", duplicate: "Jeu de données en double ; aucune nouvelle révision créée.",
    error: "Résultat non confirmé. Réessayez la soumission conservée.", denied: "Les accès ou justificatifs actuels ne permettent pas cette action. Actualisez et vérifiez le mandat client.",
    invalid: "Respectez le format JSON documenté, 100 000 octets et 100 lignes sources au maximum.", documents: "Chargez les deux documents avant les associations. Les contrôles doivent provenir d’une source préparée séparément.",
    empty: "Aucune situation d’ouverture préparée.", evidence: "Justificatifs actuels", proposed: "Proposé", control: "Contrôle indépendant", difference: "Écart",
    problems: "Écarts et problèmes d’association", writers: "L’application financière exige une approbation distincte", writersNote: "Un aperçu équilibré n’autorise aucune application financière. Utilisez l’application contrôlée ci-dessous pour une reprise autorisée séparément et liée aux sources.",
    history: "Révisions conservées", retry: "Réessayer la soumission", password: "Mot de passe", verify: "Vérifier l’identité",
    fresh: "Vérifiez votre identité, puis relancez explicitement.", verified: "Identité vérifiée. Réessayez lorsque vous êtes prêt.",
    STAGED: "Préparé — revue indépendante attendue", REVIEWED: "Aperçu revu indépendamment", CHANGES_REQUESTED: "Corrections demandées", STALE: "Données associées modifiées — nouvelle révision requise", SUPERSEDED: "Remplacé",
    schema: "Contrat des fichiers pilotes", privacy: "Les fichiers et conclusions sont effacés lorsque cet onglet est masqué. Conservez vos documents sources en lieu sûr avant de partir.",
    useCurrent: "Réviser les sources et associations conservées", unavailable: "Indisponible",
  },
}
type Props = { clientOrganizationId?: string; locale: "en" | "fr" }
type Pending = { kind: "stage" | "review"; input: Record<string, unknown> }
const issueText: Record<string, [string, string]> = {
  DUPLICATE_MAPPING: ["A source or destination is mapped twice.", "Une source ou destination est associée deux fois."],
  UNAVAILABLE_MAPPING: ["The mapped client record is unavailable.", "La donnée client associée est indisponible."],
  MISSING_MAPPING: ["Select an available client record.", "Sélectionnez une donnée client disponible."],
  INVALID_PRECISION_OR_AMOUNT: ["Use a nonnegative decimal within the supported precision.", "Utilisez un décimal positif ou nul dans la précision autorisée."],
  DUPLICATE_SOURCE_ID: ["The source identifier is repeated.", "La référence source est répétée."],
  UNIT_MISMATCH: ["The unit differs from the client item's unit.", "L’unité diffère de celle de l’article client."],
  DUPLICATE_STOCK_POSITION: ["This item and site position is repeated.", "Cette position article/site est répétée."],
  NONPOSITIVE_QUANTITY: ["The stock quantity must be positive.", "La quantité de stock doit être positive."],
  STOCK_VALUE_DIFFERENCE: ["Quantity multiplied by cost does not match value.", "La quantité multipliée par le coût ne correspond pas à la valeur."],
  DUPLICATE_DOCUMENT: ["This counterparty document is repeated.", "Ce document du tiers est répété."],
  UNSUPPORTED_CURRENCY: ["The pilot supports XAF only.", "Le pilote prend uniquement en charge le XAF."],
  INVALID_DOCUMENT_DATE: ["Use valid ISO dates before cutover and an appropriate due date.", "Utilisez des dates ISO valides avant la reprise et une échéance cohérente."],
  OPEN_ITEM_DIFFERENCE: ["Original less settled does not equal the positive outstanding amount.", "Le montant initial moins le règlement ne correspond pas au solde positif."],
  DUPLICATE_LEDGER_ACCOUNT: ["This ledger account is repeated.", "Ce compte du grand livre est répété."],
  ACCOUNT_DOMAIN_SIDE: ["Account type or debit/credit side does not match the proposed domain.", "Le type de compte ou son sens ne correspond pas au domaine proposé."],
  DOUBLE_COUNTED_DETAIL: ["A detail row is covered more than once.", "Une ligne de détail est couverte plusieurs fois."],
  INVALID_DETAIL_COVERAGE: ["The covered detail does not match this account and domain.", "Le détail couvert ne correspond pas à ce compte et domaine."],
  CONTROL_ACCOUNT_DIFFERENCE: ["Detail coverage does not equal the ledger control.", "Le détail couvert ne correspond pas au contrôle comptable."],
  UNCOVERED_DETAIL: ["A detail row has no ledger control coverage.", "Une ligne de détail n’est pas couverte par un contrôle comptable."],
  LEDGER_IMBALANCE: ["Ledger debits and credits do not balance.", "Les débits et crédits ne sont pas équilibrés."],
  INVALID_CONTROL: ["An independent control is missing or invalid.", "Un contrôle indépendant est absent ou invalide."],
  INDEPENDENT_CONTROL_DIFFERENCE: ["The proposal differs from the independent control.", "La proposition diffère du contrôle indépendant."],
  DUPLICATE_QUANTITY_CONTROL: ["The unit's control quantity is repeated.", "La quantité de contrôle de cette unité est répétée."],
}
const emptyMappings = (): OpeningMappings => ({ accounts: [], customers: [], suppliers: [], items: [], locations: [] })
export function OpeningPositionWorkbench(props: Props) {
  return <OpeningForm key={`${props.clientOrganizationId ?? "home"}:${props.locale}`} {...props} />
}
function OpeningForm({ clientOrganizationId, locale }: Props) {
  const t = copy[locale], scope = { clientOrganizationId }, button = "dashboard-button-secondary min-h-11 px-4 py-2"
  const [workspace, setWorkspace] = useState<OpeningWorkspace | null>(null), [busy, setBusy] = useState(false)
  const [source, setSource] = useState<{ name: string; content: string; data: OpeningSource } | null>(null)
  const [controls, setControls] = useState<{ name: string; content: string } | null>(null), [mappings, setMappings] = useState(emptyMappings)
  const [message, setMessage] = useState(""), [conclusion, setConclusion] = useState(""), [pending, setPending] = useState<Pending | null>(null)
  const [fresh, setFresh] = useState(false), [password, setPassword] = useState("")
  const epoch = useRef(0), notice = useRef<HTMLParagraphElement>(null), files = useRef<HTMLDivElement>(null)
  const uploadSequence = useRef({ source: 0, controls: 0 })
  useEffect(() => {
    const clear = () => { if (document.hidden) { epoch.current++; setWorkspace(null); setSource(null); setControls(null); setMappings(emptyMappings()); setConclusion(""); setPending(null); setPassword(""); setFresh(false); setBusy(false); setMessage(""); files.current?.querySelectorAll("input").forEach(input => input.value = "") } }
    document.addEventListener("visibilitychange", clear)
    return () => { epoch.current++; document.removeEventListener("visibilitychange", clear) }
  }, [])
  useEffect(() => { if (message) notice.current?.focus() }, [message])
  async function load() {
    const generation = epoch.current; setBusy(true); setWorkspace(null); setPending(null); setMessage("")
    try { const result = await getOpeningPositionWorkspaceAction(scope); if (generation !== epoch.current) return
      if (result.success && result.data) setWorkspace(result.data); else { setSource(null); setControls(null); setMappings(emptyMappings()); setConclusion(""); setMessage(t.denied) }
    } catch { if (generation === epoch.current) setMessage(t.error) }
    finally { if (generation === epoch.current) setBusy(false) }
  }
  async function upload(file: File | undefined, kind: "source" | "controls") {
    const generation = epoch.current, sequence = ++uploadSequence.current[kind]
    if (kind === "source") { setSource(null); setMappings(emptyMappings()) } else setControls(null)
    if (!file) return
    try {
      if (file.size > OPENING_MAX_BYTES || !file.name.toLowerCase().endsWith(".json")) throw Error()
      const content = await file.text(), data = JSON.parse(content)
      if (generation !== epoch.current || sequence !== uploadSequence.current[kind]) return
      if (kind === "source") setSource({ name: file.name, content, data: openingSourceSchema.parse(data) })
      else { openingControlsSchema.parse(data); setControls({ name: file.name, content }) }
      setMessage("")
    } catch { if (generation === epoch.current && sequence === uploadSequence.current[kind]) setMessage(t.invalid) }
  }
  async function submit(command: Pending) {
    if (busy || fresh) return
    const generation = epoch.current; setBusy(true); setPending(command); setMessage("")
    try {
      const result = await (command.kind === "stage" ? stageOpeningPositionAction : reviewOpeningPositionAction)(command.input)
      if (generation !== epoch.current) return
      if (!result.success) {
        if (result.code === "FRESH_AUTH_REQUIRED") { setFresh(true); setMessage(t.fresh) }
        else if (["FORBIDDEN", "CONFLICT", "VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION", "SOD_VIOLATION", "IDEMPOTENCY_CONFLICT"].includes(result.code ?? "")) {
          setWorkspace(null); setSource(null); setControls(null); setMappings(emptyMappings()); setPending(null); setConclusion(""); setMessage(t.denied)
        } else setMessage(t.error)
        return
      }
      setPending(null); setConclusion("")
      const refreshed = await getOpeningPositionWorkspaceAction(scope)
      if (generation !== epoch.current) return
      setWorkspace(refreshed.success ? refreshed.data : null)
      setMessage(!refreshed.success ? t.denied : result.data && "duplicate" in result.data && result.data.duplicate ? t.duplicate : t.saved)
    } catch { if (generation === epoch.current) setMessage(t.error) }
    finally { if (generation === epoch.current) setBusy(false) }
  }
  const keys = source ? {
    accounts: [...new Set([...source.data.ledger.map(row => row.account), ...source.data.stock.map(row => row.account), ...source.data.openItems.map(row => row.account)])],
    customers: [...new Set(source.data.openItems.filter(row => row.kind === "AR").map(row => row.counterparty))],
    suppliers: [...new Set(source.data.openItems.filter(row => row.kind === "AP").map(row => row.counterparty))],
    items: [...new Set(source.data.stock.map(row => row.item))], locations: [...new Set(source.data.stock.map(row => row.location))],
  } : null
  const current = workspace?.current
  function revise() {
    if (!current) return
    setSource({ name: current.sourceFilename, data: current.source, content: JSON.stringify(current.source, null, 2) })
    setControls({ name: current.controlsFilename, content: JSON.stringify(current.controls, null, 2) }); setMappings(current.mappings)
  }
  return <section id="opening-position-workbench" className="dashboard-glass-panel min-w-0 space-y-5 rounded-lg p-4 sm:p-6" aria-busy={busy}>
    <h2 className="text-xl font-semibold">{t.title}</h2><p>{t.intro}</p><p className="text-sm">{t.privacy}</p>
    <Button className={button} disabled={busy} onClick={() => void load()}>{t.load}</Button>
    {message && <p ref={notice} role="status" tabIndex={-1} className="break-words">{message}</p>}
    {busy && <p>{t.pending}</p>}
    {fresh && <form onSubmit={async event => { event.preventDefault(); const generation = epoch.current; setBusy(true)
      try { const result = await stepUpWithPasswordAction({ password }); if (generation !== epoch.current) return
        setPassword(""); if (result.success) { setFresh(false); setMessage(t.verified) } else setMessage(t.denied)
      } catch { if (generation === epoch.current) setMessage(t.error) } finally { if (generation === epoch.current) setBusy(false) } }}>
      <label>{t.password}<input autoComplete="current-password" type="password" className="dashboard-control block min-h-11 w-full" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <Button className={button} disabled={busy || !password}>{t.verify}</Button>
    </form>}
    {pending && !fresh && <Button className={button} disabled={busy} onClick={() => void submit(pending)}>{t.retry}</Button>}
    {workspace && <>
      <p className="break-all">{workspace.organizationId} · {workspace.latestRevision}</p>
      <details><summary>{t.schema}</summary><p className="my-2 text-sm">{t.documents}</p>
        <p className="break-words text-sm">opening-position-v1: version, country=CM, currency=XAF, cutoverDate=2026-10-01, timezone=Africa/Douala, evidenceReference, stock[], openItems[], ledger[].</p>
        <p className="break-words text-sm">stock: sourceId, item, location, unit, account, quantity, unitCost, value. openItems: sourceId, kind=AR|AP, counterparty, document, account, sourceDate, dueDate, currency, original, settled, outstanding. ledger: sourceId, account, domain=AR|AP|STOCK|CASH|EQUITY, side=DEBIT|CREDIT, amount, currency, covers[].</p>
        <p className="break-words text-sm">opening-controls-v1: version, evidenceReference, country=CM, currency=XAF, cutoverDate=2026-10-01, stock, ar, ap, debit, credit, quantities=[&#123;unit, quantity&#125;]. {locale === "fr" ? "Montants et quantités sous forme de chaînes décimales ; dates AAAA-MM-JJ." : "Amounts and quantities are decimal strings; dates use YYYY-MM-DD."}</p>
      </details>
      <div ref={files} className="grid min-w-0 gap-4 lg:grid-cols-2">
        <label className="min-w-0">{t.source}<input aria-label={t.source} type="file" accept=".json,application/json" disabled={busy || !!pending} className="block min-h-11 w-full min-w-0" onChange={e => void upload(e.target.files?.[0], "source")} /></label>
        <label className="min-w-0">{t.controls}<input aria-label={t.controls} type="file" accept=".json,application/json" disabled={busy || !!pending} className="block min-h-11 w-full min-w-0" onChange={e => void upload(e.target.files?.[0], "controls")} /></label>
      </div>
      {current && <Button className={button} disabled={busy || !!pending} onClick={revise}>{t.useCurrent}</Button>}
      {keys && <fieldset className="min-w-0 space-y-3" disabled={busy || !!pending}><legend>{t.map}</legend>
        {(Object.keys(keys) as Array<keyof OpeningMappings>).flatMap(group => keys[group].map(key => <label className="block min-w-0 break-words" key={`${group}:${key}`}>
          {t[group]} · {key}<select aria-label={`${t[group]} · ${key}`} className="dashboard-control block min-h-11 w-full min-w-0" value={mappings[group].find(m => m.source === key)?.targetId ?? ""}
            onChange={e => setMappings(previous => ({ ...previous, [group]: [...previous[group].filter(m => m.source !== key), ...(e.target.value ? [{ source: key, targetId: e.target.value }] : [])] }))}>
            <option value="">{t.select}</option>{workspace.catalog[group].map(row => <option key={row.id} value={row.id}>{"code" in row ? `${row.code} · ` : ""}{row.name}</option>)}
          </select></label>))}
      </fieldset>}
      <Button className={button} disabled={busy || !!pending || !source || !controls} onClick={() => source && controls && void submit({ kind: "stage", input: {
        ...scope, sourceFilename: source.name, sourceContent: source.content, controlsFilename: controls.name, controlsContent: controls.content,
        mappings, expectedRevision: workspace.latestRevision, idempotencyKey: crypto.randomUUID(),
      } })}>{t.stage}</Button>
      {!current ? <p>{t.empty}</p> : <>
        <h3 className="font-semibold">{t.evidence}</h3><p>{t[current.reviewState]}</p>
        <p className="text-sm [overflow-wrap:anywhere]">{current.sourceFilename} · {current.preview.sourceHash}<br />{current.controlsFilename} · {current.preview.controlsHash}<br />{current.preview.digest}</p>
        <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={t.evidence}>
          <table className="dashboard-data-table w-full text-sm"><thead><tr><th scope="col">{t.evidence}</th><th scope="col">{t.proposed}</th><th scope="col">{t.control}</th><th scope="col">{t.difference}</th></tr></thead>
            <tbody>{current.preview.comparisons.map(row => <tr key={row.key}><th className="p-2 text-left" scope="row">{({
              stock: locale === "fr" ? "Valeur du stock (XAF)" : "Stock value (XAF)", ar: locale === "fr" ? "Créances clients (XAF)" : "Receivables (XAF)",
              ap: locale === "fr" ? "Dettes fournisseurs (XAF)" : "Payables (XAF)", debit: locale === "fr" ? "Débits (XAF)" : "Debits (XAF)",
              credit: locale === "fr" ? "Crédits (XAF)" : "Credits (XAF)",
            } as Record<string, string>)[row.key] ?? `${locale === "fr" ? "Quantité" : "Quantity"} (${row.key.replace("quantity:", "")})`}</th>{[row.proposed, row.control, row.difference].map((v,i) => <td key={i} className="p-2 text-right tabular-nums">{v ?? t.unavailable}</td>)}</tr>)}</tbody></table>
        </div>
        {current.preview.issues.length > 0 && <div><h3 className="font-semibold">{t.problems}</h3><ul className="list-disc pl-5">{current.preview.issues.map((row,i) => <li className="break-words" key={i}>{row.row} · {row.field} · {issueText[row.code]?.[locale === "fr" ? 1 : 0] ?? t.invalid}</li>)}</ul></div>}
        <details><summary>{locale === "fr" ? "Détail et comptes associés" : "Detail and mapped accounts"}</summary><ul className="space-y-2 text-sm">{current.preview.details.map((row,i) => <li className="break-all" key={i}>{row.sourceId} · {row.kind} · {row.accountId ?? t.unavailable} · {row.amount ?? t.unavailable} XAF</li>)}</ul></details>
        <label className="block">{t.conclusion}<textarea className="dashboard-control block min-h-24 w-full" value={conclusion} maxLength={2000} disabled={busy || !!pending} onChange={e => setConclusion(e.target.value)} /></label>
        <div className="flex flex-wrap gap-3">{(["REVIEWED", "CHANGES_REQUESTED"] as const).map(decision => <Button className={button} key={decision}
          disabled={busy || !!pending || current.reviewState !== "STAGED" || conclusion.trim().length < 10 || (decision === "REVIEWED" && !current.preview.canReview)}
          onClick={() => void submit({ kind: "review", input: { ...scope, revisionId: current.id, expectedDigest: current.preview.digest, conclusion, decision, idempotencyKey: crypto.randomUUID() } })}>
          {decision === "REVIEWED" ? t.review : t.changes}</Button>)}</div>
        {current.reviewedById && <p className="break-words">{current.reviewedById} · {current.reviewedAt} · {current.conclusion}</p>}
      </>}
      <aside className="rounded-lg border border-[var(--dash-border)] p-4"><h3 className="font-semibold">{t.writers}</h3><p>{t.writersNote}</p></aside>
      <details><summary>{t.history} ({workspace.history.length})</summary><ul>{workspace.history.map(row => <li className="break-all" key={row.id}>{row.revision} · {t[row.status as keyof typeof t] ?? row.status} · {row.sourceHash}</li>)}</ul></details>
    </>}
  </section>
}
