// Fresh successor database only. Preserve the entire first-attempt database and private evidence.
const {fs,path,assert,root,storage,own,target,hash,quote,receipt,connect,checkMigrations,requireEmpty}=require('./database-common-r3.cjs');
const {snapshot}=require('./fixture-control-r2.cjs');
const report={startedAt:new Date().toISOString(),passed:false};
async function allBusinessEmpty(c){const tables=(await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename")).rows;const counts=[];for(const {tablename} of tables){const count=(await c.query('SELECT count(*)::int n FROM '+quote(tablename))).rows[0].n;assert.equal(count,0,'Build template must contain no business data: '+tablename);counts.push({table:tablename,count});}return{tables:counts.length,allEmpty:true,sha256:hash(JSON.stringify(counts))};}
async function main(){
 assert.equal(process.argv.length,2);assert.equal(target.full,'stoquify_local_p04v02_20261109_full_r3');
 const owner=JSON.parse(fs.readFileSync(path.join(storage,'private/cluster-owner.json'),'utf8'));assert.equal(owner.root,root);assert.equal(owner.cluster,target.cluster);assert.equal(owner.port,target.port);assert.equal(owner.state,'running');assert.equal(Number(fs.readFileSync(path.join(target.cluster,'postmaster.pid'),'utf8').split(/\r?\n/)[0]),owner.ownedPid);
 const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'../runtime-result-attempt02.json'),'utf8'));assert.equal(prior.portsReleased,true);assert.equal(prior.artifactUnchanged,true);assert.deepEqual(prior.cleanup,[]);assert(!fs.existsSync(own),'Fresh successor private directory required');
 report.priorAttemptRetained=await snapshot('attempt02-retained-before-successor');
 const template=await connect(target.build);try{report.migrations=await checkMigrations(template);report.templateEmpty=await allBusinessEmpty(template);}finally{await template.end();}
 const admin=await connect('postgres');try{assert.equal((await admin.query('SELECT count(*)::int n FROM pg_database WHERE datname=$1',[target.full])).rows[0].n,0);assert.equal((await admin.query("SELECT count(*)::int n FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid()")).rows[0].n,0,'No concurrent local DB clients allowed during clone');await admin.query('CREATE DATABASE '+quote(target.full)+' TEMPLATE '+quote(target.build));}finally{await admin.end();}
 const fresh=await connect(target.full);try{assert.deepEqual(await checkMigrations(fresh),report.migrations);report.fullEmpty=await allBusinessEmpty(fresh);await requireEmpty(fresh);}finally{await fresh.end();}
 fs.mkdirSync(own,{recursive:false});report.priorAttemptRetainedAfter=await snapshot('attempt02-retained-after-successor');for(const key of ['businessSha256','sessionSha256','auditSha256'])assert.equal(report.priorAttemptRetainedAfter[key],report.priorAttemptRetained[key]);
 report.target={...target,ownedPid:owner.ownedPid};report.passed=true;receipt('database-clones',{passed:true,migrations:report.migrations,target:report.target});
}
main().catch(e=>{report.error=String(e.message);process.exitCode=1;}).finally(()=>{report.finishedAt=new Date().toISOString();receipt('preparation',report);console.log(JSON.stringify({passed:report.passed,error:report.error,database:target.full}));});
