import { createHash } from "node:crypto";

import { db } from "@/prisma/db";

export const AGENT_PROTECTED_DATA_FINGERPRINT_VERSION =
  "agent-protected-business-data-v1" as const;

export async function fingerprintAgentProtectedBusinessData(
  organizationId: string,
) {
  const [
    journalEntries,
    journalEntryLines,
    complianceSubmissions,
    payments,
    paymentTransactions,
    inventoryTransactions,
    stockAdjustments,
    stockTransfers,
    purchaseOrders,
    supplierInvoices,
    payrollRuns,
    payrollPaymentBatches,
    payrollSalaryChanges,
    payrollDestinationChanges,
    roles,
    userRoles,
  ] = await Promise.all([
    db.journalEntry.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        postedAt: true,
        reversedAt: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    db.journalEntryLine.findMany({
      where: { organizationId },
      select: { id: true, debit: true, credit: true, createdAt: true },
      orderBy: { id: "asc" },
    }),
    db.complianceSubmission.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        attempts: true,
        submittedAt: true,
        completedAt: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    db.payment.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        amount: true,
        processedAt: true,
        refundedAmount: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    db.paymentTransaction.findMany({
      where: { organizationId },
      select: {
        id: true,
        state: true,
        amount: true,
        confirmedAt: true,
        settledAt: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    db.inventoryTransaction.findMany({
      where: { organizationId },
      select: {
        id: true,
        type: true,
        quantity: true,
        totalCost: true,
        balanceAfter: true,
        createdAt: true,
      },
      orderBy: { id: "asc" },
    }),
    db.stockAdjustment.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        approvedAt: true,
        postedBusinessEventId: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    db.stockTransfer.findMany({
      where: { organizationId },
      select: { id: true, status: true, approvedAt: true, updatedAt: true },
      orderBy: { id: "asc" },
    }),
    db.purchaseOrder.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        approvedAt: true,
        total: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    db.supplierInvoice.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        approvedById: true,
        postedAt: true,
        total: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    db.payrollRun.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        version: true,
        approvedAt: true,
        postedAt: true,
        netPayableAmount: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    db.payrollPaymentBatch.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        approvedAt: true,
        releasedAt: true,
        amount: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    db.payrollSalaryChangeRequest.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        approvedAt: true,
        appliedAt: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    db.payrollPaymentDestinationChangeRequest.findMany({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        approvedAt: true,
        appliedAt: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    db.role.findMany({
      where: { organizationId },
      select: { id: true, permissions: true, updatedAt: true },
      orderBy: { id: "asc" },
    }),
    db.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        roles: { select: { id: true }, orderBy: { id: "asc" } },
      },
      orderBy: { id: "asc" },
    }),
  ]);

  const payload = {
    journalEntries,
    journalEntryLines,
    complianceSubmissions,
    payments,
    paymentTransactions,
    inventoryTransactions,
    stockAdjustments,
    stockTransfers,
    purchaseOrders,
    supplierInvoices,
    payrollRuns,
    payrollPaymentBatches,
    payrollSalaryChanges,
    payrollDestinationChanges,
    roles: roles.map((role) => ({
      ...role,
      permissions: [...role.permissions].sort(),
    })),
    userRoles,
  };
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")}`;
}
