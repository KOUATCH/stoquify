const fs = require('node:fs');
const file = 'services/daily-habit/__tests__/daily-habit-digest.service.test.ts';
const original = fs.readFileSync(file, 'utf8');
const text = original.replace('action.label === (locale === "fr" ? "Exposition liée à la paie" : "Payroll Exposure")', 'action.label === (locale === "fr" ? "Examinez les preuves de recouvrement des soldes salariés avant de vous fier aux paiements et à la clôture." : "Review employee balance recovery evidence before payment and close claims are trusted.")');
if (text === original) throw new Error('Expected assertion not found');
const fd = fs.openSync(file, 'r+'); try { fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); }
