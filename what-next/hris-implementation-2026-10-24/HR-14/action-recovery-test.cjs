const fs=require('fs'),p='actions/hris/__tests__/approval-inbox.actions.test.ts';let s=fs.readFileSync(p,'utf8');s=s.replace('  it("derives tenant authority',`  it("retains receipt after postcommit cache failure",async()=>{
    mockRequirePermission.mockResolvedValue(rbacContext("checker-1",["hris.people.manage"]));mockRevalidatePath.mockImplementationOnce(()=>{throw Error("Synthetic cache failure")});const result=await decideHrisApprovalInboxItemAction({domain:"SALARY_CHANGE",decision:"APPROVE",employeeId:"emp-1",sourceId:"salary-1",reviewVersion:"a".repeat(64),acknowledged:true,decisionReason:"Evidence reviewed",evidenceReferences:["REQUEST"]});expect(result.success).toBe(true)
  })
  it("denies mismatched fresh identity",async()=>{
    mockRequirePermission.mockResolvedValue(rbacContext("other-user",["hris.people.manage"]));expect((await decideHrisApprovalInboxItemAction({})).success).toBe(false);expect(mockDecide).not.toHaveBeenCalled()
  })
  it("derives tenant authority`);fs.writeFileSync(p+'.hr14-candidate',s)
