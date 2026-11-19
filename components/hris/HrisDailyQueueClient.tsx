'use client'
import {useHrisFreshAuth} from './useHrisFreshAuth'
import {getDailyHrisQueueAction} from '@/actions/hris/daily-queue.actions'
import {HrisDailyQueue} from './HrisDailyQueue'
import type {DailyQueue} from '@/services/hris/daily-queue.contract'
export function HrisDailyQueueClient({initial,locale}:{initial:DailyQueue;locale:'en'|'fr'}){
  const recovery=useHrisFreshAuth(locale,initial.scopeKey)
  return <>{recovery.dialog}<HrisDailyQueue key={initial.scopeKey} initial={initial} locale={locale} refresh={async()=>{const r=await recovery.run(()=>getDailyHrisQueueAction());if(!r.success)throw Object.assign(Error(r.error),{code:r.code});return r.data}}/></>
}
