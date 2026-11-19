'use client'
import {useHrisFreshAuth} from './useHrisFreshAuth'
import {decodeHandoffCsvUtf8} from './payroll-handoff-download'
import * as actions from '@/actions/hris/payroll-handoff.actions'
import {HrisPayrollHandoff,type HandoffWorkspace,type HandoffApi} from './HrisPayrollHandoff'
export function HrisPayrollHandoffClient({initial,locale}:{initial:HandoffWorkspace;locale:'en'|'fr'}){
  const recovery=useHrisFreshAuth(locale,initial.scopeKey)
  async function result<T>(operation:()=>Promise<{success:true;data:T}|{success:false;error:string;code?:string|null}>){const value=await recovery.run(operation);if(!value.success)throw Object.assign(Error(value.error),{code:value.code});return value.data}
  const api:HandoffApi={workspace:()=>result(()=>actions.getPayrollHandoffWorkspaceAction()),preview:input=>result(()=>actions.previewPayrollHandoffAction(input)),issue:input=>result(()=>actions.issuePayrollHandoffAction(input)),package:async input=>{const {csvBase64,...pack}=await result(()=>actions.getPayrollHandoffPackageAction(input));return {...pack,csvBytes:decodeHandoffCsvUtf8(csvBase64)}},receive:input=>result(()=>actions.acknowledgePayrollHandoffAction(input))}
  return <>{recovery.dialog}<HrisPayrollHandoff key={initial.scopeKey} initial={initial} locale={locale} api={api}/></>
}
