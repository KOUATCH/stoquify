const fs=require('node:fs');
for(const [file,before,after] of [
 ['config/permissions.ts','  "hris.people.manage",\n] as const;','  "hris.people.manage",\n  "hris.documents.read",\n  "hris.documents.manage",\n  "hris.documents.retention",\n] as const;'],
 ['lib/security/rbac-permissions.ts','  "hris.people.manage": "crit",','  "hris.people.manage": "crit",\n  "hris.documents.read": "high",\n  "hris.documents.manage": "crit",\n  "hris.documents.retention": "crit",']
]){let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');if(!s.includes(before)||s.includes('"hris.documents.read"'))throw Error('Anchor mismatch '+file);fs.writeFileSync(file+'.hr15-candidate',s.replace(before,()=>after))}
