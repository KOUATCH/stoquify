const fs=require('node:fs');
const {PrismaClient}=require('@prisma/client');
const url='postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public';
const db=new PrismaClient({datasources:{db:{url}}});
const ids=['hris-verification-5a76f50c-8d54-4ffd-ad58-8c123fcb6c66-a','hris-verification-5a76f50c-8d54-4ffd-ad58-8c123fcb6c66-b'];
(async()=>{try {
 const identity=await db.$queryRaw`SELECT current_database() AS name`;
 if(identity[0].name!=='stoquify_local_hris_20261024')throw Error('Wrong database');
 for(const table of ['hrisAttendanceAnomaly','hrisTimeEntry','hrisTimeImportBatch','hrisWorkSchedule','hrisWorkCalendar','hrisTimeRequest','hrisLeaveBalanceEntry','hrisLeavePolicy','payrollEmployee'])await db[table].deleteMany({where:{organizationId:{in:ids}}});
 await db.organization.deleteMany({where:{id:{in:ids}}});
 const remaining=await db.organization.count({where:{id:{in:ids}}});
 if(remaining!==0)throw Error('Cleanup incomplete');
 fs.writeFileSync('what-next/hris-implementation-2026-10-24/HR-08/cleanup-recovery.json',JSON.stringify({timestamp:new Date().toISOString(),ids,remaining,scope:'Only the exact two failed-run synthetic organizations; no schema reset'},null,2));
 console.log('Exact failed-run fixture cleanup complete: zero remaining organizations');
}finally{await db.$disconnect()}})().catch(e=>{console.error(e);process.exitCode=1});
