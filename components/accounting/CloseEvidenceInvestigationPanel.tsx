"use client"

import { useEffect, useRef, useState } from "react"
import { getCloseEvidenceInvestigationAction } from "@/actions/accounting/close-evidence-workflow.actions"
import type { CloseEvidenceInvestigation } from "@/services/accounting/close-evidence-investigation"
import { CloseEvidenceResolutionForm, resolutionCopy } from "./CloseEvidenceResolutionForm"

export const investigationCopy = {
  en: {
    title: "Investigate retained evidence", help: "Enter the request reference from the evidence history or the colleague reporting the issue. Accountant review permission is required.",
    reference: "Request reference", inspect: "Inspect records", loading: "Loading retained records…", error: "Records could not be retrieved. Check the reference, selected period and current review access, then retry.",
    boundary: "Inspection preserves every record. To resolve conflicting history, propose an explicit selection below and obtain independent authorization. This does not accept evidence or close the finding.",
    observed: "Observed at", revision: "Snapshot reference", truncated: "Only the first 100 records or assignment changes are shown. This investigation snapshot is incomplete.",
    counts: "Displayed records", request: "Request", response: "Response", acceptance: "Acceptance", links: "Linked records", period: "Period", run: "Assessment", recorded: "Recorded at",
    diagnostics: "Detected discrepancies", limits: "These checks detect some structural discrepancies. An empty list does not establish valid evidence, approval or a complete audit trail.",
    changes: "Retained assignment changes", empty: "No discrepancies detected by these structural checks.",
    issues: { MULTIPLE_REQUESTS: "Several requests are attached to this finding.", MULTIPLE_RESPONSES: "Several responses are attached to this finding.", MULTIPLE_ACCEPTANCES: "Several acceptances are attached to this finding.", SCOPE_MISMATCH: "A record points to a different period or assessment.", MALFORMED_RECORD: "Required record information is missing or inconsistent.", BROKEN_LINK: "A request or response link cannot be verified in the displayed records.", ASSIGNMENT_HISTORY: "Response ownership and retained assignment history need investigation.", TRUNCATED: "The bounded snapshot is incomplete." },
  },
  fr: {
    title: "Examiner les justificatifs conservés", help: "Saisissez la référence de la demande depuis l’historique ou fournie par le collègue signalant le problème. Le droit de revue comptable est requis.",
    reference: "Référence de la demande", inspect: "Examiner les enregistrements", loading: "Chargement des enregistrements conservés…", error: "Les enregistrements n’ont pas pu être récupérés. Vérifiez la référence, la période et vos droits de revue, puis réessayez.",
    boundary: "L’examen conserve chaque enregistrement. Pour régulariser un historique contradictoire, proposez une sélection explicite ci-dessous et obtenez une autorisation indépendante. Ceci n’accepte aucun justificatif et ne clôture pas le constat.",
    observed: "Observé le", revision: "Référence de l’instantané", truncated: "Seuls les 100 premiers enregistrements ou changements d’attribution sont affichés. Cet instantané est incomplet.",
    counts: "Enregistrements affichés", request: "Demande", response: "Réponse", acceptance: "Acceptation", links: "Enregistrements liés", period: "Période", run: "Évaluation", recorded: "Enregistré le",
    diagnostics: "Incohérences détectées", limits: "Ces contrôles détectent certaines incohérences structurelles. Une liste vide ne prouve ni la validité des justificatifs, ni une approbation, ni l’intégrité de toute la piste d’audit.",
    changes: "Changements d’attribution conservés", empty: "Aucune incohérence détectée par ces contrôles structurels.",
    issues: { MULTIPLE_REQUESTS: "Plusieurs demandes sont rattachées à ce constat.", MULTIPLE_RESPONSES: "Plusieurs réponses sont rattachées à ce constat.", MULTIPLE_ACCEPTANCES: "Plusieurs acceptations sont rattachées à ce constat.", SCOPE_MISMATCH: "Un enregistrement indique une autre période ou évaluation.", MALFORMED_RECORD: "Des informations requises sont absentes ou incohérentes.", BROKEN_LINK: "Un lien vers une demande ou réponse ne peut pas être vérifié parmi les enregistrements affichés.", ASSIGNMENT_HISTORY: "Le responsable et l’historique des attributions doivent être examinés.", TRUNCATED: "L’instantané limité est incomplet." },
  },
} as const

export function CloseEvidenceInvestigationPanel({ periodId, locale, writable = false, draftIdentity }: { periodId: string; locale: "en" | "fr"; writable?: boolean; draftIdentity?: { organizationId: string; actorId: string } }) {
  const copy = investigationCopy[locale], [reference, setReference] = useState("")
  const [result, setResult] = useState<CloseEvidenceInvestigation | null>(null), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false)
  const [saved, setSaved] = useState("")
  const generation = useRef(0), heading = useRef<HTMLHeadingElement>(null), error = useRef<HTMLParagraphElement>(null)
  const referenceKey = draftIdentity ? `close-recovery-reference:v1:${[draftIdentity.organizationId, draftIdentity.actorId, periodId].map(encodeURIComponent).join(":")}` : ""
  useEffect(() => { generation.current++; setResult(null); setFailed(false); setBusy(false); setSaved(""); return () => { generation.current++ } }, [periodId, locale])
  useEffect(() => {
    if (!referenceKey) return
    try {
      const raw = sessionStorage.getItem(referenceKey), value = raw && JSON.parse(raw)
      if (value && typeof value.reference === "string" && value.reference.length <= 200 && typeof value.savedAt === "number" && value.savedAt <= Date.now() && Date.now() - value.savedAt <= 86400000) setReference(value.reference)
      else sessionStorage.removeItem(referenceKey)
    } catch { /* Draft restoration is optional; current inspection still requires authorization. */ }
  }, [referenceKey])
  useEffect(() => { if (failed) error.current?.focus(); else if (result) heading.current?.focus() }, [failed, result])
  const inspect = async () => {
    if (busy || !reference.trim()) return
    const token = ++generation.current; setBusy(true); setFailed(false); setResult(null)
    try {
      const response = await getCloseEvidenceInvestigationAction({ periodId, requestId: reference.trim() })
      if (token !== generation.current) return
      if (!response.success || !response.data) throw new Error()
      setResult(response.data)
    } catch { if (token === generation.current) setFailed(true) }
    finally { if (token === generation.current) setBusy(false) }
  }
  const time = (value: string) => <time dateTime={value}>{new Date(value).toLocaleString(locale)}</time>
  return <section aria-labelledby="close-investigation-title" className="min-w-0 space-y-3 border-t border-[var(--dash-border)] pt-4">
    <h3 id="close-investigation-title" className="font-semibold">{copy.title}</h3><p>{copy.help}</p>
    <form className="min-w-0 space-y-3" onSubmit={event => { event.preventDefault(); void inspect() }}>
      <label className="block">{copy.reference}<input className="dashboard-control min-h-11 w-full min-w-0 rounded-lg p-3" value={reference} maxLength={200} required disabled={busy} onChange={event => { setReference(event.target.value); setResult(null); setFailed(false); try { if (referenceKey) sessionStorage.setItem(referenceKey, JSON.stringify({ reference: event.target.value, savedAt: Date.now() })) } catch { /* The reference can be re-entered from retained history. */ } }} /></label>
      <button type="submit" disabled={busy || !reference.trim()} className="dashboard-button-secondary min-h-11 rounded-lg px-3 py-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{copy.inspect}</button>
    </form>
    {busy && <p role="status">{copy.loading}</p>}
    {failed && <p role="alert" ref={error} tabIndex={-1}>{copy.error}</p>}
    {saved && <p role="status">{saved}</p>}
    {result && <div className="min-w-0 space-y-3 break-words">
      <h4 ref={heading} tabIndex={-1} className="font-semibold">{result.title}</h4><p>{copy.boundary}</p>
      <p>{copy.observed}: {time(result.observedAt)}</p><p className="break-all">{copy.revision}: {result.revision}</p>
      {result.resolutionId && <p>{resolutionCopy[locale].approval}: {result.resolutionId}</p>}
      {result.truncated && <p role="alert" className="text-[var(--dash-warning)]">{copy.truncated}</p>}
      <p>{copy.counts}: {copy.request} {result.counts.requests} · {copy.response} {result.counts.responses} · {copy.acceptance} {result.counts.acceptances}</p>
      <h5 className="font-semibold">{copy.diagnostics}</h5><p>{copy.limits}</p>
      {result.issues.length ? <ul className="list-inside list-disc">{result.issues.map(issue => <li key={issue}>{issue === "RESOLUTION_HISTORY" ? resolutionCopy[locale].incomplete : copy.issues[issue]}</li>)}</ul> : <p>{copy.empty}</p>}
      <ol className="space-y-3">{result.records.map(row => <li key={row.id} className="min-w-0 rounded-lg border border-[var(--dash-border)] p-3">
        <p className="font-semibold">{copy[row.kind as "request" | "response" | "acceptance"]}: {row.id}</p><p>{copy.recorded}: {time(row.createdAt)}</p>
        {result.excludedIds?.includes(row.id) && <p>{resolutionCopy[locale].retained}</p>}
        <p>{copy.period}: {row.periodId}</p><p>{copy.run}: {row.closeRunId}</p>
        {(row.requestId || row.responseId) && <p>{copy.links}: {row.requestId} {row.responseId}</p>}
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{row.body}</p>
        {row.issues.length > 0 && <ul>{row.issues.map(issue => <li key={issue}>{issue === "RESOLUTION_HISTORY" ? resolutionCopy[locale].incomplete : copy.issues[issue]}</li>)}</ul>}
      </li>)}</ol>
      {result.assignmentChanges.length > 0 && <><h5 className="font-semibold">{copy.changes}</h5><ul>{result.assignmentChanges.map(change => <li key={change.id}>{change.id} · {change.requestId} · {time(change.createdAt)}</li>)}</ul></>}
      {result.proposals && <CloseEvidenceResolutionForm key={`${referenceKey}:${result.requestId}:${result.revision}`} snapshot={result} locale={locale} writable={writable} draftScope={draftIdentity ? { ...draftIdentity, periodId, requestId: result.requestId } : undefined} onSaved={message => { setSaved(message); void inspect() }} />}
    </div>}
  </section>
}
