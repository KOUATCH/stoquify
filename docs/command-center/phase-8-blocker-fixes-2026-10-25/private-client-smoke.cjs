const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {state,redact}=require('./environment.cjs');const s=state();
const {PrismaClient}=require(path.join(s.work,'private-dependencies/node_modules/@prisma/client'));
async function main(){const db=new PrismaClient({datasources:{db:{url:s.url}}});const report={productionAccess:false,writes:false,checks:[]};
try{const [identity]=await db.$queryRaw`SELECT current_database() AS name,current_setting('data_directory') AS directory`;assert.equal(identity.name,s.database);assert.equal(path.resolve(identity.directory).toLowerCase(),s.cluster.toLowerCase());
for(const name of ['firmAdvisoryRevision','hrisPayrollHandoffPackage','hrisPayrollHandoffReceipt','commandCenterOccurrence','user','organization']){assert.equal(typeof db[name]?.findMany,'function');const rows=await db[name].findMany({take:1});assert.deepEqual(rows,[]);report.checks.push(name+' all-field SELECT succeeds against replayed disposable schema')}
report.passed=true;
}finally{await db.$disconnect();fs.writeFileSync(path.join(__dirname,'private-client-smoke.json'),JSON.stringify(report,null,2))}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length}));}
main().catch(e=>{console.error(redact(e.message));process.exitCode=1});
