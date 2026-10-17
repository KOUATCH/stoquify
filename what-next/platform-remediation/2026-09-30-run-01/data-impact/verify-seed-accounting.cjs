// Evaluate ONLY the parsed seedAccountingEntries function and pure date/rounding
// helpers in a VM with capture-only Prisma delegates. Never import/run the seed.
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),crypto=require("node:crypto"),assert=require("node:assert/strict")
const ts=require("typescript")
const filename="prisma/comprehensive-seed.ts", source=fs.readFileSync(filename,"utf8")
const parsed=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true)
const fn=parsed.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==="seedAccountingEntries")
assert(fn,"seed function must be present")
const helpers=[]
for(const statement of parsed.statements) if(ts.isVariableStatement(statement)) {
  for(const declaration of statement.declarationList.declarations) if(["day","money","qty"].includes(declaration.name.getText(parsed))) helpers.push(`const ${declaration.getText(parsed)};`)
}
assert.equal(helpers.length,3)
const code=ts.transpileModule(`${helpers.join("\n")}\n${fn.getText(parsed)}\nseedAccountingEntries()`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
const delegates=["ledgerPostingBatch","journalEntry","journalEntryLine","accountingSourceLink","ledgerAuditEvent"]
async function capture(currency,indexes) {
  const writes={}
  const prisma=Object.fromEntries(delegates.map(name=>[name,{createMany:async({data})=>{writes[name]=data;return{count:data.length}}}]))
  const context=vm.createContext({prisma,seedIndexes:indexes,currentOrg:()=>({currency}),orgId:()=>"synthetic-org",
    id:(kind,index)=>`${kind}-${index}`,orgScopedNumber:(kind,index)=>`${kind}-${index}`,
    CAMEROON_STANDARD_VAT_RATE_MULTIPLIER:.1925,AccountingSourceType:{POS_SALE:"POS_SALE"},
    AccountingPostingPurpose:{SALE_COMPLETION:"SALE_COMPLETION"},LedgerPostingBatchStatus:{POSTED:"POSTED"},JournalEntryStatus:{POSTED:"POSTED"}})
  await new vm.Script(code,{filename:"isolated-capture-only-seed.js"}).runInContext(context,{timeout:3000})
  return writes
}
async function main() {
  const baseline=process.argv.includes("--baseline"), checks=[]
  const standard=await capture("XAF",Array.from({length:12},(_,index)=>index+1))
  let missingBase=0,before=0,after=0
  for(const entry of standard.journalEntry) {
    const month=Number(entry.periodId.split("-").at(-1))-1
    const start=new Date(Date.UTC(2026,month,1)),end=new Date(Date.UTC(2026,month+1,0,23,59,59,999))
    if(entry.entryDate<start)before++
    if(entry.entryDate>end)after++
  }
  for(const line of standard.journalEntryLine) if(line.baseDebit==null||line.baseCredit==null)missingBase++
  if(baseline) {
    assert.equal(missingBase,60);assert.equal(before,7);assert.equal(after,4)
    checks.push({name:"original producer reproduces observed two-organization aggregate fingerprint",passed:true,
      journalCount:standard.journalEntry.length*2,missingBaseLines:missingBase*2,beforePeriodStart:before*2,afterPeriodEnd:after*2})
  } else {
    for(const currency of ["XAF","EUR"]) {
      // May 31 -> June 1 verifies actual dates determine the selected month;
      // the dynamic currency case proves this fix does not hard-code XAF.
      const writes=await capture(currency,[1,12,31,32])
      for(const [index,entry] of writes.journalEntry.entries()) {
        assert.equal(entry.periodId,`accounting_period-${entry.entryDate.getUTCMonth()+1}`)
        assert.equal(writes.ledgerPostingBatch[index].periodId,entry.periodId)
        assert.equal(writes.accountingSourceLink[index].sourceDate.toISOString(),entry.entryDate.toISOString())
        assert.equal(entry.currency,currency)
        const lines=writes.journalEntryLine.filter(line=>line.journalEntryId===entry.id)
        assert.equal(lines.length,5)
        let debitCents=0,creditCents=0
        for(const line of lines) {
          assert.equal(line.currency,currency);assert.equal(line.exchangeRate,1)
          assert.equal(line.baseDebit,line.debit);assert.equal(line.baseCredit,line.credit)
          debitCents+=Math.round(line.baseDebit*100);creditCents+=Math.round(line.baseCredit*100)
        }
        assert.equal(debitCents,creditCents)
      }
      checks.push({name:`generated ${currency} base lines balance and journal/batch/source dates agree across month boundary`,passed:true,journals:4,lines:20})
    }
    assert.equal(missingBase,0);assert.equal(before,0);assert.equal(after,0)
    checks.push({name:"all normal seed journals have complete base amounts and containing periods",passed:true,journals:12,lines:60})
  }
  const report={generatedAt:new Date().toISOString(),status:"PASS",mode:baseline?"baseline":"corrected",source:filename,
    sourceSha256:crypto.createHash("sha256").update(source).digest("hex"),databaseAccess:false,seedModuleImported:false,checks}
  fs.writeFileSync(path.join(__dirname,baseline?"seed-producer-baseline.json":"seed-producer-verification.json"),JSON.stringify(report,null,2)+"\n")
  console.log(JSON.stringify(report,null,2))
}
main().catch(error=>{console.log(JSON.stringify({status:"FAILED",name:error.name,code:error.code||"SEED_CAPTURE_FAILED"}));process.exitCode=1})
