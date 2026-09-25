const fs = require('node:fs');
const file = 'services/daily-habit/__tests__/daily-habit-digest.service.test.ts';
const original = fs.readFileSync(file, 'utf8');
const text = original.replace('1 dossier(s) actif(s) de soldes salariés présentent un montant restant de 983421.78.', '1 dossier actif de solde salarié présente un montant restant de 983421.78.')
  .replace('expect(serialized).not.toContain("Employee balance recovery cases are open")', 'expect(serialized.includes("Employee balance recovery cases are open")).toBe(false)')
  .replace('expect(serialized).not.toContain("active employee balance case(s)")', 'expect(serialized.includes("active employee balance case(s)")).toBe(false)');
if (text === original) throw new Error('Expected assertion missing');
const fd = fs.openSync(file, 'r+'); try { fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); }
