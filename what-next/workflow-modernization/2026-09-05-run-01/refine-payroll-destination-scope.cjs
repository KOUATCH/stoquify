const fs = require('node:fs');
const file = 'services/signals/business-signal-rules.service.ts';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('fact.signalType === "payroll_exposure" || fact.additionalRequiredPermissions')) throw new Error('Expected scope missing');
text = text.replace('const defaults = TYPE_DEFAULTS[fact.signalType];', `const defaults = TYPE_DEFAULTS[fact.signalType];
  const actionPath = fact.actionPath ?? defaults.actionPath;
  const opensPayroll = fact.signalType === "payroll_exposure" &&
    (actionPath === "/dashboard/payroll" || actionPath.startsWith("/dashboard/payroll/"));`)
  .replace('actionPath: fact.actionPath ?? defaults.actionPath,', 'actionPath,')
  .replace('fact.signalType === "payroll_exposure" || fact.additionalRequiredPermissions', 'opensPayroll || fact.additionalRequiredPermissions')
  .replace('fact.signalType === "payroll_exposure" ? ["payroll.command.read"]', 'opensPayroll ? ["payroll.command.read"]');
const fd = fs.openSync(file, 'r+'); try { fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); }
