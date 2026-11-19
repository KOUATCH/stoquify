import '@testing-library/jest-dom'
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react'
import {HrisPeopleAuthoring} from '../HrisPeopleAuthoring'
const callbacks:Record<string,()=>void>={}
jest.mock('next/link',()=>({__esModule:true,default:({children,href}:any)=><a href={href}>{children}</a>}))
jest.mock('../HrisControlledReview',()=>({HrisControlledReview:({target,onAccessDenied}:any)=>{callbacks[target.employeeId]=onAccessDenied;return null}}))
const selected=(id:string)=>({employee:{id,updatedAt:'2026-10-24',employeeNumber:id,displayName:id,status:'DRAFT',hireDate:'2026-10-01',countryCode:'CM'},blockers:[],contracts:[],documentRequests:[],payment:{paymentDestination:{}},compensation:{salaryChanges:[{id:'salary-'+id,status:'REQUESTED',effectiveFrom:'2026-11-01',currentBaseSalary:'100',proposedBaseSalary:'200',redactions:[]}]},timeline:{events:[]},lifecycle:null})
const view=(id:string):any=>({selected:selected(id),employees:['a','b'].map(id=>({id,employeeNumber:id,displayName:id})),users:[],locations:[],organization:{currency:'XAF',country:'CM'},canAuthorContract:true,completeEmployeeList:true})
test('late review denial from previous employee cannot clear current workspace',async()=>{
 render(<HrisPeopleAuthoring initial={view('a')} locale="en" reload={jest.fn().mockResolvedValue(view('b'))} execute={jest.fn()}/>);const old=callbacks.a;expect(old).toEqual(expect.any(Function));fireEvent.change(screen.getByLabelText('Open an employee'),{target:{value:'b'}});await waitFor(()=>expect(screen.getByLabelText('Employee name')).toHaveValue('b'));act(()=>old());expect(screen.getByLabelText('Employee name')).toHaveValue('b');act(()=>callbacks.b());expect(screen.queryByLabelText('Employee name')).toBeNull()
})
