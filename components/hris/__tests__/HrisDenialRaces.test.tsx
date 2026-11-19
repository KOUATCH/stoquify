import '@testing-library/jest-dom'
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react'
import {HrisDocumentWorkspace} from '../HrisDocumentWorkspace'
const document={id:'original',revision:1,title:'Private original title',status:'AVAILABLE',byteLength:100,retainUntil:'2030-01-01',employeeVisible:false,legalHold:false,evidenceBound:false,policy:{nameEn:'Test policy',nameFr:'Politique test'}}
const workspace:any={employeeId:'synthetic',documents:[document],policies:[],canReview:false,canRetain:true}
function retention(){fireEvent.change(screen.getByLabelText('Authorization reference or reason'),{target:{value:'Synthetic authorization'}});fireEvent.click(screen.getByRole('checkbox',{name:'I checked the approved policy and the authority for this action.',hidden:true}));fireEvent.submit(screen.getByRole('button',{name:'Record retention action',hidden:true}).closest('form')!)}
const denied=()=>Object.assign(Error('Denied'),{code:'FORBIDDEN',status:403})
test('late list cannot restore private originals after concurrent retention denial',async()=>{
 let resolve!:(v:any)=>void,lists=0;
 const execute=jest.fn(async command=>{if(command==='LIST')return lists++===0?workspace:new Promise(r=>resolve=r);throw denied()})
 render(<HrisDocumentWorkspace locale="en" execute={execute}/>);await screen.findByText('Private original title');fireEvent.click(screen.getByRole('button',{name:'Refresh status'}));retention();await waitFor(()=>expect(screen.queryByText('Private original title')).toBeNull());await act(async()=>resolve(workspace));expect(screen.queryByText('Private original title')).toBeNull()
})
test('late downloaded bytes cannot trigger a download after concurrent retention denial',async()=>{
 let resolve!:(v:any)=>void;
 const execute=jest.fn(async command=>{if(command==='LIST')return workspace;if(command==='DOWNLOAD')return new Promise(r=>resolve=r);throw denied()});const click=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{})
 render(<HrisDocumentWorkspace locale="en" execute={execute}/>);await screen.findByText('Private original title');fireEvent.click(screen.getByRole('button',{name:'Download original'}));retention();await waitFor(()=>expect(screen.queryByText('Private original title')).toBeNull());await act(async()=>resolve({blob:new Blob(['synthetic'])}));expect(click).not.toHaveBeenCalled();click.mockRestore()
})
test('retention freshness refusal reaches password recovery and retains the reason',async()=>{
 const execute=jest.fn(async command=>{if(command==='LIST')return workspace;throw Object.assign(Error('Verify'),{code:'FRESH_AUTH_REQUIRED',status:403})});render(<HrisDocumentWorkspace locale="en" execute={execute}/>);await screen.findByText('Private original title');retention();expect(await screen.findByLabelText('Password')).toHaveFocus();expect(screen.getByDisplayValue('Synthetic authorization')).toBeInTheDocument();expect(execute.mock.calls.filter(c=>c[0]==='RETAIN')).toHaveLength(1)
})
test('confirmed upload with failed refresh stays saved and does not invite mutation retry',async()=>{
 let lists=0;const execute=jest.fn(async command=>{if(command==='LIST'){if(lists++)throw Error('Read lost');return {...workspace,policies:[{code:'TEST',nameEn:'Test',nameFr:'Test'}]}}return {status:'PENDING_REVIEW'}})
 render(<HrisDocumentWorkspace locale="en" execute={execute}/>);await screen.findByLabelText('Document title');fireEvent.change(screen.getByLabelText('Document title'),{target:{value:'Synthetic upload'}});fireEvent.change(screen.getByLabelText('Document policy'),{target:{value:'TEST'}});fireEvent.change(screen.getByLabelText('PDF, PNG or JPEG — up to 5 MB'),{target:{files:[new File(['%PDF-1.4\n%%EOF'],'synthetic.pdf',{type:'application/pdf'})]}});fireEvent.submit(screen.getByRole('button',{name:'Upload for review'}).closest('form')!);await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Saved. Refresh status'));expect(screen.getByRole('alert')).not.toHaveTextContent('unconfirmed');expect(screen.queryByRole('button',{name:'Retry same upload'})).toBeNull();expect(execute.mock.calls.filter(c=>c[0]==='UPLOAD')).toHaveLength(1)
})
test('confirmed review with freshness-denied refresh preserves saved outcome and password focus',async()=>{
 let lists=0;const execute=jest.fn(async command=>{if(command==='LIST'){if(lists++)throw Object.assign(Error('Verify'),{code:'FRESH_AUTH_REQUIRED',status:403});return {...workspace,canReview:true,documents:[{...document,status:'PENDING_REVIEW'}]}}return {status:'AVAILABLE'}})
 render(<HrisDocumentWorkspace locale="en" execute={execute}/>);await screen.findByText('Private original title');fireEvent.click(screen.getByRole('button',{name:'Review approval'}));fireEvent.change(screen.getByLabelText('Decision reason'),{target:{value:'Synthetic review completed'}});fireEvent.click(screen.getByRole('checkbox',{name:'I inspected the original, policy, validity and replacement link.'}));fireEvent.submit(screen.getByRole('button',{name:'Record decision'}).closest('form')!);expect(await screen.findByLabelText('Password')).toHaveFocus();await waitFor(()=>expect(screen.getByText(/Saved\. Refresh status/)).toBeInTheDocument());expect(execute.mock.calls.filter(c=>c[0]==='REVIEW')).toHaveLength(1)
})
test('confirmed retention action with failed refresh remains saved',async()=>{
 let lists=0;const execute=jest.fn(async command=>{if(command==='LIST'){if(lists++)throw Error('Read failed');return workspace}return {status:'AVAILABLE'}});render(<HrisDocumentWorkspace locale="en" execute={execute}/>);await screen.findByText('Private original title');retention();await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Saved. Refresh status'));expect(screen.getByText('Retention action recorded.')).toBeInTheDocument();expect(execute.mock.calls.filter(c=>c[0]==='RETAIN')).toHaveLength(1)
})
