const fs=require('node:fs');
const replacements={
 'prisma/schema.prisma':[['model HrisEmployeeDocument {\n id String @id','model HrisEmployeeDocument {\n id String @id\n storageProvider String @default("UNBOUND")']],
 'services/hris/employee-document.service.ts':[
 ['type DocumentRow={id:string;','type DocumentRow={id:string;storageProvider:string;'],
 ['const objectKey=(r:DocumentRow)=>','function checkStore(r:DocumentRow,p:EmployeeDocumentPorts){if(r.storageProvider!==p.store.name)throw new BusinessRuleError("HRIS_DOCUMENT_STORAGE_IDENTITY_MISMATCH")}\nconst objectKey=(r:DocumentRow)=>'],
 ['const requestHash=digest(JSON.stringify({...input,sha256:file.sha256,byteLength:file.byteLength}))','const requestHash=digest(JSON.stringify({...input,sha256:file.sha256,byteLength:file.byteLength}))\n const provider=ports??runtimeDocumentPorts()'],
 ['INSERT INTO hris_employee_documents (id,"organizationId"','INSERT INTO hris_employee_documents (id,"storageProvider","organizationId"'],
 ['VALUES (${id},${a.organizationId},${access.employeeId}','VALUES (${id},${provider.store.name},${a.organizationId},${access.employeeId}'],
 ['const provider=ports??runtimeDocumentPorts()\n // Immutable','checkStore(saved,provider)\n // Immutable'],
 ['const {r}=await transaction(authorize),bytes=decryptEmployeeDocument(await (ports??runtimeDocumentPorts()).store.get(objectKey(r)),r)','const {r}=await transaction(authorize),provider=ports??runtimeDocumentPorts();checkStore(r,provider);const bytes=decryptEmployeeDocument(await provider.store.get(objectKey(r)),r)'],
 ['await (ports??runtimeDocumentPorts()).store.remove(objectKey(r))','const provider=ports??runtimeDocumentPorts();checkStore(r,provider);await provider.store.remove(objectKey(r))'],
 ],
 'what-next/hris-implementation-2026-10-24/HR-15/migrate.cjs':[["const file=process.argv[2]==='duplicates'?","const file=process.argv[2]==='storage'?'prisma/migrations/20261024150300_hris_document_storage_identity/migration.sql':process.argv[2]==='duplicates'?"]],
};
for(const [p,edits] of Object.entries(replacements)){let s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');for(const [from,to] of edits){if(!s.includes(from))throw Error('Anchor missing '+p+': '+from);s=s.replace(from,()=>to)}fs.writeFileSync(p+'.hr15-candidate',s)}
