import {
  CustomerReceivableDocumentStatus,
  Prisma,
} from "@prisma/client"

import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

export const CUSTOMER_RECEIVABLE_DOCUMENT_SOURCE_VERSION = 1
export const CUSTOMER_RECEIVABLE_REFERENCE_TYPE =
  "CUSTOMER_RECEIVABLE_DOCUMENT" as const

export type EnsurePostedCustomerReceivableInput = {
  organizationId: string
  customerId: string
  salesOrderId: string
  actorId: string
  issuedAt?: Date | string | null
  initialUnpaidAmount?: Prisma.Decimal.Value | null
  sourceEventId?: string | null
  metadata?: Record<string, unknown>
}

function requiredText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new BusinessRuleError(label + " is required")
  return normalized
}

function normalizeDate(
  value: Date | string | null | undefined,
  fallback: Date,
  label: string,
) {
  const result =
    value === null || value === undefined
      ? new Date(fallback.getTime())
      : value instanceof Date
        ? new Date(value.getTime())
        : new Date(value)
  if (Number.isNaN(result.getTime())) {
    throw new BusinessRuleError(label + " is invalid")
  }
  return result
}

export function receivableMoney(
  value: Prisma.Decimal.Value,
  label: string,
) {
  let parsed: Prisma.Decimal
  try {
    parsed = new Prisma.Decimal(value)
  } catch {
    throw new BusinessRuleError(label + " is invalid")
  }
  const normalized = parsed.toDecimalPlaces(2)
  if (!parsed.eq(normalized)) {
    throw new BusinessRuleError(
      label + " cannot contain more than two decimal places",
    )
  }
  return normalized
}

export function receivableJson(
  value: Record<string, unknown>,
): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function addDays(value: Date, days: number) {
  const result = new Date(value.getTime())
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function documentNumber(orderNumber: string) {
  return ("AR-" + requiredText(orderNumber, "Sales order number")).slice(0, 120)
}

function isUniqueConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  )
}

export async function loadCustomerReceivableWithLatestState(
  tx: Prisma.TransactionClient,
  organizationId: string,
  documentId: string,
) {
  const document = await tx.customerReceivableDocument.findFirst({
    where: { id: documentId, organizationId },
  })
  if (!document) throw new NotFoundError("Posted customer receivable not found")

  const latestState = await tx.customerReceivableDocumentState.findFirst({
    where: { organizationId, documentId },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  })
  if (!latestState) {
    throw new ConflictError(
      "Posted customer receivable lifecycle evidence is missing",
    )
  }
  return { document, latestState }
}

export async function ensurePostedCustomerReceivableDocumentInTx(
  tx: Prisma.TransactionClient,
  input: EnsurePostedCustomerReceivableInput,
) {
  const organizationId = requiredText(input.organizationId, "Organization")
  const customerId = requiredText(input.customerId, "Customer")
  const salesOrderId = requiredText(input.salesOrderId, "Sales order")
  const actorId = requiredText(input.actorId, "Actor")

  const existing = await tx.customerReceivableDocument.findFirst({
    where: {
      organizationId,
      sourceSalesOrderId: salesOrderId,
      version: 1,
    },
  })
  if (existing) {
    if (existing.customerId !== customerId) {
      throw new ConflictError(
        "Posted customer receivable tenant/customer identity does not match",
      )
    }
    const state = await tx.customerReceivableDocumentState.findFirst({
      where: { organizationId, documentId: existing.id },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    })
    if (!state) {
      throw new ConflictError(
        "Posted customer receivable initial lifecycle evidence is missing",
      )
    }
    return { document: existing, state, replayed: true }
  }

  const sale = await tx.salesOrder.findFirst({
    where: {
      id: salesOrderId,
      organizationId,
      customerId,
      deletedAt: null,
    },
    select: {
      id: true,
      orderNumber: true,
      orderDate: true,
      dueDate: true,
      status: true,
      paymentStatus: true,
      subtotal: true,
      taxAmount: true,
      shippingCost: true,
      discount: true,
      total: true,
      locationId: true,
      terminalId: true,
      sessionId: true,
      createdById: true,
      createdAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          tradeName: true,
          taxIdentifier: true,
          address: true,
          country: true,
          countryCode: true,
          currency: true,
          timezone: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          code: true,
          email: true,
          phone: true,
          address: true,
          taxId: true,
          paymentTerms: true,
          preferredLocale: true,
        },
      },
    },
  })
  if (!sale) {
    throw new NotFoundError(
      "Tenant-scoped sales order for posted receivable was not found",
    )
  }

  const actor = await tx.user.findFirst({
    where: { id: actorId, organizationId, isActive: true },
    select: { id: true },
  })
  if (!actor) {
    throw new NotFoundError("Active posted-receivable actor not found")
  }

  const subtotal = receivableMoney(sale.subtotal, "Receivable subtotal")
  const taxAmount = receivableMoney(sale.taxAmount, "Receivable tax")
  const shippingAmount = receivableMoney(
    sale.shippingCost,
    "Receivable shipping",
  )
  const discountAmount = receivableMoney(
    sale.discount,
    "Receivable discount",
  )
  const totalAmount = receivableMoney(sale.total, "Receivable total")
  const calculatedTotal = subtotal
    .plus(taxAmount)
    .plus(shippingAmount)
    .minus(discountAmount)
    .toDecimalPlaces(2)
  if (!calculatedTotal.eq(totalAmount) || totalAmount.lte(0)) {
    throw new BusinessRuleError(
      "Sales-order totals are not safe for immutable receivable posting",
    )
  }

  let initialUnpaidAmount: Prisma.Decimal
  if (
    input.initialUnpaidAmount !== null &&
    input.initialUnpaidAmount !== undefined
  ) {
    initialUnpaidAmount = receivableMoney(
      input.initialUnpaidAmount,
      "Initial receivable unpaid amount",
    )
  } else {
    const opening = await tx.customerLedgerEntry.aggregate({
      where: {
        organizationId,
        customerId,
        referenceType: "SALES_ORDER",
        referenceId: salesOrderId,
      },
      _sum: { debit: true, credit: true },
    })
    initialUnpaidAmount = receivableMoney(
      new Prisma.Decimal(opening._sum.debit ?? 0).minus(
        new Prisma.Decimal(opening._sum.credit ?? 0),
      ),
      "Legacy receivable net open amount",
    )
  }
  if (initialUnpaidAmount.lt(0) || initialUnpaidAmount.gt(totalAmount)) {
    throw new BusinessRuleError(
      "Initial receivable unpaid amount must be non-negative and no greater than the document total",
    )
  }
  const initialPaidAmount = totalAmount
    .minus(initialUnpaidAmount)
    .toDecimalPlaces(2)
  const initialStatus = initialUnpaidAmount.eq(0)
    ? CustomerReceivableDocumentStatus.PAID
    : initialPaidAmount.gt(0)
      ? CustomerReceivableDocumentStatus.PARTIALLY_PAID
      : CustomerReceivableDocumentStatus.ISSUED

  const paymentTermsDays = Math.max(
    0,
    Math.min(sale.customer.paymentTerms ?? 30, 3650),
  )
  const invoiceDate = new Date(sale.orderDate.getTime())
  const dueDate = sale.dueDate
    ? new Date(sale.dueDate.getTime())
    : addDays(invoiceDate, paymentTermsDays)
  const issuedAt = normalizeDate(
    input.issuedAt,
    invoiceDate,
    "Receivable issued date",
  )
  if (dueDate.getTime() < invoiceDate.getTime()) {
    throw new BusinessRuleError(
      "Posted customer receivable due date cannot precede invoice date",
    )
  }
  if (issuedAt.getTime() < invoiceDate.getTime()) {
    throw new BusinessRuleError(
      "Posted customer receivable issue date cannot precede invoice date",
    )
  }

  const currency = requiredText(
    sale.organization.currency,
    "Organization currency",
  ).toUpperCase()
  if (currency.length !== 3) {
    throw new BusinessRuleError("Organization currency is invalid")
  }

  const organizationSnapshot = {
    organizationId,
    name: sale.organization.name,
    tradeName: sale.organization.tradeName,
    taxIdentifier: sale.organization.taxIdentifier,
    address: sale.organization.address,
    country: sale.organization.country,
    countryCode: sale.organization.countryCode,
    currency,
    timezone: sale.organization.timezone,
  }
  const customerSnapshot = {
    customerId,
    name: sale.customer.name,
    code: sale.customer.code,
    email: sale.customer.email,
    phone: sale.customer.phone,
    address: sale.customer.address,
    taxId: sale.customer.taxId,
    paymentTermsDays,
    preferredLocale: sale.customer.preferredLocale,
  }
  const sourceSnapshot = {
    sourceType: "SALES_ORDER",
    salesOrderId,
    orderNumber: sale.orderNumber,
    orderDate: invoiceDate.toISOString(),
    dueDate: dueDate.toISOString(),
    status: sale.status,
    paymentStatus: sale.paymentStatus,
    locationId: sale.locationId,
    terminalId: sale.terminalId,
    sessionId: sale.sessionId,
    createdById: sale.createdById,
    subtotal: subtotal.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    shippingAmount: shippingAmount.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    initialPaidAmount: initialPaidAmount.toFixed(2),
    initialUnpaidAmount: initialUnpaidAmount.toFixed(2),
  }
  const metadata = {
    gate: "phase-5-slice-438-posted-customer-receivable",
    sourceVersion: CUSTOMER_RECEIVABLE_DOCUMENT_SOURCE_VERSION,
    sourceEventId: input.sourceEventId ?? null,
    ...(input.metadata ?? {}),
  }
  const sourceEvidenceHash = hashBusinessPayload(sourceSnapshot)
  const metadataHash = hashBusinessPayload(metadata)
  const documentHash = hashBusinessPayload({
    organizationSnapshot,
    customerSnapshot,
    sourceSnapshot,
    metadataHash,
  })
  const stateHash = hashBusinessPayload({
    organizationId,
    salesOrderId,
    status: initialStatus,
    version: 1,
    paidAmount: initialPaidAmount.toFixed(2),
    unpaidAmount: initialUnpaidAmount.toFixed(2),
    effectiveAt: issuedAt.toISOString(),
    previousStateHash: null,
    documentHash,
  })

  try {
    const document = await tx.customerReceivableDocument.create({
      data: {
        organizationId,
        customerId,
        sourceSalesOrderId: salesOrderId,
        documentNumber: documentNumber(sale.orderNumber),
        version: 1,
        sourceVersion: CUSTOMER_RECEIVABLE_DOCUMENT_SOURCE_VERSION,
        issuedAt,
        invoiceDate,
        dueDate,
        paymentTermsDays,
        currency,
        currencyPrecision: 2,
        subtotal,
        taxAmount,
        shippingAmount,
        discountAmount,
        totalAmount,
        initialPaidAmount,
        initialUnpaidAmount,
        organizationSnapshot: receivableJson(organizationSnapshot),
        customerSnapshot: receivableJson(customerSnapshot),
        sourceSnapshot: receivableJson(sourceSnapshot),
        metadata: receivableJson(metadata),
        documentHash,
        sourceEvidenceHash,
        metadataHash,
        issuedById: actor.id,
      },
    })
    const event = await recordBusinessEventInTx(tx, {
      organizationId,
      eventType: "customer.receivable.posted",
      eventSource: "INTERNAL",
      schemaVersion: CUSTOMER_RECEIVABLE_DOCUMENT_SOURCE_VERSION,
      idempotencyKey:
        "customer-receivable:" + document.id + ":issued:1",
      payload: {
        customerReceivableDocumentId: document.id,
        documentNumber: document.documentNumber,
        version: document.version,
        customerId,
        salesOrderId,
        totalAmount: totalAmount.toFixed(2),
        initialPaidAmount: initialPaidAmount.toFixed(2),
        initialUnpaidAmount: initialUnpaidAmount.toFixed(2),
        currency,
        documentHash,
        sourceEvidenceHash,
      },
      occurredAt: issuedAt,
      actorId: actor.id,
      sourceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
      sourceId: document.id,
      documentHash,
      metadata: {
        gate: "phase-5-slice-438-posted-customer-receivable",
        metadataHash,
      },
      outboxMessages: [],
    })
    const state = await tx.customerReceivableDocumentState.create({
      data: {
        organizationId,
        documentId: document.id,
        version: 1,
        status: initialStatus,
        paidAmount: initialPaidAmount,
        unpaidAmount: initialUnpaidAmount,
        effectiveAt: issuedAt,
        actorId: actor.id,
        sourceType: "SALES_ORDER",
        sourceId: salesOrderId,
        previousStateHash: null,
        stateHash,
        businessEventId: event.event.id,
        evidenceHash: sourceEvidenceHash,
        metadata: receivableJson({
          gate: "phase-5-slice-438-initial-receivable-state",
          documentHash,
        }),
      },
    })
    await markBusinessEventAppliedInTx(tx, organizationId, event.event.id)
    await tx.auditLog.create({
      data: {
        organizationId,
        entityType: "CustomerReceivableDocument",
        entityId: document.id,
        action: "CUSTOMER_RECEIVABLE_DOCUMENT_POSTED",
        userId: actor.id,
        changes: receivableJson({
          after: {
            documentNumber: document.documentNumber,
            version: document.version,
            customerId,
            salesOrderId,
            totalAmount: totalAmount.toFixed(2),
            initialPaidAmount: initialPaidAmount.toFixed(2),
            initialUnpaidAmount: initialUnpaidAmount.toFixed(2),
            currency,
            documentHash,
            sourceEvidenceHash,
            stateHash,
            businessEventId: event.event.id,
          },
        }),
      },
    })
    return { document, state, replayed: false }
  } catch (error) {
    if (!isUniqueConflict(error)) throw error
    const raced = await tx.customerReceivableDocument.findFirst({
      where: { organizationId, sourceSalesOrderId: salesOrderId, version: 1 },
    })
    if (!raced || raced.customerId !== customerId) {
      throw new ConflictError(
        "Posted customer receivable identity conflict could not be replayed",
      )
    }
    const state = await tx.customerReceivableDocumentState.findFirst({
      where: { organizationId, documentId: raced.id },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    })
    if (!state) {
      throw new ConflictError(
        "Posted customer receivable race lost without lifecycle evidence",
      )
    }
    return { document: raced, state, replayed: true }
  }
}
