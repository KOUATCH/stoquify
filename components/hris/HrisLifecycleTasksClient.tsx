"use client"
import {useHrisFreshAuth} from "./useHrisFreshAuth"
import {HrisLifecycleTasks,type LifecycleTaskWorkspace,type LifecycleTaskTransport} from './HrisLifecycleTasks'
import {getLifecycleTaskWorkspaceAction,decideLifecycleTaskAction,rescheduleLifecycleTaskSourceAction} from '@/actions/hris/lifecycle-task.actions'
export function HrisLifecycleTasksClient({initial,locale}:{initial:LifecycleTaskWorkspace;locale:'en'|'fr'}){
  const recovery=useHrisFreshAuth(locale,initial.scopeKey)
  const execute:LifecycleTaskTransport=async(op,input)=>{const r=await recovery.run(async()=>await(op==='READ'?getLifecycleTaskWorkspaceAction(input):op==='DECIDE'?decideLifecycleTaskAction(input):rescheduleLifecycleTaskSourceAction(input)));if(!r.success)throw Object.assign(Error(r.error),{status:r.status,code:r.code});return r.data}
  return <>{recovery.dialog}<HrisLifecycleTasks key={initial.scopeKey} initial={initial} locale={locale} execute={execute}/></>
}
