-- CreateEnum
CREATE TYPE "PayrollDeclarationEvidenceTransition" AS ENUM (
  'SUBMIT',
  'ACCEPT',
  'REJECT',
  'MARK_PAYMENT_DUE',
  'MARK_PAID',
  'RECONCILE',
  'ARCHIVE',
  'AMEND'
);

-- CreateTable
CREATE TABLE "payroll_declaration_evidence" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "declarationId" TEXT NOT NULL,
  "transition" "PayrollDeclarationEvidenceTransition" NOT NULL,
  "previousStatus" "PayrollDeclarationStatus" NOT NULL,
  "nextStatus" "PayrollDeclarationStatus" NOT NULL,
  "authority" TEXT NOT NULL,
  "declarationType" TEXT NOT NULL,
  "authorityChannel" TEXT NOT NULL,
  "authorityEnvironment" TEXT NOT NULL DEFAULT 'MANUAL_PORTAL',
  "authorityReference" TEXT,
  "authorityStatus" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "submittedById" TEXT,
  "approvedById" TEXT,
  "evidenceCapturedById" TEXT NOT NULL,
  "evidenceHash" TEXT NOT NULL,
  "submittedPayloadHash" TEXT,
  "authorityResponseHash" TEXT,
  "portalReceiptHash" TEXT,
  "supportingFileHash" TEXT,
  "sourceRegisterHash" TEXT,
  "countryPackResolutionHash" TEXT NOT NULL,
  "automationCapabilityStatus" TEXT NOT NULL DEFAULT 'AUTOMATION_BLOCKED',
  "productionSubmissionSupported" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payroll_declaration_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_declaration_evidence_organizationId_declarationId_transition_idempotencyKey_key"
  ON "payroll_declaration_evidence"("organizationId", "declarationId", "transition", "idempotencyKey");

-- CreateIndex
CREATE INDEX "payroll_declaration_evidence_organizationId_declarationId_createdAt_idx"
  ON "payroll_declaration_evidence"("organizationId", "declarationId", "createdAt");

-- CreateIndex
CREATE INDEX "payroll_declaration_evidence_organizationId_transition_createdAt_idx"
  ON "payroll_declaration_evidence"("organizationId", "transition", "createdAt");

-- AddForeignKey
ALTER TABLE "payroll_declaration_evidence"
  ADD CONSTRAINT "payroll_declaration_evidence_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_declaration_evidence"
  ADD CONSTRAINT "payroll_declaration_evidence_declarationId_fkey"
  FOREIGN KEY ("declarationId") REFERENCES "payroll_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "payroll_declaration_evidence_prevent_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payroll evidence: declaration evidence %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RAISE EXCEPTION 'Cannot modify immutable payroll evidence: declaration evidence %', OLD."id"
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "payroll_declaration_evidence_prevent_mutation_trigger" ON "payroll_declaration_evidence";
CREATE TRIGGER "payroll_declaration_evidence_prevent_mutation_trigger"
  BEFORE UPDATE OR DELETE ON "payroll_declaration_evidence"
  FOR EACH ROW EXECUTE FUNCTION "payroll_declaration_evidence_prevent_mutation"();