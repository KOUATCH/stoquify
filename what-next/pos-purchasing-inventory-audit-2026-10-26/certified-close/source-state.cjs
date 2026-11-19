const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const mode=process.argv[2];if(!['start','final'].includes(mode))throw Error('Expected start/final');
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(r.status!==0)throw Error(r.stderr);return r.stdout};
const paths=run('rg',['--files','services/accounting','services/reconciliation','services/purchasing','services/inventory','services/controls','actions/accounting','lib/security','prisma','scripts','graphify-out']).trim().split(/\r?\n/).filter(p=>/\.(ts|tsx|js|cjs|json|sql|prisma)$/.test(p));
paths.push('jest.cross-workflow-phase3.config.cjs','package.json','docs/ecc/command-registry.json');
const files=[...new Set(paths)].sort().map(file=>({file:file.replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}));
const head=run('git',['rev-parse','HEAD']).trim();fs.writeFileSync(path.join(__dirname,mode+'-source.json'),JSON.stringify({at:new Date().toISOString(),head,files},null,2));
fs.writeFileSync(path.join(__dirname,mode+'-working-tree.txt'),run('git',['status','--short']));console.log(JSON.stringify({head,files:files.length}));
