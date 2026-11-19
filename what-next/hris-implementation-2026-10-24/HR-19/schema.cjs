const fs=require('node:fs'),file='prisma/schema.prisma';let s=fs.readFileSync(file,'utf8');if(s.includes('model HrisPayrollHandoffPackage'))throw Error('Already installed');s=s.replace('  commandCenterNotices CommandCenterNotice[]',()=> '  hrisHandoffPackages HrisPayrollHandoffPackage[]\n  hrisHandoffReceipts HrisPayrollHandoffReceipt[]\n  commandCenterNotices CommandCenterNotice[]');const start=s.indexOf('model PayrollPeriod {'),end=s.indexOf('model PayrollAttendanceSnapshot {',start);if(start<0||end<0)throw Error('Period anchor');const part=s.slice(start,end).replace('  attendanceSnapshots PayrollAttendanceSnapshot[]','  hrisHandoffPackages HrisPayrollHandoffPackage[]\n  attendanceSnapshots PayrollAttendanceSnapshot[]');s=s.slice(0,start)+part+s.slice(end);s+=`
model HrisPayrollHandoffPackage {
 id String @id
 organizationId String
 organization Organization @relation(fields:[organizationId],references:[id],onDelete:Restrict)
 payrollPeriodId String
 payrollPeriod PayrollPeriod @relation(fields:[payrollPeriodId],references:[id],onDelete:Restrict)
 version Int
 recipientUserId String
 issuedById String
 idempotencyKey String
 requestHash String
 previewHash String
 manifestJson Json
 manifestBytes String
 csvBytes String
 manifestHash String
 csvHash String
 packageHash String
 replacesPackageId String? @unique
 replacesPackage HrisPayrollHandoffPackage? @relation("HandoffReplacement",fields:[replacesPackageId],references:[id],onDelete:Restrict,onUpdate:NoAction)
 replacement HrisPayrollHandoffPackage? @relation("HandoffReplacement")
 receipt HrisPayrollHandoffReceipt?
 issuedAt DateTime @db.Timestamp(3)
 @@unique([organizationId,payrollPeriodId,version],map:"hris_handoff_version")
 @@unique([organizationId,issuedById,idempotencyKey],map:"hris_handoff_replay")
 @@index([organizationId,recipientUserId,issuedAt],map:"hris_handoff_recipient")
 @@map("hris_payroll_handoff_packages")
}
model HrisPayrollHandoffReceipt {
 id String @id
 organizationId String
 organization Organization @relation(fields:[organizationId],references:[id],onDelete:Restrict)
 packageId String @unique
 package HrisPayrollHandoffPackage @relation(fields:[packageId],references:[id],onDelete:Restrict)
 actorId String
 idempotencyKey String
 requestHash String
 packageHash String
 status String
 acceptedRowIds Json
 rejectedRows Json
 reference String
 recordedAt DateTime @db.Timestamp(3)
 @@unique([organizationId,actorId,idempotencyKey],map:"hris_handoff_receipt_replay")
 @@map("hris_payroll_handoff_receipts")
}
`;fs.writeFileSync(file+'.hr19-candidate',s);
