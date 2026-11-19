import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {db} from './db';
import {requestSupplierBankChange,approveSupplierBankChangeWithControls} from '../services/purchasing/ap-control.service';
import {previewPaymentRequest,submitPaymentRequest,reviewPaymentRequestApproval,confirmPaymentRequestApproval} from '../services/purchasing/payment-request.service';
import {previewPaymentRelease,confirmPaymentRelease} from '../services/purchasing/payment-release.service';
type Actor={organizationId:string;actorId:string;sessionId:string;sessionToken:string;actorPermissions:string[];lastAuthAt:Date};
export async function seedSupplierPayments(org:string,actors:Record<string,Actor>,out:string){
 const evidence:unknown[]=[];
 const scope=(a:Actor)=>({organizationId:org,actorId:a.actorId,sessionId:a.sessionId,sessionToken:a.sessionToken});
 const doc=(name:string,data:unknown)=>{const bytes=JSON.stringify({classification:'SYNTHETIC_TEST_ONLY',externalTransferPerformed:false,data});writeFileSync(path.join(out,'synthetic-documents',name+'.json'),bytes);return{uri:`http://127.0.0.1:3188/${name}.json`,sha:createHash('sha256').update(bytes).digest('hex')}};
 for(let branch=0;branch<3;branch++){
  const supplierId=`${org}_supplier_${branch}`,marker=`${org}-payment-${branch}`;
  const invoice=await db.supplierInvoice.findFirstOrThrow({where:{organizationId:org,supplierId,invoiceNumber:`SYN-${org}-${branch}-202610`}});
  if(!['POSTED','PAYMENT_PENDING','PAID'].includes(invoice.status)){evidence.push({scenario:'payment-blocked-invoice',invoiceId:invoice.id,status:invoice.status});continue;}
  let bank=await db.supplierBankAccount.findFirst({where:{organizationId:org,supplierId,status:'APPROVED'}});
  if(!bank){
   let change=await db.supplierBankChangeRequest.findFirst({where:{organizationId:org,supplierId,status:'PENDING'}});
   if(!change){const proof=doc(marker+'-destination',{supplierId,destination:'NON_ROUTABLE_SYNTHETIC_ACCOUNT'});const r=await requestSupplierBankChange({organizationId:org,supplierId,requestedById:actors.owner.actorId,bankName:'Synthetic Test Clearing Institution',accountName:'Synthetic supplier destination',accountNumber:`TEST-ONLY-${org}-${branch}`,reason:'Disposable fixture; not a routable bank account',documentHash:'sha256:'+proof.sha,metadata:{synthetic:true}});change=r.bankChangeRequest;}
   const result=await approveSupplierBankChangeWithControls({organizationId:org,changeRequestId:change.id,approvedById:actors.checker.actorId},actors.checker);bank=result.bankAccount;
  }
  let payment=await db.supplierPayment.findFirst({where:{organizationId:org,notes:marker}});
  if(!payment){const proof=doc(marker+'-request',{invoiceId:invoice.id,amount:String(invoice.total)});const draft={supplierId,bankAccountId:bank.id,method:'CASH' as const,paymentDate:new Date().toISOString().slice(0,10),documentReference:proof.uri,documentSha256:proof.sha,notes:marker,allocations:[{supplierInvoiceId:invoice.id,amount:String(invoice.total)}]};const p=await previewPaymentRequest(draft,scope(actors.owner));const r=await submitPaymentRequest({draft,expectedRevision:p.revision,idempotencyKey:marker+':request'},scope(actors.owner));payment=await db.supplierPayment.findUniqueOrThrow({where:{id:r.paymentRequestId}});}
  // Retain a pending request, an approved request, and a released payment per org.
  if(branch===0&&payment.status==='DRAFT'){
   const denial=async(name:string,work:()=>Promise<unknown>)=>{let rejected=false;try{await work()}catch(error){rejected=true;evidence.push({scenario:name,rejected:true,reason:error instanceof Error?error.message:String(error)})}if(!rejected)throw new Error(name+' unexpectedly allowed');};
   await denial('self-approval-denied',()=>reviewPaymentRequestApproval(payment!.id,scope(actors.owner)));
   await denial('cross-tenant-payment-denied',()=>reviewPaymentRequestApproval(payment!.id,{...scope(actors.checker),organizationId:org==='synth12_douala'?'synth12_yaounde':'synth12_douala'}));
  }
  if(branch>0&&payment.status==='DRAFT'){const p=await reviewPaymentRequestApproval(payment.id,scope(actors.checker));await confirmPaymentRequestApproval({paymentRequestId:payment.id,expectedRevision:p.revision,idempotencyKey:marker+':approve'},scope(actors.checker));payment=await db.supplierPayment.findUniqueOrThrow({where:{id:payment.id}});}
  if(branch===2&&payment.status==='APPROVED'){const at=new Date().toISOString(),proof=doc(marker+'-execution',{paymentId:payment.id,executedAt:at,method:'SIMULATED_CASH',amount:String(payment.amount)});const draft={paymentRequestId:payment.id,executionReference:marker,executedAt:at,evidenceUri:proof.uri,evidenceSha256:proof.sha};const p=await previewPaymentRelease(draft,scope(actors.accountant));const command={draft,expectedRevision:p.revision,idempotencyKey:marker+':release'};const result=await confirmPaymentRelease(command,scope(actors.accountant));const replay=await confirmPaymentRelease(command,scope(actors.accountant));evidence.push({scenario:'supplier-payment-release',result,replayed:replay.replayed,warnings:p.warnings});}
  const retained=await db.supplierPayment.findUniqueOrThrow({where:{id:payment.id}});evidence.push({scenario:'supplier-payment',paymentId:payment.id,status:retained.status,branch});
 }
 return evidence;
}

