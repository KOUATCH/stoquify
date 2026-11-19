const fs=require('node:fs'),p='prisma/schema.prisma';let s=fs.readFileSync(p,'utf8');if(s.includes('model HrisPersonalCorrectionCase'))throw Error('Already present');s=s.replace('  hrisEmployeeDocuments           HrisEmployeeDocument[]','  hrisEmployeeDocuments           HrisEmployeeDocument[]\n  hrisPersonalCorrections         HrisPersonalCorrectionCase[]');if(!s.includes('hrisPersonalCorrections'))throw Error('Anchor missing');s+=`\nmodel HrisPersonalCorrectionCase {
 id String @id
 organizationId String
 employeeId String
 employee PayrollEmployee @relation(fields: [organizationId, employeeId], references: [organizationId, id], onDelete: Restrict)
 requestedById String
 assignedOwnerId String
 idempotencyKey String
 requestHash String
 status String @default("REQUESTED")
 revision Int @default(1)
 proposal Json
 baseline Json
 policy Json
 reason String
 documentId String?
 history Json
 appliedBusinessEventId String?
 appliedEmployeeVersion String?
 createdAt DateTime @default(now())
 updatedAt DateTime @default(now())
 @@unique([organizationId, requestedById, idempotencyKey], map: "hris_personal_case_replay")
 @@index([organizationId, assignedOwnerId, status, createdAt], map: "hris_personal_case_owner")
 @@index([organizationId, employeeId, createdAt], map: "hris_personal_case_employee")
 @@map("hris_personal_correction_cases")
}\n`;fs.writeFileSync(p+'.hr16-candidate',s);
