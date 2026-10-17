import { Prisma, type PrismaClient } from "@prisma/client";

const REPAIR_VERSION = "systematic-reseed-draft-ap-arithmetic-v1";
const SYNTHETIC_INVOICE = /^rds_org_\d{3}_supplier_invoice_\d{3}$/;
const decimal = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);

export function calculateDraftInvoiceTotals(
  lines: Array<{
    id: string;
    quantity: Prisma.Decimal.Value;
    unitCost: Prisma.Decimal.Value;
    taxRate: Prisma.Decimal.Value;
  }>,
  discount: Prisma.Decimal.Value,
) {
  if (!lines.length) throw new Error("Draft invoice has no source lines.");
  const calculated = lines.map((line) => {
    const quantity = decimal(line.quantity);
    const unitCost = decimal(line.unitCost);
    const taxRate = decimal(line.taxRate);
    if (!quantity.isFinite() || !unitCost.isFinite() || !taxRate.isFinite() || quantity.lte(0) || unitCost.lt(0) || taxRate.lt(0)) {
      throw new Error("Draft invoice has invalid source quantities, costs, or tax rates.");
    }
    const subtotal = quantity.mul(unitCost).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const taxAmount = subtotal.mul(taxRate).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    return { id: line.id, subtotal, taxAmount, lineTotal: subtotal.plus(taxAmount) };
  });
  const subtotal = calculated.reduce((sum, line) => sum.plus(line.subtotal), decimal(0));
  const taxAmount = calculated.reduce((sum, line) => sum.plus(line.taxAmount), decimal(0));
  const discountAmount = decimal(discount);
  const total = subtotal.plus(taxAmount).minus(discountAmount);
  if (!discountAmount.isFinite() || discountAmount.lt(0) || total.lt(0)) throw new Error("Invalid draft discount.");
  return { lines: calculated, subtotal, taxAmount, total };
}

export function draftInvoiceRepairBlockers(input: {
  id: string;
  status: string;
  hasPostedOrApprovedEvidence: boolean;
  hasHistoricalDerivatives: boolean;
  hasReceiptsOrApprovalEvidence: boolean;
  paymentStatuses: string[];
  pendingAllocatedAmount: Prisma.Decimal.Value;
  correctedTotal: Prisma.Decimal.Value;
}) {
  const blockers: string[] = [];
  if (!SYNTHETIC_INVOICE.test(input.id)) blockers.push("NOT_IDENTIFIED_SYNTHETIC_INVOICE");
  if (input.status !== "DRAFT") blockers.push("NOT_DRAFT");
  if (input.hasPostedOrApprovedEvidence) blockers.push("POSTED_OR_APPROVED_EVIDENCE");
  if (input.hasHistoricalDerivatives) blockers.push("HISTORICAL_DERIVATIVES");
  if (input.hasReceiptsOrApprovalEvidence) blockers.push("RECEIPT_OR_MATCH_APPROVAL_EVIDENCE");
  if (input.paymentStatuses.some((status) => status !== "DRAFT")) blockers.push("NON_DRAFT_PAYMENT_ALLOCATION");
  if (decimal(input.pendingAllocatedAmount).gt(input.correctedTotal)) blockers.push("PENDING_ALLOCATIONS_EXCEED_CORRECTED_TOTAL");
  return blockers;
}

type RepairOptions = {
  apply?: boolean;
  actorByOrganization: Record<string, string>;
  expectedDatabase: string;
};

export async function repairDraftSyntheticSupplierInvoices(prisma: PrismaClient, options: RepairOptions) {
  const configured = process.env.DATABASE_URL?.replace(/\$\{([^}]+)\}/g, (_, key: string) => process.env[key] ?? "");
  if (!configured || process.env.NODE_ENV === "production") throw new Error("Local database required.");
  const target = new URL(configured);
  if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(target.hostname) || decodeURIComponent(target.pathname.slice(1)) !== options.expectedDatabase || !/(?:local|replay|disposable|test)/i.test(options.expectedDatabase)) {
    throw new Error("Draft fixture repair target does not match the authorized local database.");
  }
  const connected = await prisma.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`;
  if (connected[0]?.database !== options.expectedDatabase) throw new Error("Connected database differs from the approved repair target.");
  const candidates = await prisma.supplierInvoice.findMany({
    where: { id: { startsWith: "rds_org_" } },
    select: { id: true }, orderBy: { id: "asc" },
  });
  const results: Array<Record<string, unknown>> = [];
  for (const candidate of candidates) {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM supplier_invoices WHERE id = ${candidate.id} FOR UPDATE`;
      const invoice = await tx.supplierInvoice.findUniqueOrThrow({ where: { id: candidate.id } });
      const [lines, allocations, matches, historicalCounts] = await Promise.all([
        tx.supplierInvoiceLine.findMany({ where: { supplierInvoiceId: invoice.id }, orderBy: { id: "asc" } }),
        tx.supplierPaymentAllocation.findMany({ where: { supplierInvoiceId: invoice.id } }),
        tx.threeWayMatch.findMany({ where: { supplierInvoiceId: invoice.id } }),
        Promise.all([
          tx.journalEntry.count({ where: { organizationId: invoice.organizationId, sourceId: invoice.id } }),
          tx.fiscalDocument.count({ where: { organizationId: invoice.organizationId, sourceId: invoice.id } }),
          tx.accountingSourceLink.count({ where: { organizationId: invoice.organizationId, sourceId: invoice.id } }),
          tx.supplierInvoiceMatchException.count({ where: { supplierInvoiceId: invoice.id } }),
        ]),
      ]);
      const payments = await tx.supplierPayment.findMany({ where: { id: { in: allocations.map((a) => a.supplierPaymentId) } } });
      const totals = calculateDraftInvoiceTotals(lines, invoice.discount);
      const blockers = draftInvoiceRepairBlockers({
        id: invoice.id, status: invoice.status,
        hasPostedOrApprovedEvidence: Boolean(invoice.approvedById || invoice.postedAt || invoice.postedBusinessEventId || invoice.ledgerPostingBatchId || invoice.documentHash || invoice.evidenceHash || invoice.cancelledAt || invoice.deletedAt || !invoice.amountPaid.eq(0)),
        hasHistoricalDerivatives: historicalCounts.some((count) => count > 0),
        hasReceiptsOrApprovalEvidence: lines.some((line) => Boolean(line.purchaseOrderLineId || line.goodsReceiptLineId)) || matches.some((match) => Boolean(match.purchaseOrderId || match.goodsReceiptId || match.matchedById || match.evidenceHash)) || payments.some((payment) => Boolean(payment.approvedById || payment.releasedById || payment.approvedAt || payment.releasedAt || payment.ledgerPostingBatchId || payment.postedBusinessEventId || payment.documentHash || payment.evidenceHash)),
        paymentStatuses: payments.map((payment) => payment.status),
        pendingAllocatedAmount: allocations.reduce((sum, allocation) => sum.plus(allocation.amount), decimal(0)),
        correctedTotal: totals.total,
      });
      if (lines.some((line) => line.organizationId !== invoice.organizationId || !/^rds_org_\d{3}_supplier_invoice_line_\d{3}$/.test(line.id)) || allocations.some((allocation) => allocation.organizationId !== invoice.organizationId) || payments.some((payment) => payment.organizationId !== invoice.organizationId)) blockers.push("UNEXPECTED_FIXTURE_SCOPE");
      const changedLines = totals.lines.filter((line) => {
        const original = lines.find((old) => old.id === line.id)!;
        return !original.taxAmount.eq(line.taxAmount) || !original.lineTotal.eq(line.lineTotal) || original.matchStatus !== "EXCEPTION";
      });
      const changesRequired = changedLines.length > 0 || !invoice.subtotal.eq(totals.subtotal) || !invoice.taxAmount.eq(totals.taxAmount) || !invoice.total.eq(totals.total) || matches.some((match) => match.status !== "EXCEPTION");
      const snapshot = {
        invoice: { subtotal: invoice.subtotal.toFixed(2), taxAmount: invoice.taxAmount.toFixed(2), total: invoice.total.toFixed(2), status: invoice.status },
        lines: lines.map((line) => ({ id: line.id, taxAmount: line.taxAmount.toFixed(2), lineTotal: line.lineTotal.toFixed(2), matchStatus: line.matchStatus })),
        matches: matches.map((match) => ({ id: match.id, status: match.status })),
      };
      const after = {
        invoice: { subtotal: totals.subtotal.toFixed(2), taxAmount: totals.taxAmount.toFixed(2), total: totals.total.toFixed(2), status: "DRAFT" },
        lines: totals.lines.map((line) => ({ id: line.id, taxAmount: line.taxAmount.toFixed(2), lineTotal: line.lineTotal.toFixed(2), matchStatus: "EXCEPTION" })),
        matches: matches.map((match) => ({ id: match.id, status: "EXCEPTION" })),
      };
      if (blockers.length) return { id: invoice.id, outcome: "BLOCKED", blockers, before: snapshot, proposed: after };
      if (!changesRequired) return { id: invoice.id, outcome: "UNCHANGED" };
      if (!options.apply) return { id: invoice.id, outcome: "PROPOSED", before: snapshot, after };
      const actorId = options.actorByOrganization[invoice.organizationId];
      const actor = actorId ? await tx.user.findFirst({ where: { id: actorId, organizationId: invoice.organizationId, isActive: true } }) : null;
      if (!actor) throw new Error("An active existing organization actor is required for the repair audit.");
      for (const line of changedLines) await tx.supplierInvoiceLine.update({ where: { id: line.id }, data: { taxAmount: line.taxAmount, lineTotal: line.lineTotal, matchStatus: "EXCEPTION" } });
      await tx.supplierInvoice.update({ where: { id: invoice.id }, data: { subtotal: totals.subtotal, taxAmount: totals.taxAmount, total: totals.total } });
      for (const match of matches.filter((entry) => entry.status !== "EXCEPTION")) await tx.threeWayMatch.update({ where: { id: match.id }, data: { status: "EXCEPTION", metadata: { ...((match.metadata && typeof match.metadata === "object" && !Array.isArray(match.metadata)) ? match.metadata as Prisma.JsonObject : {}), seedRemediation: { version: REPAIR_VERSION, reason: "Synthetic draft lacks linked purchase-order/receipt evidence. Match remains unresolved until prepared through AP controls.", previousStatus: match.status } } } });
      await tx.auditLog.create({ data: { organizationId: invoice.organizationId, userId: actor.id, entityType: "SupplierInvoice", entityId: invoice.id, action: "SYSTEMATIC_SEED_DRAFT_ARITHMETIC_REPAIRED", changes: { version: REPAIR_VERSION, synthetic: true, before: snapshot, after, preserved: ["identity", "names", "quantity", "unitCost", "taxRate", "draftPaymentPlan"], limitation: "Unreceived draft fixture; no posting, payment release, or compliance approval is claimed." } } });
      return { id: invoice.id, outcome: "REPAIRED", before: snapshot, after };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
    results.push(result);
  }
  return { version: REPAIR_VERSION, apply: Boolean(options.apply), results };
}
