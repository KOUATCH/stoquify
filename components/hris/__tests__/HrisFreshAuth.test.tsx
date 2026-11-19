import '@testing-library/jest-dom'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {useHrisFreshAuth, HrisFreshAuthGate} from '../useHrisFreshAuth'
import {stepUpWithPasswordAction} from '@/actions/security/step-up-auth.actions'
jest.mock('@/actions/security/step-up-auth.actions',()=>({stepUpWithPasswordAction:jest.fn()}))
const refresh=jest.fn()
jest.mock('next/navigation',()=>({usePathname:()=>'/en/dashboard/people/manage',useRouter:()=>({refresh})}))
const verify=stepUpWithPasswordAction as jest.Mock
function Harness({action,scope='employee-a',locale='en',verified}:{action:jest.Mock;scope?:string;locale?:'en'|'fr';verified?:()=>void}) {
 const recovery=useHrisFreshAuth(locale,scope,verified)
 return <><input aria-label="Business draft" defaultValue="Keep this"/><button onClick={()=>void recovery.run(action)}>Save draft</button>{recovery.dialog}</>
}
function deferred(){let resolve!:(v:any)=>void;const promise=new Promise<any>(r=>resolve=r);return {promise,resolve}}
async function open(action=jest.fn().mockResolvedValue({success:false,code:'FRESH_AUTH_REQUIRED'})) {
 const view=render(<Harness action={action}/>);const trigger=screen.getByRole('button',{name:'Save draft'});trigger.focus();fireEvent.click(trigger);await screen.findByRole('dialog');return {view,action,trigger}
}
beforeEach(()=>{jest.clearAllMocks()})
it.each(['cancel','verify'])('does not reopen for an older overlapping denial after %s',async outcome=>{
 const first=deferred(),second=deferred(),action=jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
 verify.mockResolvedValue({success:true});render(<Harness action={action}/>);fireEvent.click(screen.getByText('Save draft'));fireEvent.click(screen.getByText('Save draft'))
 await act(async()=>first.resolve({success:false,code:'FRESH_AUTH_REQUIRED'}));await screen.findByRole('dialog')
 if(outcome==='cancel')fireEvent.click(screen.getByText('Cancel'))
 else {fireEvent.change(screen.getByLabelText('Password'),{target:{value:'synthetic'}});fireEvent.click(screen.getByText('Verify password'));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())}
 await act(async()=>second.resolve({success:false,code:'FRESH_AUTH_REQUIRED'}));expect(screen.queryByRole('dialog')).toBeNull()
})
it('opens only for freshness denial and does not weaken permission/module failures',async()=>{
 for(const code of ['FORBIDDEN','AUTH_REQUIRED','MODULE_DISABLED']) {const action=jest.fn().mockResolvedValue({success:false,code});const view=render(<Harness action={action}/>);await act(async()=>fireEvent.click(screen.getByText('Save draft')));expect(screen.queryByRole('dialog')).toBeNull();view.unmount()}
})
it('clears failed passwords, preserves draft on cancel, and restores keyboard focus',async()=>{
 verify.mockResolvedValue({success:false,code:'INVALID_CREDENTIALS'});const {trigger}=await open();expect(screen.getByLabelText('Password')).toHaveFocus();fireEvent.change(screen.getByLabelText('Password'),{target:{value:'incorrect'}});fireEvent.click(screen.getByText('Verify password'));await screen.findByRole('alert');expect(screen.getByLabelText('Password')).toHaveValue('');fireEvent.click(screen.getByText('Cancel'));await waitFor(()=>expect(trigger).toHaveFocus());expect(screen.getByLabelText('Business draft')).toHaveValue('Keep this')
})
it('does not automatically repeat the business action after verification',async()=>{
 verify.mockResolvedValue({success:true});const {action}=await open();fireEvent.change(screen.getByLabelText('Password'),{target:{value:'synthetic'}});fireEvent.click(screen.getByText('Verify password'));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(action).toHaveBeenCalledTimes(1);expect(screen.getByRole('status')).toHaveTextContent('Retry your action')
})
it('ignores a late action denial after employee scope changes',async()=>{
 const pending=deferred(),action=jest.fn(()=>pending.promise);const view=render(<Harness action={action}/>);fireEvent.click(screen.getByText('Save draft'));view.rerender(<Harness action={action} scope="employee-b"/>);await act(async()=>pending.resolve({success:false,code:'FRESH_AUTH_REQUIRED'}));expect(screen.queryByRole('dialog')).toBeNull()
})
it('ignores a late password success after navigation/unmount and blocks duplicate attempts',async()=>{
 const pending=deferred(),verified=jest.fn(),action=jest.fn().mockResolvedValue({success:false,code:'FRESH_AUTH_REQUIRED'});verify.mockReturnValue(pending.promise);const view=render(<Harness action={action} verified={verified}/>);fireEvent.click(screen.getByText('Save draft'));await screen.findByRole('dialog');fireEvent.change(screen.getByLabelText('Password'),{target:{value:'synthetic'}});fireEvent.click(screen.getByText('Verify password'));expect(screen.getByText('Cancel')).toBeDisabled();view.unmount();await act(async()=>pending.resolve({success:true}));expect(verified).not.toHaveBeenCalled();expect(verify).toHaveBeenCalledTimes(1)
})
it('distinguishes invalid sessions from throttling',async()=>{
 verify.mockResolvedValueOnce({success:false,code:'RATE_LIMITED'}).mockResolvedValueOnce({success:false,code:'AUTH_REQUIRED'});await open();for(const code of [1,2]){fireEvent.change(screen.getByLabelText('Password'),{target:{value:'synthetic'}});fireEvent.click(screen.getByText('Verify password'));await waitFor(()=>expect(verify).toHaveBeenCalledTimes(code));await screen.findByRole('alert')};expect(await screen.findByRole('link',{name:'Sign in'})).toHaveAttribute('href','/en/login');expect(screen.getByLabelText('Password')).toBeDisabled()
})
it('French initial-read recovery refreshes through the unchanged server gate',async()=>{
 verify.mockResolvedValue({success:true});render(<HrisFreshAuthGate locale="fr"/>);fireEvent.click(screen.getByText('Vérifier le mot de passe'));await screen.findByRole('dialog');fireEvent.change(screen.getByLabelText('Mot de passe'),{target:{value:'synthetic'}});fireEvent.click(screen.getAllByText('Vérifier le mot de passe').at(-1)!);await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(1))
})
