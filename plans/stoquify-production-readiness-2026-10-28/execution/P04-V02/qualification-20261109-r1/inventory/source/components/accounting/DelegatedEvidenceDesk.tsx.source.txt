"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { getDelegatedEvidenceDeskAction, requestDelegatedEvidenceAction } from "@/actions/accounting/delegated-evidence-desk.actions"
import type { DelegatedEvidenceDesk as Desk } from "@/services/accounting/delegated-evidence-desk.service"
import { closeEvidenceFindingTitle, closeEvidenceWorkflowCopy } from "./close-evidence-workflow-copy"

const copy = {
  en: { title: "Request and track evidence", period: "Client accounting period", choose: "Choose…", nextPeriod: "Next periods", firstPeriod: "First periods",
    finding: "Existing finding", recipient: "Client response owner", due: "Response due", question: "Scoped evidence question", submit: "Send evidence request", retry: "Retry the same request",
    refresh: "Refresh evidence choices", load: "Checking current access…", unavailable: "Evidence choices unavailable. Refresh your access and try again.", saved: "Request recorded. The client response owner can reply in their Close evidence workspace.",
    readOnly: "Evidence is available to read. Current module access does not allow new requests.",
    uncertain: "The outcome is uncertain. Retry this exact request before starting another.", rejected: "The request was not accepted. Review current choices and permissions.",
    draft: "Unsent text survives a failed read or submission on this screen. Leaving or reauthorizing the workspace clears it; private drafts are not stored in the browser.",
    scope: "Existing missing-close-evidence and settlement-proof cases only. A reply does not resolve a financial exception or authorize posting, payment, signing or close.",
    partial: "Partial coverage: continue each available page. These are not firm-wide totals.", more: "Load more", tracking: "Request ownership and retained history", original: "Original request reference", owner: "Current client response owner",
    replacement: "Recipient changes remain in the client's authorized Close workspace. History and original attribution are retained.", engagement: "Managed engagement", legacy: "Named mandate; not enrolled in an engagement", source: "Open authorized source context",
    kinds: { MISSING_CLOSE_EVIDENCE: "Missing close evidence", SETTLEMENT_PROOF: "Settlement proof" } },
  fr: { title: "Demander et suivre les justificatifs", period: "Période comptable du client", choose: "Choisir…", nextPeriod: "Périodes suivantes", firstPeriod: "Premières périodes",
    finding: "Constat existant", recipient: "Responsable de réponse chez le client", due: "Échéance de réponse", question: "Question précise sur les justificatifs", submit: "Envoyer la demande", retry: "Réessayer la même demande",
    refresh: "Actualiser les choix", load: "Vérification des droits actuels…", unavailable: "Choix indisponibles. Actualisez vos droits puis réessayez.", saved: "Demande enregistrée. Le responsable peut répondre dans son espace de justificatifs de clôture.",
    readOnly: "Les justificatifs restent consultables. Les droits actuels du module ne permettent pas de nouvelles demandes.",
    uncertain: "Résultat incertain. Réessayez exactement cette demande avant d'en créer une autre.", rejected: "Demande refusée. Vérifiez les choix actuels et vos droits.",
    draft: "Le texte non envoyé est conservé ici après un échec de lecture ou d'envoi. Quitter ou réautoriser l'espace l'efface ; aucun brouillon privé n'est stocké dans le navigateur.",
    scope: "Justificatifs de clôture manquants et preuves de règlement existants uniquement. Une réponse ne résout pas une anomalie financière et n'autorise aucune écriture, paiement, signature ou clôture.",
    partial: "Couverture partielle : poursuivez chaque page disponible. Aucun total global du cabinet.", more: "Charger la suite", tracking: "Responsables et historique conservé", original: "Référence de la demande initiale", owner: "Responsable actuel chez le client",
    replacement: "Les changements de destinataire restent dans l'espace de clôture autorisé du client. L'historique et l'auteur initial sont conservés.", engagement: "Mission encadrée", legacy: "Mandat nominatif non rattaché à une mission", source: "Ouvrir le contexte source autorisé",
    kinds: { MISSING_CLOSE_EVIDENCE: "Justificatif de clôture manquant", SETTLEMENT_PROOF: "Preuve de règlement" } },
}
const button = "dashboard-button-secondary min-h-11 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
const control = "dashboard-control mt-1 min-h-11 w-full min-w-0 rounded-lg p-3"
export type DelegatedEvidenceRecovery = { actorId: string; clientId: string; periodId: string; command: Record<string,unknown> }
export function DelegatedEvidenceDesk({ clientId, clientName, locale, onDenied, recovery, onRecoveryChange }: {
  clientId: string; clientName: string; locale: "en" | "fr"; onDenied(): void
  recovery?: DelegatedEvidenceRecovery | null; onRecoveryChange?(value: DelegatedEvidenceRecovery | null): void
}) {
  const t=copy[locale], existing=closeEvidenceWorkflowCopy[locale]
  const retained=recovery?.clientId===clientId?recovery:null
  const [data,setData]=useState<Desk|null>(null), [period,setPeriod]=useState(retained?.periodId??""), [after,setAfter]=useState<string|undefined>()
  const [busy,setBusy]=useState(false), [message,setMessage]=useState(""), [failed,setFailed]=useState(false)
  const [draft,setDraft]=useState({finding:"",recipient:"",due:"",text:""})
  const [pending,setPending]=useState<Record<string,unknown>|null>(retained?.command??null)
  const generation=useRef(0), heading=useRef<HTMLHeadingElement>(null)
  const pendingCommand=useRef<Record<string,unknown>|null>(retained?.command??null), suspended=useRef(false)
  const pendingActor=useRef<string|null>(retained?.actorId??null)
  const reload=useRef<()=>void>(()=>{})
  function remember(command:Record<string,unknown>|null){
    pendingCommand.current=command;setPending(command)
    if(command&&data?.period){pendingActor.current=data.actorId;onRecoveryChange?.({actorId:data.actorId,clientId,periodId:data.period.id,command})}
    else if(!command){pendingActor.current=null;onRecoveryChange?.(null)}
  }
  function deny(){++generation.current;setBusy(false);setData(null);setDraft({finding:"",recipient:"",due:"",text:""});remember(null);onDenied()}
  async function load(page?: {kind: keyof Desk["cursors"];cursor:string}) {
    const token=++generation.current;setBusy(true);setFailed(false);setMessage("")
    if(!page)setData(null)
    try{
      const r=await getDelegatedEvidenceDeskAction({clientOrganizationId:clientId,...(period?{periodId:period}:{}),...(after?{afterPeriodId:after}:{}),...(page?{page}:{})})
      if(token!==generation.current)return
      if(!r.success){if(["FORBIDDEN","AUTH_REQUIRED"].includes(r.code))deny();else {setFailed(true);setMessage(t.unavailable)};return}
      if(pendingCommand.current&&pendingActor.current!==r.data.actorId)remember(null)
      setData(old=>{
        if(!page||!old)return r.data
        const kind=page.kind, next=r.data
        const merged=Array.from(new Map([...old[kind],...next[kind]].map(row=>["id" in row?row.id:row.requestId,row])).values())
        return {...old,[kind]:merged,cursors:{...old.cursors,[kind]:next.cursors[kind]},partial:old.partial||next.partial,generatedAt:next.generatedAt,
          writable:next.writable,engagement:next.engagement,canSupervise:next.canSupervise}
      })
      if(pendingCommand.current)setMessage(t.uncertain)
    }catch{if(token===generation.current){setFailed(true);setMessage(t.unavailable)}}
    finally{if(token===generation.current){setBusy(false);heading.current?.focus()}}
  }
  reload.current=()=>{void load()}
  useEffect(()=>{void load();return()=>{++generation.current}},[clientId,period,after]) // actions reauthorize each page
  useEffect(()=>{
    const hide=()=>{
      ++generation.current;suspended.current=true;setBusy(false);setData(null);setMessage("")
      setDraft({finding:"",recipient:"",due:"",text:""})
    }
    const changed=()=>{
      if(document.hidden)hide()
      else if(suspended.current){suspended.current=false;reload.current()}
    }
    const restored=()=>{hide();if(!document.hidden){suspended.current=false;reload.current()}}
    document.addEventListener("visibilitychange",changed)
    window.addEventListener("pageshow",restored)
    return()=>{document.removeEventListener("visibilitychange",changed);window.removeEventListener("pageshow",restored)}
  },[])
  async function submit(){
    if(busy||!data?.period||!data.writable)return
    const due=new Date(draft.due)
    if(!pending&&(!draft.finding||!draft.recipient||draft.text.trim().length<10||!Number.isFinite(due.getTime())))return
    const command=pendingCommand.current??{clientOrganizationId:clientId,findingId:draft.finding,requestedFromId:draft.recipient,dueAt:due.toISOString(),requestText:draft.text.trim(),correlationId:crypto.randomUUID()}
    remember(command);setBusy(true);setMessage("");const token=++generation.current
    try{
      const r=await requestDelegatedEvidenceAction(command)
      if(token!==generation.current)return
      if(r.success){remember(null);setDraft({finding:"",recipient:"",due:"",text:""});await load();setMessage(t.saved)}
      else if(["FORBIDDEN","AUTH_REQUIRED"].includes(r.code))deny()
      else if(r.retryable||r.code==="INTERNAL_ERROR")setMessage(t.uncertain)
      else {remember(null);setMessage(t.rejected)}
    }catch{if(token===generation.current)setMessage(t.uncertain)}
    finally{if(token===generation.current)setBusy(false)}
  }
  return <section className="my-4 min-w-0 space-y-4 rounded-lg border border-[var(--dash-border)] p-4" aria-busy={busy} aria-label={`${t.title}: ${clientName}`}>
    <h4 ref={heading} tabIndex={-1} className="font-semibold">{t.title}: {clientName}</h4>
    <p>{t.scope}</p><p className="text-sm">{t.draft}</p>
    <button className={button} disabled={busy} onClick={()=>void load()}>{t.refresh}</button>
    <p role={failed?"alert":"status"}>{busy?t.load:message}</p>
    {data&&<>
      <p>{data.engagement?`${t.engagement}: ${data.engagement.id} · ${data.engagement.scope} · ${new Date(data.engagement.expiresAt).toLocaleString(locale)}`:t.legacy}</p>
      {data.partial&&<p role="status">{t.partial}</p>}
      {!data.writable&&<p role="status">{t.readOnly}</p>}
      <label className="block">{t.period}<select className={control} value={period} disabled={busy||!!pending} onChange={e=>{setDraft({finding:"",recipient:"",due:"",text:""});setPeriod(e.target.value)}}>
        <option value="">{t.choose}</option>{data.period&&!data.periods.some(p=>p.id===data.period!.id)&&<option value={data.period.id}>{data.period.name}</option>}
        {data.periods.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <div className="flex flex-wrap gap-2">{after&&<button className={button} disabled={busy||!!pending} onClick={()=>setAfter(undefined)}>{t.firstPeriod}</button>}
        {data.nextPeriod&&<button className={button} disabled={busy||!!pending} onClick={()=>setAfter(data.nextPeriod!)}>{t.nextPeriod}</button>}</div>
      {data.period&&<>
        <form onSubmit={e=>{e.preventDefault();void submit()}} className="grid min-w-0 gap-3 md:grid-cols-2">
          <label>{t.finding}<select required className={control} disabled={busy||!!pending} value={draft.finding} onChange={e=>setDraft({...draft,finding:e.target.value})}>
            <option value="">{t.choose}</option>{data.findings.map(f=><option key={f.id} value={f.id}>{t.kinds[f.caseKind]} — {closeEvidenceFindingTitle(f.title,locale)} · {f.closeRunId}</option>)}</select></label>
          <label>{t.recipient}<select required className={control} disabled={busy||!!pending} value={draft.recipient} onChange={e=>setDraft({...draft,recipient:e.target.value})}>
            <option value="">{t.choose}</option>{data.recipients.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <label>{t.due}<input className={control} required type="datetime-local" disabled={busy||!!pending} value={draft.due} onChange={e=>setDraft({...draft,due:e.target.value})}/></label>
          <label className="md:col-span-2">{t.question}<textarea className={control} required minLength={10} maxLength={4000} disabled={busy||!!pending} value={draft.text} onChange={e=>setDraft({...draft,text:e.target.value})}/></label>
          <button className={button} disabled={busy||!data.writable}>{pending?t.retry:t.submit}</button>
        </form>
        <div className="flex flex-wrap gap-2">{(Object.keys(data.cursors) as Array<keyof Desk["cursors"]>).map(kind=>data.cursors[kind]&&<button key={kind} className={button} disabled={busy} onClick={()=>void load({kind,cursor:data.cursors[kind]!})}>{existing.more[kind]}</button>)}</div>
        <Link className="inline-flex min-h-11 items-center underline" href={`/${locale}/dashboard/accounting/accountant-portal?clientOrganizationId=${encodeURIComponent(clientId)}&periodId=${encodeURIComponent(data.period.id)}`}>{t.source}</Link>
        <h5 className="font-semibold">{t.tracking}</h5><p>{t.replacement}</p>
        <ul className="space-y-3">{[...data.tracking,...data.supervision].map(row=><li key={row.requestId} className="break-words rounded-lg border p-3">
          <p>{row.title&&closeEvidenceFindingTitle(row.title,locale)}</p><p>{existing.trackingStates[row.state]}</p><p>{t.original}: {row.requestId}</p>
          <p>{t.owner}: {row.recipientName??"—"}</p>{!row.recipientAvailable&&<p>{existing.recipientUnavailable}</p>}
          {row.assignment?.changedAt&&<p>{existing.ownerChanged}: {new Date(row.assignment.changedAt).toLocaleString(locale)} · {row.assignment.reason}</p>}
        </li>)}</ul>
      </>}
    </>}
  </section>
}
