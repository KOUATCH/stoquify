const fs=require('node:fs');
for(const file of ['services/hris/__tests__/leave-balance.service.test.ts','services/hris/__tests__/operational-time.service.test.ts','services/hris/__tests__/operational-time-decision-concurrency.test.ts']){
 let s=fs.readFileSync(file,'utf8');s='// These owner-unit contracts isolate upstream policy/schedule admission. HR-12 real PostgreSQL cases verify those guards.\n'+
 'jest.mock("@/services/hris/leave-eligibility.service", () => ({ assertEmployeeLeaveEligibility: jest.fn().mockResolvedValue({}) }))\n'+
 'jest.mock("@/services/hris/leave-entitlement.service", () => ({ assertLeavePolicyOpen: jest.fn().mockResolvedValue(undefined) }))\n'+
 'jest.mock("@/services/hris/leave-allocation.service", () => ({ resolveLeaveAllocationInTx: jest.fn().mockImplementation(async (_tx, input) => ({ requestedMinutes: input.requestedMinutes, allocations: input.allocations ?? [] })) }))\n'+s;
 fs.writeFileSync(file+'.hr12-candidate',s);
}
const file='components/hris/__tests__/HrisOperationalTimePanels.test.tsx';let s=fs.readFileSync(file,'utf8');s='jest.mock("@/actions/hris/leave-entitlement.actions", () => ({ requestLeaveCancellationAction: jest.fn() }))\n'+s;s=s.replace('    fireEvent.change(screen.getByLabelText("Minutes"), {','    fireEvent.change(screen.getByLabelText("Leave policy"), { target: { value: "policy-1" } })\n    fireEvent.change(screen.getByLabelText("Minutes"), {');fs.writeFileSync(file+'.hr12-candidate',s);
