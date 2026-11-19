// Disposable local fixture cleanup only; never imported by the application.
module.exports=async function(db,{org,url,owns}){
 const assert=require('node:assert/strict');
 assert.equal(url,'postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public');
 assert.equal(process.env.HRIS_CORRECTNESS_DATABASE_URL,url);assert.equal(owns,true);assert.match(org,/^hr21term-[a-f0-9-]{36}$/);
 await db.$transaction(async tx=>{
  const [target]=await tx.$queryRaw`SELECT current_database() AS name, inet_server_addr()::text AS host, inet_server_port() AS port`;
  assert.equal(target.name,'stoquify_local_hris_20261024');assert.equal(target.host,'127.0.0.1/32');assert.equal(target.port,55464);
  assert.equal(await tx.organization.count({where:{id:org}}),1);
  await tx.$executeRawUnsafe('LOCK TABLE hris_payroll_handoff_packages, hris_payroll_handoff_receipts IN ACCESS EXCLUSIVE MODE');
  const states=()=>tx.$queryRaw`SELECT tgname,tgenabled::text FROM pg_trigger WHERE tgname IN ('hris_handoff_package_guard','hris_handoff_receipt_guard') ORDER BY tgname`;
  const original=await states();assert.deepEqual(original,[{tgname:'hris_handoff_package_guard',tgenabled:'O'},{tgname:'hris_handoff_receipt_guard',tgenabled:'O'}]);
  await tx.$executeRawUnsafe('ALTER TABLE hris_payroll_handoff_receipts DISABLE TRIGGER hris_handoff_receipt_guard');
  await tx.$executeRawUnsafe('ALTER TABLE hris_payroll_handoff_packages DISABLE TRIGGER hris_handoff_package_guard');
  await tx.$executeRaw`DELETE FROM hris_payroll_handoff_receipts WHERE "organizationId"=${org}`;
  const rows=await tx.$queryRaw`SELECT id FROM hris_payroll_handoff_packages WHERE "organizationId"=${org} ORDER BY version DESC`;
  for(const row of rows)await tx.$executeRaw`DELETE FROM hris_payroll_handoff_packages WHERE id=${row.id} AND "organizationId"=${org}`;
  await tx.$executeRawUnsafe('ALTER TABLE hris_payroll_handoff_packages ENABLE TRIGGER hris_handoff_package_guard');
  await tx.$executeRawUnsafe('ALTER TABLE hris_payroll_handoff_receipts ENABLE TRIGGER hris_handoff_receipt_guard');
  assert.deepEqual(await states(),original);
 },{timeout:60000});
};
