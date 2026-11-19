import {readFileSync,writeFileSync} from 'node:fs'
import {db} from '@/prisma/db'
import {grantEmployeeDocument,downloadEmployeeDocument} from '../employee-document.service'
import {digest} from '../employee-document.contract'
import {getPayrollHandoffPackage} from '../payroll-handoff.service'
import {applyApprovedHrisEmployeeLifecycle} from '../lifecycle.service'
import {decideLifecycleTask} from '../lifecycle-task.service'
import type {EmployeeDocumentPorts} from '../employee-document.storage'
jest.mock('@/prisma/db',()=>{const {PrismaClient}=require('@prisma/client');const url=process.env.HRIS_RECOVERY_DATABASE_URL;if(url!=='postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_recovery_20261025?schema=public')throw Error('Owned recovery target required');return {db:new PrismaClient({datasources:{db:{url}}})}})
const base='what-next/hris-implementation-2026-10-24/HR-21/development-02',manifest=JSON.parse(readFileSync(base+'/backup-manifest.json','utf8')),f=JSON.parse(readFileSync(manifest.fixture,'utf8'));
const helper=require('../../../'+base+'/snapshot.cjs'),objects=new Map<string,Buffer>(f.objects.map(([k,b]:string[])=>[k,Buffer.from(b,'base64')]));
const permissions=['hris.people.read','hris.people.manage','payroll.employees.manage','payroll.contracts.read','payroll.contracts.manage','EMPLOYEE_SALARY_READ','hris.documents.read','hris.documents.manage','hris.tasks.read','hris.tasks.work','hris.tasks.review','hris.handoff.read','hris.handoff.export','hris.handoff.receive','hris.self_service.read','hris.self_service.request'];
const actor=(i=0)=>({organizationId:f.org,actorId:f.users[i],actorPermissions:i>=4?['hris.self_service.read','hris.self_service.request']:permissions});
const ports:EmployeeDocumentPorts={store:{name:f.storeName,async get(k){const b=objects.get(k);if(!b)throw Error('Synthetic object unavailable');return b},async put(){throw Error('Recovery must not upload')},async remove(){throw Error('Recovery must not delete')}},scanner:{name:'not invoked',async scan(){throw Error('Recovery must not rescan')}}};
let stages=0;
beforeAll(()=>{for(const [k,v]of Object.entries(f.environment))process.env[k]=v as string;jest.useFakeTimers({now:new Date('2026-11-01T12:00:00Z'),doNotFake:['nextTick','setImmediate','clearImmediate','setTimeout','clearTimeout','setInterval','clearInterval','hrtime','performance','queueMicrotask']})})
afterAll(async()=>{jest.useRealTimers();for(const k of Object.keys(f.environment))delete process.env[k];await db.$disconnect();if(stages===3)writeFileSync(base+'/recovery-test-results.json',JSON.stringify({status:'TESTS_COMPLETE_PENDING_RUNNER',stages,tables:manifest.tables,documents:f.docs.length,runId:f.org}))})
test('restored native data matches every nonempty tenant table before reads mutate audit history',async()=>{
 expect(await helper.fingerprints(db,f.org)).toEqual(f.fingerprints);expect(await db.payrollRun.count({where:{organizationId:f.org}})).toBe(0);expect(await db.payrollPaymentBatch.count({where:{organizationId:f.org}})).toBe(0);stages++;
})
test('recovered document originals and exact handoff bytes survive; incomplete recovery fails closed',async()=>{
 expect(stages).toBe(1);
 for(const doc of f.docs){const grant=await grantEmployeeDocument(actor(),doc.id),download=await downloadEmployeeDocument(actor(),grant.token,ports);expect(digest(download.bytes)).toBe(doc.sha256);expect(objects.get('hris/'+f.org+'/'+doc.id)!.equals(Buffer.from(download.bytes))).toBe(false)}
 for(const p of f.packages){const restored=await getPayrollHandoffPackage(actor(3),{packageId:p.id});expect(restored.packageHash).toBe(p.packageHash);expect(restored.csvBytes).toBe(p.csvBytes);expect(restored.receipt).not.toBeNull()}
 const doc=f.docs[0],key='hris/'+f.org+'/'+doc.id,original=objects.get(key)!;const download=async()=>{const g=await grantEmployeeDocument(actor(),doc.id);return downloadEmployeeDocument(actor(),g.token,ports)};
 objects.delete(key);try{await expect(download()).rejects.toThrow()}finally{objects.set(key,original)}
 const damaged=Buffer.from(original);damaged[0]^=1;objects.set(key,damaged);try{await expect(download()).rejects.toThrow()}finally{objects.set(key,original)}
 const rows=await db.$queryRaw<Array<{encryptionKey:string}>>`SELECT "encryptionKey" FROM hris_employee_documents WHERE id=${doc.id}`;
 await db.$executeRaw`UPDATE hris_employee_documents SET "encryptionKey"='' WHERE id=${doc.id}`;try{await expect(download()).rejects.toThrow()}finally{await db.$executeRaw`UPDATE hris_employee_documents SET "encryptionKey"=${rows[0].encryptionKey} WHERE id=${doc.id}`}
 expect(digest((await download()).bytes)).toBe(doc.sha256);
 await db.$executeRaw`UPDATE hris_employee_documents SET "encryptionKey"=${Buffer.alloc(32,7).toString('base64')} WHERE id=${doc.id}`;try{await expect(download()).rejects.toThrow()}finally{await db.$executeRaw`UPDATE hris_employee_documents SET "encryptionKey"=${rows[0].encryptionKey} WHERE id=${doc.id}`}
 await expect(db.$executeRaw`UPDATE hris_payroll_handoff_packages SET "csvBytes"='tampered' WHERE id=${f.packageId}`).rejects.toThrow();
 await expect(db.$executeRaw`DELETE FROM hris_payroll_handoff_receipts WHERE "packageId"=${f.packageId}`).rejects.toThrow();
 await db.role.updateMany({where:{organizationId:f.org,code:f.users[3]},data:{permissions:[]}});try{await expect(getPayrollHandoffPackage(actor(3),{packageId:f.packageId})).rejects.toThrow()}finally{await db.role.updateMany({where:{organizationId:f.org,code:f.users[3]},data:{permissions}})}
 await expect(grantEmployeeDocument({...actor(),organizationId:'synthetic-wrong-tenant'},doc.id)).rejects.toThrow();
 const other=f.docs.find((d:any)=>d.employeeId===f.employees[1]);await expect(grantEmployeeDocument(actor(4),other.id)).rejects.toThrow();await expect(grantEmployeeDocument(actor(5),other.id)).rejects.toThrow();stages++;
})
test('restored completed lifecycle and task retries do not duplicate events or task history',async()=>{
 expect(stages).toBe(2);
 const event=await db.businessEvent.findFirstOrThrow({where:{organizationId:f.org,eventType:'hris.employee.lifecycle.applied',payload:{path:['type'],equals:'TERMINATE'}}}),requestId=(event.payload as any).requestId;
 const before=await db.businessEvent.count({where:{organizationId:f.org}}),replayed=await applyApprovedHrisEmployeeLifecycle({...actor(2),employeeId:f.employees[1],requestId});expect(replayed.replayed).toBe(true);expect(replayed.businessEventId).toBe(event.id);expect(await db.businessEvent.count({where:{organizationId:f.org}})).toBe(before);
 const rows=await db.$queryRaw<Array<{id:string;revision:number;history:any[]}>>`SELECT id,revision,history FROM hris_lifecycle_tasks WHERE "organizationId"=${f.org} AND "requestId"=${requestId} AND code='ASSETS'`,row=rows[0],last=row.history.findLast(h=>h.operation==='APPROVE');
 expect(await decideLifecycleTask(actor(1),{taskId:row.id,revision:last.outcome.revision-1,operation:'APPROVE',reason:last.reason,idempotencyKey:last.key,acknowledged:true})).toEqual(last.outcome);
 expect(await db.$queryRaw`SELECT id,revision,history FROM hris_lifecycle_tasks WHERE id=${row.id}`).toEqual(rows);stages++;
})
