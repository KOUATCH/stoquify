const fs=require('node:fs'),path=require('node:path'),{PrismaClient}=require('@prisma/client');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8')),t=read('DATABASE_TARGET.json'),f=read('BROWSER_FIXTURE.json');
if(t.host!=='localhost'||!/^stoquify_retention_p07_20261017_[a-f0-9]+$/.test(t.database))throw Error('Unexpected target');
const db=new PrismaClient({datasources:{db:{url:`postgresql://${t.user}@localhost:${t.port}/${t.database}?schema=public`}}});
db.onboardingImportBatch.findMany({where:{organizationId:f.organizationId},select:{id:true,target:true,status:true,sourceFilename:true,approvedById:true,committedRecordCount:true,lastSafeErrorCode:true,riskLevel:true},orderBy:{createdAt:'asc'}}).then(rows=>{console.log(JSON.stringify(rows));fs.writeFileSync(path.join(__dirname,'snapshot-'+Date.now()+'.json'),JSON.stringify(rows,null,2));}).finally(()=>db.$disconnect());
