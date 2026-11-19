const fs=require('node:fs');
const file='prisma/schema.prisma';let source=fs.readFileSync(file,'utf8');
if(source.includes('model HrisEmployeeDocument'))throw Error('Already present');
source=source.replace('  hrisAttendanceAnomalies          HrisAttendanceAnomaly[]','  hrisAttendanceAnomalies          HrisAttendanceAnomaly[]\n  hrisEmployeeDocuments           HrisEmployeeDocument[]');
if(!source.includes('hrisEmployeeDocuments'))throw Error('Anchor missing');
source+=`\n// Protected originals: separate from item assets; retention prevents employee deletion.
model HrisEmployeeDocument {
 id String @id
 organizationId String
 employeeId String
 employee PayrollEmployee @relation(fields: [organizationId, employeeId], references: [organizationId, id], onDelete: Restrict)
 uploadedById String
 idempotencyKey String
 requestHash String
 title String
 mimeType String
 byteLength Int
 sha256 String
 encryptionKey String
 encryptionIv String
 encryptionTag String
 policy Json
 employeeVisible Boolean
 status String @default("UPLOADING")
 scanProof Json?
 reviewProof Json?
 revision Int @default(1)
 replacesDocumentId String?
 replacesDocument HrisEmployeeDocument? @relation("HrisDocumentLineage", fields: [organizationId, employeeId, replacesDocumentId], references: [organizationId, employeeId, id], onDelete: Restrict)
 replacements HrisEmployeeDocument[] @relation("HrisDocumentLineage")
 expiresAt DateTime?
 retainUntil DateTime
 legalHold Boolean @default(false)
 holdReasonHash String?
 evidenceBoundAt DateTime?
 createdAt DateTime @default(now())
 updatedAt DateTime @default(now())
 @@unique([organizationId, employeeId, id], map: "hris_documents_identity_key")
 @@unique([organizationId, uploadedById, idempotencyKey], map: "hris_documents_replay_key")
 @@index([organizationId, employeeId, status, expiresAt], map: "hris_documents_scope_status_idx")
 @@map("hris_employee_documents")
}\n`;
fs.writeFileSync(file+'.hr15-candidate',source);
