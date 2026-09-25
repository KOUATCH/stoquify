"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { previewPurchaseOrderAmendment, confirmPurchaseOrderAmendment } from "@/actions/purchaseOrderWorkflow/purchase-order-amendment.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { purchaseAmendmentCommandSchema, purchaseAmendmentReceiptSchema, type PurchaseAmendmentCommand, type PurchaseAmendmentPreview, type PurchaseAmendmentReceipt } from "@/services/purchase-order/purchase-order-amendment-contracts"

export const purchaseAmendmentStorageKey=(organizationId:string,actorId:string,orderId:string)=>`stoquify:purchase-amendment:${JSON.stringify([organizationId,actorId,orderId])}`
export function PurchaseOrderAmendmentDialog({orderId,proposalId,organizationId,actorId,onClose,onConfirmed}:{orderId:string;proposalId:string|null;organizationId:string;actorId:string;onClose:()=>void;onConfirmed:()=>void}){
  const t=useTranslations('purchaseOrderAmendment'),locale=useLocale(),key=purchaseAmendmentStorageKey(organizationId,actorId,orderId)
  const [active,setActive]=useState<{orderId:string;proposalId:string}|null>(null),[preview,setPreview]=useState<PurchaseAmendmentPreview|null>(null),[pending,setPending]=useState<PurchaseAmendmentCommand|null>(null),[receipt,setReceipt]=useState<PurchaseAmendmentReceipt|null>(null)
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[password,setPassword]=useState(''),[needsPassword,setNeedsPassword]=useState(false)
  const generation=useRef(0),inFlight=useRef(false),initialized=useRef(''),returnFocus=useRef<HTMLElement|null>(null)
  const explain=useCallback((code?:string)=>t(code==='CONFLICT'?'stale':code==='FRESH_AUTH_REQUIRED'?'fresh':code==='SOD_VIOLATION'?'separation':code==='OPEN_RECEIPT'?'openReceipt':code==='RETAINED_OBLIGATIONS'?'obligations':['FORBIDDEN','AUTH_REQUIRED','NOT_FOUND'].includes(code??'')?'denied':code==='BUSINESS_RULE_VIOLATION'?'unavailable':code==='IDEMPOTENCY_CONFLICT'?'alreadyApplied':'unknown'),[t])
  const load=useCallback(async(query:{orderId:string;proposalId:string})=>{
    const current=++generation.current;setBusy(true);setError('');setPreview(null)
    try{const result=await previewPurchaseOrderAmendment(query);if(current!==generation.current)return
      if(!result.success){setError(explain(result.code));return}const data=result.data
      if(data.organizationId!==organizationId||data.actorId!==actorId||data.orderId!==query.orderId||data.proposalId!==query.proposalId){setError(t('denied'));return}
      setPreview(data);setNeedsPassword(data.requiresFreshAuth);setReceipt(data.receipt)
    }catch{if(current===generation.current)setError(t('loadFailed'))}finally{if(current===generation.current)setBusy(false)}
  },[actorId,organizationId,explain,t])
  const loader=useRef(load),text=useRef(t);loader.current=load;text.current=t
  useEffect(()=>{
    if(!organizationId||!actorId||!proposalId&&initialized.current===key)return
    initialized.current=key;++generation.current;setPending(null);setReceipt(null);setPreview(null);setPassword('');setNeedsPassword(false);setError('');setBusy(false)
    let command:PurchaseAmendmentCommand|null=null
    try{const raw=sessionStorage.getItem(key);if(raw&&raw.length<2000){const parsed=purchaseAmendmentCommandSchema.safeParse(JSON.parse(raw));if(parsed.success&&parsed.data.orderId===orderId)command=parsed.data}}catch{setError(text.current('storage'))}
    if(command){setActive({orderId:command.orderId,proposalId:command.proposalId});setPending(command);setError(text.current('unknown'))}
    else{const query=proposalId?{orderId,proposalId}:null;setActive(query);if(query)void loader.current(query)}
    return()=>{++generation.current}
  },[orderId,proposalId,organizationId,actorId,key])
  async function confirm(){
    if(!active||inFlight.current||!pending&&!preview)return
    const current=generation.current;inFlight.current=true;setBusy(true);setError('')
    try{
      if(needsPassword){const verified=await stepUpWithPasswordAction({password});setPassword('');if(current!==generation.current)return;if(!verified.success){setError(t('passwordFailed'));return}}
      const command=pending??{...active,expectedRevision:preview!.revision,idempotencyKey:crypto.randomUUID()}
      try{sessionStorage.setItem(key,JSON.stringify(command))}catch{setError(t('storage'));return}setPending(command)
      const result=await confirmPurchaseOrderAmendment(command);if(current!==generation.current)return
      if(!result.success){setError(explain(result.code));if(result.code==='FRESH_AUTH_REQUIRED')setNeedsPassword(true)
        if(['CONFLICT','SOD_VIOLATION','BUSINESS_RULE_VIOLATION','VALIDATION_ERROR','OPEN_RECEIPT','RETAINED_OBLIGATIONS','IDEMPOTENCY_CONFLICT'].includes(result.code)){sessionStorage.removeItem(key);setPending(null);setPreview(null)}return}
      const {replayed,...record}=result.data,valid=purchaseAmendmentReceiptSchema.safeParse(record)
      if(!valid.success||typeof replayed!=='boolean'||record.orderId!==command.orderId||record.proposalId!==command.proposalId||record.requestReference!==command.idempotencyKey||record.reviewedRevision!==command.expectedRevision||record.approvedById!==actorId){setError(t('unknown'));return}
      sessionStorage.removeItem(key);setPending(null);setReceipt(result.data);setNeedsPassword(false)
    }catch{if(current===generation.current)setError(t('unknown'))}finally{inFlight.current=false;if(current===generation.current)setBusy(false)}
  }
  function close(){if(busy)return;++generation.current;setActive(null);setPassword('');onClose();if(receipt)onConfirmed()}
  const money=(value:string)=>preview?new Intl.NumberFormat(locale,{style:'currency',currency:preview.currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)):value
  const date=(value:string|null)=>value?new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(value)):'—'
  return <Dialog open={!!active} onOpenChange={open=>{if(!open)close()}}><DialogContent closeLabel={t('close')} closeDisabled={busy} className="dashboard-landing-theme dark dashboard-glass-panel max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl grid-cols-[minmax(0,1fr)] overflow-y-auto p-4 text-[var(--dash-text)] [overflow-wrap:anywhere] [&>*]:min-w-0 sm:p-6 motion-reduce:animate-none" onOpenAutoFocus={()=>{returnFocus.current=document.activeElement as HTMLElement}} onCloseAutoFocus={event=>{event.preventDefault();returnFocus.current?.focus()}} onEscapeKeyDown={event=>{if(busy)event.preventDefault()}} onPointerDownOutside={event=>{if(busy)event.preventDefault()}}><DialogHeader className="pr-8 text-left"><DialogTitle>{t('title')}</DialogTitle><DialogDescription>{t('description')}</DialogDescription></DialogHeader>
    {busy&&<p role="status">{t('loading')}</p>}{error&&<p role="alert" className="rounded-lg border border-[var(--dash-warning)] p-3">{error}</p>}
    {pending&&!preview&&<p className="break-all text-sm">{pending.orderId}<br/>{t('reference')}: {pending.idempotencyKey}</p>}
    {receipt?<div role="status" className="space-y-3"><h3 className="font-semibold">{t('recorded')}</h3><p>{t('reference')}: <span className="break-all">{receipt.requestReference}</span></p><p>{t('approvedBy')}: {receipt.approvedById}</p><p>{date(receipt.approvedAt)}</p><p>{t('next')}</p></div>:preview?<div className="space-y-4"><h3 className="break-words font-semibold">{preview.orderNumber} · {preview.supplier}</h3><p>{t('buyerReason')}: {preview.reason}</p><p>{t('delivery')}: {date(preview.beforeDate)} → {date(preview.afterDate)}</p><p className="font-semibold">{t('total')}: {money(preview.beforeTotal)} → {money(preview.afterTotal)}</p><ul className="space-y-3">{preview.lines.map(line=><li key={line.id} className="rounded-lg border border-[var(--dash-border)] p-3"><p className="font-semibold">{locale==='fr'?line.nameFr:line.nameEn}</p><p>{t('quantity')}: {line.beforeQuantity} → {line.afterQuantity} · {t('received')}: {line.receivedQuantity}</p><p>{t('lineTotal')}: {money(line.beforeTotal)} → {money(line.afterTotal)}</p></li>)}</ul><p className="text-sm">{t('precision')}</p></div>:null}
    {!receipt&&needsPassword&&<div><Label htmlFor="amendment-password">{t('password')}</Label><Input id="amendment-password" type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} disabled={busy}/></div>}
    <div className="flex flex-wrap justify-end gap-3"><Button variant="outline" className="dashboard-button-secondary h-auto min-h-11 whitespace-normal" disabled={busy} onClick={close}>{t('close')}</Button>{!receipt&&!pending&&active&&<Button variant="outline" className="dashboard-button-secondary h-auto min-h-11 whitespace-normal" disabled={busy} onClick={()=>void load(active)}>{t('reload')}</Button>}{!receipt&&(preview||pending)&&<Button className="dashboard-button-primary h-auto min-h-11 whitespace-normal" disabled={busy||needsPassword&&!password} onClick={()=>void confirm()}>{t(pending?'recover':'confirm')}</Button>}</div>
  </DialogContent></Dialog>
}
