const fs=require('node:fs'),path=require('node:path'),{PrismaClient}=require('@prisma/client');
const t=JSON.parse(fs.readFileSync(path.join(__dirname,'DATABASE_TARGET.json'),'utf8')),f=JSON.parse(fs.readFileSync(path.join(__dirname,'BROWSER_FIXTURE.json'),'utf8'));
if(t.host!=='localhost'||!/^stoquify_retention_p07_20261018_[a-f0-9]+$/.test(t.database)||f.database!==t.database)throw Error('Unexpected target');
const db=new PrismaClient({datasources:{db:{url:`postgresql://${t.user}@localhost:${t.port}/${t.database}?schema=public`}}});
db.onboardingImportBatch.findMany({where:{organizationId:f.organizationId},select:{id:true,target:true,status:true,lastSafeErrorCode:true,errorRecordCount:true,committedRecordCount:true}}).then(rows=>console.log(JSON.stringify(rows))).finally(()=>db.$disconnect());
