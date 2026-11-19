// Two narrow fixture repairs. Preserve the original capture and shared concurrent changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {root,state}=require('./environment.cjs'),s=state(),receipt=path.join(__dirname,'fixture-repairs.json');
assert.ok(!fs.existsSync(receipt));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),changes=[];
function edit(folder,file,replacements){const target=path.join(folder,file),before=fs.readFileSync(target),newline=before.toString().includes('\r\n')?'\r\n':'\n';let content=before.toString().replaceAll('\r\n','\n');for(const [from,to]of replacements){assert.equal(content.split(from).length,2,'Expected exactly one fixture match: '+file);content=content.replace(from,to)}const after=Buffer.from(content.replaceAll('\n',newline));assert.equal(hash(fs.readFileSync(target)),hash(before),'Concurrent change; refuse overwrite');fs.writeFileSync(path.join(__dirname,'fixture-before-'+changes.length+'.txt'),before);fs.writeFileSync(target,after);changes.push({scope:folder===root?'shared-workspace':'captured-candidate',file,before:hash(before),after:hash(after)})}
const stock='services/inventory/__tests__/stock-integrity.repairs.postgres.test.ts';
const old="  await db.accountingPeriod.update({ where: { id: f.period.id }, data: { status: 'CLOSED' } })";
const closed=`  // Synthetic closed-state fixture, not certification of the period-close approval workflow.
  await db.$transaction(async tx => {
    const closedAt = new Date()
    const event = await tx.periodControlEvent.create({ data: {
      organizationId: f.organizationId, periodId: f.period.id, version: 1,
      operation: 'CLOSE', fromStatus: 'OPEN', toStatus: 'CLOSED', actorId: f.actorId,
      reason: 'Synthetic closed-period stock denial fixture', idempotencyKey: 'fixture-close',
      sourceRevision: '0', approval: { fixture: true }, createdAt: closedAt,
    } })
    await tx.accountingPeriod.update({ where: { id: f.period.id }, data: {
      status: 'CLOSED', controlVersion: 1, lastControlEventId: event.id,
      closedAt, lockedAt: closedAt, closedById: f.actorId,
    } })
  })`;
edit(root,stock,[[old,closed]]);edit(s.candidate,stock,[[old,closed]]);
const cross='services/inventory/__tests__/cross-workflow.phase3.postgres.test.ts';
const fixes=[
 ['sessionId: shift.id, createdById: user.id, orderNumber: id','sessionId: shift.id, customerId: f.customerId, createdById: user.id, orderNumber: id'],
 ['expectedDeliveryDate: today, orderLines: [{ itemId: f.itemId, quantity, unitPrice }]','expectedDeliveryDate: today, shippingCost: 0, orderLines: [{ itemId: f.itemId, quantity, unitPrice, taxRate: 0, discount: 0 }]'],
 ['let unlock!: () => void, reached!: () => void','let unlock!: () => void, reached!: () => void, holderPid = 0'],
 ['await tx.$queryRaw`SELECT id FROM inventory_levels WHERE id = ${level.id} FOR UPDATE`; reached();','const rows = await tx.$queryRaw<Array<{ pid: number }>>`SELECT id, pg_backend_pid() AS pid FROM inventory_levels WHERE id = ${level.id} FOR UPDATE`; holderPid = rows[0].pid; reached();'],
 ["const rows = await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(DISTINCT pid) AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%inventory_levels%'`", "// Checkout may wait indirectly through shared organization/item locks.\n      const rows = await db.$queryRaw<Array<{ count: bigint }>>`WITH RECURSIVE blocked(pid) AS (SELECT pid FROM pg_stat_activity WHERE ${holderPid} = ANY(pg_blocking_pids(pid)) UNION SELECT a.pid FROM pg_stat_activity a JOIN blocked b ON b.pid = ANY(pg_blocking_pids(a.pid))) SELECT count(DISTINCT a.pid) AS count FROM pg_stat_activity a JOIN blocked b USING(pid) WHERE a.datname=current_database()`"],
];
edit(s.candidate,cross,fixes);
fs.writeFileSync(receipt,JSON.stringify({applicationRuntimeChanges:0,schemaChanges:0,changes,reason:'Closed-state setup must satisfy retained receipt trigger; second checkout requires customer. Explicit purchase input defaults and observed blocker-chain waits reuse reviewed shared-workspace corrections. New accounting scenario remains outside capture.'},null,2));console.log(JSON.stringify(changes));
