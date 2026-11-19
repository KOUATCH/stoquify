/** Synthetic, isolated dataset. Controlled records are produced by real services. */
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { db } from './db';
import { hashPassword, verifyPassword } from '../lib/password';
import { systematicRoleDefinitions } from './systematic-reseed-reference-data';
import { createFiscalYearWithPeriods } from '../services/accounting/periods.service';
import { ensureAccountingSettings } from '../services/accounting/accounting-settings.service';
import { createChartAccount } from '../services/accounting/accounts.service';
import { ensureDefaultJournals, createManualJournalEntry } from '../services/accounting/journals.service';
import { postJournalEntry } from '../services/accounting/posting.service';
import { DEFAULT_POSTING_RULES } from '../services/accounting/default-posting-rules';
import { createPostingRule, updatePostingRule } from '../services/accounting/posting-rules.service';
import { upsertHrisEmployeeProfile } from '../services/hris/employee.service';
import { createPayrollContract } from '../services/payroll/contract.service';

const OUT = path.resolve('docs/engineering/database/disposable-dataset-2026-10-28');
const PRIVATE = path.resolve('.seed-artifacts/disposable-dataset-2026-10-28');
const REF = '2026-10-28';
const orgs = [
  { id: 'synth12_douala', name: 'Wouri Distribution — Synthetic', city: 'Douala', industry: 'Wholesale and retail', locale: 'FR' },
  { id: 'synth12_yaounde', name: 'Mfoundi Office Supplies — Synthetic', city: 'Yaoundé', industry: 'Office supplies', locale: 'EN' },
  { id: 'synth12_bafoussam', name: 'Hauts Plateaux Commerce — Synthetic', city: 'Bafoussam', industry: 'General trade', locale: 'FR' },
];
const products = [
  ['Rice 25 kg', 'Riz 25 kg', 14000, 17500], ['Cooking oil 5 L', 'Huile végétale 5 L', 5200, 6800],
  ['Soap, carton of 24', 'Savon, carton de 24', 7200, 9600], ['Drinking water 1.5 L', 'Eau potable 1,5 L', 250, 400],
  ['A4 paper 500 sheets', 'Papier A4 500 feuilles', 2200, 3000], ['Blue pen, box of 50', 'Stylo bleu, boîte de 50', 1800, 2500],
  ['Ledger notebook', 'Cahier comptable', 1000, 1600], ['Document folder', 'Chemise à documents', 180, 300],
  ['Laundry detergent 1 kg', 'Lessive 1 kg', 1200, 1750], ['Sugar 1 kg', 'Sucre 1 kg', 650, 850],
  ['Coffee 250 g', 'Café 250 g', 1100, 1500], ['Tea, box of 25', 'Thé, boîte de 25', 900, 1300],
] as const;
const firstNames = ['Aline', 'Boris', 'Clémence', 'Daniel', 'Estelle', 'Fabrice', 'Grace', 'Hervé', 'Irène', 'Jean', 'Karine', 'Luc'];
const lastNames = ['Njoya', 'Mballa', 'Fotso', 'Ewane', 'Ngono', 'Tchoumi'];
const credentialsPath = path.join(PRIVATE, 'credentials.json');
type Credential = { organizationId: string; userId: string; role: string; email: string; password: string };
const credentials: Credential[] = existsSync(credentialsPath) ? JSON.parse(readFileSync(credentialsPath, 'utf8')) : [];
const report: { phases: unknown[]; issues: Array<{ phase: string; organizationId?: string; message: string }>; scenarios: unknown[] } = { phases: [], issues: [], scenarios: [] };
const save = () => writeFileSync(path.join(OUT, 'seed-results.json'), JSON.stringify(report, null, 2) + '\n');
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const when = (month: number, day = 10) => new Date(Date.UTC(2025, 10 + month, day, 10));
const roles = ['owner', 'maker', 'checker', 'accountant', 'payroll_administrator', 'payroll_approver', 'manager', 'cashier', 'inventory_controller', 'employee_self_service', 'auditor'];

async function phase(name: string, organizationId: string | undefined, action: () => Promise<unknown>) {
  console.log('Phase:', name, organizationId || 'dataset');
  try { const value = await action(); report.phases.push({ name, organizationId, status: 'passed', result: value }); }
  catch (error) { report.issues.push({ phase: name, organizationId, message: error instanceof Error ? error.message : String(error) }); save(); throw error; }
  save();
}

async function reference(org: typeof orgs[number]) {
  const organizationId = org.id;
  await db.organization.upsert({ where: { id: organizationId }, update: {}, create: {
    id: organizationId, name: org.name, slug: organizationId, country: 'Cameroon', countryCode: 'CM', currency: 'XAF', timezone: 'Africa/Douala', defaultLocale: org.locale as 'EN' | 'FR', industry: org.industry,
    address: `${org.city}, Cameroon — synthetic address`, requestedModules: ['inventory', 'sales', 'pos', 'purchasing', 'accounting', 'finance', 'payroll', 'compliance', 'reports', 'analytics', 'payment_reconciliation', 'close_assurance'],
  } });
  for (let branch = 0; branch < 3; branch++) await db.location.upsert({ where: { id: `${organizationId}_loc_${branch}` }, update: {}, create: {
    id: `${organizationId}_loc_${branch}`, organizationId, name: `${org.city} ${['Central store', 'Neighbourhood store', 'Warehouse'][branch]}`, code: ['CENTRAL','ANNEX','DEPOT'][branch], type: branch === 2 ? 'WAREHOUSE' : 'STORE', isDefault: branch === 0,
  } });
  const definitions = systematicRoleDefinitions();
  for (const [i, roleCode] of roles.entries()) {
    const definition = definitions.find(r => r.code === roleCode);
    if (!definition) throw new Error('Missing role definition ' + roleCode);
    const roleId = `${organizationId}_role_${roleCode}`, userId = `${organizationId}_user_${roleCode}`;
    const permissions = [...new Set([...definition.permissions, ...(roleCode === 'checker' ? ['purchasing.ap.invoice.post','purchasing.supplier.bank.approve'] : []), ...(roleCode === 'accountant' ? ['purchasing.ap.payment.release'] : []), ...(roleCode === 'manager' ? ['payments.reconciliation.read','payments.reconciliation.exception.resolve','payments.reconciliation.sign','accounting.journal.read'] : []), ...(roleCode === 'payroll_approver' ? ['hris.people.manage','hris.people.read','payroll.contracts.manage'] : [])])];
    await db.role.upsert({ where: { id: roleId }, update: { permissions }, create: { id: roleId, organizationId, code: roleCode, nameEn: definition.nameEn, permissions } });
    let credential = credentials.find(c => c.userId === userId);
    if (!credential) {
      if (await db.user.findUnique({ where: { id: userId } })) throw new Error('Existing identity has no retained credential; refusing replacement');
      credential = { organizationId, userId, role: roleCode, email: `${roleCode}@${organizationId.replace('_','-')}.example.test`, password: `Synthetic!${randomBytes(22).toString('base64url')}9a` };
      credentials.push(credential); writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600 });
    }
    if (!await db.user.findUnique({ where: { id: userId } })) {
      const hashed = await hashPassword(credential.password);
      await db.user.create({ data: { id: userId, organizationId, email: credential.email, name: `${firstNames[i]} ${lastNames[i % lastNames.length]}`, firstName: firstNames[i], lastName: lastNames[i % lastNames.length], password: hashed, emailVerified: true, isVerified: true, preferredLocale: org.locale as 'EN'|'FR', mfaBackupCodes: [], roles: { connect: { id: roleId } }, accounts: { create: { id: `${userId}_credential`, providerId: 'credential', accountId: userId, password: hashed } } } });
    }
    const account = await db.account.findFirstOrThrow({ where: { userId, providerId: 'credential' } });
    if (!await verifyPassword(credential.password, account.password)) throw new Error('Retained credential verification failed');
  }
  const unit = await db.unit.upsert({ where: { id: `${organizationId}_unit` }, update: {}, create: { id: `${organizationId}_unit`, organizationId, nameEn: 'Retail unit', nameFr: 'Unité de vente', symbol: 'unit', type: 'QUANTITY' } });
  for (const [i, product] of products.entries()) {
    const id = `${organizationId}_item_${i}`;
    await db.item.upsert({ where: { id }, update: {}, create: { id, organizationId, nameEn: product[0], nameFr: product[1], sku: `SYN-${i.toString().padStart(3,'0')}`, slug: `product-${i}`, imageUrls: [], costPrice: product[2], sellingPrice: product[3], unitId: unit.id, trackInventory: true } });
    for (let branch = 0; branch < 3; branch++) await db.inventoryLevel.upsert({ where: { itemId_locationId: { itemId: id, locationId: `${organizationId}_loc_${branch}` } }, update: {}, create: { itemId: id, locationId: `${organizationId}_loc_${branch}`, quantityOnHand: 0, quantityAvailable: 0, quantityReserved: 0, averageCost: 0, totalValue: 0 } });
  }
  for (let i = 0; i < 12; i++) {
    await db.customer.upsert({ where: { id: `${organizationId}_customer_${i}` }, update: {}, create: { id: `${organizationId}_customer_${i}`, organizationId, name: `${firstNames[i]} ${lastNames[i % 6]}`, code: `CLIENT-${i+1}`, email: `client${i+1}@${organizationId}.example.test`, creditLimit: 250000 } });
    if (i < 6) await db.supplier.upsert({ where: { id: `${organizationId}_supplier_${i}` }, update: {}, create: { id: `${organizationId}_supplier_${i}`, organizationId, name: ['Littoral Food Cooperative','Central Paper Trading','Plateaux Household Goods','Wouri Beverage Supply','Mfoundi Stationery','Regional Grocery Supply'][i] + ' (Synthetic)', code: `FOURN-${i+1}`, email: `supplier${i+1}@${organizationId}.example.test` } });
  }
  return { locations: 3, products: products.length, customers: 12, suppliers: 6, personas: roles.length };
}

const accounts = [
  ['571100','Cash on hand','Caisse','ASSET','DEBIT','CASH_ON_HAND'], ['521100','Bank','Banque','ASSET','DEBIT','BANK'],
  ['411100','Customer receivables','Clients','ASSET','DEBIT','ACCOUNTS_RECEIVABLE'], ['401100','Supplier payables','Fournisseurs','LIABILITY','CREDIT','ACCOUNTS_PAYABLE'],
  ['408100','Goods received not invoiced','Fournisseurs, factures non parvenues','LIABILITY','CREDIT','GRNI'], ['311100','Merchandise stock','Marchandises','ASSET','DEBIT','INVENTORY'],
  ['701100','Merchandise sales','Ventes de marchandises','REVENUE','CREDIT','SALES_REVENUE'], ['601100','Cost of merchandise sold','Coût des marchandises vendues','EXPENSE','DEBIT','COGS'],
  ['443100','Output VAT','TVA facturée','LIABILITY','CREDIT','OUTPUT_VAT'], ['445100','Input VAT','TVA récupérable','ASSET','DEBIT','INPUT_VAT'],
  ['603100','Inventory variance','Variation de stock','EXPENSE','DEBIT','INVENTORY_VARIANCE'], ['101100','Owner capital','Capital','EQUITY','CREDIT','OWNER_CAPITAL'],
  ['622100','Office rent','Loyers','EXPENSE','DEBIT','RENT'], ['605100','Utilities','Eau et électricité','EXPENSE','DEBIT','UTILITIES'],
  ['661100','Gross wages','Salaires','EXPENSE','DEBIT','PAYROLL_GROSS_EXPENSE'], ['664100','Employer contributions','Charges sociales','EXPENSE','DEBIT','PAYROLL_EMPLOYER_CHARGE_EXPENSE'],
  ['422100','Net wages payable','Rémunérations dues','LIABILITY','CREDIT','NET_PAY_PAYABLE'], ['447100','Payroll deductions payable','Retenues salariales','LIABILITY','CREDIT','PAYROLL_WITHHOLDING_PAYABLE'], ['431100','Social contributions payable','Cotisations sociales','LIABILITY','CREDIT','SOCIAL_CONTRIBUTIONS_PAYABLE'],
  ['511100','Card settlement clearing','Encaissements carte','ASSET','DEBIT','CARD_CLEARING'], ['552100','Mobile money clearing','Monnaie mobile','ASSET','DEBIT','MOBILE_MONEY_CLEARING'], ['513100','Cheques awaiting clearance','Chèques à encaisser','ASSET','DEBIT','CHEQUE_CLEARING'],
  ['419100','Customer credits','Avoirs clients','LIABILITY','CREDIT','STORE_CREDIT_LIABILITY'], ['409100','Supplier return claims','Créances retours fournisseurs','ASSET','DEBIT','SUPPLIER_RETURN_CLAIM'], ['421100','Employee advances','Avances au personnel','ASSET','DEBIT','EMPLOYEE_RECEIVABLES'], ['422200','Employee settlements payable','Dettes envers le personnel','LIABILITY','CREDIT','EMPLOYEE_PAYABLES'],
] as const;

async function accounting(org: typeof orgs[number]) {
  const organizationId = org.id, actorId = `${org.id}_user_owner`;
  await ensureAccountingSettings(organizationId, actorId);
  // Explicit synthetic employer classification, not statutory approval evidence.
  await db.organizationAccountingSettings.update({ where:{organizationId}, data:{payrollCnpsFamilyAllowanceSector:'GENERAL',payrollCnpsOccupationalRiskGroup:'A'} });
  for (const year of [2025, 2026]) if (!await db.fiscalYear.findFirst({ where: { organizationId, name: String(year) } })) await createFiscalYearWithPeriods(organizationId, { name: String(year), startDate: new Date(Date.UTC(year,0,1)), endDate: new Date(Date.UTC(year,11,31)), createMonthlyPeriods: true }, actorId);
  for (const [code,nameEn,nameFr,type,normalBalance,mappingKey] of accounts) if (!await db.chartOfAccount.findUnique({ where: { organizationId_code: { organizationId, code } } })) await createChartAccount(organizationId, { code,nameEn,nameFr,type,normalBalance,mappingKey,currency:'XAF',syscohadaClass:code[0] }, actorId);
  await ensureDefaultJournals(organizationId, actorId);
  const mapped = await db.chartOfAccount.findMany({ where: { organizationId } });
  const installed: string[] = [], pending: string[] = [];
  for (const rule of DEFAULT_POSTING_RULES) {
    if (rule.lines.some(l => !mapped.some(a => a.mappingKey === l.mappingKey))) { pending.push(rule.code); continue; }
    const existing=await db.postingRule.findFirst({where:{organizationId,code:rule.code},include:{lines:true}});
    const input={code:rule.code,nameEn:rule.nameEn,nameFr:rule.nameFr,sourceType:rule.sourceType,postingPurpose:rule.postingPurpose,priority:rule.priority,lines:rule.lines.map(l=>({lineNumber:l.lineNumber,side:l.side,amountSource:l.amountSource,mappingKey:l.mappingKey,description:l.description,condition:l.condition||undefined}))};
    if(!existing)await createPostingRule(organizationId,input,actorId);
    else if(existing.lines.some(l=>l.accountId&&l.mappingKey))await updatePostingRule(organizationId,existing.id,input,actorId);
    installed.push(rule.code);
  }
  const receiptRuleId = `${organizationId}_rule_RECEIPT`;
  await db.postingRule.upsert({ where:{id:receiptRuleId},update:{},create:{id:receiptRuleId,organizationId,code:'SYNTHETIC-GOODS-RECEIPT',nameEn:'Received merchandise accrual',nameFr:'Stock reçu et factures non parvenues',sourceType:'GOODS_RECEIPT',postingPurpose:'GOODS_RECEIPT',lines:{create:[
    {organizationId,lineNumber:1,side:'DEBIT',amountSource:'COST_AMOUNT',accountId:mapped.find(a=>a.mappingKey==='INVENTORY')!.id},
    {organizationId,lineNumber:2,side:'CREDIT',amountSource:'COST_AMOUNT',accountId:mapped.find(a=>a.mappingKey==='GRNI')!.id},
  ]}}});
  return { accounts: mapped.length, installedPostingRules: installed, pendingPostingRules: pending };
}

async function people(org: typeof orgs[number]) {
  const control = { organizationId: org.id, actorId: `${org.id}_user_payroll_administrator`, actorPermissions: systematicRoleDefinitions().find(r => r.code === 'payroll_administrator')!.permissions };
  for (let i = 0; i < 12; i++) {
    const employeeNumber = `EMP-${(i+1).toString().padStart(3,'0')}`;
    let employee = await db.payrollEmployee.findUnique({ where: { organizationId_employeeNumber: { organizationId: org.id, employeeNumber } } });
    if (!employee) employee = (await upsertHrisEmployeeProfile({ ...control, createOnly:true, employeeNumber, displayName:`${firstNames[i]} ${lastNames[i%6]}`, legalName:`${firstNames[i]} ${lastNames[i%6]}`, hireDate:when(0,1), countryCode:'CM', locationId:`${org.id}_loc_${i%3}`, department:i<6?'Retail':'Operations', jobTitle:i<6?'Sales associate':'Warehouse associate', idempotencyKey:`${org.id}:employee:${i}` })).payrollEmployee;
    // Link real synthetic personas through the versioned profile service. The
    // twelfth employee intentionally has no application account (readiness case).
    if(i<roles.length&&!employee.userId)employee=(await upsertHrisEmployeeProfile({...control,employeeId:employee.id,employeeNumber,displayName:employee.displayName,hireDate:employee.hireDate!,countryCode:'CM',userId:`${org.id}_user_${roles[i]}`,expectedUpdatedAt:employee.updatedAt.toISOString(),idempotencyKey:`${org.id}:employee-account-link:${i}`})).payrollEmployee;
    const number = `${employeeNumber}-CDI-2025`;
    if (!await db.payrollContract.findFirst({ where: { organizationId:org.id, employeeId:employee!.id, contractNumber:number } })) await createPayrollContract({ ...control, employeeId:employee!.id, contractNumber:number, type:'CDI', effectiveFrom:'2025-11-01', baseSalary:String(95000+i*12500), currency:'XAF', workingHoursPerMonth:'173.33', idempotencyKey:`${org.id}:contract:${i}` });
  }
  return { employees:12, contracts:12, linkedApplicationUsers:11, intentionallyUnmappedEmployees:1, status:'Employee references prepared; lifecycle state is independently verified after business workflows' };
}

async function main() {
  mkdirSync(PRIVATE,{recursive:true}); mkdirSync(OUT,{recursive:true});
  const manifest = JSON.parse(readFileSync(path.join(OUT,'manifest.json'),'utf8'));
  const url = new URL(process.env.DATABASE_URL || '');
  if (url.pathname !== '/'+manifest.target.database || !url.pathname.startsWith('/stoquify_replay_dataset_') || !['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Owned disposable target required');
  require('../scripts/disposable-business-dataset.cjs').assertManifestTarget(url,manifest);
  const identity = await db.$queryRaw<Array<{name:string}>>`SELECT current_database() AS name`;
  if(identity[0].name!==manifest.target.database)throw new Error('Database identity mismatch');
  if(await db.organization.count({where:{id:{notIn:orgs.map(o=>o.id)}}}))throw new Error('Unexpected organization in disposable dataset');
  process.env.HRIS_SETUP_PILOT_ORGANIZATIONS=orgs.map(o=>o.id).join(',');
  for(const org of orgs){ await phase('reference',org.id,()=>reference(org)); await phase('accounting-setup',org.id,()=>accounting(org)); await phase('hris-drafts',org.id,()=>people(org)); }
  const { runBusinessWorkflows } = await import('./disposable-business-workflows');
  for (const org of orgs) {
    try { await phase('business-workflows', org.id, async () => {
      const result=await runBusinessWorkflows(org.id, credentials.filter(c => c.organizationId === org.id), OUT, PRIVATE);
      for(const finding of result.findings)report.issues.push({phase:'business-workflows',organizationId:org.id,message:JSON.stringify(finding)});
      return result;
    }); } catch { /* Retain failure and continue other independent organizations. */ }
  }
  save();
  if(report.issues.length)process.exitCode=1;
  console.log('Implemented phases complete; see coverage and independent verification for remaining scope.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}).finally(()=>db.$disconnect());
