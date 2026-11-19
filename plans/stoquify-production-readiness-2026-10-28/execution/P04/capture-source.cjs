const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../../..');
const git=(args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024});assert.equal(r.status,0,r.stderr);return r.stdout};
const dirs=['app','actions','services','lib','components','hooks','types','utils','prisma','middleware.ts','next.config.mjs','package.json','package-lock.json','tsconfig.json','jest.setup.ts','docs/ecc/command-registry.json'];
const files=[...new Set(git(['ls-files','-c','-o','--exclude-standard','--',...dirs]).split(/\r?\n/).filter(Boolean))].filter(p=>/\.(ts|tsx|js|jsx|mjs|cjs|json|prisma|sql)$/.test(p)&&fs.existsSync(path.join(root,p))).sort();
const source=files.map(p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')}));
fs.writeFileSync(path.join(__dirname,'source-manifest.json'),JSON.stringify({capturedAt:new Date().toISOString(),head:git(['rev-parse','HEAD']).trim(),candidate:'current dirty working tree',files:source},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(__dirname,'git-status-before.txt'),git(['status','--short','--untracked-files=normal']),{flag:'wx'});
console.log(JSON.stringify({files:source.length,head:git(['rev-parse','HEAD']).trim()}));
