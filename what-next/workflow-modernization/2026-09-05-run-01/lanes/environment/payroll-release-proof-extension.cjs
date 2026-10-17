// Actual destination and payment lifecycle services; bank input remains synthetic and no provider is contacted.
module.exports=async function({f,scope,actors,employee,payslip,payroll,now,runId,receipt,diagnosticDb}){
 const {db,path,root,assert,crypto}=f;
 const {requestPayrollPaymentBatch:request,approvePayrollPaymentBatch:approve,releasePayrollPaymentBatch:release}=require(path.join(root,'services/payroll/payroll-control.service.ts'));
 const dest=require(path.join(root,'services/payroll/payment-evidence.service.ts'));
 const {recordPayrollPaymentSettlementEvidence:settle,getPayrollPaymentReconciliation:getRead}=require(path.join(root,'services/payroll/payment-reconciliation.service.ts'));
 process.env.PAYROLL_PAYMENT_DESTINATION_HASH_SECRET=crypto.randomBytes(32).toString('hex');
 const requestInput={...scope,payrollRunId:payroll.id,requestedById:actors[0].id,method:'BANK_TRANSFER',paymentDate:now,idempotencyKey:runId+'-payment-request',bankFileHash:'synthetic-file-'+runId,allocations:[{payslipId:payslip.id,employeeId:employee.id,amount:payslip.netPayableAmount.toString()}],actorPermissions:['payroll.payments.request'],lastAuthAt:now,now};
 receipt.stage='input proof denial';await assert.rejects(request(requestInput,db),/certified HRIS input readiness/);
 receipt.stage='destination request/approve/apply';
 const destination=await dest.requestPaymentDestinationChange({...scope,employeeId:employee.id,actorId:actors[0].id,actorPermissions:['payroll.payment_destination.request'],paymentMethod:'BANK_TRANSFER',bankAccountNumber:'SYNTHETIC-0000',bankName:'Owned synthetic bank',requestReason:'Isolated release verification',evidenceDocumentHash:'synthetic-destination-'+runId,idempotencyKey:runId+'-destination'},db);
 const destinationId=destination.paymentDestinationChange.id;
 await assert.rejects(dest.approvePaymentDestinationChange({...scope,paymentDestinationChangeRequestId:destinationId,actorId:actors[0].id,actorPermissions:['payroll.payment_destination.approve'],decisionReason:'Forbidden self approval',approvalEvidenceHash:'synthetic-self-approval'},db),/own request/);
 await dest.approvePaymentDestinationChange({...scope,paymentDestinationChangeRequestId:destinationId,actorId:actors[1].id,actorPermissions:['payroll.payment_destination.approve'],decisionReason:'Isolated fixture approval only',approvalEvidenceHash:'synthetic-approval-'+runId,idempotencyKey:runId+'-destination-approve'},db);
 await dest.applyApprovedPaymentDestinationChange({...scope,paymentDestinationChangeRequestId:destinationId,actorId:actors[2].id,actorPermissions:['payroll.payment_destination.apply'],idempotencyKey:runId+'-destination-apply'},db);
 const destinationProof=await dest.assertApprovedPaymentDestinationEvidence(db,{...scope,employeeId:employee.id});assert.equal(destinationProof.paymentDestinationChangeRequestId,destinationId);
 const persistedDestination=await db.payrollPaymentDestinationChangeRequest.findUniqueOrThrow({where:{id:destinationId}});assert.equal(persistedDestination.status,'APPLIED');assert.ok(!JSON.stringify(persistedDestination).includes('SYNTHETIC-0000'));
 await assert.rejects(dest.assertApprovedPaymentDestinationEvidence(db,{organizationId:'another-tenant',employeeId:employee.id}),/not found/);
 receipt.destinationPrerequisite={requestId:destinationId,requestApproveApply:true,independentActors:true,selfApprovalDenied:true,tenantDenial:true,noRawDestinationPersisted:true,authoritativeEvidenceValidated:true};
 const paymentCounts=async()=>({batches:await db.payrollPaymentBatch.count({where:scope}),transactions:await db.paymentTransaction.count({where:scope}),journals:await db.journalEntry.count({where:scope})});const beforeMissingProof=await paymentCounts();
 await assert.rejects(request(requestInput,db),/certified HRIS input readiness/);assert.deepEqual(await paymentCounts(),beforeMissingProof);
 receipt.releasePrerequisite={status:'BLOCKED_ENGINEERING_FIXTURE_INPUT',missing:'hrisPayrollReadinessHash/payrollInputReadinessHash/payrollEngineInputHashes/payrollEngineInputSnapshotHash',noPaymentEffects:true,releaseExecuted:false,settlementExecuted:false};
 // The posted fixture deliberately lacks HRIS calculation provenance. Do not inject approval strings to pass the gate.
 return;
};
