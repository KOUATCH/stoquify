import {randomUUID} from "node:crypto"
import {db} from "@/prisma/db"
import {uploadEmployeeDocument,listEmployeeDocuments,reviewEmployeeDocument,grantEmployeeDocument,downloadEmployeeDocument,retainEmployeeDocument,deleteEmployeeDocument} from "../employee-document.service"
import {digest,issueDocumentGrant} from "../employee-document.contract"
import {readItemPicture} from "@/services/media/picture.service"
import type {EmployeeDocumentPorts} from "../employee-document.storage"
jest.mock("@/prisma/db",()=>{const {PrismaClient}=require("@prisma/client"),url=process.env.HRIS_CORRECTNESS_DATABASE_URL;if(url!=="postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public")throw Error("Owned explicit database required");return {db:new PrismaClient({datasources:{db:{url}},transactionOptions:{maxWait:15000,timeout:25000}})}})
const org='hr15-'+randomUUID(),other=org+'-other',employee=org+'-employee',users=[0,1,2,3].map(i=>org+i),permissions=['hris.people.read','hris.people.manage','hris.self_service.read','hris.self_service.request','hris.documents.read','hris.documents.manage','hris.documents.retention'],actor=(i=0)=>({organizationId:org,actorId:users[i],actorPermissions:permissions}),bytes=Buffer.from('%PDF-1.4\nSynthetic HR document only\n%%EOF')
const objects=new Map<string,Buffer>(),tombstones=new Set<string>();let failPut=false,failDelete=false,failScan=false,rejectScan=false
const ports:EmployeeDocumentPorts={store:{name:'HR15 named synthetic immutable encrypted store',async put(key,value){if(tombstones.has(key))throw Error('tombstone');const prior=objects.get(key);if(prior&&!prior.equals(Buffer.from(value)))throw Error('immutable conflict');objects.set(key,Buffer.from(value));if(failPut)throw Error('synthetic lost upload response')},async get(key){const v=objects.get(key);if(!v)throw Error('missing');return v},async remove(key){tombstones.add(key);objects.delete(key);if(failDelete)throw Error('synthetic lost deletion response')}},scanner:{name:'HR15 synthetic protocol scanner (not malware certification)',async scan(value,sha256){if(failScan)throw Error('synthetic scanner unavailable');expect(digest(value)).toBe(sha256);return {sha256,verdict:rejectScan?'REJECTED':'CLEAN',reference:'synthetic-protocol-proof'}}}}
const input=(extra:Record<string,unknown>={})=>({employeeId:employee,policyCode:'SYNTHETIC',title:'Synthetic original',mimeType:'application/pdf',idempotencyKey:randomUUID(),...extra})
async function approved(extra:Record<string,unknown>={}){const r=await uploadEmployeeDocument(actor(),input(extra),bytes,ports);return reviewEmployeeDocument(actor(1),{documentId:r.id,revision:r.revision,decision:'APPROVE',acknowledged:true,reason:'Synthetic reviewer inspected original'})}
beforeAll(async()=>{
 process.env.HRIS_DOCUMENT_GRANT_SECRET='synthetic-grant-only-'.repeat(3)
 process.env.HRIS_DOCUMENT_POLICIES_JSON=JSON.stringify([{organizationId:org,countryCode:'CM',code:'SYNTHETIC',version:'1',nameEn:'Synthetic policy',nameFr:'Politique synthétique',retentionDays:30,employeeVisible:true,employeeMayUpload:true,approvalReference:'synthetic-approval-reference',approvedBy:'synthetic-policy-owner',approvedAt:'2026-01-01T00:00:00Z',effectiveFrom:'2026-01-01T00:00:00Z',effectiveTo:'2030-01-01T00:00:00Z',documentKind:'IDENTITY'}])
 for(const id of [org,other])await db.organization.create({data:{id,name:'Synthetic document employer',slug:id,country:'CM',timezone:'Africa/Douala'}})
 for(const [i,id] of users.entries()){await db.user.create({data:{id,organizationId:org,email:id+'@example.invalid',name:'Synthetic role '+i,isVerified:true}});await db.role.create({data:{organizationId:org,code:id,nameEn:id,permissions:i===2?['hris.people.read']:i===3?['hris.self_service.read']:permissions,users:{connect:{id}}}})}
 await db.payrollEmployee.create({data:{id:employee,organizationId:org,userId:users[0],employeeNumber:org,displayName:'Synthetic employee',hireDate:new Date('2026-01-01'),countryCode:'CM'}})
 await db.payrollEmployee.create({data:{id:employee+'-other',organizationId:org,userId:users[3],employeeNumber:org+'-other',displayName:'Synthetic other employee',hireDate:new Date('2026-01-01'),countryCode:'CM'}})
})
afterEach(()=>{failPut=false;failDelete=false;failScan=false;rejectScan=false})
afterAll(async()=>{try{await db.$executeRaw`DELETE FROM hris_employee_documents WHERE "organizationId"=${org}`;await db.payrollEmployee.deleteMany({where:{organizationId:org}});await db.organization.deleteMany({where:{id:{in:[org,other]}}});await db.user.deleteMany({where:{id:{in:users}}});expect(await db.user.count({where:{id:{in:users}}})).toBe(0);expect(await db.organization.count({where:{id:{in:[org,other]}}})).toBe(0)}finally{await db.$disconnect();delete process.env.HRIS_DOCUMENT_POLICIES_JSON;delete process.env.HRIS_DOCUMENT_GRANT_SECRET}},120000)
test('upload, quarantine, clean independent content review and current own download',async()=>{
 const r=await uploadEmployeeDocument(actor(),input(),bytes,ports);expect(r.status).toBe('PENDING_REVIEW');expect(objects.get(`hris/${org}/${r.id}`)).not.toEqual(bytes)
 await expect(grantEmployeeDocument(actor(),r.id)).rejects.toThrow();await expect(reviewEmployeeDocument(actor(),{documentId:r.id,revision:r.revision,decision:'APPROVE',acknowledged:true,reason:'Attempted own review'})).rejects.toThrow(/Independent/)
 const preview=await grantEmployeeDocument(actor(1),r.id);expect((await downloadEmployeeDocument(actor(1),preview.token,ports)).bytes).toEqual(bytes)
 const review={documentId:r.id,revision:r.revision,decision:'APPROVE',acknowledged:true,reason:'Synthetic review of the original'},results=await Promise.all([reviewEmployeeDocument(actor(1),review),reviewEmployeeDocument(actor(1),review)]);expect(results[0]).toEqual(results[1])
 const grant=await grantEmployeeDocument(actor(),r.id);expect((await downloadEmployeeDocument(actor(),grant.token,ports)).bytes).toEqual(bytes)
 expect(JSON.stringify(await listEmployeeDocuments(actor()))).not.toMatch(/encryptionKey|sha256|providerUrl/)
})
test('cross tenant, unlinked user, metadata-only manager, wrong grant actor and revoked role denied',async()=>{
 const r=await approved(),g=await grantEmployeeDocument(actor(),r.id)
 await expect(grantEmployeeDocument({...actor(),organizationId:other},r.id)).rejects.toThrow();await expect(grantEmployeeDocument(actor(2),r.id)).rejects.toThrow();await expect(grantEmployeeDocument(actor(3),r.id)).rejects.toThrow();await expect(downloadEmployeeDocument(actor(1),g.token,ports)).rejects.toThrow()
 await db.user.update({where:{id:users[0]},data:{isActive:false}});await expect(downloadEmployeeDocument(actor(),g.token,ports)).rejects.toThrow();await db.user.update({where:{id:users[0]},data:{isActive:true}})
})
test('upload response loss exact retry and changed payload conflict retain one object',async()=>{
 const i=input();failPut=true;await expect(uploadEmployeeDocument(actor(),i,bytes,ports)).rejects.toThrow(/lost upload/);failPut=false
 const rows=await db.$queryRaw<Array<{id:string;status:string}>>`SELECT id,status FROM hris_employee_documents WHERE "organizationId"=${org} AND "idempotencyKey"=${i.idempotencyKey}`;expect(rows).toHaveLength(1);expect(rows[0].status).toBe('UPLOADING');await expect(grantEmployeeDocument(actor(),rows[0].id)).rejects.toThrow()
 const out=await Promise.all([uploadEmployeeDocument(actor(),i,bytes,ports),uploadEmployeeDocument(actor(),i,bytes,ports)]);expect(out[0].id).toBe(out[1].id);await expect(uploadEmployeeDocument(actor(),{...i,title:'Changed title'},bytes,ports)).rejects.toThrow(/REPLAY_CONFLICT/)
})
test('scanner failure and rejection remain inaccessible',async()=>{
 const i=input();failScan=true;await expect(uploadEmployeeDocument(actor(),i,bytes,ports)).rejects.toThrow(/scanner/);const rows=await db.$queryRaw<Array<{id:string;status:string}>>`SELECT id,status FROM hris_employee_documents WHERE "organizationId"=${org} AND "idempotencyKey"=${i.idempotencyKey}`;expect(rows[0].status).toBe('QUARANTINED');await expect(grantEmployeeDocument(actor(1),rows[0].id)).rejects.toThrow();failScan=false;rejectScan=true;const r=await uploadEmployeeDocument(actor(),i,bytes,ports);expect(r.status).toBe('REJECTED');await expect(grantEmployeeDocument(actor(1),r.id)).rejects.toThrow()
})
test('expired document is actionable and competing replacements preserve lineage',async()=>{
 const old=await approved({expiresAt:'2026-01-01T00:00:00Z'});expect((await listEmployeeDocuments(actor())).documents.find(r=>r.id===old.id)?.needsReplacement).toBe(true)
 const a=await uploadEmployeeDocument(actor(),input({replacesDocumentId:old.id}),bytes,ports),b=await uploadEmployeeDocument(actor(),input({replacesDocumentId:old.id}),bytes,ports),review=(r:typeof a)=>({documentId:r.id,revision:r.revision,decision:'APPROVE',acknowledged:true,reason:'Synthetic replacement review'})
 const outcomes=await Promise.allSettled([reviewEmployeeDocument(actor(1),review(a)),reviewEmployeeDocument(actor(1),review(b))]);expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect((await listEmployeeDocuments(actor())).documents.find(r=>r.id===old.id)?.status).toBe('SUPERSEDED')
})
test('hold, evidence binding and native employee evidence prevent deletion',async()=>{
 const unique=Buffer.from('%PDF-1.4\nUnique evidence fixture\n%%EOF'),draft=await uploadEmployeeDocument(actor(),input(),unique,ports),r=await reviewEmployeeDocument(actor(1),{documentId:draft.id,revision:draft.revision,decision:'APPROVE',acknowledged:true,reason:'Synthetic evidence review'});await db.$executeRaw`UPDATE hris_employee_documents SET "retainUntil"='2020-01-01' WHERE id=${r.id}`
 await retainEmployeeDocument(actor(1),{documentId:r.id,revision:r.revision,operation:'HOLD',reason:'Synthetic legal hold'});await expect(deleteEmployeeDocument(actor(1),r.id,ports)).rejects.toThrow(/RETAINED/)
 const current=(await listEmployeeDocuments(actor())).documents.find(d=>d.id===r.id)!;await retainEmployeeDocument(actor(1),{documentId:r.id,revision:current.revision,operation:'RELEASE_HOLD',reason:'Synthetic release authorization'})
 await db.payrollEmployee.update({where:{id:employee},data:{metadata:{hrEvidenceReferences:[{documentHash:'sha256:'+digest(unique)}]}}})
 expect((await listEmployeeDocuments(actor())).documents.find(d=>d.id===r.id)?.evidenceBound).toBe(true);await expect(deleteEmployeeDocument(actor(1),r.id,ports)).rejects.toThrow(/RETAINED/)
 // Retained binding is irreversible even if a later metadata edit drops the link.
 await db.payrollEmployee.update({where:{id:employee},data:{metadata:{}}});await expect(deleteEmployeeDocument(actor(1),r.id,ports)).rejects.toThrow(/RETAINED/)
})
test('uncertain deletion stays inaccessible, native evidence attach denied, exact retry completes tombstone',async()=>{
 const unique=Buffer.from('%PDF-1.4\nUnique purge fixture\n%%EOF'),draft=await uploadEmployeeDocument(actor(),input(),unique,ports),r=await reviewEmployeeDocument(actor(1),{documentId:draft.id,revision:draft.revision,decision:'APPROVE',acknowledged:true,reason:'Synthetic purge review'});await db.$executeRaw`UPDATE hris_employee_documents SET "retainUntil"='2020-01-01' WHERE id=${r.id}`
 failDelete=true;await expect(deleteEmployeeDocument(actor(1),r.id,ports)).rejects.toThrow(/lost deletion/);await expect(grantEmployeeDocument(actor(),r.id)).rejects.toThrow();await expect(db.payrollEmployee.update({where:{id:employee},data:{metadata:{hrEvidenceReferences:[{documentHash:digest(unique)}]}}})).rejects.toThrow(/EVIDENCE_UNAVAILABLE/)
 failDelete=false;expect(await deleteEmployeeDocument(actor(1),r.id,ports)).toMatchObject({status:'DELETED'});expect(await deleteEmployeeDocument(actor(1),r.id,ports)).toMatchObject({status:'DELETED'});await expect(ports.store.put(`hris/${org}/${r.id}`,unique)).rejects.toThrow(/tombstone/)
})
test('ownership is rechecked after waiting for the employee lock',async()=>{
 const r=await approved(),own={...actor(),actorPermissions:['hris.self_service.read']};let ready!:()=>void,release!:()=>void
 const entered=new Promise<void>(v=>ready=v),gate=new Promise<void>(v=>release=v)
 const remap=db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM payroll_employees WHERE id=${employee} FOR UPDATE`;ready();await gate;await tx.payrollEmployee.update({where:{id:employee},data:{userId:null}})})
 await entered;const access=grantEmployeeDocument(own,r.id);await new Promise(r=>setTimeout(r,100));release();await remap;await expect(access).rejects.toThrow();await db.payrollEmployee.update({where:{id:employee},data:{userId:users[0]}})
})
test('revocation during provider fetch prevents returning the original',async()=>{
 const r=await approved(),g=await grantEmployeeDocument(actor(),r.id),delayed={...ports,store:{...ports.store,async get(key:string){const value=await ports.store.get(key);await db.user.update({where:{id:users[0]},data:{isActive:false}});return value}}}
 try{await expect(downloadEmployeeDocument(actor(),g.token,delayed)).rejects.toThrow()}finally{await db.user.update({where:{id:users[0]},data:{isActive:true}})}
})
test('pending, rejected and deleted duplicate bytes do not block retained native evidence',async()=>{
 const unique=Buffer.from('%PDF-1.4\nDuplicate content evidence\n%%EOF'),draft=await uploadEmployeeDocument(actor(),input(),unique,ports),r=await reviewEmployeeDocument(actor(1),{documentId:draft.id,revision:draft.revision,decision:'APPROVE',acknowledged:true,reason:'Synthetic duplicate review'})
 for(const state of ['PENDING_REVIEW','REJECTED','DELETED']){const duplicate=await uploadEmployeeDocument(actor(),input(),unique,ports);await db.$executeRaw`UPDATE hris_employee_documents SET status=${state} WHERE id=${duplicate.id}`;await db.payrollEmployee.update({where:{id:employee},data:{metadata:{hrEvidenceReferences:[{documentHash:'sha256:'+digest(unique)}],unrelated:{state}}}});expect((await listEmployeeDocuments(actor())).documents.find(d=>d.id===r.id)?.evidenceBound).toBe(true)}
 await db.payrollEmployee.update({where:{id:employee},data:{metadata:{}}})
})
test('provider configuration changes cannot redirect a retained original',async()=>{
 const r=await approved(),g=await grantEmployeeDocument(actor(),r.id),wrong={...ports,store:{...ports.store,name:'different synthetic store',get:jest.fn()}}
 await expect(downloadEmployeeDocument(actor(),g.token,wrong)).rejects.toThrow(/STORAGE_IDENTITY/);expect(wrong.store.get).not.toHaveBeenCalled()
})
test('legacy evidence first remains usable with its first pending, rejected or deleted stored copy',async()=>{
 for(const state of ['PENDING_REVIEW','REJECTED','DELETED']){
  const unique=Buffer.from('%PDF-1.4\nLegacy evidence first '+state+'\n%%EOF'),metadata={hrEvidenceReferences:[{documentHash:'sha256:'+digest(unique)}]}
  await db.payrollEmployee.update({where:{id:employee},data:{metadata}})
  const draft=await uploadEmployeeDocument(actor(),input(),unique,ports);await db.$executeRaw`UPDATE hris_employee_documents SET status=${state} WHERE id=${draft.id}`
  await db.payrollEmployee.update({where:{id:employee},data:{metadata:{...metadata,unrelated:'Preserved existing legacy reference'}}})
  if(state==='PENDING_REVIEW'){const r=await reviewEmployeeDocument(actor(1),{documentId:draft.id,revision:draft.revision,decision:'APPROVE',acknowledged:true,reason:'Synthetic legacy original review'});expect(r.evidenceBound).toBe(true)}
  await db.payrollEmployee.update({where:{id:employee},data:{metadata:{}}})
 }
})
test('expired grants and the alternate item-media owner cannot retrieve HR originals',async()=>{
 const r=await approved(),expired=issueDocumentGrant({documentId:r.id,organizationId:org,actorId:users[0],revision:r.revision},Date.now()-60001)
 await expect(downloadEmployeeDocument(actor(),expired.token,ports)).rejects.toThrow(/EXPIRED/);await expect(readItemPicture(r.id,org)).rejects.toThrow(/not found/i)
})
test('delete tombstone wins against a delayed upload and rejects later holds',async()=>{
 let entered!:()=>void,release!:()=>void;const reached=new Promise<void>(r=>entered=r),gate=new Promise<void>(r=>release=r),i=input(),delayed={...ports,store:{...ports.store,async put(key:string,value:Uint8Array){entered();await gate;return ports.store.put(key,value)}}}
 const upload=uploadEmployeeDocument(actor(),i,bytes,delayed);await reached
 const rows=await db.$queryRaw<Array<{id:string;revision:number}>>`UPDATE hris_employee_documents SET "retainUntil"='2020-01-01' WHERE "organizationId"=${org} AND "idempotencyKey"=${i.idempotencyKey} RETURNING id,revision`,r=rows[0]
 expect(await deleteEmployeeDocument(actor(1),r.id,ports)).toMatchObject({status:'DELETED'});await expect(retainEmployeeDocument(actor(1),{documentId:r.id,revision:r.revision,operation:'HOLD',reason:'Synthetic late hold'})).rejects.toThrow(/DELETE_ALREADY_CLAIMED/)
 release();await expect(upload).rejects.toThrow(/tombstone/);expect(objects.has(`hris/${org}/${r.id}`)).toBe(false)
})
test('rendered own upload, independent review and download in EN/FR',async()=>{
 const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),directory=path.resolve('what-next/hris-implementation-2026-10-24/HR-15/browser')
 const server=http.createServer(async(req:any,res:any)=>{try{
  const url=new URL(req.url,'http://127.0.0.1'),role=req.headers.cookie?.includes('fixtureRole=checker')?1:req.headers.cookie?.includes('fixtureRole=employee')?0:2,a=actor(role)
  if(url.pathname==='/api/hris/documents'){
   res.setHeader('Content-Type','application/json');if(req.method==='GET'){res.end(JSON.stringify(await listEmployeeDocuments(a,url.searchParams.get('employeeId')??undefined)));return}
   const parts=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>6*1024*1024)throw Error('bounded fixture');parts.push(chunk)}const buffer=Buffer.concat(parts),contentType=req.headers['content-type']??''
   if(contentType.startsWith('multipart/form-data;')){const form=await new Response(buffer,{headers:{'Content-Type':contentType}}).formData(),file=form.get('file') as File,input=JSON.parse(String(form.get('metadata')));res.end(JSON.stringify(await uploadEmployeeDocument(a,{...input,mimeType:file.type},new Uint8Array(await file.arrayBuffer()),ports)));return}
   const command=JSON.parse(buffer.toString('utf8'));if(command.command==='REVIEW'){res.end(JSON.stringify(await reviewEmployeeDocument(a,command.input)));return}if(command.command==='GRANT'){res.end(JSON.stringify(await grantEmployeeDocument(a,command.documentId)));return}if(command.command==='DOWNLOAD'){const r=await downloadEmployeeDocument(a,command.token,ports);res.setHeader('Content-Type',r.mimeType);res.end(r.bytes);return}throw Error('Unknown command')
  }
  if(['/bundle.js','/styles.css'].includes(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('css')?'text/css':'text/javascript');res.end(fs.readFileSync(path.join(directory,url.pathname.slice(1))));return}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
 }catch(e){res.statusCode=String(e).includes('STALE')?409:403;res.end(JSON.stringify({error:'Synthetic denied or unavailable'}))}})
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));try{const results=await require('../../../what-next/hris-implementation-2026-10-24/HR-15/browser/check.cjs')(`http://127.0.0.1:${server.address().port}`,employee);expect(results).toHaveLength(11)}finally{await new Promise<void>(r=>server.close(r))}
},240000)
