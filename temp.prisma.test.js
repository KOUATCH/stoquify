const { PrismaClient } = require('@prisma/client');
(async()=>{
  const prisma = new PrismaClient();
  try{ await prisma.$queryRaw`SELECT 1`; console.log('query ok'); }
  catch(e){ console.error('err', e.message); console.error('code', e.code); console.error('meta', e.meta);}
  finally{ await prisma.$disconnect().catch(()=>{}); }
})();
