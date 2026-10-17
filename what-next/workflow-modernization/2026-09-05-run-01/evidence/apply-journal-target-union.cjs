const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const edits=[
 ['services/accounting/close-assurance-pack.service.ts','c4bf854f799f5e08b492ceaee35541f61bd4aa37c58485df60bafa825c56200d',text=>{
  const field='  periodId?: string | null;\n  periodStart?: Date | string | null;';assert.ok(text.includes(field));
  text=text.replace(field,'  periodId?: string | null;\n  periodIds?: readonly string[];\n  periodStart?: Date | string | null;');
  const filter='  if (input.periodId) periodFilters.push({ periodId: input.periodId });';assert.ok(text.includes(filter));
  return text.replace(filter,filter+'\n  if (input.periodIds?.length) periodFilters.push({ periodId: { in: [...new Set(input.periodIds)].sort() } });');
 }],
 ['services/accounting/journal-close-invalidation.service.ts','8ee2bfe698fdab25e6d557c113023b64051ab59d9b487b86ece4925fb64899a8',text=>{
  text=text.replace('import type { Prisma } from "@prisma/client"','import type { Prisma } from "@prisma/client"\nimport { ConflictError } from "@/services/_shared/action-errors"');
  text=text.replace('  reversalPeriodId: string\n','  reversalPeriodId: string\n  affectedPeriodIds: readonly string[]\n');
  const start=text.indexOf('  const periodIds = [...new Set([input.originalPeriodId, input.reversalPeriodId])]');assert.ok(start>0);
  return text.slice(0,start)+`  const periodIds = [...new Set(input.affectedPeriodIds)].sort()
  if (![input.originalPeriodId, input.reversalPeriodId].every(id => periodIds.includes(id))) {
    throw new ConflictError("Journal reversal evidence scope is incomplete.")
  }
  // One query and one globally ordered run-lock set, including overlaps.
  // Callers acquire the complete period boundary before financial writes.
  return recordCloseCertificationInvalidationsForSourceInTx(tx, organizationId, {
    sourceCode: "LEDGER_JOURNAL_REVERSED",
    sourceId: input.originalJournalEntryId,
    periodIds,
    staleReason: input.staleReason ?? "Ledger journal reversal changed certified close evidence.",
    newEvidenceHash: input.reversalJournalEntryId,
    correlationId: input.correlationId ?? null,
  }, control)
}
`;
 }],
];
const prepared=edits.map(([file,expected,edit])=>{const target=path.join(root,file),before=fs.readFileSync(target);assert.equal(sha(before),expected);const text=before.toString('utf8'),newline=text.includes('\r\n')?'\r\n':'\n',after=Buffer.from(edit(text.replaceAll('\r\n','\n')).replaceAll('\n',newline));return{file,target,before,after};});
for(const item of prepared){assert.equal(sha(fs.readFileSync(item.target)),sha(item.before));fs.writeFileSync(item.target,item.after);assert.equal(sha(fs.readFileSync(item.target)),sha(item.after));}
console.log(JSON.stringify(prepared.map(item=>({file:item.file,before:sha(item.before),after:sha(item.after)}))));
