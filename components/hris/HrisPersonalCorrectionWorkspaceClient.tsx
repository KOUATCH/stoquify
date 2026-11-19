"use client"
import {useHrisFreshAuth} from "./useHrisFreshAuth"
import {HrisPersonalCorrectionWorkspace,type OwnCorrections,type CorrectionQueue,type CorrectionTransport} from "./HrisPersonalCorrectionWorkspace"
import {getOwnCorrectionWorkspaceAction,submitOwnCorrectionAction,amendOwnCorrectionAction,getCorrectionQueueAction,getCorrectionReviewAction,decideCorrectionAction} from "@/actions/hris/personal-correction.actions"
const operations={OWN:getOwnCorrectionWorkspaceAction,SUBMIT:submitOwnCorrectionAction,AMEND:amendOwnCorrectionAction,QUEUE:getCorrectionQueueAction,REVIEW:getCorrectionReviewAction,DECIDE:decideCorrectionAction}
export function HrisPersonalCorrectionWorkspaceClient({initial,own,locale,selectedCaseId}:{initial:OwnCorrections|CorrectionQueue;own:boolean;locale:"en"|"fr";selectedCaseId?:string}){
  const scope=initial.scopeKey+":"+own+":"+(selectedCaseId??'all'),recovery=useHrisFreshAuth(locale,scope)
  const execute:CorrectionTransport=async(operation,input)=>{const r=await recovery.run(async()=>await operations[operation](input));if(!r.success)throw Object.assign(Error(r.error),{status:r.status,code:r.code});return r.data}
  return <>{recovery.dialog}<HrisPersonalCorrectionWorkspace key={scope} initial={initial} own={own} locale={locale} execute={(operation,input)=>execute(operation,operation==='QUEUE'&&selectedCaseId?{caseId:selectedCaseId}:input)}/></>
}
