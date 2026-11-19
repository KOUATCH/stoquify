/// <reference types="@testing-library/jest-dom" />
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { HrisRosterWorkspace, type RosterWorkspace } from "../HrisRosterWorkspace"
import { buildDatedShiftPlan } from "@/services/hris/shift-plan"
const initial=():RosterWorkspace=>({startDate:"2026-01-05",days:7,own:false,canManage:true,employees:[{id:"employee-a",displayName:"Employee A"}],roster:[],calendars:[{id:"calendar",name:"Reviewed calendar",timezone:"Africa/Douala",effectiveFrom:new Date("2026-01-01Z"),effectiveTo:null}],periods:[],versions:[],closure:null})
test("late file A cannot overwrite newer selected file B",async()=>{
  Object.defineProperty(global,"TextDecoder",{value:require("node:util").TextDecoder,configurable:true})
  const execute=jest.fn().mockResolvedValue({success:true,data:{rows:[],payloadHash:"preview"}})
  render(<HrisRosterWorkspace initial={initial()} locale="en" execute={execute}/>);
  let finishA!:(v:ArrayBuffer)=>void,finishB!:(v:ArrayBuffer)=>void
  const a={name:"A.csv",size:1,arrayBuffer:()=>new Promise<ArrayBuffer>(resolve=>{finishA=resolve})},b={name:"B.csv",size:1,arrayBuffer:()=>new Promise<ArrayBuffer>(resolve=>{finishB=resolve})}
  fireEvent.change(screen.getByLabelText("Attendance source"),{target:{value:"Clock"}})
  fireEvent.change(screen.getByLabelText("Attendance CSV file"),{target:{files:[a]}});fireEvent.change(screen.getByLabelText("Attendance CSV file"),{target:{files:[b]}})
  await act(async()=>{finishB(Uint8Array.from([66]).buffer)});await act(async()=>{finishA(Uint8Array.from([65]).buffer)})
  fireEvent.click(screen.getByRole("button",{name:"Preview attendance file"}));await waitFor(()=>expect(execute).toHaveBeenCalledWith("PREVIEW",expect.objectContaining({fileName:"B.csv",content:"B"})))
})
test("name-only revision preserves every shift and unpaid break",async()=>{
  const data=initial(),raw={workDate:"2026-01-05",timezone:"Africa/Douala",shifts:[{start:"2026-01-05T08:00+01:00",end:"2026-01-05T12:00+01:00",unpaidBreaks:[{start:"2026-01-05T09:00+01:00",end:"2026-01-05T09:15+01:00"},{start:"2026-01-05T10:00+01:00",end:"2026-01-05T10:15+01:00"}]},{start:"2026-01-05T13:00+01:00",end:"2026-01-05T17:00+01:00",unpaidBreaks:[{start:"2026-01-05T15:00+01:00",end:"2026-01-05T15:15+01:00"}]}]},plan=buildDatedShiftPlan(raw)
  data.versions=[{id:"old",employeeId:"employee-a",name:"Split shifts",status:"ACTIVE",revision:1,supersedesScheduleId:null,sourceHash:"sha256:reviewed",calendarId:"calendar",timezone:"Africa/Douala",effectiveFrom:raw.workDate,effectiveTo:raw.workDate,weeklyPattern:{sun:0,mon:435,tue:0,wed:0,thu:0,fri:0,sat:0},standardWeeklyMinutes:435,shiftPlan:plan as any,canApprove:false}]
  const execute=jest.fn().mockResolvedValue({success:true,data});render(<HrisRosterWorkspace initial={data} locale="en" execute={execute}/>);
  fireEvent.click(screen.getByRole("button",{name:"Revise this interval"}));fireEvent.change(screen.getByLabelText("Schedule name"),{target:{value:"Renamed split shifts"}});fireEvent.change(screen.getByLabelText("Preparation evidence reference"),{target:{value:"Reviewed rename"}})
  fireEvent.submit(screen.getByRole("button",{name:"Save draft for review"}).closest("form")!)
  await waitFor(()=>expect(execute).toHaveBeenCalledWith("PREPARE",expect.objectContaining({shiftPlan:raw,supersedesScheduleId:"old"})))
  expect(buildDatedShiftPlan(execute.mock.calls[0][1].shiftPlan).scheduledMinutes).toBe(plan.scheduledMinutes)
})
test("internal employee/period switch clears certification evidence",async()=>{
  const a=initial();a.closure={period:{id:"p1",name:"Period A",start:a.startDate,end:a.startDate},readiness:{ready:true,message:"Ready",totals:null},entries:[],requests:[],anomalies:[],snapshots:[]}
  const b={...a,employees:[{id:"employee-b",displayName:"Employee B"}],closure:{...a.closure,period:{...a.closure.period,id:"p2",name:"Period B"}}}
  const execute=jest.fn().mockResolvedValue({success:true,data:b});render(<HrisRosterWorkspace initial={a} locale="en" execute={execute}/>);
  fireEvent.change(screen.getByLabelText("Certification evidence reference"),{target:{value:"Evidence for A only"}});fireEvent.change(screen.getByLabelText("Employee identifier (blank for team)"),{target:{value:"employee-b"}})
  fireEvent.submit(screen.getByRole("button",{name:"Refresh view"}).closest("form")!);await waitFor(()=>expect(screen.getByLabelText("Certification evidence reference")).toHaveValue(""))
})
test.each([false,true])("name-only revision preserves numeric weekdays or explicit off-day (%s)",async off=>{
  const data=initial(),pattern=off?{sun:0,mon:0,tue:0,wed:0,thu:0,fri:0,sat:0}:{"0":0,"1":600,"2":360,"3":0,"4":0,"5":0,"6":0}
  data.versions=[{id:"prior",employeeId:"employee-a",name:"Retained plan",status:"ACTIVE",revision:1,supersedesScheduleId:null,sourceHash:"sha256:retained",calendarId:"calendar",timezone:"Africa/Douala",effectiveFrom:data.startDate,effectiveTo:off?data.startDate:null,weeklyPattern:pattern,standardWeeklyMinutes:off?0:960,shiftPlan:off?buildDatedShiftPlan({workDate:data.startDate,timezone:"Africa/Douala",shifts:[]}) as any:null,canApprove:false}]
  const execute=jest.fn().mockResolvedValue({success:true,data});render(<HrisRosterWorkspace initial={data} locale="en" execute={execute}/>);fireEvent.click(screen.getByRole("button",{name:"Revise this interval"}));fireEvent.change(screen.getByLabelText("Preparation evidence reference"),{target:{value:"Reviewed name-only change"}});fireEvent.submit(screen.getByRole("button",{name:"Save draft for review"}).closest("form")!)
  await waitFor(()=>expect(execute).toHaveBeenCalledWith("PREPARE",expect.objectContaining(off?{shiftPlan:{workDate:data.startDate,timezone:"Africa/Douala",shifts:[]}}:{weeklyPattern:{sun:0,mon:600,tue:360,wed:0,thu:0,fri:0,sat:0},standardWeeklyMinutes:960})))
})
test("preview shows identities and all quantities; commit retains reconciliation receipt",async()=>{
  Object.defineProperty(global,"TextDecoder",{value:require("node:util").TextDecoder,configurable:true})
  const data=initial(),rows=[{index:0,employeeId:"employee-a",workDate:"2026-01-05",sourceRecordId:"clock-a",scheduledMinutes:480,workedMinutes:360,absenceMinutes:120,overtimeMinutes:0,issues:[],duplicate:true},{index:1,employeeId:"employee-b",workDate:"2026-01-05",sourceRecordId:"clock-b",scheduledMinutes:480,workedMinutes:100,absenceMinutes:0,overtimeMinutes:0,issues:["SCHEDULE_RECONCILIATION_MISMATCH"],duplicate:false}]
  const execute=jest.fn(async(command:string)=>({success:true,data:command==="PREVIEW"?{rows,payloadHash:"reviewed"}:command==="IMPORT"?{id:"batch-receipt",acceptedCount:0,rejectedCount:1,metadata:{duplicateCount:1},replayed:false}:data}))
  render(<HrisRosterWorkspace initial={data} locale="en" execute={execute}/>);fireEvent.change(screen.getByLabelText("Attendance source"),{target:{value:"Clock"}});await act(async()=>fireEvent.change(screen.getByLabelText("Attendance CSV file"),{target:{files:[{name:"two.csv",size:1,arrayBuffer:async()=>Uint8Array.from([65]).buffer}]}}))
  fireEvent.click(screen.getByRole("button",{name:"Preview attendance file"}));await screen.findByText(/employee-b.*clock-b.*480 \/ 100 \/ 0 \/ 0/)
  expect(screen.getByText(/employee-a.*clock-a.*480 \/ 360 \/ 120 \/ 0/)).toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Import reviewed rows"}));await screen.findByText("batch-receipt");expect(screen.getByText("Accepted / rejected / unchanged: 0 / 1 / 1")).toBeInTheDocument()
})
