#!/usr/bin/env node
// Authorized local fixture correction: archive/remove only premature allocations
// on these 12 unposted drafts. Never manufacture approval, posting or payment proof.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { Prisma, PrismaClient } = require('@prisma/client')
const { validateTarget } = require('./repair-demo-journal-base-amounts.cjs')
const ORG = 'rds_org_001'
const DATABASE = 'stoquify_replay_next_20260830'
const VERSION = 'rds001-draft-ap-allocation-repair-v1'
const ACTION = 'DEMO_DRAFT_INVOICE_ALLOCATION_REPAIRED'
const pad = n => String(n).padStart(3, '0')
const ids = kind => Array.from({length:12}, (_,i)=>`${ORG}_${kind}_${pad(i+1)}`)
const INVOICES = ids('supplier_invoice'), PAYMENTS = ids('supplier_payment'), ALLOCATIONS = ids('supplier_payment_allocation')
const json = value => JSON.parse(JSON.stringify(value))
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const d = value => new Prisma.Decimal(value)
const noFields = (row, fields) => fields.forEach(field => assert.equal(row[field], null, `Unexpected ${field} on ${row.id}`))

function validateSnapshot(s) {
  assert.equal(s.invoices.length, 12)
  assert.equal(s.payments.length, 12)
  assert(s.allocations.length === 0 || s.allocations.length === 12, 'Partial allocation repair requires review')
  for (const name of ['ledger', 'journals', 'events', 'batches', 'fiscalDocuments', 'sourceLinks']) assert.equal(s[name].length, 0, `Retained ${name} requires review`)
  let invoiceTotal = d(0), plannedTotal = d(0)
  for (let i = 0; i < 12; i++) {
    const invoice = s.invoices[i], payment = s.payments[i], suffix = pad(i+1)
    assert.equal(invoice.id, INVOICES[i]); assert.equal(invoice.organizationId, ORG)
    assert.equal(invoice.invoiceNumber, `RDS001-INVOICENUMBER-${suffix}`)
    assert.equal(invoice.supplierId, `${ORG}_supplier_${suffix}`)
    assert.equal(invoice.status, 'DRAFT'); assert.equal(invoice.currency, 'XAF')
    assert(d(invoice.amountPaid).eq(0)); assert(d(invoice.total).gt(0))
    noFields(invoice, ['purchaseOrderId','approvedById','postedAt','postedBusinessEventId','ledgerPostingBatchId','documentHash','evidenceHash','cancelledAt','deletedAt','metadata'])
    assert.equal(invoice.supplierCreditNotes.length, 0)
    assert.equal(invoice.lines.length, 1)
    const line = invoice.lines[0]
    assert.equal(line.id, `${ORG}_supplier_invoice_line_${suffix}`)
    assert.equal(line.organizationId, ORG); assert.equal(line.supplierInvoiceId, invoice.id)
    noFields(line, ['goodsReceiptLineId','purchaseOrderLineId'])
    assert.equal(line.matchStatus, 'EXCEPTION')
    assert(d(line.quantity).mul(line.unitCost).eq(invoice.subtotal))
    assert(d(invoice.subtotal).plus(invoice.taxAmount).minus(invoice.discount).eq(invoice.total))
    assert(s.priorAudits.some(a => a.entityId === invoice.id && a.action === 'SYSTEMATIC_SEED_DRAFT_ARITHMETIC_REPAIRED'), 'Retained seed repair provenance required')
    assert.equal(payment.id, PAYMENTS[i]); assert.equal(payment.organizationId, ORG)
    assert.equal(payment.supplierId, invoice.supplierId); assert.equal(payment.currency, invoice.currency)
    assert.equal(payment.status, 'DRAFT'); assert(d(payment.amount).gt(0))
    noFields(payment, ['bankAccountId','approvedById','releasedById','approvedAt','releasedAt','postedBusinessEventId','ledgerPostingBatchId','documentHash','evidenceHash','deletedAt','metadata'])
    if (s.allocations.length) {
      const a = s.allocations[i]
      assert.equal(a.id, ALLOCATIONS[i]); assert.equal(a.organizationId, ORG)
      assert.equal(a.supplierInvoiceId, invoice.id); assert.equal(a.supplierPaymentId, payment.id)
      assert(d(a.amount).eq(payment.amount) && d(a.amount).lte(invoice.total))
      plannedTotal = plannedTotal.plus(a.amount)
    }
    invoiceTotal = invoiceTotal.plus(invoice.total)
  }
  return { invoiceCount: 12, allocationsToArchive: s.allocations.length, preservedDraftInvoiceTotal: invoiceTotal.toFixed(2), archivedDraftAllocationTotal: plannedTotal.toFixed(2), recognizedPayableAfterRepair: '0.00', currency: 'XAF' }
}

async function readSnapshot(tx) {
  const refs = [...INVOICES, ...PAYMENTS]
  const result = {
    invoices: await tx.supplierInvoice.findMany({ where:{id:{in:INVOICES}}, include:{lines:{orderBy:{id:'asc'}},supplierCreditNotes:true}, orderBy:{id:'asc'} }),
    payments: await tx.supplierPayment.findMany({where:{id:{in:PAYMENTS}},orderBy:{id:'asc'}}),
    // Include every allocation of the source payments as well as the invoices.
    allocations: await tx.supplierPaymentAllocation.findMany({where:{OR:[{supplierInvoiceId:{in:INVOICES}},{supplierPaymentId:{in:PAYMENTS}}]},orderBy:{id:'asc'}}),
    ledger: await tx.supplierLedgerEntry.findMany({where:{referenceId:{in:refs}},orderBy:{id:'asc'}}),
    journals: await tx.journalEntry.findMany({where:{sourceId:{in:refs}},orderBy:{id:'asc'}}),
    events: await tx.businessEvent.findMany({where:{sourceId:{in:refs}},orderBy:{id:'asc'}}),
    batches: await tx.ledgerPostingBatch.findMany({where:{sourceId:{in:refs}},orderBy:{id:'asc'}}),
    fiscalDocuments: await tx.fiscalDocument.findMany({where:{sourceId:{in:refs}},orderBy:{id:'asc'}}),
    sourceLinks: await tx.accountingSourceLink.findMany({where:{sourceId:{in:refs}},orderBy:{id:'asc'}}),
    priorAudits: await tx.auditLog.findMany({where:{organizationId:ORG,entityId:{in:refs},action:{not:ACTION}},orderBy:{id:'asc'}}),
    otherAllocations: await tx.$queryRaw`SELECT count(*)::int AS count, md5(COALESCE(string_agg(row_to_json(a)::text, '|' ORDER BY a.id), '')) AS hash FROM supplier_payment_allocations a WHERE a.id NOT IN (${Prisma.join(ALLOCATIONS)})`,
  }
  return json(result)
}

async function financials(tx, resolve) {
  const invoices = await tx.supplierInvoice.findMany({where:{id:{in:INVOICES},organizationId:ORG},include:{paymentAllocations:{include:{supplierPayment:true}},supplierCreditNotes:true}})
  const result = await resolve(tx, ORG, invoices, [], new Date(), 'XAF')
  return { unverified: result.unverifiedCount, currencyTotals: result.currencyTotals, states: invoices.map(i=>({id:i.id,...result.movements.get(`invoice:${i.id}`)})).sort((a,b)=>a.id.localeCompare(b.id)) }
}

async function main() {
  const args = process.argv.slice(2), mode = args[0] || '--dry-run'
  assert(['--dry-run','--rehearse','--apply'].includes(mode))
  assert(mode === '--dry-run' ? args.length <= 1 : args.length === 2 && /^[a-f0-9]{64}$/.test(args[1]), 'Reviewed snapshot hash required')
  require('@next/env').loadEnvConfig(process.cwd(), true, {info(){},error(){}})
  const raw = (process.env.DATABASE_URL || '').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g,(_,key)=>process.env[key]||'').replace(/^['"]|['"]$/g,'').trim()
  validateTarget(raw)
  require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'node'}})
  require('tsconfig-paths/register')
  const { resolveAPHistoryFinancials } = require('../services/purchasing/ap-history-financial')
  const db = new PrismaClient({datasources:{db:{url:raw}}})
  const directory = path.resolve('.codex-tmp', VERSION)
  fs.mkdirSync(directory,{recursive:true})
  const rollback = new Error('REHEARSAL_ROLLBACK')
  let report, beforeHash
  try {
    try {
      await db.$transaction(async tx => {
        if(mode === '--dry-run') await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
        const [connected] = await tx.$queryRawUnsafe('SELECT current_database() AS name')
        assert.equal(connected.name,DATABASE)
        if(mode !== '--dry-run') {
          await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'")
          await tx.$queryRaw`SELECT id FROM supplier_payments WHERE id IN (${Prisma.join(PAYMENTS)}) ORDER BY id FOR UPDATE`
          await tx.$queryRaw`SELECT id FROM supplier_invoices WHERE id IN (${Prisma.join(INVOICES)}) ORDER BY id FOR UPDATE`
          await tx.$queryRaw`SELECT id FROM supplier_payment_allocations WHERE "supplierPaymentId" IN (${Prisma.join(PAYMENTS)}) OR "supplierInvoiceId" IN (${Prisma.join(INVOICES)}) ORDER BY id FOR UPDATE`
        }
        const before = await readSnapshot(tx), plan = validateSnapshot(before)
        beforeHash = hash(before)
        const audits = await tx.auditLog.findMany({where:{organizationId:ORG,action:ACTION,entityId:{in:INVOICES}},orderBy:{entityId:'asc'}})
        report = { database:DATABASE, organizationId:ORG, mode, snapshotHash:beforeHash, ...plan, beforeFinancials:await financials(tx,resolveAPHistoryFinancials) }
        if(!plan.allocationsToArchive) {
          assert.equal(audits.length,12)
          assert(audits.every(a=>a.changes?.version===VERSION && a.changes?.before?.allocation && a.changes?.after?.allocation===null))
          assert.equal(report.beforeFinancials.unverified,0)
          report.outcome='ALREADY_REPAIRED'; return
        }
        assert.equal(audits.length,0)
        assert.equal(report.beforeFinancials.unverified,12)
        if(mode === '--dry-run') {
          const backup = path.join(directory,`${beforeHash}.before.json`)
          if(fs.existsSync(backup)) assert.deepEqual(JSON.parse(fs.readFileSync(backup,'utf8')),before)
          else fs.writeFileSync(backup,JSON.stringify(before,null,2),{flag:'wx'})
          report.outcome='PROPOSED'; return
        }
        assert.equal(beforeHash,args[1],'Source changed since reviewed dry run')
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory,`${beforeHash}.before.json`),'utf8')),before,'Backup mismatch')
        for(const [index, invoice] of before.invoices.entries()) {
          const allocation = before.allocations[index]
          // Archive every original field before detaching the invalid draft link.
          await tx.auditLog.create({data:{organizationId:ORG,entityType:'SupplierInvoice',entityId:invoice.id,action:ACTION,
            userAgent:'Codex local demo maintenance; explicitly authorized by workspace owner',
            changes:{version:VERSION,synthetic:true,snapshotHash:beforeHash,reason:'Seed allocated a draft payment to an unapproved draft invoice; payment requests require POSTED or PAYMENT_PENDING invoice evidence.',
              before:{invoice,allocation,payment:before.payments[index]},after:{invoice,allocation:null,payment:before.payments[index]},
              preserved:['invoice amounts and draft status','invoice lines and match exceptions','payment request and amounts','all unrelated allocations','prior audit history'],
              limitation:'No approval, recognition, payment, due date or ledger evidence was fabricated. Recreate allocations through the payment workflow after invoice approval/posting.'}}})
          const removed = await tx.supplierPaymentAllocation.deleteMany({where:{id:allocation.id,organizationId:ORG,supplierInvoiceId:invoice.id,supplierPaymentId:allocation.supplierPaymentId,amount:allocation.amount}})
          assert.equal(removed.count,1)
        }
        const after = await readSnapshot(tx)
        assert.deepEqual(after,{...before,allocations:[]},'Unexpected changes outside the 12 allocation links')
        report.afterFinancials = await financials(tx,resolveAPHistoryFinancials)
        assert.equal(report.afterFinancials.unverified,0)
        assert(report.afterFinancials.states.every(row=>row.state==='not_recognized'&&row.amount==='0.00'))
        assert.equal(report.afterFinancials.currencyTotals[0].openPayable,'0.00')
        assert.equal(await tx.auditLog.count({where:{organizationId:ORG,action:ACTION,entityId:{in:INVOICES}}}),12)
        report.afterHash=hash(after)
        report.outcome=mode==='--rehearse'?'ROLLED_BACK':'REPAIRED'
        if(mode==='--rehearse') throw rollback
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000})
    } catch(error) {if(error!==rollback) throw error}
    if(report.outcome==='ROLLED_BACK') {
      assert.equal(hash(await readSnapshot(db)),beforeHash)
      assert.equal(await db.auditLog.count({where:{organizationId:ORG,action:ACTION,entityId:{in:INVOICES}}}),0)
      report.rollbackVerified=true
    }
    fs.writeFileSync(path.join(directory,`${mode.slice(2)}-result.json`),JSON.stringify(report,null,2))
    console.log(JSON.stringify({...report,beforeFinancials:{...report.beforeFinancials,states:undefined},afterFinancials:report.afterFinancials?{...report.afterFinancials,states:undefined}:undefined},null,2))
  } finally {await db.$disconnect()}
}
module.exports={validateSnapshot}
if(require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1})
