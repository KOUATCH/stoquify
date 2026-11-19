CREATE TABLE "hris_employee_documents" (
 "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
 "uploadedById" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
 "title" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "byteLength" INTEGER NOT NULL CHECK ("byteLength" BETWEEN 12 AND 5242880),
 "sha256" TEXT NOT NULL, "encryptionKey" TEXT NOT NULL, "encryptionIv" TEXT NOT NULL, "encryptionTag" TEXT NOT NULL,
 "policy" JSONB NOT NULL, "employeeVisible" BOOLEAN NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'UPLOADING' CHECK ("status" IN ('UPLOADING','QUARANTINED','PENDING_REVIEW','AVAILABLE','SUPERSEDED','REJECTED','DELETE_PENDING','DELETED')),
 "scanProof" JSONB, "reviewProof" JSONB, "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
 "replacesDocumentId" TEXT, "expiresAt" TIMESTAMP(3), "retainUntil" TIMESTAMP(3) NOT NULL,
 "legalHold" BOOLEAN NOT NULL DEFAULT false, "holdReasonHash" TEXT, "evidenceBoundAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "hris_documents_employee_fk" FOREIGN KEY ("organizationId","employeeId") REFERENCES "payroll_employees"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "hris_documents_identity_key" UNIQUE ("organizationId","employeeId","id"),
 CONSTRAINT "hris_documents_replay_key" UNIQUE ("organizationId","uploadedById","idempotencyKey"),
 CONSTRAINT "hris_documents_lineage_fk" FOREIGN KEY ("organizationId","employeeId","replacesDocumentId") REFERENCES "hris_employee_documents"("organizationId","employeeId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "hris_documents_scope_status_idx" ON "hris_employee_documents"("organizationId","employeeId","status","expiresAt");
CREATE UNIQUE INDEX "hris_documents_approved_successor_idx" ON "hris_employee_documents"("replacesDocumentId") WHERE "status" IN ('AVAILABLE','SUPERSEDED');
