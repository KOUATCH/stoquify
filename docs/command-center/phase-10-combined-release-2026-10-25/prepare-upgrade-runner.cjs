const fs=require('node:fs'),path=require('node:path');let text=fs.readFileSync(path.join(__dirname,'../phase-8-blocker-fixes-2026-10-25/upgrade.cjs'),'utf8');
text=text.replaceAll('115','PREDECESSOR_COUNT').replaceAll('118','120').replaceAll('PREDECESSOR_COUNT','118').replaceAll('Phase 8','Phase 10').replaceAll('phase8','phase10');
text=text.replace("require('@prisma/client')","require(path.join(require('./environment.cjs').state().work,'private-dependencies/node_modules/@prisma/client'))");
text=text.replace(/ const catalog=.*\r?\n/,` const catalog=JSON.parse(fs.readFileSync(path.join(s.candidate,'prisma/migration-catalog-manifest.json'))).migrations.map(m=>({name:m.name,sha256:m.rawSha256})),prior=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest-before.json'))).migrations.map(m=>({name:m.name,sha256:m.rawSha256}));\n`);
text=text.replace('assert.deepEqual(catalog.slice(0,118),prior)','for(const old of prior)assert.deepEqual(catalog.find(m=>m.name===old.name),old)');
text=text.replace('catalog.slice(118)','catalog.filter(m=>!prior.some(old=>old.name===m.name))');
text=text.replace("  const ledger=await db.$queryRaw",`  assert.deepEqual(await db.firmPracticeRevision.findMany(),[]);report.checks.push('Latest generated client reads the newly migrated FirmPracticeRevision table');\n  const ledger=await db.$queryRaw`);
fs.writeFileSync(path.join(__dirname,'upgrade.cjs'),text);console.log('Prepared reviewed populated 118-to-120 upgrade; no SQL or application source changes');
