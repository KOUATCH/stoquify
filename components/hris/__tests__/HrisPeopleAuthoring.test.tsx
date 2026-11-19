/// <reference types="@testing-library/jest-dom" />
import {render,screen,fireEvent,waitFor,act} from "@testing-library/react"
import {HrisPeopleAuthoring} from "../HrisPeopleAuthoring"
jest.mock("next/link",()=>({__esModule:true,default:({children,href}:any)=><a href={href}>{children}</a>}))
jest.mock("next-intl/routing",()=>({defineRouting:(value:any)=>value}))
const selected=(id="a",version="2026-10-24T00:00:00.000Z",name="First")=>({employee:{id,updatedAt:version,employeeNumber:id,displayName:name,status:"DRAFT",hireDate:version,countryCode:"CM"},blockers:[],contracts:[],documentRequests:[],payment:{paymentDestination:{}},compensation:{salaryChanges:[]},timeline:{events:[]},lifecycle:null})
const view=(s:any=selected())=>({selected:s,employees:[{id:"a",employeeNumber:"a",displayName:"First"},{id:"b",employeeNumber:"b",displayName:"Second"}],users:[],locations:[],organization:{currency:"XAF",country:"CM"},canAuthorContract:true,completeEmployeeList:true})
test("switching employee cannot retarget an existing payment draft",async()=>{
  const reload=jest.fn().mockResolvedValue(view(selected("b"))),execute=jest.fn()
  render(<HrisPeopleAuthoring initial={view() as any} locale="en" reload={reload} execute={execute}/>);
  fireEvent.change(screen.getByLabelText("Bank name"),{target:{value:"Draft for A"}})
  fireEvent.change(screen.getByLabelText("Open an employee"),{target:{value:"b"}})
  await waitFor(()=>expect(screen.getByLabelText("Bank name")).toHaveValue(""))
  expect(execute).not.toHaveBeenCalled()
})
test("refresh adopts newer profile values together with their version",async()=>{
  const reload=jest.fn().mockResolvedValue(view(selected("a","2026-10-24T01:00:00.000Z","Newer saved name"))),execute=jest.fn().mockResolvedValue({success:true})
  render(<HrisPeopleAuthoring initial={view() as any} locale="en" reload={reload} execute={execute}/>);
  fireEvent.change(screen.getByLabelText("Employee name"),{target:{value:"Stale draft"}})
  fireEvent.click(screen.getByRole("button",{name:"Refresh status"}))
  await waitFor(()=>expect(screen.getByLabelText("Employee name")).toHaveValue("Newer saved name"))
  fireEvent.submit(screen.getByRole("form",{name:"Correct employee profile",hidden:true}))
  await waitFor(()=>expect(execute).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({displayName:"Newer saved name",expectedUpdatedAt:"2026-10-24T01:00:00.000Z"})})))
})
test("failed French save keeps fields and reuses the same retry key",async()=>{
  const execute=jest.fn().mockResolvedValue({success:false,error:"Duplicate identity"}),reload=jest.fn()
  render(<HrisPeopleAuthoring initial={view(null) as any} locale="fr" reload={reload} execute={execute}/>);
  fireEvent.change(screen.getByLabelText("Nom de l’employé"),{target:{value:"Brouillon conservé"}})
  const form=screen.getByRole("form",{name:"Créer un brouillon employé",hidden:true});fireEvent.submit(form)
  await screen.findByText(/Duplicate identity/);expect(screen.getByLabelText("Nom de l’employé")).toHaveValue("Brouillon conservé")
  fireEvent.submit(form);await waitFor(()=>expect(execute).toHaveBeenCalledTimes(2));expect(execute.mock.calls[0][0].data.idempotencyKey).toBe(execute.mock.calls[1][0].data.idempotencyKey)
})
test("redacted salaries cannot be reviewed through guided forms",()=>{
  const current=selected();current.compensation.salaryChanges=[{id:"secret",status:"REQUESTED",effectiveFrom:"2026-11-01",currentBaseSalary:"[REDACTED:PAYROLL]",proposedBaseSalary:"[REDACTED:PAYROLL]",redactions:[{field:"salary"}]}] as any
  render(<HrisPeopleAuthoring initial={view(current) as any} locale="en" reload={jest.fn()} execute={jest.fn()}/>);
  expect(screen.queryByRole("form",{name:"Approve salary change",hidden:true})).toBeNull()
})
test("late selection response cannot replace a newer selected employee",async()=>{
  let finishOld!:(value:any)=>void;const reload=jest.fn().mockImplementationOnce(()=>new Promise(r=>finishOld=r)).mockResolvedValueOnce(view(selected("a","2026-10-24T02:00:00Z","Latest")))
  render(<HrisPeopleAuthoring initial={view() as any} locale="en" reload={reload} execute={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText("Open an employee"),{target:{value:"b"}})
  fireEvent.change(screen.getByLabelText("Open an employee"),{target:{value:"a"}})
  await waitFor(()=>expect(screen.getByLabelText("Employee name")).toHaveValue("Latest"))
  await act(async()=>finishOld(view(selected("b"))))
  expect(screen.getByLabelText("Employee name")).toHaveValue("Latest")
})
test("late save completion cannot navigate away from a subsequently selected employee",async()=>{
  let finishSave!:(value:any)=>void;const execute=jest.fn(()=>new Promise<any>(r=>finishSave=r)),reload=jest.fn().mockResolvedValue(view(selected("b","2026-10-24T00:00:00Z","Second")))
  render(<HrisPeopleAuthoring initial={view() as any} locale="en" reload={reload} execute={execute}/>);
  fireEvent.submit(screen.getByRole("form",{name:"Correct employee profile",hidden:true}))
  fireEvent.change(screen.getByLabelText("Open an employee"),{target:{value:"b"}})
  await waitFor(()=>expect(screen.getByLabelText("Employee name")).toHaveValue("Second"))
  await act(async()=>finishSave({success:true,data:{payrollEmployee:{id:"a"}}}))
  expect(reload).toHaveBeenCalledTimes(1);expect(screen.getByLabelText("Employee name")).toHaveValue("Second")
})
test("a form cannot submit while another employee selection is loading",async()=>{
  let finishLoad!:(value:any)=>void;const reload=jest.fn(()=>new Promise<any>(r=>finishLoad=r)),execute=jest.fn()
  render(<HrisPeopleAuthoring initial={view() as any} locale="en" reload={reload} execute={execute}/>);
  fireEvent.change(screen.getByLabelText("Open an employee"),{target:{value:"b"}})
  fireEvent.submit(screen.getByRole("form",{name:"Correct employee profile",hidden:true}))
  expect(execute).not.toHaveBeenCalled()
  await act(async()=>finishLoad(view(selected("b","2026-10-24T00:00:00Z","Second"))))
  expect(screen.getByLabelText("Employee name")).toHaveValue("Second")
})

test("late freshness denial for a previous employee cannot open password recovery",async()=>{
  let finishSave!:(value:any)=>void;const execute=jest.fn(()=>new Promise<any>(r=>finishSave=r)),reload=jest.fn().mockResolvedValue(view(selected("b","2026-10-24T00:00:00Z","Second")))
  render(<HrisPeopleAuthoring initial={view() as any} locale="en" reload={reload} execute={execute}/>);
  fireEvent.submit(screen.getByRole("form",{name:"Correct employee profile",hidden:true}))
  fireEvent.change(screen.getByLabelText("Open an employee"),{target:{value:"b"}})
  await waitFor(()=>expect(screen.getByLabelText("Employee name")).toHaveValue("Second"))
  await act(async()=>finishSave({success:false,code:"FRESH_AUTH_REQUIRED",error:"Verify again"}))
  expect(screen.queryByRole("dialog")).toBeNull();expect(screen.getByLabelText("Employee name")).toHaveValue("Second")
})
