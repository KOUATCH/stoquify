const fs=require('node:fs'),p='services/hris/operational-time.service.ts';let s=fs.readFileSync(p,'utf8');
s=s.replace('select:{sourceHash:true}}),','select:{sourceHash:true,importedById:true}}),');
s=s.replace('  return {\n    policy: {','  return {\n    preparedByIds: [...new Set(imports.map(item=>item.importedById))].sort(),\n    policy: {');
s=s.replace('hashBusinessPayload(previous) !== hashBusinessPayload(current)','hashBusinessPayload(previous) !== hashBusinessPayload({policy:current.policy,evidence:current.evidence,totals:current.totals})');
const needle='  const source = await readOperationalAttendanceSource(parsed, client)';if(!s.includes(needle))throw Error('Certification source marker missing');
s=s.replace(needle,()=>needle+`
  if (!source.preparedByIds.length || source.preparedByIds.includes(parsed.actorId)) throw new BusinessRuleError("SOD_VIOLATION: Independent certification must exclude every importer contributing source evidence, including adjacent work dates.")
  parsed.preparedById = source.preparedByIds[0]
`);
fs.writeFileSync(p+'.hr13-candidate',s);
const q='services/hris/__tests__/hris-correctness.postgres.test.ts';let t=fs.readFileSync(q,'utf8').replace('sourceRecordId:\x60october-${day}\x60','sourceRecordId:\x60${employeeId}-october-${day}\x60').replace('sourceRecordId:\x60november-${i+1}\x60','sourceRecordId:\x60${employeeId}-november-${i+1}\x60');fs.writeFileSync(q+'.hr13-candidate',t);
