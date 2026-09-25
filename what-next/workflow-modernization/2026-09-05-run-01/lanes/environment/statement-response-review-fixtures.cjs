const f=require('./statement-recipient-fixtures.cjs'),{fs,path,assert,db}=f;
const credentials=JSON.parse(fs.readFileSync(path.join(f.root,'playwright/.auth/workflow-self-profile-v1.json'),'utf8'));
assert.equal(credentials.source,'owned-self-profile-verification');assert.equal(credentials.database,f.helper.database);
const {ensurePostedCustomerReceivableDocumentInTx}=require(path.join(f.root,'services/accounting/customer-receivable-document.service.ts'));
const {createCustomerStatementSnapshot}=require(path.join(f.root,'services/accounting/customer-statement.service.ts'));
const {issueCustomerStatementAccessToken}=require(path.join(f.root,'services/accounting/customer-statement-access.service.ts'));
async function responseFixture(person,run){
  const organizationId=person.organizationId,actorId=person.reader.userId,locale=person.locale;
  const customer=await db.customer.create({data:{organizationId,name:'Owned recipient review '+locale+' '+run,email:'review@example.invalid',preferredLocale:locale==='fr'?'FR':'EN'}});
  const location=await db.location.create({data:{organizationId,name:'Owned review location',code:'REVIEW-'+run}});
  const sale=await db.salesOrder.create({data:{organizationId,customerId:customer.id,locationId:location.id,createdById:actorId,orderNumber:'REVIEW-'+locale+'-'+run,status:'COMPLETED',orderDate:new Date('2026-08-10T12:00:00Z'),dueDate:new Date('2026-08-25T12:00:00Z'),subtotal:'100.00',total:'100.00'}});
  const document=await db.$transaction(tx=>ensurePostedCustomerReceivableDocumentInTx(tx,{organizationId,customerId:customer.id,salesOrderId:sale.id,actorId,issuedAt:'2026-08-10T12:00:00Z',initialUnpaidAmount:'100.00',metadata:{verificationOnly:true}}));
  const statement=await createCustomerStatementSnapshot({organizationId,customerId:customer.id,generatedById:actorId,periodStart:'2026-08-01T00:00:00Z',periodEnd:'2026-08-31T23:59:59.999Z',currency:'XAF',idempotencyKey:'review-statement-'+locale+'-'+run,correlationId:'review-statement-correlation-'+locale+'-'+run},db);
  const access=await issueCustomerStatementAccessToken({organizationId,statementSnapshotId:statement.statementId,issuedById:actorId,allowDispute:true,allowPromiseToPay:true},db);
  const command={statementSnapshotId:statement.statementId,token:access.token,actionType:'DISPUTE',customerReceivableDocumentId:document.document.id,requestedAmount:'25.00',note:'Owned disputed quantity for sender review',idempotencyKey:'review-response-'+locale+'-'+run,correlationId:'review-response-correlation-'+locale+'-'+run};
  const response=await f.submitCustomerStatementRecipientAction(command,db);
  return{organizationId,actorId,customerId:customer.id,statementId:statement.statementId,statementNumber:statement.statementNumber,statementVersion:statement.version,actionId:response.actionId,command,token:access.token,tokenId:access.tokenId,url:f.base+'/'+locale+'/dashboard/customers/'+customer.id+'/statement'};
}
const reviewFiles=['services/accounting/customer-statement-response.service.ts','services/accounting/customer-statement-response.schemas.ts','actions/accounting/customer-statement-response.actions.ts','hooks/customer-statement-review-request.ts','components/customers/CustomerStatementResponses.tsx','components/customers/CustomerStatementWorkflow.tsx','services/modules/module-entitlement.service.ts','services/_shared/protect.ts','lib/security/rbac-permissions.ts','lib/security/auth-session.ts','services/roles/role-custodian-policy.ts','services/events/business-event.service.ts'];
const sources=()=>({...f.sources(),...Object.fromEntries(reviewFiles.map(file=>[file,f.crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]))});
module.exports={...f,credentials,responseFixture,sources};
