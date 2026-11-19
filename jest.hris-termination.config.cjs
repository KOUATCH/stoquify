// Bounded pure/mocked regression lane, no application or database bootstrap.
const base=require('./jest.hris-handoff-browser.config.cjs');
module.exports={...base,roots:[...base.roots,'<rootDir>/services/payroll/__tests__'],testMatch:[...base.testMatch,'**/lifecycle.service.test.ts','**/lifecycle-task.contract.test.ts','**/HrisLifecycleTasks.test.tsx','**/payroll-control.service.test.ts']};
