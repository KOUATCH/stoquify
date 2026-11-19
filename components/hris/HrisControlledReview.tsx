"use client"
import {useHrisFreshAuth} from "./useHrisFreshAuth"
import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { getHrisApprovalReviewAction, decideHrisApprovalInboxItemAction } from "@/actions/hris/approval-inbox.actions"
import type { HrisApprovalReview, HrisDecisionReceipt } from "@/services/hris/approval-review.service"
import type { TimeApprovalReview, TimeDecisionReceipt } from "@/services/hris/time-review.service"
import {getTimeApprovalReviewAction,decideReviewedTimeApprovalAction} from "@/actions/hris/time-review.actions"

export type ReviewTarget={domain:HrisApprovalReview["domain"]|TimeApprovalReview["domain"];decision:HrisApprovalReview["decision"];sourceId:string;employeeId:string;leavePolicyId?:string}
export function HrisControlledReview({target,locale,label,disabled,onComplete,onAccessDenied}:{target:ReviewTarget;locale:"en"|"fr";label:string;disabled?:boolean;onComplete?:()=>void|Promise<void>;onAccessDenied?:()=>void}){
  const recovery=useHrisFreshAuth(locale,[target.domain,target.employeeId,target.sourceId,target.decision].join(":"))
  const t=(en:string,fr:string)=>locale==="fr"?fr:en
  const authority=(value:string)=>({TENANT_HRIS_ADMIN:t("Company HR administration","Administration RH de l’entreprise"),EXPLICIT_DOMAIN_REVIEW_GRANT:t("Employee and task-specific review delegation","Délégation de validation pour ce salarié et cette tâche"),REPORTING_RELATIONSHIP:t("Reporting manager","Responsable hiérarchique"),DELEGATED_MANAGER_AUTHORITY:t("Delegated manager","Responsable délégué"),LOCATION_RESPONSIBILITY_COMPATIBILITY:t("Assigned location responsibility","Responsabilité du site attribué"),OWN_RECORD:t("Own employee record","Dossier personnel")}[value]??value)
  const value=(raw:string)=>raw==="true"?t("Yes","Oui"):raw==="false"?t("No","Non"):/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(raw)?new Date(raw).toLocaleString(locale):raw
  const trigger=useRef<HTMLButtonElement>(null),title=useRef<HTMLHeadingElement>(null),generation=useRef(0)
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[review,setReview]=useState<HrisApprovalReview|TimeApprovalReview|null>(null),[receipt,setReceipt]=useState<HrisDecisionReceipt|TimeDecisionReceipt|null>(null)
  const time=["TIME_POLICY","WORK_SCHEDULE","TIME_REQUEST"].includes(target.domain)
  const [reason,setReason]=useState(""),[ack,setAck]=useState(false),[refs,setRefs]=useState<string[]>([]),[error,setError]=useState("")
  const [uncertain,setUncertain]=useState(false)
  const frozenDecision=useRef<Record<string,unknown>|null>(null)
  async function load(){
    const current=++generation.current;setBusy(true);setError("");setAck(false);setRefs([]);setReview(null)
    try{const result=await recovery.run(async()=>await (time?getTimeApprovalReviewAction:getHrisApprovalReviewAction)(target));if(current!==generation.current)return
      if(!result.success){if(["FORBIDDEN","AUTH_REQUIRED","TENANT_SCOPE_VIOLATION"].includes(result.code??""))onAccessDenied?.();throw Error(result.error)}setReview(result.data)
    }catch{setError(t("Review is unavailable. Refresh your session or ask an authorized reviewer. Your reason remains saved here.","La vérification est indisponible. Actualisez votre session ou contactez un valideur autorisé. Votre motif reste conservé ici."))}
    finally{if(current===generation.current)setBusy(false)}
  }
  async function submit(){
    if(busy||(!review&&!frozenDecision.current))return;setBusy(true);setError("")
    const input=frozenDecision.current??{...target,reviewVersion:review!.version,acknowledged:ack,decisionReason:reason,evidenceReferences:refs}
    frozenDecision.current=input
    try{const result=await recovery.run(async()=>await (time?decideReviewedTimeApprovalAction:decideHrisApprovalInboxItemAction)(input))
      if(!result.success){
        if(["FORBIDDEN","AUTH_REQUIRED","TENANT_SCOPE_VIOLATION"].includes(result.code??"")){onAccessDenied?.();if(!uncertain)frozenDecision.current=null;setReview(null);setReceipt(null);setRefs([]);setAck(false);setReason("");setError(uncertain?t("Access is no longer authorized. Private review details were cleared. Restore access, then recover the original decision receipt.","L’accès n’est plus autorisé. Les détails confidentiels ont été effacés. Rétablissez l’accès, puis récupérez le reçu de la décision initiale."):t("Access is no longer authorized. Private review details were cleared. Load current facts after access is restored.","L’accès n’est plus autorisé. Les détails confidentiels ont été effacés. Rechargez les faits après le rétablissement de l’accès."))}
        else if(result.code==="CONFLICT"||result.code==="CONCURRENCY_CONFLICT"||result.code==="INVALID_TRANSITION"||result.code==="NOT_FOUND"){frozenDecision.current=null;setAck(false);setReview(null);setUncertain(false);setError(t("The reviewed facts changed. Load current facts and acknowledge them again. Your reason is preserved.","Les faits ont changé. Chargez les faits actuels et confirmez-les à nouveau. Votre motif est conservé."))}
        else if(["FRESH_AUTH_REQUIRED","VALIDATION_ERROR","BUSINESS_RULE_VIOLATION","SOD_VIOLATION"].includes(result.code??"")){if(!uncertain)frozenDecision.current=null;setError(t("Decision was refused. Verify your authority and the source requirements. Your entries are preserved.","La décision a été refusée. Vérifiez vos droits et les exigences de la source. Vos saisies sont conservées."))}
        else {setUncertain(true);setError(t("The outcome is uncertain. Recover the receipt using this unchanged decision.","Le résultat est incertain. Récupérez le reçu avec cette décision inchangée."))}
        return
      }
      frozenDecision.current=null;setReceipt(result.data);setUncertain(false)
      setTimeout(()=>title.current?.focus(),0)
    }catch{setUncertain(true);setError(t("Confirmation was interrupted. Retry the same decision to recover its receipt. Do not change the submitted reason or evidence.","La confirmation a été interrompue. Réessayez la même décision pour récupérer son reçu. Ne modifiez pas le motif ni les preuves soumis."))}
    finally{setBusy(false)}
  }
  const status=(value:string)=>({APPROVED:t("Approved","Approuvé"),REJECTED:t("Rejected","Rejeté"),APPLIED:t("Applied","Appliqué"),SCHEDULED:t("Scheduled — not yet applied","Planifié — pas encore appliqué")}[value]??value)
  return <>
    <button ref={trigger} type="button" className="dashboard-btn-secondary min-h-10 px-3" disabled={disabled} onClick={()=>{setOpen(true);if(!receipt&&!uncertain)void load()}}>{label}</button>
    <Dialog open={open} onOpenChange={value=>{if(!busy){setOpen(value);if(!value){generation.current++;if(receipt)void Promise.resolve(onComplete?.()).catch(()=>{setOpen(true);setError(t("Decision saved. The queue could not refresh; keep this receipt and refresh later.","Décision enregistrée. La liste n’a pas pu être actualisée ; conservez ce reçu et actualisez plus tard."))})}}}}>
      <DialogContent closeDisabled={busy} closeLabel={t("Close","Fermer")} className="dashboard-landing-theme dark max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto break-words text-white" onOpenAutoFocus={e=>{e.preventDefault();title.current?.focus()}} onCloseAutoFocus={e=>{e.preventDefault();trigger.current?.focus()}}>
        <DialogTitle ref={title} tabIndex={-1} className="pr-6">{receipt?t("Decision receipt","Reçu de décision"):label}</DialogTitle>
        <DialogDescription>{t("Independent review of the displayed facts. The server records your acknowledgement, reason and selected evidence with this version.","Vérification indépendante des faits affichés. Le serveur conserve votre confirmation, votre motif et les preuves sélectionnées avec cette version.")}</DialogDescription>
        {error&&<p role="alert" className="border border-rose-400 p-3">{error}</p>}
        {busy&&<p role="status">{t("Please wait…","Veuillez patienter…")}</p>}
        {receipt?<div role="status" className="grid gap-2">
          <p>{status(receipt.status)} · {receipt.employee.displayName}</p><p>{t("Actor","Auteur")} : {receipt.actor.name}</p>
          <p>{t("Scope","Périmètre")} : {receipt.employee.displayName} · {authority(receipt.scope.authority)}</p>
          <p>{new Date(receipt.decidedAt).toLocaleString(locale)} · {t("Receipt version","Version du reçu")} {receipt.version}</p>
          {receipt.scheduledFor&&<p>{t("Scheduled for","Prévu le")} {new Date(receipt.scheduledFor).toLocaleString(locale)}</p>}
          <p className="break-all">{t("Reviewed version","Version vérifiée")} : {receipt.reviewedVersion}</p>
          <p>{t("Request","Demande")} : {receipt.requestId}</p>{receipt.replayed&&<p>{t("Recovered saved receipt","Reçu enregistré récupéré")}</p>}
        </div>:<>
          {review&&<div className="grid min-w-0 gap-3">
            <p>{review.employee.displayName} · {t("Requested by","Demandé par")} {review.requester.name} · {new Date(review.requestedAt).toLocaleString(locale)}</p>
            <p>{t("Effective date","Date d’effet")} : {review.effectiveAt?new Date(review.effectiveAt).toLocaleString(locale):t("On application","À l’application")}</p>
            <p>{t("Scope","Périmètre")} : {authority(review.scope.authority)} · {review.employee.displayName}</p>
            <p>{t("Impact: this decision changes the source workflow used for HR or payroll readiness. An approval does not itself release payroll or payment.","Impact : cette décision modifie le dossier source utilisé pour la préparation RH ou paie. Une approbation ne déclenche pas à elle seule une paie ou un paiement.")}</p>
            {review.fields.map(f=><section key={f.key} className="min-w-0 rounded border border-white/20 p-3"><h3 className="font-semibold">{f.label[locale]}</h3><p>{t("Before","Avant")} : {value(f.before)}</p><p>{t("After","Après")} : {value(f.after)}</p></section>)}
            <fieldset disabled={busy||uncertain} className="grid gap-2"><legend>{t("Evidence reviewed","Preuves vérifiées")}</legend>{review.evidence.map(e=><label key={e.id} className="flex items-start gap-2"><input type="checkbox" checked={refs.includes(e.id)} onChange={event=>setRefs(event.target.checked?[...refs,e.id]:refs.filter(r=>r!==e.id))}/>{e.label[locale]}</label>)}</fieldset>
            <p className="text-sm">{t("References identify retained source evidence. They are not document downloads or legal certification.","Ces références identifient les preuves conservées. Elles ne constituent ni des téléchargements de documents ni une certification juridique.")}</p>
          </div>}
          <label>{t("Decision reason (8–500 characters)","Motif de décision (8–500 caractères)")}<textarea className="dashboard-control mt-1 min-h-24 w-full p-2" value={reason} disabled={busy||uncertain} minLength={8} maxLength={500} onChange={e=>setReason(e.target.value)}/></label>
          {review&&<label className="flex items-start gap-2"><input type="checkbox" disabled={busy||uncertain} checked={ack} onChange={e=>setAck(e.target.checked)}/>{t("I reviewed the displayed facts, dates, impact and source evidence for this decision.","J’ai vérifié les faits, les dates, l’impact et les preuves affichés pour cette décision.")}</label>}
          <div className="flex flex-wrap gap-3">
            {!uncertain&&<button type="button" disabled={busy} className="dashboard-btn-secondary px-3" onClick={()=>void load()}>{t("Load current facts","Charger les faits actuels")}</button>}
            <button type="button" className="dashboard-btn-primary px-3" disabled={busy||(uncertain?!frozenDecision.current:!review||!ack||reason.trim().length<8||(target.decision!=="REJECT"&&!refs.length))} onClick={()=>void submit()}>{uncertain?t("Recover decision receipt","Récupérer le reçu"):t("Confirm decision","Confirmer la décision")}</button>
          </div>
        </>}
      </DialogContent>
    </Dialog>
    {recovery.dialog}
  </>
}
