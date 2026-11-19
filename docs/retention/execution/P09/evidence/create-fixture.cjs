// One-time synthetic fixture authoring. Writes only the named, new module fixture.
const fs = require('node:fs'), crypto = require('node:crypto')
const target = 'services/organization/__fixtures__/authorized-archive.v1.json'
const org = 'synthetic-org', at = '2026-10-18T00:00:00Z'
const row = (kind,id,data) => ({kind,id,organizationId:org,...data})
const money = amount => ({currency:'XAF',amount})
const files = {}
const groups = {
 'locations': [row('location','site-a',{name:'Synthetic main shop'}),row('location','site-b',{name:'Synthetic warehouse'})],
 'organization-settings': [row('settings','settings',{currency:'XAF',currencyScale:2,timezone:'Africa/Douala',locales:['fr','en']})],
 'roles-membership': [row('role','owner-role',{code:'OWNER',permissions:['fixture.review']}),row('role','cashier-role',{code:'CASHIER',permissions:['fixture.sale']}),row('principal','owner',{roleId:'owner-role',locationIds:['site-a','site-b']}),row('principal','cashier',{roleId:'cashier-role',locationIds:['site-a']})],
 'item-unit-tax-codes': [row('item','item-a',{sku:'SYNTHETIC-001',nameEn:'Fixture item',nameFr:'Article fictif',unitCode:'EACH',quantityScale:0})],
 'customer-supplier-masters': [row('party','customer-a',{partyType:'customer',name:'Synthetic customer',contact:{email:'synthetic@example.invalid'}}),row('party','supplier-a',{partyType:'supplier',name:'Synthetic supplier'})],
 'attachments': [row('evidence','receipt-evidence',{attachmentPath:'attachments/receipt.txt',description:'Synthetic sale receipt'}),row('evidence','purchase-evidence',{attachmentPath:'attachments/receipt-of-goods.txt',description:'Synthetic receipt of goods'})],
 'sales-returns-shifts': [row('transaction','sale-a',{transactionType:'sale',partyId:'customer-a',itemId:'item-a',locationId:'site-a',actorId:'cashier',evidenceIds:['receipt-evidence'],quantity:'1',unitCode:'EACH',total:money('1250.00'),effectiveAt:at,recordedAt:at,sourceModel:'SalesOrder',sourceId:'source-sale-a'})],
 'purchasing-ap': [row('transaction','purchase-a',{transactionType:'purchase',partyId:'supplier-a',itemId:'item-a',locationId:'site-a',actorId:'owner',evidenceIds:['purchase-evidence'],quantity:'2',unitCode:'EACH',total:money('800.00'),effectiveAt:at,recordedAt:at,sourceModel:'PurchaseOrder',sourceId:'source-purchase-a'})],
 'journals-source-links': [row('posting','sale-debit',{transactionId:'sale-a',accountCode:'FIXTURE-CASH',debit:money('1250.00'),credit:money('0')}),row('posting','sale-credit',{transactionId:'sale-a',accountCode:'FIXTURE-SALES',debit:money('0'),credit:money('1250.00')}),row('posting','purchase-debit',{transactionId:'purchase-a',accountCode:'FIXTURE-STOCK',debit:money('800.00'),credit:money('0')}),row('posting','purchase-credit',{transactionId:'purchase-a',accountCode:'FIXTURE-AP',debit:money('0'),credit:money('800.00')})],
 'audit-approvals': [row('approval','review-sale',{transactionId:'sale-a',reviewerId:'owner',evidenceId:'receipt-evidence',decision:'approved',recordedAt:at})],
 'opening-closing-positions': [row('stock-position','position-a',{itemId:'item-a',locationId:'site-a',unitCode:'EACH',opening:'5',movement:'1',closing:'6'}),row('stock-position','position-b',{itemId:'item-a',locationId:'site-b',unitCode:'EACH',opening:'7',movement:'0',closing:'7'})],
}
for(const [category,rows] of Object.entries(groups)) files[`records/${category}.json`]=JSON.stringify(rows,null,2)+'\n'
files['attachments/receipt.txt']='SYNTHETIC ONLY: sale-a, 1 EACH, XAF 1250.00\n'
files['attachments/receipt-of-goods.txt']='SYNTHETIC ONLY: purchase-a, 2 EACH, XAF 800.00\n'
const categories=['organization-settings','roles-membership','locations','item-unit-tax-codes','customer-supplier-masters','opening-closing-positions','sales-returns-shifts','stock-receiving-transfers','purchasing-ap','payments-reconciliation-ar','journals-source-links','close-review-comments','audit-approvals','attachments','import-provenance','offline-pending','analytics-reports','commercial-lifecycle','payroll','credentials']
const hash = content=>'sha256:'+crypto.createHash('sha256').update(content,'utf8').digest('hex')
const manifest = {
 schemaVersion:'stoquify.authorized-archive/1-draft',profile:'p09-synthetic-retail',archiveId:'p09-fixture-v1',organizationId:org,generatedAt:at,
 source:{revision:'p09-hand-authored-fixture-v1',snapshotId:'synthetic-snapshot-1',basis:'synthetic-fixture'},
 authority:{ownerId:'owner',decisionId:'synthetic-owner-decision',policyVersion:'p09-proposed-v1',sensitiveScopes:['party.contact']},completeness:'partial',
 coverage:categories.map(category=>({category,status:groups[category]?'included':['payroll','credentials'].includes(category)?'excluded':'blocked',reason:groups[category]?'Only the bounded synthetic DTO rows listed in this file; no full domain completeness claim.':category==='credentials'?'Passwords, authentication/session/provider/receipt tokens and encryption keys never travel.':category==='payroll'?'Outside P01 pilot.':'No DTO/runtime extraction or complete evidence for this category in P09; P16 mapping required.',owner:'Data/export engineer'})),
 files:Object.entries(files).map(([path,content])=>({path,category:path.startsWith('attachments/')?'attachments':path.slice(8,-5),mediaType:path.startsWith('attachments/')?'text/plain':'application/json',byteLength:Buffer.byteLength(content),sha256:hash(content),recordCount:path.startsWith('attachments/')?0:JSON.parse(content).length})),
 controls:{recordCount:Object.values(groups).flat().length,transactionTotals:[money('2050.00')],debitTotals:[money('2050.00')],creditTotals:[money('2050.00')]},
}
fs.mkdirSync('services/organization/__fixtures__',{recursive:true})
fs.writeFileSync(target,JSON.stringify({manifest,files},null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify({target,records:manifest.controls.recordCount,files:manifest.files.length}))
