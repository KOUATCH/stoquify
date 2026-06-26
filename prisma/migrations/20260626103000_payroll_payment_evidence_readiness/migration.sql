-- CreateEnum
CREATE TYPE "PayrollPaymentDestinationChangeStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'APPLIED');

-- CreateTable
CREATE TABLE "payroll_payment_destination_change_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "PayrollPaymentDestinationChangeStatus" NOT NULL DEFAULT 'REQUESTED',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "bankAccountMasked" TEXT,
    "bankAccountHash" TEXT,
    "mobileMoneyProvider" TEXT,
    "mobileMoneyPhoneMasked" TEXT,
    "mobileMoneyPhoneHash" TEXT,
    "paymentDestinationHash" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "rejectedById" TEXT,
    "appliedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "requestReason" TEXT NOT NULL,
    "decisionReason" TEXT,
    "evidenceDocumentHash" TEXT NOT NULL,
    "approvalEvidenceHash" TEXT,
    "requestBusinessEventId" TEXT,
    "approvalBusinessEventId" TEXT,
    "appliedBusinessEventId" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_payment_destination_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pay_dest_change_employee_status_idx" ON "payroll_payment_destination_change_requests"("organizationId", "employeeId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "pay_dest_change_hash_idx" ON "payroll_payment_destination_change_requests"("organizationId", "paymentDestinationHash");

-- CreateIndex
CREATE INDEX "payroll_payment_destination_change_requests_requestedById_idx" ON "payroll_payment_destination_change_requests"("requestedById");

-- CreateIndex
CREATE INDEX "payroll_payment_destination_change_requests_approvedById_idx" ON "payroll_payment_destination_change_requests"("approvedById");

-- AddForeignKey
ALTER TABLE "payroll_payment_destination_change_requests" ADD CONSTRAINT "payroll_payment_destination_change_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payment_destination_change_requests" ADD CONSTRAINT "payroll_payment_destination_change_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;