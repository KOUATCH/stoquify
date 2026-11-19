const fs=require('node:fs');
const path='services/payroll/__tests__/payroll-employee.service.test.ts';let text=fs.readFileSync(path,'utf8');const marker='  it("rejects an employee-user mapping when the user is not in the same tenant", async () => {';
if(!text.includes(marker))throw Error('Test insertion anchor missing');
const tests=`  it("records native effective facts and retains imported lineage on an edit", async () => {
    const tx=buildTx();useTransaction(tx);tx.organization.findFirst.mockResolvedValue({id:"org-1"});
    const origin={sourceSystem:"CSV_IMPORT",sourceRecordId:"row-7",sourceHash:"sha256:import-original",updatedAt:"2026-01-01T00:00:00.000Z"};
    const existing=employeeSourceRow({metadata:{hrSourceData:origin}});
    tx.payrollEmployee.findMany.mockResolvedValue([existing]);tx.payrollEmployee.update.mockImplementation(async ({data}:any)=>({...existing,...data}));
    const command={organizationId:"org-1",actorId:"hr-1",actorPermissions:["hris.people.manage"],employeeId:existing.id,expectedUpdatedAt:existing.updatedAt.toISOString(),employeeNumber:existing.employeeNumber,displayName:"Corrected name",hireDate:existing.hireDate,countryCode:"CM",idempotencyKey:"native-edit-1"};
    const result=await upsertPayrollEmployeeSourceProfile(command);
    const source=(result.payrollEmployee.metadata as any).hrSourceData;
    expect(source).toMatchObject({sourceSystem:"HRIS_NATIVE_PROFILE",originSourceReference:origin,updatedById:"hr-1"});
    expect(source.sourceHash).toMatch(/^sha256:[a-f0-9]{64}$/);expect(source.sourceHash).not.toBe(origin.sourceHash);
    const event=mockedRecordBusinessEventInTx.mock.calls.at(-1)![1];expect(event.payload.sourceReference.sourceHash).toBe(source.sourceHash);expect(source.sourceRecordId).toBe(event.payload.requestPayloadHash);
    tx.businessEvent.findFirst.mockResolvedValue({id:"retained-event",payload:{employeeId:existing.id,requestPayloadHash:event.payload.requestPayloadHash}});tx.payrollEmployee.findFirst.mockResolvedValue(result.payrollEmployee);
    const replay=await upsertPayrollEmployeeSourceProfile(command);expect(replay.payrollEmployee.metadata).toEqual(result.payrollEmployee.metadata);expect(tx.payrollEmployee.update).toHaveBeenCalledTimes(1);expect(mockedRecordBusinessEventInTx).toHaveBeenCalledTimes(1);
  });

  it.each(["hr-1",null])("only mints native creation provenance for an identified actor: %s",async actorId=>{
    const tx=buildTx();useTransaction(tx);tx.organization.findFirst.mockResolvedValue({id:"org-1"});tx.payrollEmployee.findMany.mockResolvedValue([]);tx.payrollEmployee.create.mockImplementation(async ({data}:any)=>({id:"emp-new",...data}));
    const result=await upsertPayrollEmployeeSourceProfile({organizationId:"org-1",actorId,actorPermissions:["hris.people.manage"],createOnly:true,employeeNumber:"NEW",displayName:"Native draft",hireDate:"2026-01-01",countryCode:"CM",idempotencyKey:"native-new"});
    const source=(result.payrollEmployee.metadata as any).hrSourceData;expect(source.sourceSystem).toBe(actorId?"HRIS_NATIVE_PROFILE":null);expect(source.sourceHash).toEqual(actorId?expect.stringMatching(/^sha256:[a-f0-9]{64}$/):null);
  });

`;
text=text.replace(marker,()=>tests+marker);fs.writeFileSync(path,text);
