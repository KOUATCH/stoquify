import '@testing-library/jest-dom'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {HrisOperationalTimeApprovalPanel} from '../HrisOperationalTimeApprovalPanel'
import {getTimeApprovalReviewAction,decideReviewedTimeApprovalAction} from '@/actions/hris/time-review.actions'
import {reviewFixture,receiptFixture} from './controlled-review.fixture'
const refresh=jest.fn()
jest.mock('next/navigation',()=>({usePathname:()=>'/en/dashboard/people/team',useRouter:()=>({refresh})}))
const read=getTimeApprovalReviewAction as jest.Mock,decide=decideReviewedTimeApprovalAction as jest.Mock
const request={id:'leave-request',type:'LEAVE',employeeId:'employee',periodStart:'2026-10-26T00:00:00Z',periodEnd:'2026-10-26T00:00:00Z',requestedMinutes:240,requestedAt:'2026-10-26T00:00:00Z',canDecide:true,employee:{displayName:'Synthetic employee'}}
beforeEach(()=>{jest.clearAllMocks();read.mockResolvedValue({success:true,data:{...reviewFixture,domain:'TIME_REQUEST',fields:[{key:'minutes',label:{en:'Requested minutes',fr:'Minutes demandées'},before:'—',after:'240'}]}});decide.mockResolvedValue({success:true,data:{...receiptFixture,domain:'TIME_REQUEST'}})})
async function open(){render(<HrisOperationalTimeApprovalPanel requests={[request]} locale="en"/>);fireEvent.click(screen.getByRole('button',{name:'Approve'}));await screen.findByRole('heading',{name:'Requested minutes'})}
test('closing a completed time decision refreshes the server-owned queue after preserving the receipt',async()=>{
 await open();fireEvent.change(screen.getByRole('textbox'),{target:{value:'Independently reviewed leave request'}});for(const checkbox of screen.getAllByRole('checkbox'))fireEvent.click(checkbox);fireEvent.click(screen.getByRole('button',{name:'Confirm decision'}));await screen.findByRole('heading',{name:'Decision receipt'});expect(refresh).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Close'}));await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(1));expect(decide).toHaveBeenCalledTimes(1)
})
test('closing an undecided review neither refreshes nor submits',async()=>{await open();fireEvent.click(screen.getByRole('button',{name:'Close'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(refresh).not.toHaveBeenCalled();expect(decide).not.toHaveBeenCalled()})
