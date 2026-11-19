export const queueKinds = ['INPUT', 'TIME', 'REVIEW', 'EXPIRY', 'CORRECTION', 'TASK'] as const
export type QueueKind = typeof queueKinds[number]
export type DailyWorkItem = {
  id: string; kind: QueueKind; employeeId: string; employeeName: string;
  reason: string; owner: string; dueAt: string | null; openedAt: string | null;
  href: string; actionable: boolean
}
export type DailyQueue = {
  scopeKey: string; asOf: string; items: DailyWorkItem[];
  employees: Array<{id:string; displayName:string; status:string}>;
  coverageLimited: boolean; categories: QueueKind[];
  inputReadiness: 'PERIOD_SELECTION_REQUIRED'; notifications: 'SOURCE_WORKSPACES_ONLY'
}
export function filterDailyQueue(queue:DailyQueue, kind:QueueKind|'ALL', employeeId:string, overdue:boolean) {
  const items=queue.items.filter(i=>(kind==='ALL'||i.kind===kind)&&(!employeeId||i.employeeId===employeeId)&&(!overdue||!!i.dueAt&&i.dueAt<queue.asOf))
  return {items,count:items.length,overdue:items.filter(i=>!!i.dueAt&&i.dueAt<queue.asOf).length}
}
export function uniqueDailyItems(items:DailyWorkItem[]) {
  return [...new Map(items.map(i=>[i.id,i])).values()].sort((a,b)=>
    queueKinds.indexOf(a.kind)-queueKinds.indexOf(b.kind)||(a.dueAt??'9999').localeCompare(b.dueAt??'9999')||a.id.localeCompare(b.id))
}
