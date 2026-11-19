const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {PrismaClient,Prisma}=require('@prisma/client');
const {schemaTokens}=require('../../scripts/ensure-prisma-client');
const generated=path.resolve('node_modules/.prisma/client');
const engineName='query_engine-windows.dll.node';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const engineHash=hash(path.join(generated,engineName));
assert.equal(engineHash,hash(path.join(path.dirname(require.resolve('@prisma/engines/package.json')),engineName)));
assert.equal(Prisma.prismaVersion.client,require('@prisma/client/package.json').version);
assert.equal(Prisma.prismaVersion.client,require('prisma/package.json').version);
assert.ok(Prisma.ModelName.FirmAdvisoryRevision && Prisma.ModelName.FirmPracticeRevision);
// Constructing a client does not connect to the database. Read its generated schema only.
const inlineSchema=new PrismaClient()._engineConfig.inlineSchema;
assert.equal(schemaTokens(inlineSchema),schemaTokens(fs.readFileSync('prisma/schema.prisma','utf8')));
for(const name of ['index.js','index.d.ts','default.js','default.d.ts'])assert.ok(fs.statSync(path.join(generated,name)).size>0);
// Complete only the companion copy skipped when Prisma could not replace the
// already-identical, locked DLL. No generated JS, types, engine or source schema is edited.
fs.writeFileSync(path.join(generated,'schema.prisma'),inlineSchema);
const report={clientVersion:Prisma.prismaVersion.client,engineHash,engineReplaced:false,inlineSchemaMatches:true,companionCopyCompleted:true,databaseConnected:false};
fs.writeFileSync(path.join(__dirname,'client-recovery.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
