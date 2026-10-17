const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const file=path.resolve(__dirname,'../../../services/inventory/__tests__/inventory-stock-event.service.test.ts');
let text=fs.readFileSync(file,'utf8');
const before='  Reflect.deleteProperty(transaction, "$transaction")';
assert.equal(text.split(before).length,2);
const newline=text.includes('\r\n')?'\r\n':'\n';
text=text.replace(before,[before,'  transaction.$queryRaw.mockResolvedValueOnce([await mockedDb.accountingPeriod.findFirst()])','  mockedDb.$transaction.mockClear()'].join(newline));
const after='  }, transaction as unknown as Prisma.TransactionClient)).rejects.toThrow("idempotency key")';
assert.equal(text.split(after).length,2);
text=text.replace(after,after+newline+'  expect(mockedDb.$transaction).not.toHaveBeenCalled()');
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));}finally{fs.closeSync(fd)}
console.log('Updated the existing-transaction period-lock fixture only.');
