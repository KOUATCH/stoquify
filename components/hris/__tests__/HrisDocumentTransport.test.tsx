import {render} from '@testing-library/react'
import {HrisDocumentWorkspaceClient} from '../HrisDocumentWorkspaceClient'
let transport:any
jest.mock('../HrisDocumentWorkspace',()=>({HrisDocumentWorkspace:(props:any)=>{transport=props.execute;return null}}))
test.each(['LIST','UPLOAD','GRANT','DOWNLOAD'])('%s retains canonical denial code and status',async stage=>{
 const failure={ok:false,status:403,json:async()=>({code:'FRESH_AUTH_REQUIRED',error:'Internal detail'})}
 global.fetch=jest.fn().mockResolvedValue(failure)
 if(stage==='DOWNLOAD')(global.fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({token:'synthetic'})})
 render(<HrisDocumentWorkspaceClient locale="en" employeeId="synthetic"/>);
 await expect(transport(['GRANT','DOWNLOAD'].includes(stage)?'DOWNLOAD':stage,{documentId:'synthetic',file:new File(['x'],'x.pdf'),metadata:{}})).rejects.toMatchObject({code:'FRESH_AUTH_REQUIRED',status:403,message:'Document operation unavailable'})
})
