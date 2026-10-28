const { PrismaClient } = require("@prisma/client");
(async()=>{ 
  const dbUrl = process.env.DATABASE_URL;
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try { const r = await prisma.$queryRaw`SELECT 1`; console.log('ok', Array.isArray(r)); }
  catch(e){ console.error('ERR', e.code, e.message); process.exitCode = 1; }
  finally { await prisma.$disconnect(); }
})();
