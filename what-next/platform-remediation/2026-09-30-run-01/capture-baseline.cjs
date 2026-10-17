const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
const scopes=['app','actions','components','config','hooks','lib','services','prisma','scripts','jest.config.ts','jest.setup.ts','tsconfig.json','next.config.mjs','package.json','package-lock.json'];
const git=(args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
const baseline=path.join(__dirname,'baseline.json');
if(fs.existsSync(baseline)) throw new Error('Baseline already exists; preserve it');
const files=[...new Set(git(['ls-files','-z','--cached','--others','--exclude-standard','--',...scopes]).split('\0').filter(Boolean))];
const hashes={};
for(const file of files) {const full=path.join(root,file);if(fs.existsSync(full)&&fs.statSync(full).isFile())hashes[file]=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');}
const status=git(['status','--porcelain=v1','-z']);
fs.writeFileSync(path.join(__dirname,'initial-git-status.txt'),status.replaceAll('\0','\n'));
const record={capturedAt:new Date().toISOString(),head:git(['rev-parse','HEAD']).trim(),node:process.version,files:hashes};
fs.writeFileSync(baseline,JSON.stringify(record,null,2));
console.log(JSON.stringify({capturedAt:record.capturedAt,head:record.head,hashedFiles:Object.keys(hashes).length,statusEntries:status.split('\0').filter(Boolean).length}));
