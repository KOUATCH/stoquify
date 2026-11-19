import '@testing-library/jest-dom'
import {render,screen,fireEvent,waitFor} from '@testing-library/react'
import {HrisPeopleAuthoring} from '../HrisPeopleAuthoring'
import {HrisDocumentWorkspace} from '../HrisDocumentWorkspace'
jest.mock('next/link',()=>({__esModule:true,default:({children,href}:any)=><a href={href}>{children}</a>}))
const view:any={selected:null,employees:[],users:[],locations:[],organization:{currency:'XAF',country:'CM'},canAuthorContract:true,completeEmployeeList:true}
const denied=()=>Object.assign(Error('Denied'),{code:'FORBIDDEN',status:403})
const documents:any={employeeId:'synthetic',documents:[],policies:[{code:'TEST',nameEn:'Test',nameFr:'Test'}],canReview:false,canRetain:false}
function fillHire(){fireEvent.change(screen.getByLabelText('Employee name'),{target:{value:'Private draft'}});return screen.getByRole('form',{name:'Create employee draft',hidden:true})}
function fillUpload(){fireEvent.change(screen.getByLabelText('Document title'),{target:{value:'Private original'}});fireEvent.change(screen.getByLabelText('Document policy'),{target:{value:'TEST'}});fireEvent.change(screen.getByLabelText('PDF, PNG or JPEG — up to 5 MB'),{target:{files:[new File(['%PDF-1.4\n%%EOF'],'synthetic.pdf',{type:'application/pdf'})]}});return screen.getByRole('button',{name:'Upload for review'}).closest('form')!}
test.each(['read','write','postcommit'])('hiring %s denial clears private drafts',async mode=>{
 const reload=jest.fn().mockRejectedValue(denied()),execute=jest.fn().mockResolvedValue(mode==='write'?{success:false,code:'FORBIDDEN',error:'Denied'}:{success:true})
 render(<HrisPeopleAuthoring initial={view} locale="en" reload={reload} execute={execute}/>);const form=fillHire();if(mode==='read')fireEvent.click(screen.getByRole('button',{name:'Refresh status'}));else fireEvent.submit(form)
 await waitFor(()=>expect(screen.queryByDisplayValue('Private draft')).toBeNull());expect(screen.queryByLabelText('Employee name')).toBeNull();expect(screen.getByRole('alert')).toHaveTextContent(/access/i)
})
test('unknown hiring outcome locks fields and retries identical request',async()=>{
 const execute=jest.fn().mockRejectedValueOnce(Error('connection lost')).mockResolvedValue({success:true}),reload=jest.fn().mockResolvedValue(view)
 render(<HrisPeopleAuthoring initial={view} locale="en" reload={reload} execute={execute}/>);fireEvent.submit(fillHire());await screen.findByRole('button',{name:'Retry exact request',hidden:true});expect(screen.getByLabelText('Employee name')).toBeDisabled();const first=execute.mock.calls[0][0];fireEvent.click(screen.getByRole('button',{name:'Retry exact request',hidden:true}));await waitFor(()=>expect(execute).toHaveBeenCalledTimes(2));expect(execute.mock.calls[1][0]).toEqual(first)
})
test('document freshness expiry preserves the submitted original and requests password verification',async()=>{
 const execute=jest.fn(async command=>{if(command==='LIST')return documents;throw Object.assign(Error('Verify'),{code:'FRESH_AUTH_REQUIRED',status:403})})
 render(<HrisDocumentWorkspace locale="en" execute={execute}/>);await screen.findByLabelText('Document title');fireEvent.submit(fillUpload());await screen.findByRole('dialog');expect(screen.getByLabelText('Document title')).toHaveValue('Private original');expect(execute.mock.calls.filter(c=>c[0]==='UPLOAD')).toHaveLength(1)
})
test('document denial clears original metadata and upload draft',async()=>{
 const execute=jest.fn(async command=>{if(command==='LIST')return documents;throw denied()})
 render(<HrisDocumentWorkspace locale="en" execute={execute}/>);await screen.findByLabelText('Document title');fireEvent.submit(fillUpload());await waitFor(()=>expect(screen.queryByLabelText('Document title')).toBeNull());expect(screen.getByRole('alert')).toHaveTextContent(/access/i)
})
test('freshness refusal during unknown hiring recovery keeps the original request locked',async()=>{
 const execute=jest.fn().mockRejectedValueOnce(Error('lost')).mockResolvedValueOnce({success:false,code:'FRESH_AUTH_REQUIRED'}).mockResolvedValue({success:true})
 render(<HrisPeopleAuthoring initial={view} locale="en" reload={jest.fn().mockResolvedValue(view)} execute={execute}/>);const form=fillHire();fireEvent.submit(form);await screen.findByRole('button',{name:'Retry exact request',hidden:true});expect(screen.getByLabelText('Employee name')).toBeDisabled();fireEvent.submit(form);await screen.findByLabelText('Password');expect(screen.getByLabelText('Employee name')).toBeDisabled();expect(execute.mock.calls[1][0]).toEqual(execute.mock.calls[0][0])
})
