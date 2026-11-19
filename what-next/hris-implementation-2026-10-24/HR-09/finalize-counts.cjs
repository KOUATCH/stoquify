const fs=require('node:fs');
const files=['what-next/hris-implementation-2026-10-24/HR-09/RESULT.md','what-next/hris-implementation-2026-10-24/HR-09/write-evidence.cjs','docs/ecc/cameroon-blueprint-execution-2026-10-07.md'];
for(const p of files){let s=fs.readFileSync(p,'utf8');
 s=s.replaceAll('21/21','22/22').replaceAll('21 HR-09','22 HR-09').replaceAll('21-case','22-case');
 if(p.endsWith('write-evidence.cjs'))s=s.replaceAll('21 passed, 21 total','22 passed, 22 total').replaceAll('tests:21','tests:22').replaceAll('81 DB cases','82 DB cases').replaceAll('unit-r2.log','unit-final.log').replace("['R1','R2','R3','R4','R5']","['R1','R2','R3','R4','R5','R6']");
 if(p.endsWith('RESULT.md'))s=s.replaceAll('unit-r2.log','unit-final.log').replace('All were corrected and re-reviewed:', 'All were corrected and re-reviewed. An additional self-review finding, R6, closes grants over soft-deleted employees while preserving advisory-before-row lock order. Independent review confirmed that follow-up. Original findings:');
 fs.writeFileSync(p,s);
}
