const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../../..'),file=path.join(__dirname,'verify-account-sessions.cjs');
let text=fs.readFileSync(file,'utf8');
const original="const safe=error=>{let value=String(error?.message??error);";
assert.ok(text.includes(original));
text=text.replace(original,"const safe=error=>{let value=String(error?.message??error).replace(/[^\\r\\n]*(?:cookie|authorization):[^\\r\\n]*/gi,'[authentication header redacted]');");
text=text.replace("async function browserProof(){const data=metadata(),", "async function browserProof(){const data=metadata();const selectedLocale=process.argv[3];assert.ok(!selectedLocale||['en','fr'].includes(selectedLocale));report.selectedLocale=selectedLocale??'both';data.fixtures=data.fixtures.filter(f=>!selectedLocale||f.locale===selectedLocale);const ");
text=text.replaceAll("otherContext.request.get(helper.baseUrl+'/api/me/permissions')", "otherContext.request.get(helper.baseUrl+'/api/me/permissions',{timeout:120000})");
fs.writeFileSync(file,text);
// Preserve the failed run, redact credential headers, and invalidate only the
// exposed synthetic session in the owned local database. Do not print it.
const helper=require('./registration-local.cjs'),target=helper.targetUrl(),reportFile=path.join(__dirname,'account-sessions-browser-218effc7-729.json'),report=JSON.parse(fs.readFileSync(reportFile,'utf8')),fixtures=JSON.parse(fs.readFileSync(path.join(root,'playwright/.auth/workflow-account-sessions-v1.json'),'utf8'));
assert.equal(fixtures.source,'owned-account-sessions-verification');assert.equal(fixtures.database,helper.database);
const tokens=[];
for(const row of report.checks){const match=row.error?.match(/better-auth\.session_data=([A-Za-z0-9_-]+)/);if(match){const payload=JSON.parse(Buffer.from(match[1],'base64url').toString('utf8'));tokens.push(payload.session.session.token);}if(row.error)row.error=row.error.replace(/[^\r\n]*(?:cookie|authorization):[^\r\n]*/gi,'[authentication header redacted]');}
const {PrismaClient}=require('@prisma/client'),db=new PrismaClient({datasources:{db:{url:target.toString()}},log:[]});
(async()=>{await helper.withClient(target,helper.assertOwned);const deleted=await db.session.deleteMany({where:{token:{in:tokens},userId:{in:fixtures.fixtures.map(f=>f.editor.userId)}}});report.evidenceRedaction={recordedAt:new Date().toISOString(),reason:'Playwright timeout included a synthetic authentication cookie header. Header redacted, exact exposed owned fixture session invalidated; failure and other evidence retained.',invalidatedSyntheticSessions:deleted.count};fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({redacted:true,invalidatedSyntheticSessions:deleted.count,productionSourceChanged:false}));})().finally(()=>db.$disconnect());
