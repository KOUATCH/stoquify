const fs = require('node:fs');
const file = 'services/daily-habit/daily-habit-digest.service.ts';
let text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
function replace(before, after) { if (!text.includes(before)) throw new Error('Expected source missing'); text = text.replace(before, after); }
replace('actionRoles: ["owner", "finance", "manager", "accountant"],', 'actionRoles: ["owner", "finance", "manager", "accountant", "payroll"],');
replace('actionRoles: ["finance"],', 'actionRoles: ["finance", "payroll"],');
for (const source of ['signal', 'item']) {
  text = text.replaceAll(`requiredPermission: ${source}.requiredPermission,`, `requiredPermission: ${source}.requiredPermission,\n    ...(${source}.additionalRequiredPermissions ? { additionalRequiredPermissions: ${source}.additionalRequiredPermissions } : {}),`);
}
const fd=fs.openSync(file,'r+'); try { fs.writeFileSync(fd,text); fs.ftruncateSync(fd,Buffer.byteLength(text)); } finally { fs.closeSync(fd); }
console.log('Owner/finance audiences include authorized payroll actions; link metadata retains every read requirement.');
