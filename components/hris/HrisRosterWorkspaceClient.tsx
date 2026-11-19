"use client"
import { useHrisFreshAuth } from "./useHrisFreshAuth"
import { HrisRosterWorkspace, type RosterWorkspace, type RosterExecute } from "./HrisRosterWorkspace"
import { readRosterAction, readOwnRosterAction, prepareRosterAction, approveRosterAction, previewAttendanceFileAction, commitAttendanceFileAction, resolveRosterAnomalyAction, certifyRosterAttendanceAction } from "@/actions/hris/roster.actions"
const commands={READ:readRosterAction,PREPARE:prepareRosterAction,APPROVE:approveRosterAction,PREVIEW:previewAttendanceFileAction,IMPORT:commitAttendanceFileAction,RESOLVE:resolveRosterAnomalyAction,CERTIFY:certifyRosterAttendanceAction}
export function HrisRosterWorkspaceClient({initial,locale}:{initial:RosterWorkspace;locale:"en"|"fr"}){
  const recovery=useHrisFreshAuth(locale,String(initial.own)+initial.employees.map(e=>e.id).join(":"))
  const execute:RosterExecute=(command,input)=>recovery.run(async()=>await (command==="READ"&&initial.own?readOwnRosterAction(input):commands[command](input)))
  return <>{recovery.dialog}<HrisRosterWorkspace key={String(initial.own)+initial.employees.map(e=>e.id).join(":")} initial={initial} locale={locale} execute={execute}/></>
}
