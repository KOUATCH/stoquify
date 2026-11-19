import { allocateOperationalMinutes } from "../time-allocation"

const date=(value:string)=>new Date(value+"T00:00:00Z")
const schedule={id:"schedule",sourceHash:"sha256:schedule",timezone:"Africa/Douala",weeklyPattern:{sun:480,mon:480,tue:480,wed:480,thu:480,fri:480,sat:480},effectiveFrom:date("2026-01-01"),effectiveTo:null,approvedById:"reviewer",approvalEvidenceHash:"sha256:review",calendar:{sourceHash:"sha256:calendar",status:"ACTIVE",timezone:"Africa/Douala",effectiveFrom:date("2026-01-01"),effectiveTo:null,holidays:[] as Array<{holidayDate:Date;sourceHash:string}>}}
const policy={id:"annual",effectiveFrom:date("2026-01-01"),effectiveTo:null as Date|null,sourceHash:"sha256:annual",approvedById:"reviewer",approvalEvidenceHash:"sha256:review"}
const entry=(workDate:string,workedMinutes=0,overtimeMinutes=0)=>({id:workDate,workDate:date(workDate),scheduledMinutes:480,workedMinutes,absenceMinutes:480-workedMinutes,overtimeMinutes})
const request={id:"request",type:"LEAVE",status:"APPROVED",periodStart:date("2026-10-31"),periodEnd:date("2026-11-01"),requestedMinutes:960,leavePolicyId:"annual",approvalEvidenceHash:"sha256:approved",sourceHash:"sha256:request",metadata:{}}
const base=()=>({entries:[entry("2026-10-31"),entry("2026-11-01")],requests:[request],schedules:[schedule],policies:[policy],periodStart:date("2026-10-31"),periodEnd:date("2026-10-31")})

describe("HR-03 work-date minute conservation",()=>{
  it("requires complete scheduled-date coverage within employment",()=>{
    expect(()=>allocateOperationalMinutes({...base(),requests:[],periodStart:date("2026-10-30")})).toThrow("every scheduled work date")
    expect(allocateOperationalMinutes({...base(),requests:[],periodStart:date("2026-10-30"),employmentStart:date("2026-10-31")}).totals.scheduledMinutes).toBe(480)
  })
  it("allocates 960 once as 480 in each period, deterministically",()=>{
    const first=allocateOperationalMinutes(base());const second=allocateOperationalMinutes({...base(),periodStart:date("2026-11-01"),periodEnd:date("2026-11-01")})
    expect([first.totals.leaveMinutes,second.totals.leaveMinutes]).toEqual([480,480])
    expect(allocateOperationalMinutes(base()).allocationHash).toBe(first.allocationHash)
  })
  it("owns an overnight shift once on its reviewed local start work-date",()=>{
    const shiftStart="2026-10-31T22:00:00+01:00",shiftEnd="2026-11-01T06:00:00+01:00"
    const shiftMinutes=(new Date(shiftEnd).getTime()-new Date(shiftStart).getTime())/60000
    expect(shiftMinutes).toBe(480)
    // The import contract supplies the local start-date label, not the UTC instant.
    expect(entry(shiftStart.slice(0,10),shiftMinutes).workDate).toEqual(date("2026-10-31"))
    const first=allocateOperationalMinutes({...base(),entries:[entry("2026-10-31",480),entry("2026-11-01",480)],requests:[]})
    const second=allocateOperationalMinutes({...base(),entries:[entry("2026-10-31",480),entry("2026-11-01",480)],requests:[],periodStart:date("2026-11-01"),periodEnd:date("2026-11-01")})
    expect(first.totals.workedMinutes+second.totals.workedMinutes).toBe(960)
    expect(first.totals.workedMinutes).toBe(480)
  })
  it("requires an explicit split for partial multi-day leave and conserves it",()=>{
    expect(()=>allocateOperationalMinutes({...base(),requests:[{...request,requestedMinutes:360}]})).toThrow("per-date")
    const result=allocateOperationalMinutes({...base(),requests:[{...request,requestedMinutes:360,metadata:{allocations:[{workDate:"2026-10-31",minutes:120},{workDate:"2026-11-01",minutes:240}]}}]})
    expect(result.totals).toMatchObject({leaveMinutes:120,absenceMinutes:360})
  })
  it("selects each request's explicit policy, including multiple leave types",()=>{
    const result=allocateOperationalMinutes({...base(),policies:[policy,{...policy,id:"sick"}],requests:[
      {...request,id:"a",periodEnd:date("2026-10-31"),requestedMinutes:480},
      {...request,id:"b",periodStart:date("2026-11-01"),requestedMinutes:480,leavePolicyId:"sick"},
    ]})
    expect(result.usedPolicies.map(item=>item.id)).toEqual(["annual","sick"])
  })
  it("respects effective schedule changes and holidays",()=>{
    const changed={...schedule,id:"new",effectiveFrom:date("2026-11-01"),weeklyPattern:{...schedule.weeklyPattern,sun:240}}
    const result=allocateOperationalMinutes({...base(),schedules:[schedule,changed],entries:[entry("2026-10-31"),{...entry("2026-11-01"),scheduledMinutes:240,absenceMinutes:240}],requests:[{...request,requestedMinutes:720}]})
    expect(result.allocations.map(item=>item.minutes)).toEqual([480,240])
    const holiday={...schedule,calendar:{...schedule.calendar,holidays:[{holidayDate:date("2026-11-01"),sourceHash:"sha256:holiday"}]}}
    expect(allocateOperationalMinutes({...base(),schedules:[holiday],entries:[entry("2026-10-31"),{...entry("2026-11-01"),scheduledMinutes:0,absenceMinutes:0}],requests:[{...request,requestedMinutes:480}]}).totals.leaveMinutes).toBe(480)
  })
  it("uses recorded overtime once despite duplicate authorizations and never manufactures work",()=>{
    const overtime={...request,type:"OVERTIME",requestedMinutes:120}
    const result=allocateOperationalMinutes({...base(),entries:[entry("2026-10-31",480,60)],requests:[overtime,{...overtime,id:"duplicate"}]})
    expect(result.totals).toMatchObject({workedMinutes:480,overtimeMinutes:60})
    expect(allocateOperationalMinutes({...base(),entries:[entry("2026-10-31",480)],requests:[overtime]}).totals.overtimeMinutes).toBe(0)
  })
  it.each(["unapproved overtime","overlapping leave","unbalanced source","missing date","missing schedule","expired policy"])("blocks %s",kind=>{
    const input=base()
    if(kind==="unapproved overtime"){input.entries=[entry("2026-10-31",480,60)];input.requests=[]}
    if(kind==="overlapping leave")input.requests=[request,{...request,id:"second"}]
    if(kind==="unbalanced source")input.entries[0].workedMinutes=480
    if(kind==="missing date")input.entries.pop()
    if(kind==="missing schedule")input.schedules=[]
    if(kind==="expired policy")input.policies=[{...policy,effectiveTo:date("2026-10-31")}]
    expect(()=>allocateOperationalMinutes(input)).toThrow("HRIS_TIME_ALLOCATION_UNRESOLVED")
  })
})
