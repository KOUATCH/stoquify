const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');const repo=path.resolve(__dirname,'../../..');const files=['services/inventory/inventory-reconciliation.service.ts','services/accounting/close-assurance.service.ts','services/accounting/close-assurance-pack.service.ts','services/inventory/__tests__/inventory-reconciliation.service.test.ts','services/accounting/__tests__/close-assurance.service.test.ts','services/accounting/__tests__/close-assurance-pack.service.test.ts'];
const original=Object.fromEntries(files.map(file=>[file,fs.readFileSync(path.join(repo,file),'utf8')])),changes=new Map();
const expected={'services/inventory/inventory-reconciliation.service.ts':'d13cd4d3245a5058303d549591570006a2b5d999361172d8795fe904cd2f6158','services/accounting/close-assurance.service.ts':'aade3f1f61ec126132d4e4cbb794e745e6370b6b7819c94e65591839b7399905','services/accounting/close-assurance-pack.service.ts':'6bd4400725922dde466faf6e5dc7aa3d203d22e1ffe2c3e58780658c80fff7ae'};
for(const [file,hash]of Object.entries(expected))assert.equal(crypto.createHash('sha256').update(original[file]).digest('hex'),hash);
function replace(s,a,b){assert.ok(s.includes(a),a);return s.replace(a,b)}function edit(file,work){let s=work(original[file].replace(/\r\n/g,'\n'));changes.set(file,original[file].includes('\r\n')?s.replace(/\n/g,'\r\n'):s)}
edit(files[0],s=>{
 s=replace(s,'import { db }','import { createHash } from "node:crypto";\n\nimport { db }');
 s=replace(s,'  reportHash: string;','  reportHash: string;\n  evidenceHash: string;\n  evidenceHashVersion: 1;');
 s=replace(s,'export async function reconcileInventoryClass3(',`// Stream complete, ordered source populations. Page boundaries and the time of
// observation are not source revisions; record identities and values are.
async function sourceFingerprint(loadPage: (cursor?: string) => Promise<Array<{ id: string }>>) {
  const digest = createHash("sha256");
  let cursor: string | undefined;
  for (;;) {
    const rows = await loadPage(cursor);
    for (const row of rows) digest.update(hashBusinessPayload(JSON.parse(JSON.stringify(row)))).update("\\n");
    if (rows.length < sourcePageSize) break;
    cursor = rows[rows.length - 1].id;
  }
  return digest.digest("hex");
}

function fingerprintPage(cursor?: string) {
  return { orderBy: { id: "asc" as const }, take: sourcePageSize,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) };
}

export async function reconcileInventoryClass3(`);
 const marker='  return {\n    ...report,\n    status: failures.length === 0 ? "PASSED" : "BLOCKED",';
 s=replace(s,marker,`  // Keep reportHash as the exact observation receipt. Freshness compares a
  // separate versioned fingerprint, including rows whose changes can offset
  // each other in aggregate totals and counts.
  const sourceFingerprints = await Promise.all([
    sourceFingerprint(cursor => client.inventoryTransaction.findMany({
      where: closingInventoryWhere, ...fingerprintPage(cursor),
    })),
    sourceFingerprint(cursor => client.journalEntryLine.findMany({
      where: closingClass3Where, ...fingerprintPage(cursor),
      include: {
        account: { select: { id: true, code: true, syscohadaClass: true, isActive: true } },
        journalEntry: { select: { id: true, entryNumber: true, entryDate: true, postedAt: true, status: true, sourceType: true, sourceId: true, periodId: true } },
      },
    })),
    sourceFingerprint(cursor => client.businessEvent.findMany({
      where: { organizationId: parsed.organizationId, sourceType: { in: [...inventoryAccountingSourceTypes] }, recordedAt: { lte: recordedThrough }, ...closingEventDateFilter },
      select: { id: true, eventType: true, schemaVersion: true, status: true, payloadHash: true, documentHash: true, sourceType: true, sourceId: true, occurredAt: true, recordedAt: true, postingBatchId: true },
      ...fingerprintPage(cursor),
    })),
    sourceFingerprint(cursor => client.stockAdjustment.findMany({
      where: { organizationId: parsed.organizationId, status: "COMPLETED", createdAt: { lte: recordedThrough }, ...adjustmentDateFilter }, ...fingerprintPage(cursor),
    })),
    sourceFingerprint(cursor => client.stockCountSession.findMany({
      where: { organizationId: parsed.organizationId, status: "POSTED", createdAt: { lte: recordedThrough }, ...countDateFilter }, ...fingerprintPage(cursor),
    })),
    sourceFingerprint(cursor => client.inventoryLevel.findMany({
      where: { item: { organizationId: parsed.organizationId }, location: { organizationId: parsed.organizationId, ...(parsed.locationId ? { id: parsed.locationId } : {}) } },
      // Only membership enters the period report; today's mutable balance does not.
      select: { id: true, itemId: true, locationId: true }, ...fingerprintPage(cursor),
    })),
  ]);
  const { recordedThrough: observationCutoff, ...businessReport } = report;
  const evidenceHash = \`sha256:\${hashBusinessPayload({ version: 1, ...businessReport, locationId: parsed.locationId ?? null, toleranceValue: toleranceValue.toString(), sourceFingerprints })}\`;

  return {
    ...report,
    recordedThrough: observationCutoff,
    evidenceHash,
    evidenceHashVersion: 1,
    status: failures.length === 0 ? "PASSED" : "BLOCKED",`);
 return s;
});
edit(files[1],s=>{
 s=replace(s,'  sourceHash: string | null\n  blockerStatus:','  sourceHash: string | null\n  evidenceHashVersion: 1 | null\n  observationHash: string | null\n  recordedThrough: string | null\n  blockerStatus:');
 s=replace(s,'      sourceHash: null,\n      blockerStatus: "EVIDENCE_UNAVAILABLE",','      sourceHash: null,\n      evidenceHashVersion: null,\n      observationHash: null,\n      recordedThrough: null,\n      blockerStatus: "EVIDENCE_UNAVAILABLE",');
 s=replace(s,'    sourceHash: params.result.reportHash,','    sourceHash: params.result.evidenceHash,\n    evidenceHashVersion: params.result.evidenceHashVersion,\n    observationHash: params.result.reportHash,\n    recordedThrough: params.result.recordedThrough,');return s;
});
edit(files[2],s=>{
 s=replace(s,'    sourceHash: result.reportHash,','    sourceHash: result.evidenceHash,\n    evidenceHashVersion: result.evidenceHashVersion,\n    observationHash: result.reportHash,\n    recordedThrough: result.recordedThrough,');
 s=replace(s,'  if (stringField(savedAnnex, "blockerStatus") !== "PASSED") {',`  if (savedAnnex.evidenceHashVersion !== 1) {
    return {
      status: "MISSING", sourceModel: "InventoryValuationAnnex", sourceId,
      sourceEventName: "inventory.valuation.annex.checked",
      staleReason: "Inventory valuation evidence predates the source-fingerprint contract. Run a new close assessment.",
      previousEvidenceHash, newEvidenceHash: null, savedAnnex, currentAnnex: null,
      certificationBlocker: "Inventory valuation evidence must be regenerated with a current source fingerprint.",
      detectedAt,
    };
  }

  if (stringField(savedAnnex, "blockerStatus") !== "PASSED") {`);
 s=s.replaceAll('current.reportHash','current.evidenceHash');return s;
});
edit(files[3],s=>{
 s=s.replaceAll('inventoryLevel: { count: jest.fn() }','inventoryLevel: { count: jest.fn(), findMany: jest.fn() }').replaceAll('inventoryLevel: { count: jest.Mock }','inventoryLevel: { count: jest.Mock; findMany: jest.Mock }');
 s=s.replaceAll('      findFirst: jest.fn(),','      findFirst: jest.fn(),\n      findMany: jest.fn(),').replaceAll('    findFirst: jest.Mock;','    findFirst: jest.Mock;\n    findMany: jest.Mock;');
 for(const model of ['stockAdjustment','stockCountSession'])s=s.replaceAll(model+': { count: jest.fn() }',model+': { count: jest.fn(), findMany: jest.fn() }').replaceAll(model+': { count: jest.Mock }',model+': { count: jest.Mock; findMany: jest.Mock }');
 s=replace(s,'    configurePassingPopulation();',`    for (const model of [mockedDb.inventoryLevel, mockedDb.journalEntryLine, mockedDb.stockAdjustment, mockedDb.stockCountSession]) model.findMany.mockResolvedValue([]);
    configurePassingPopulation();`);
 s=replace(s,'      .mockResolvedValueOnce([finalMovement]);','      .mockResolvedValueOnce([finalMovement])\n      .mockResolvedValue([]);');
 s=replace(s,'      .mockResolvedValueOnce([]);','      .mockResolvedValueOnce([])\n      .mockResolvedValue([]);');
 s=replace(s,'    expect(mockedDb.inventoryTransaction.findMany).toHaveBeenCalledTimes(2);','    expect(mockedDb.inventoryTransaction.findMany.mock.calls.filter(([query]) => query.select)).toHaveLength(2);');return s;
});
edit(files[4],s=>replace(s,'    reportHash: "sha256:inventory-valuation",','    reportHash: "sha256:inventory-observation",\n    evidenceHash: "sha256:inventory-valuation",\n    evidenceHashVersion: 1,\n    recordedThrough: "2026-06-15T12:00:00.000Z",'));
edit(files[5],s=>{s=replace(s,'    sourceHash,\n    blockerStatus:','    sourceHash,\n    evidenceHashVersion: 1,\n    observationHash: "sha256:inventory-observation",\n    recordedThrough: "2026-06-15T12:00:00.000Z",\n    blockerStatus:');s=replace(s,'    reportHash: sourceHash,','    reportHash: "sha256:inventory-observation",\n    evidenceHash: sourceHash,\n    evidenceHashVersion: 1,\n    recordedThrough: "2026-06-15T12:00:00.000Z",');return s});
const baseline='evidence/inventory-freshness-source-before-'+crypto.randomUUID()+'.json';fs.writeFileSync(path.join(__dirname,baseline),JSON.stringify({at:new Date().toISOString(),sourceHashes:Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(original[file]).digest('hex')])),sources:original},null,2)+'\n',{flag:'wx'});
for(const [file,text]of changes){const target=path.join(repo,file);assert.equal(fs.readFileSync(target,'utf8'),original[file]);const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text))}finally{fs.closeSync(fd)}}console.log(JSON.stringify({baseline,edited:[...changes.keys()]}));
