import { createHash } from "node:crypto"
import fixture from "../__fixtures__/authorized-archive.v1.json"
import { validateAuthorizedArchive } from "../authorized-archive-contract"

const expected = { organizationId: "synthetic-org", ownerId: "owner", decisionId: "synthetic-owner-decision", sensitiveScopes: ["party.contact"] }
const clone = () => JSON.parse(JSON.stringify(fixture)) as typeof fixture
const bytes = (f: typeof fixture) => new Map(Object.entries(f.files).map(([path,content])=>[path,Buffer.from(content,"utf8")]))
const validate = (f: typeof fixture, scope = expected) => validateAuthorizedArchive(f.manifest,bytes(f),scope)
const hash = (content: string) => `sha256:${createHash("sha256").update(content,"utf8").digest("hex")}`

// Negative cases may reseal bytes/counts. Relational/financial checks must still catch loss.
function edit(f: typeof fixture, name: keyof typeof fixture.files, change: (rows: any[])=>any[]) {
  const rows = change(JSON.parse(f.files[name]))
  f.files[name] = JSON.stringify(rows) + "\n"
  const entry = f.manifest.files.find(e=>e.path===name)!
  entry.sha256=hash(f.files[name]); entry.byteLength=Buffer.byteLength(f.files[name]); entry.recordCount=rows.length
}

it("accepts the exact bounded synthetic archive, never a complete tenant export",()=>{
  const result=validate(clone())
  expect(result.errors).toEqual([]); expect(result.valid).toBe(true); expect(result.records).toHaveLength(21)
  expect(fixture.manifest.completeness).toBe("partial")
})

it("independent reader reconstructs original IDs, attachments, two sites, positions and currency totals",()=>{
  // Deliberately does not call production validator, schema, hash or decimal helpers.
  const rows: any[]=[]
  for(const descriptor of fixture.manifest.files) {
    const content = fixture.files[descriptor.path as keyof typeof fixture.files]
    expect(Buffer.byteLength(content)).toBe(descriptor.byteLength)
    expect(`sha256:${createHash("sha256").update(content).digest("hex")}`).toBe(descriptor.sha256)
    if(descriptor.path.startsWith("records/")) rows.push(...JSON.parse(content))
  }
  const byId = new Map(rows.map(r=>[r.id,r]))
  expect(rows).toHaveLength(21); expect(byId.size).toBe(21)
  const sale=byId.get("sale-a"),purchase=byId.get("purchase-a")
  expect([sale.sourceId,purchase.sourceId]).toEqual(["source-sale-a","source-purchase-a"])
  expect(byId.get(sale.actorId).locationIds).toContain(sale.locationId)
  expect(byId.get(sale.partyId).contact.email).toBe("synthetic@example.invalid")
  for(const t of [sale,purchase]) for(const evidenceId of t.evidenceIds) {
    const attachment=fixture.files[byId.get(evidenceId).attachmentPath as keyof typeof fixture.files]
    expect(attachment).toContain(t.id)
  }
  const cents = (v: string) => { const [a,b=""] = v.split("."); return BigInt(a)*BigInt(100)+BigInt(b.padEnd(2,"0")) }
  expect(cents(sale.total.amount)).toBe(BigInt(125000))
  expect(cents(purchase.total.amount)).toBe(BigInt(80000))
  const postings=rows.filter(r=>r.kind==="posting")
  const debit=postings.reduce((s,r)=>s+cents(r.debit.amount),BigInt(0))
  const credit=postings.reduce((s,r)=>s+cents(r.credit.amount),BigInt(0))
  expect(debit).toBe(BigInt(205000)); expect(credit).toBe(BigInt(205000))
  expect(BigInt(byId.get("position-a").opening)+BigInt(purchase.quantity)-BigInt(sale.quantity)).toBe(BigInt(6))
  expect(byId.get("position-a").closing).toBe("6"); expect(byId.get("position-b").closing).toBe("7")
  expect(byId.get("review-sale").reviewerId).toBe("owner")
})

it.each([
  ["file hash", "FILE_HASH", (f:any)=>{ f.files['attachments/receipt.txt']=f.files['attachments/receipt.txt'].replace('1250','1251') }],
  ["byte count", "BYTE_COUNT", (f:any)=>{ f.manifest.files[0].byteLength++ }],
  ["row count", "RECORD_COUNT", (f:any)=>{ f.manifest.files[0].recordCount++ }],
  ["total count", "TOTAL_RECORD_COUNT", (f:any)=>{ f.manifest.controls.recordCount++ }],
  ["declared total", "MONETARY_TOTAL", (f:any)=>{ f.manifest.controls.transactionTotals[0].amount='0' }],
  ["missing bytes", "MISSING_FILE", (f:any)=>{ delete f.files['attachments/receipt.txt'] }],
  ["unlisted file", "UNDECLARED_FILE", (f:any)=>{ f.files['attachments/extra.txt']='unexpected' }],
  ["duplicate path", "DUPLICATE_PATH", (f:any)=>{ f.manifest.files.push(f.manifest.files[0]) }],
  ["missing category", "COVERAGE_MISSING_OR_DUPLICATE", (f:any)=>{ f.manifest.coverage.pop() }],
  ["duplicate category", "COVERAGE_MISSING_OR_DUPLICATE", (f:any)=>{ f.manifest.coverage.push(f.manifest.coverage[0]) }],
  ["false completeness", "FALSE_COMPLETENESS", (f:any)=>{ f.manifest.completeness='declared-scope-complete' }],
  ["credentials included", "CREDENTIALS_NOT_EXCLUDED", (f:any)=>{ f.manifest.coverage.find((r:any)=>r.category==='credentials').status='included' }],
  ["authority substituted", "AUTHORITY_MISMATCH", (f:any)=>{ f.manifest.authority.ownerId='intruder' }],
  ["manifest credential", "MANIFEST_SCHEMA", (f:any)=>{ f.manifest.accessToken='synthetic-forbidden' }],
  ["unknown version", "MANIFEST_SCHEMA", (f:any)=>{ f.manifest.schemaVersion='2' }],
  ["traversal", "MANIFEST_SCHEMA", (f:any)=>{ f.manifest.files[0].path='records/../secret.json' }],
  ["drive path", "MANIFEST_SCHEMA", (f:any)=>{ f.manifest.files[0].path='C:/secret.json' }],
  ["Windows reserved path", "MANIFEST_SCHEMA", (f:any)=>{ f.manifest.files[0].path='records/con.json' }],
  ["remote path", "MANIFEST_SCHEMA", (f:any)=>{ f.manifest.files[0].path='https://example.invalid/file' }],
  ["numeric money", "MANIFEST_SCHEMA", (f:any)=>{ f.manifest.controls.debitTotals[0].amount=2050 }],
  ["duplicate currency", "TOTAL_CURRENCIES", (f:any)=>{ f.manifest.controls.debitTotals.push(f.manifest.controls.debitTotals[0]) }],
  ["invented included category", "INCLUDED_CATEGORY_WITHOUT_FILE", (f:any)=>{ f.manifest.coverage.find((r:any)=>r.category==='offline-pending').status='included' }],
  ["attachment media type", "ATTACHMENT_DESCRIPTOR", (f:any)=>{ f.manifest.files.find((r:any)=>r.path==='attachments/receipt.txt').mediaType='image/png' }],
] as const)("rejects %s",(_name,code,change)=>{
  const f=clone(); change(f); expect(validate(f).errors).toContain(code)
})

it("detects omitted referenced evidence even when file hash and all counts are recomputed",()=>{
  const f=clone(); edit(f,"records/attachments.json",rows=>rows.filter(r=>r.id!=="receipt-evidence")); f.manifest.controls.recordCount--
  expect(validate(f).errors).toContain("MISSING_OR_WRONG_LINK")
})
it("detects omitted referenced attachment even when descriptor and bytes are both removed",()=>{
  const f=clone(); f.manifest.files=f.manifest.files.filter(e=>e.path!=="attachments/receipt.txt"); delete (f.files as any)['attachments/receipt.txt']
  expect(validate(f).errors).toContain("MISSING_REFERENCED_ATTACHMENT")
})
it.each(["password","accessToken","refreshToken","encryptionKey","providerPayload","bankAccount"])("rejects unauthorized record field %s after resealing",key=>{
  const f=clone(); edit(f,"records/customer-supplier-masters.json",rows=>rows.map(r=>({...r,[key]:"synthetic-forbidden"})))
  expect(validate(f).errors).toContain("RECORD_SCHEMA")
})
it("requires externally approved sensitive scope, not self-authorization in a manifest",()=>{
  const f=clone(), result=validate(f,{...expected,sensitiveScopes:[]})
  expect(result.errors).toEqual(expect.arrayContaining(["UNAUTHORIZED_SCOPE","UNAUTHORIZED_FIELD"]))
  expect(result.records).toEqual([])
})
it("rejects contact omitted from declared scope even when the caller allows it",()=>{
  const f=clone(); f.manifest.authority.sensitiveScopes=[]
  expect(validate(f).errors).toContain("UNAUTHORIZED_FIELD")
})
it.each([
  ["foreign tenant", "FOREIGN_TENANT", "records/locations.json",(rows:any[])=>rows.map(r=>({...r,organizationId:'other'}))],
  ["wrong link kind", "MISSING_OR_WRONG_LINK", "records/sales-returns-shifts.json",(rows:any[])=>rows.map(r=>({...r,evidenceIds:['item-a']}))],
  ["removed mandatory evidence", "RECORD_SCHEMA", "records/sales-returns-shifts.json",(rows:any[])=>rows.map(r=>({...r,evidenceIds:[]}))],
  ["duplicate IDs", "DUPLICATE_ID", "records/locations.json",(rows:any[])=>[rows[0],rows[0]]],
  ["unbalanced journal", "TRANSACTION_TIE_OUT", "records/journals-source-links.json",(rows:any[])=>rows.map((r,i)=>i===0?{...r,debit:{currency:'XAF',amount:'1251'}}:r)],
  ["broken position", "POSITION_TIE_OUT", "records/opening-closing-positions.json",(rows:any[])=>rows.map(r=>({...r,closing:'999'}))],
  ["unit mismatch", "UNIT_MISMATCH", "records/sales-returns-shifts.json",(rows:any[])=>rows.map(r=>({...r,unitCode:'CASE'}))],
  ["negative transaction quantity", "RECORD_SCHEMA", "records/sales-returns-shifts.json",(rows:any[])=>rows.map(r=>({...r,quantity:'-1'}))],
  ["resealed stock arithmetic without transaction support", "STOCK_MOVEMENT_TIE_OUT", "records/opening-closing-positions.json",(rows:any[])=>rows.map(r=>({...r,opening:'0',movement:'99',closing:'99'}))],
  ["currency mismatch", "CURRENCY_MISMATCH", "records/journals-source-links.json",(rows:any[])=>rows.map(r=>({...r,debit:{...r.debit,currency:'EUR'}}))],
] as const)("detects resealed %s",(_name,code,file,change)=>{
  const f=clone(); edit(f,file,change); expect(validate(f).errors).toContain(code)
})

it("retains monetary precision beyond the JS safe integer range",()=>{
  const f=clone(), large='9007199254740993.25'
  edit(f,'records/sales-returns-shifts.json',rows=>rows.map(r=>({...r,total:{...r.total,amount:large}})))
  edit(f,'records/journals-source-links.json',rows=>rows.map(r=>r.id==='sale-debit'?{...r,debit:{...r.debit,amount:large}}:r.id==='sale-credit'?{...r,credit:{...r.credit,amount:large}}:r))
  for(const group of Object.values(f.manifest.controls).filter(Array.isArray)) group[0].amount='9007199254741793.25'
  expect(validate(f).errors).toEqual([])
})

it("does not treat an absent currency total as zero",()=>{
  const f=clone()
  edit(f,'records/sales-returns-shifts.json',rows=>rows.map(r=>({...r,total:{currency:'XAF',amount:'0'}})))
  edit(f,'records/purchasing-ap.json',rows=>rows.map(r=>({...r,total:{currency:'XAF',amount:'0'}})))
  edit(f,'records/journals-source-links.json',rows=>rows.map(r=>({...r,debit:{currency:'XAF',amount:'0'},credit:{currency:'XAF',amount:'0'}})))
  for(const group of Object.values(f.manifest.controls).filter(Array.isArray)) { group[0].currency='EUR'; group[0].amount='0' }
  expect(validate(f).errors).toContain('TOTAL_CURRENCIES')
})
