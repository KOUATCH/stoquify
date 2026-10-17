"use client"

import { useEffect, useRef, useState } from "react"
import { proposeCloseEvidenceResolutionAction, approveCloseEvidenceResolutionAction, closeEvidenceResolutionProposalAction } from "@/actions/accounting/close-evidence-workflow.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import type { CloseEvidenceInvestigation } from "@/services/accounting/close-evidence-investigation"
import type { CloseRecoveryCommand } from "@/services/accounting/close-evidence-resolution.schemas"
import { readCloseRecoveryDraft, saveCloseRecoveryDraft, closeRecoveryDraftKey, type CloseRecoveryDraftScope, type CloseRecoveryDraft } from "@/hooks/accounting/close-evidence-resolution-draft"

export const resolutionCopy = {
  en: { title: "Propose retained evidence selection", help: "Select the retained request and any linked response and acceptance that match the finding’s current state. Explain every exclusion. An independent reviewer must authorize the proposal; all original records remain available.", request: "Retained request", response: "Retained response", acceptance: "Retained acceptance", none: "None selected", reason: "Reason for this selection", exclusion: "Reason to retain but exclude", propose: "Record proposal", proposals: "Recovery proposals", review: "Independent review notes", approve: "Authorize selection", pending: "Awaiting independent authorization", approved: "Selection authorized", stale: "Source or earlier decision changed. Inspect the records again before proposing a new decision.", proposed: "Proposal recorded. Give its reference to an independent reviewer; it has not changed the evidence used for processing.", done: "Selection authorized. Refresh the evidence workbench to continue through the existing response or acceptance controls.", error: "The outcome could not be confirmed. Keep this form and retry the same submission.", denied: "Current authority or selected evidence does not permit this decision. Inspect the source again; your draft is retained.", retry: "Retry saved submission", password: "Password", verify: "Verify identity", fresh: "Verify your identity, then explicitly retry the saved submission.", verified: "Identity verified. Review and retry the saved submission.", confirm: "I reviewed the selection and every exclusion; this does not accept evidence or close the finding.", incomplete: "The snapshot is incomplete or recovery history needs investigation. No proposal can be submitted.", retained: "Excluded from processing; original record retained", approval: "Authorization reference", readonly: "Current access allows inspection only.", more: "Only the latest 20 recovery events are shown." },
  fr: { title: "Proposer une sélection des justificatifs conservés", help: "Sélectionnez la demande conservée et, le cas échéant, la réponse et l’acceptation liées correspondant à l’état actuel du constat. Justifiez chaque exclusion. Un réviseur indépendant doit autoriser la proposition ; tous les originaux restent disponibles.", request: "Demande conservée", response: "Réponse conservée", acceptance: "Acceptation conservée", none: "Aucune sélection", reason: "Motif de cette sélection", exclusion: "Motif de conservation avec exclusion", propose: "Enregistrer la proposition", proposals: "Propositions de régularisation", review: "Notes de revue indépendante", approve: "Autoriser la sélection", pending: "Autorisation indépendante attendue", approved: "Sélection autorisée", stale: "La source ou la décision antérieure a changé. Examinez les enregistrements avant une nouvelle proposition.", proposed: "Proposition enregistrée. Transmettez sa référence à un réviseur indépendant ; elle ne change pas les justificatifs utilisés pour le traitement.", done: "Sélection autorisée. Actualisez l’espace justificatif pour poursuivre avec les contrôles de réponse ou d’acceptation existants.", error: "Le résultat n’a pas pu être confirmé. Conservez ce formulaire et réessayez la même soumission.", denied: "Les droits actuels ou les justificatifs sélectionnés ne permettent pas cette décision. Réexaminez la source ; votre brouillon est conservé.", retry: "Réessayer la soumission conservée", password: "Mot de passe", verify: "Vérifier l’identité", fresh: "Vérifiez votre identité, puis réessayez explicitement la soumission conservée.", verified: "Identité vérifiée. Examinez et réessayez la soumission conservée.", confirm: "J’ai examiné la sélection et chaque exclusion ; ceci n’accepte aucun justificatif et ne clôture pas le constat.", incomplete: "L’instantané est incomplet ou l’historique de régularisation doit être examiné. Aucune proposition ne peut être soumise.", retained: "Exclu du traitement ; original conservé", approval: "Référence d’autorisation", readonly: "Vos droits actuels permettent uniquement la consultation.", more: "Seuls les 20 derniers événements de régularisation sont affichés." },
} as const
export const resolutionDecisionCopy = {
  en: { withdraw: "Withdraw proposal", reject: "Reject proposal", withdrawn: "Proposal withdrawn", rejected: "Proposal rejected", reason: "Reason for closing this proposal", confirm: "Close this pending proposal and keep its history. This does not change evidence or an existing authorization.", reference: "Decision reference", at: "Decision recorded at" },
  fr: { withdraw: "Retirer la proposition", reject: "Rejeter la proposition", withdrawn: "Proposition retirée", rejected: "Proposition rejetée", reason: "Motif de clôture de cette proposition", confirm: "Clôturer cette proposition en attente et conserver son historique. Ceci ne modifie ni les justificatifs ni une autorisation existante.", reference: "Référence de la décision", at: "Décision enregistrée le" },
} as const
export const resolutionDraftCopy = {
  en: { help: "Drafts stay in this browser tab for up to 24 hours. They are not approval records. Reopen the same request after a reload. Do not use a shared browser for private review notes.", restored: "Draft restored. Review the current records before continuing; confirmations must be entered again.", unavailable: "Tab storage is unavailable. Keep this page open; your draft is currently held only in memory.", stale: "The evidence snapshot changed since this draft. Review the current records and selection before making a new proposal.", checked: "I reviewed this draft against the current evidence snapshot.", discard: "Discard saved draft", pending: "Unconfirmed submission retained. Retry this exact submission to learn its recorded outcome; nothing is submitted automatically.", reference: "Submission reference" },
  fr: { help: "Les brouillons restent dans cet onglet pendant 24 heures au maximum. Ils ne constituent pas des approbations. Rouvrez la même demande après un rechargement. Évitez un navigateur partagé pour les notes confidentielles.", restored: "Brouillon restauré. Examinez les enregistrements actuels avant de poursuivre ; les confirmations doivent être renouvelées.", unavailable: "Le stockage de l’onglet est indisponible. Gardez cette page ouverte ; le brouillon reste uniquement en mémoire.", stale: "L’instantané a changé depuis ce brouillon. Examinez les enregistrements et la sélection actuels avant une nouvelle proposition.", checked: "J’ai vérifié ce brouillon par rapport à l’instantané actuel des justificatifs.", discard: "Abandonner le brouillon enregistré", pending: "Soumission non confirmée conservée. Réessayez exactement cette soumission pour connaître son résultat enregistré ; aucun envoi n’est automatique.", reference: "Référence de soumission" },
} as const
type Command = CloseRecoveryCommand
const control = "dashboard-control min-h-11 w-full min-w-0 rounded-lg p-3"
const button = "dashboard-button-secondary min-h-11 rounded-lg px-3 py-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"

export function CloseEvidenceResolutionForm({ snapshot, locale, writable, onSaved, draftScope }: { snapshot: CloseEvidenceInvestigation; locale: "en" | "fr"; writable: boolean; onSaved(message: string): void; draftScope?: CloseRecoveryDraftScope }) {
  const copy = resolutionCopy[locale], [selected, setSelected] = useState({ request: "", response: "", acceptance: "" }), [reason, setReason] = useState("")
  const [exclusions, setExclusions] = useState<Record<string, string>>({}), [notes, setNotes] = useState<Record<string, string>>({}), [confirmed, setConfirmed] = useState<Record<string, boolean>>({})
  const decisionCopy = resolutionDecisionCopy[locale], [closeReasons, setCloseReasons] = useState<Record<string, string>>({}), [closeConfirmed, setCloseConfirmed] = useState<Record<string, boolean>>({})
  const [pending, setPending] = useState<Command | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("")
  const [fresh, setFresh] = useState(false), [password, setPassword] = useState("")
  const draftCopy = resolutionDraftCopy[locale], storageKey = draftScope ? closeRecoveryDraftKey(draftScope) : ""
  const [hydrated, setHydrated] = useState(false), [storageFailed, setStorageFailed] = useState(false), [restored, setRestored] = useState(false)
  const [draftRevision, setDraftRevision] = useState(snapshot.revision), [reviewedDraft, setReviewedDraft] = useState(false)
  const scopeRef = useRef(draftScope)
  scopeRef.current = draftScope
  const notice = useRef<HTMLParagraphElement>(null), passwordInput = useRef<HTMLInputElement>(null), mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    try {
      const scope = scopeRef.current, value = scope ? readCloseRecoveryDraft(sessionStorage, scope) : null
      if (value) { setSelected(value.selected); setReason(value.reason); setExclusions(value.exclusions); setNotes(value.notes); setCloseReasons(value.closeReasons); setPending(value.pending); setDraftRevision(value.revision); setRestored(true) }
    } catch { setStorageFailed(true) }
    setHydrated(true)
  }, [storageKey])
  useEffect(() => {
    if (!hydrated || !scopeRef.current) return
    const value: CloseRecoveryDraft = { revision: draftRevision, selected, reason, exclusions, notes, closeReasons, pending }
    const hasDraft = !!pending || Object.values(selected).some(Boolean) || !!reason || [exclusions, notes, closeReasons].some(map => Object.values(map).some(Boolean))
    try { saveCloseRecoveryDraft(sessionStorage, scopeRef.current, hasDraft ? value : null) }
    catch { setStorageFailed(true) }
  }, [hydrated, storageKey, draftRevision, selected, reason, exclusions, notes, closeReasons, pending])
  useEffect(() => { if (fresh) passwordInput.current?.focus(); else if (message) notice.current?.focus() }, [fresh, message])
  const excluded = snapshot.records.filter(row => !Object.values(selected).includes(row.id))
  const disabled = busy || !!pending || !writable || !hydrated, incomplete = snapshot.truncated || snapshot.issues.includes("RESOLUTION_HISTORY")
  const staleDraft = draftRevision !== snapshot.revision
  function clearDraft() {
    setSelected({ request: "", response: "", acceptance: "" }); setReason(""); setExclusions({}); setNotes({}); setCloseReasons({}); setPending(null); setConfirmed({}); setCloseConfirmed({}); setRestored(false); setDraftRevision(snapshot.revision); setReviewedDraft(false)
    try { if (draftScope) saveCloseRecoveryDraft(sessionStorage, draftScope, null) } catch { setStorageFailed(true) }
  }
  function completeDraft(command: Command) {
    const remainingNotes = { ...notes }, remainingReasons = { ...closeReasons }
    if (command.kind !== "propose") { delete remainingNotes[command.input.proposalId]; delete remainingReasons[command.input.proposalId] }
    const next: CloseRecoveryDraft = { revision: draftRevision, selected: command.kind === "propose" ? { request: "", response: "", acceptance: "" } : selected,
      reason: command.kind === "propose" ? "" : reason, exclusions: command.kind === "propose" ? {} : exclusions, notes: remainingNotes, closeReasons: remainingReasons, pending: null }
    const hasDraft = Object.values(next.selected).some(Boolean) || !!next.reason || [next.exclusions, next.notes, next.closeReasons].some(map => Object.values(map).some(Boolean))
    // The parent re-inspects and unmounts this form on success. Preserve other
    // unsent work synchronously rather than relying on a later React effect.
    try { if (draftScope) saveCloseRecoveryDraft(sessionStorage, draftScope, hasDraft ? next : null) } catch { setStorageFailed(true) }
    setSelected(next.selected); setReason(next.reason); setExclusions(next.exclusions); setNotes(next.notes); setCloseReasons(next.closeReasons); setPending(null); setConfirmed({}); setCloseConfirmed({}); setRestored(false)
  }
  async function submit(command: Command) {
    if (busy || !writable || fresh || !hydrated) return
    // Save before dispatch so a reload during the request retains the same key.
    try { if (draftScope) saveCloseRecoveryDraft(sessionStorage, draftScope, { revision: command.kind === "propose" ? command.input.expectedRevision : draftRevision, selected, reason, exclusions, notes, closeReasons, pending: command }) }
    catch { setStorageFailed(true) }
    setPending(command); setBusy(true); setMessage("")
    try {
      const result = await (command.kind === "propose" ? proposeCloseEvidenceResolutionAction : command.kind === "approve" ? approveCloseEvidenceResolutionAction : closeEvidenceResolutionProposalAction)(command.input)
      if (!mounted.current) return
      if (!result.success) {
        if (result.code === "FRESH_AUTH_REQUIRED") { setFresh(true); setMessage(copy.fresh) }
        else if (["FORBIDDEN", "CONFLICT", "REVIEW_REQUIRED", "NOT_FOUND", "VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION"].includes(result.code || "")) { setPending(null); setMessage(result.code === "CONFLICT" ? copy.stale : copy.denied) }
        else setMessage(copy.error)
        return
      }
      completeDraft(command); onSaved(command.kind === "propose" ? copy.proposed : command.kind === "approve" ? copy.done : command.input.decision === "WITHDRAWN" ? decisionCopy.withdrawn : decisionCopy.rejected)
    } catch { if (mounted.current) setMessage(copy.error) }
    finally { if (mounted.current) setBusy(false) }
  }
  async function verify() {
    if (busy || !password) return
    setBusy(true)
    try { const result = await stepUpWithPasswordAction({ password }); if (!mounted.current) return; if (!result.success) throw new Error(); setFresh(false); setMessage(copy.verified) }
    catch { if (mounted.current) setMessage(copy.fresh) }
    finally { if (mounted.current) { setPassword(""); setBusy(false) } }
  }
  return <section className="min-w-0 space-y-4 border-t border-[var(--dash-border)] pt-4" aria-labelledby="close-recovery-title">
    <h5 id="close-recovery-title" className="font-semibold">{copy.title}</h5><p>{copy.help}</p>
    {draftScope && <p>{draftCopy.help}</p>}
    {storageFailed && <p role="status">{draftCopy.unavailable}</p>}
    {restored && <p role="status">{draftCopy.restored}</p>}
    {staleDraft && <p>{draftCopy.stale}</p>}
    {staleDraft && !pending && <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={reviewedDraft} disabled={disabled} onChange={event => setReviewedDraft(event.target.checked)} />{draftCopy.checked}</label>}
    {pending && <p>{draftCopy.pending} {draftCopy.reference}: <span className="break-all">{pending.input.correlationId}</span></p>}
    {!pending && draftScope && <button type="button" className={button} disabled={busy || !hydrated} onClick={clearDraft}>{draftCopy.discard}</button>}
    {!writable && <p>{copy.readonly}</p>}
    {message && <p ref={notice} tabIndex={-1} role="alert">{message}</p>}
    {fresh && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void verify() }}><label>{copy.password}<input ref={passwordInput} type="password" autoComplete="current-password" className={control} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label><button className={button} disabled={busy || !password}>{copy.verify}</button></form>}
    {pending && !fresh && <button className={button} disabled={busy || !writable || !hydrated} type="button" onClick={() => void submit(pending)}>{copy.retry}</button>}
    {incomplete ? <p role="alert">{copy.incomplete}</p> : <form className="min-w-0 space-y-3" onSubmit={event => { event.preventDefault(); if ((staleDraft && !reviewedDraft) || !selected.request || !excluded.length || reason.trim().length < 10 || excluded.some(row => (exclusions[row.id] || "").trim().length < 10)) return; setDraftRevision(snapshot.revision); void submit({ kind: "propose", input: { periodId: snapshot.periodId, requestId: snapshot.requestId, expectedRevision: snapshot.revision, selectedRequestId: selected.request, selectedResponseId: selected.response || null, selectedAcceptanceId: selected.acceptance || null, reason: reason.trim(), exclusions: excluded.map(row => ({ id: row.id, reason: exclusions[row.id].trim() })), correlationId: crypto.randomUUID() } }) }}>
      {(["request", "response", "acceptance"] as const).map(kind => <label key={kind} className="block">{copy[kind]}<select className={control} value={selected[kind]} required={kind === "request"} disabled={disabled} onChange={event => setSelected(old => ({ ...old, [kind]: event.target.value }))}><option value="">{copy.none}</option>{snapshot.records.filter(row => row.kind === kind).map(row => <option key={row.id} value={row.id}>{row.id}</option>)}</select></label>)}
      <label className="block">{copy.reason}<textarea className={control} minLength={10} maxLength={4000} required value={reason} disabled={disabled} onChange={event => setReason(event.target.value)} /></label>
      {excluded.map(row => <label key={row.id} className="block [overflow-wrap:anywhere]">{copy.exclusion}: {row.id}<textarea className={control} minLength={10} maxLength={2000} required disabled={disabled} value={exclusions[row.id] || ""} onChange={event => setExclusions(old => ({ ...old, [row.id]: event.target.value }))} /></label>)}
      <button className={button} disabled={disabled || !selected.request || !excluded.length || (staleDraft && !reviewedDraft)}>{copy.propose}</button>
    </form>}
    <h5 className="font-semibold">{copy.proposals}</h5>{snapshot.proposalsTruncated && <p role="alert">{copy.more}</p>}
    <ul className="space-y-3">{snapshot.proposals?.map(proposal => <li key={proposal.id} className="min-w-0 space-y-2 rounded-lg border border-[var(--dash-border)] p-3 [overflow-wrap:anywhere]">
      <p>{proposal.id}</p><p>{proposal.approvalId ? copy.approved : proposal.outcome?.state === "WITHDRAWN" ? decisionCopy.withdrawn : proposal.outcome?.state === "REJECTED" ? decisionCopy.rejected : proposal.stale ? copy.stale : copy.pending}</p><p>{proposal.reason}</p>
      {proposal.outcome && proposal.outcome.state !== "APPROVED" && <><p>{decisionCopy.reason}: {proposal.outcome.reason}</p><p>{decisionCopy.reference}: {proposal.outcome.id}</p><p>{decisionCopy.at}: <time dateTime={proposal.outcome.createdAt}>{new Date(proposal.outcome.createdAt).toLocaleString(locale)}</time></p></>}
      <p>{copy.request}: {proposal.selectedRequestId}</p>{proposal.selectedResponseId && <p>{copy.response}: {proposal.selectedResponseId}</p>}{proposal.selectedAcceptanceId && <p>{copy.acceptance}: {proposal.selectedAcceptanceId}</p>}
      <ul>{proposal.exclusions.map(row => <li key={row.id}>{copy.exclusion}: {row.id} — {row.reason}</li>)}</ul>
      {proposal.approvalId && <p>{copy.approval}: {proposal.approvalId}</p>}
      {proposal.canApprove && writable && <form className="space-y-3" onSubmit={event => { event.preventDefault(); if (!confirmed[proposal.id] || (notes[proposal.id] || "").trim().length < 10) return; void submit({ kind: "approve", input: { proposalId: proposal.id, notes: notes[proposal.id].trim(), correlationId: crypto.randomUUID() } }) }}>
        <label className="block">{copy.review}<textarea className={control} minLength={10} maxLength={4000} required disabled={disabled} value={notes[proposal.id] || ""} onChange={event => setNotes(old => ({ ...old, [proposal.id]: event.target.value }))} /></label>
        <label className="flex items-start gap-2"><input type="checkbox" required className="mt-1" disabled={disabled} checked={confirmed[proposal.id] || false} onChange={event => setConfirmed(old => ({ ...old, [proposal.id]: event.target.checked }))} />{copy.confirm}</label>
        <button className={button} disabled={disabled || !confirmed[proposal.id]}>{copy.approve}</button>
      </form>}
      {(proposal.canWithdraw || proposal.canReject) && writable && <form className="space-y-3" onSubmit={event => { event.preventDefault(); if (!closeConfirmed[proposal.id] || (closeReasons[proposal.id] || "").trim().length < 10) return; void submit({ kind: "close", input: { proposalId: proposal.id, decision: proposal.canWithdraw ? "WITHDRAWN" : "REJECTED", reason: closeReasons[proposal.id].trim(), correlationId: crypto.randomUUID() } }) }}>
        <label className="block">{decisionCopy.reason}<textarea className={control} required minLength={10} maxLength={4000} disabled={disabled} value={closeReasons[proposal.id] || ""} onChange={event => setCloseReasons(old => ({ ...old, [proposal.id]: event.target.value }))} /></label>
        <label className="flex items-start gap-2"><input type="checkbox" required className="mt-1" disabled={disabled} checked={closeConfirmed[proposal.id] || false} onChange={event => setCloseConfirmed(old => ({ ...old, [proposal.id]: event.target.checked }))} />{decisionCopy.confirm}</label>
        <button className={button} disabled={disabled || !closeConfirmed[proposal.id]}>{proposal.canWithdraw ? decisionCopy.withdraw : decisionCopy.reject}</button>
      </form>}
    </li>)}</ul>
  </section>
}
