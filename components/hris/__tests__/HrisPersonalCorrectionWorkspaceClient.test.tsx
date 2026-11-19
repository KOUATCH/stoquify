import '@testing-library/jest-dom'
import {render,screen,fireEvent,waitFor} from '@testing-library/react'
jest.mock('../HrisPersonalCorrectionWorkspace',()=>({HrisPersonalCorrectionWorkspace:({execute}:any)=><button onClick={()=>execute('QUEUE')}>Refresh selected case</button>}))
jest.mock('@/actions/hris/personal-correction.actions',()=>({getCorrectionQueueAction:jest.fn().mockResolvedValue({success:true,data:{cases:[]}})}))
import {HrisPersonalCorrectionWorkspaceClient} from '../HrisPersonalCorrectionWorkspaceClient'
import {getCorrectionQueueAction} from '@/actions/hris/personal-correction.actions'
test('exact-case targeting survives refresh and query navigation',async()=>{const initial={scopeKey:'synthetic',cases:[],historyTruncated:false},view=render(<HrisPersonalCorrectionWorkspaceClient initial={initial} own={false} locale="en" selectedCaseId="old-case"/>);fireEvent.click(screen.getByRole('button'));await waitFor(()=>expect(getCorrectionQueueAction).toHaveBeenLastCalledWith({caseId:'old-case'}));view.rerender(<HrisPersonalCorrectionWorkspaceClient initial={initial} own={false} locale="en" selectedCaseId="other-case"/>);fireEvent.click(screen.getByRole('button'));await waitFor(()=>expect(getCorrectionQueueAction).toHaveBeenLastCalledWith({caseId:'other-case'}))})
