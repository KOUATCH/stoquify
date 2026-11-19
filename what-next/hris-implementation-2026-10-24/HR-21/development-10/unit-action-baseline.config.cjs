const path=require('path'),root=process.cwd(),base=require(path.join(root,'jest.hris-hiring.config.cjs'));
module.exports={...base,rootDir:root,testMatch:['**/payroll-contract.actions.test.ts'],moduleNameMapper:{...base.moduleNameMapper,'^\\.\\./payroll-contract.actions$':path.join(__dirname,'original-payroll-contract.actions.ts')}};
