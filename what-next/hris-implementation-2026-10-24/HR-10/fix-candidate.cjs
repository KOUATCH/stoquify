const fs=require('node:fs');
function change(file,fn){const before=fs.readFileSync(file,'utf8'),after=fn(before);if(before===after)throw Error('No change '+file);fs.writeFileSync(file+'.hr10-candidate',after)}
change('services/payroll/contract.service.ts',s=>s.replace('  markBusinessEventAppliedInTx,','  hashBusinessPayload,\n  markBusinessEventAppliedInTx,').replace('  return inTransaction(client, async (tx) => {\n    const employee = await tx.payrollEmployee.findFirst({',`  const requestHash = hashBusinessPayload({...parsed, actorId: undefined, actorPermissions: undefined, idempotencyKey: undefined})
  return inTransaction(client, async (tx) => {
    await tx.$queryRaw\`SELECT pg_advisory_xact_lock(hashtextextended(\${"hris-contract:" + parsed.organizationId}, 0))::text\`
    if (parsed.idempotencyKey) {
      const retained = await tx.businessEvent.findFirst({where: {organizationId: parsed.organizationId, idempotencyKey: parsed.idempotencyKey, eventType: "payroll.contract.lifecycle.created", status: "APPLIED"}})
      if (retained) {
        const payload = retained.payload as Record<string, unknown>
        if (payload.requestHash !== requestHash) throw new ConflictError("Contract request changed after saving. Review before submitting again.")
        const contract = await tx.payrollContract.findFirst({where: {id: String(payload.contractId), organizationId: parsed.organizationId, employeeId: parsed.employeeId, deletedAt: null}})
        if (!contract) throw new NotFoundError("Saved contract is no longer available.")
        return {contract: mapContractForWorkflow(contract, salaryRedactionFor({actorPermissions: parsed.actorPermissions, field: "contracts.baseSalary"})), businessEventId: retained.id}
      }
    }
    const employee = await tx.payrollEmployee.findFirst({`).replace('payload: contractEventPayload("created", contract, {','payload: contractEventPayload("created", contract, {\n        requestHash,'));
change('services/payroll/employee.service.ts',s=>s.replace('legalName: parsed.legalName ?? null,\n      status: existing','legalName: parsed.legalName === undefined ? undefined : parsed.legalName,\n      status: existing'));
change('components/hris/HrisPeopleAuthoring.tsx',s=>s.replace('key={key} title={title}','key={(employee?.id??"new")+":"+key} title={title}').replace('"edit-"+employee.id','"edit-"+employee.id+":"+employee.updatedAt').replace('s.status==="REQUESTED"&&form','s.status==="REQUESTED"&&s.currentBaseSalary!=null&&s.proposedBaseSalary!=null&&form').replace('s.status==="APPROVED"&&form','s.status==="APPROVED"&&s.currentBaseSalary!=null&&s.proposedBaseSalary!=null&&form'));
for(const f of ['services/payroll/__tests__/payroll-employee.service.test.ts','services/payroll/__tests__/payroll-contract.service.test.ts'])change(f,s=>s.replace('function buildTx() {\n  return {','function buildTx() {\n  return {\n    $queryRaw: jest.fn().mockResolvedValue([]),\n    businessEvent: {findFirst: jest.fn().mockResolvedValue(null)},'));
