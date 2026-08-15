import { createHash } from "node:crypto"
import {
  Prisma,
  SupplierPoAccessAction,
  SupplierPoAccessOutcome,
  SupplierPoAccessTokenStatus,
  SupplierPoProposalActorType,
  SupplierPoProposalStatus,
  SupplierPoProposalType,
} from "@prisma/client"

import { db } from "@/prisma/db"
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

import {
  issueSupplierPoInviteInputSchema,
  reviewSupplierPoProposalInputSchema,
  submitSupplierPoProposalInputSchema,
  type IssueSupplierPoInviteInput,
  type ReviewSupplierPoProposalInput,
  type SubmitSupplierPoProposalInput,
} from "./supplier-po-acknowledgement.schemas"
import {
  createSupplierPoAccessToken,
  verifySupplierPoAccessToken,
  type SupplierPoTokenPermission,
} from "./supplier-po-access-token"

const SERIALIZABLE = Prisma.TransactionIsolationLevel.Serializable

export type SupplierPoEnvelopePayload = {
  schemaVersion: 1
  purchaseOrder: {
    orderNumber: string
    status: string
    orderDate: string
    expectedDeliveryDate: string | null
    paymentTerms: string | null
    currency: string
    subtotal: string
    taxAmount: string
    shippingCost: string
    discount: string
    total: string
    deliveryLocation: string
  }
  buyer: { displayName: string }
  supplier: { displayName: string }
  lines: Array<{
    purchaseOrderLineId: string
    itemName: string
    sku: string | null
    orderedQuantity: string
    unitCost: string
    discount: string
    taxRate: string
    taxAmount: string
    lineTotal: string
  }>
  controls: {
    redacted: true
    externalActionsAreProposals: true
    authoritativeRecords: ["purchase_order", "stock", "accounts_payable", "accounting"]
  }
}

type ResolvedSupplierPoAccess = {
  organizationId: string
  envelopeId: string
  tokenId: string
  tokenHashPrefix: string
  envelopeContentHash: string
  expiresAt: Date
  permissions: SupplierPoTokenPermission[]
  envelope: {
    id: string
    purchaseOrderId: string
    preferredLocale: string
    payload: Prisma.JsonValue
    sourceStateHash: string
    contentHash: string
    createdAt: Date
  }
  proposal: null | {
    id: string
    proposalType: SupplierPoProposalType
    requestedDeliveryDate: Date | null
    supplierNote: string | null
    payloadHash: string
    createdAt: Date
    lines: Array<{
      purchaseOrderLineId: string
      originalOrderedQuantity: Prisma.Decimal
      requestedQuantity: Prisma.Decimal
    }>
    states: Array<{
      version: number
      status: SupplierPoProposalStatus
      effectiveAt: Date
      actorType: SupplierPoProposalActorType
      reason: string | null
      stateHash: string
    }>
  }
}

function requiredText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new BusinessRuleError(label + " is required")
  return normalized
}

function optionalNote(value: string | null | undefined) {
  const normalized = value?.trim() || null
  if (normalized && (normalized.length < 3 || normalized.length > 500)) {
    throw new BusinessRuleError(
      "Note must contain between 3 and 500 characters",
    )
  }
  return normalized
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function optionalHash(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? hashValue(normalized) : null
}

function decimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value)
}

function decimalString(value: Prisma.Decimal) {
  return value.toFixed(value.decimalPlaces() > 2 ? 3 : 2)
}

function envelopePayload(value: Prisma.JsonValue): SupplierPoEnvelopePayload {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new ConflictError("Supplier PO envelope payload is invalid")
  }
  const candidate = value as unknown as SupplierPoEnvelopePayload
  if (
    candidate.schemaVersion !== 1 ||
    !candidate.purchaseOrder?.orderNumber ||
    !Array.isArray(candidate.lines) ||
    candidate.controls?.redacted !== true ||
    candidate.controls?.externalActionsAreProposals !== true
  ) {
    throw new ConflictError("Supplier PO envelope payload is invalid")
  }
  return candidate
}

function assertEnvelopeIntegrity(envelope: {
  payload: Prisma.JsonValue
  contentHash: string
}) {
  const payload = envelopePayload(envelope.payload)
  if (hashBusinessPayload(payload) !== envelope.contentHash) {
    throw new ConflictError(
      "Supplier PO envelope content hash does not match its payload",
    )
  }
  return payload
}

function proposalResult(
  proposal: ResolvedSupplierPoAccess["proposal"] extends infer T
    ? Exclude<T, null>
    : never,
  replayed: boolean,
) {
  const currentState = [...proposal.states].sort(
    (left, right) => right.version - left.version,
  )[0]
  if (!currentState) {
    throw new ConflictError("Supplier proposal state evidence is missing")
  }
  return {
    proposalId: proposal.id,
    proposalType: proposal.proposalType,
    status: currentState.status,
    requestedDeliveryDate:
      proposal.requestedDeliveryDate?.toISOString() ?? null,
    note: proposal.supplierNote,
    quantityChanges: proposal.lines.map((line) => ({
      purchaseOrderLineId: line.purchaseOrderLineId,
      originalOrderedQuantity: decimalString(line.originalOrderedQuantity),
      requestedQuantity: decimalString(line.requestedQuantity),
    })),
    payloadHash: proposal.payloadHash,
    stateHash: currentState.stateHash,
    submittedAt: proposal.createdAt.toISOString(),
    history: [...proposal.states]
      .sort((left, right) => left.version - right.version)
      .map((state) => ({
        version: state.version,
        status: state.status,
        actorType: state.actorType,
        effectiveAt: state.effectiveAt.toISOString(),
        reason: state.reason,
        stateHash: state.stateHash,
      })),
    replayed,
    authoritativeMutation: false as const,
  }
}

function buildEnvelopePayload(purchaseOrder: {
  orderNumber: string
  status: string
  orderDate: Date
  expectedDeliveryDate: Date | null
  paymentTerms: string | null
  subtotal: Prisma.Decimal
  taxAmount: Prisma.Decimal
  shippingCost: Prisma.Decimal
  discount: Prisma.Decimal
  total: Prisma.Decimal
  organization: { name: string; tradeName: string | null; currency: string }
  supplier: { name: string; preferredLocale: string }
  location: { name: string }
  lines: Array<{
    id: string
    orderedQuantity: Prisma.Decimal
    unitCost: Prisma.Decimal
    discount: Prisma.Decimal
    taxRate: Prisma.Decimal
    taxAmount: Prisma.Decimal
    lineTotal: Prisma.Decimal
    item: { nameEn: string; nameFr: string | null; sku: string | null }
  }>
}): SupplierPoEnvelopePayload {
  return {
    schemaVersion: 1,
    purchaseOrder: {
      orderNumber: purchaseOrder.orderNumber,
      status: purchaseOrder.status,
      orderDate: purchaseOrder.orderDate.toISOString(),
      expectedDeliveryDate:
        purchaseOrder.expectedDeliveryDate?.toISOString() ?? null,
      paymentTerms: purchaseOrder.paymentTerms,
      currency: purchaseOrder.organization.currency,
      subtotal: decimalString(purchaseOrder.subtotal),
      taxAmount: decimalString(purchaseOrder.taxAmount),
      shippingCost: decimalString(purchaseOrder.shippingCost),
      discount: decimalString(purchaseOrder.discount),
      total: decimalString(purchaseOrder.total),
      deliveryLocation: purchaseOrder.location.name,
    },
    buyer: {
      displayName:
        purchaseOrder.organization.tradeName || purchaseOrder.organization.name,
    },
    supplier: { displayName: purchaseOrder.supplier.name },
    lines: purchaseOrder.lines.map((line) => ({
      purchaseOrderLineId: line.id,
      itemName:
        purchaseOrder.supplier.preferredLocale === "FR"
          ? line.item.nameFr || line.item.nameEn
          : line.item.nameEn,
      sku: line.item.sku,
      orderedQuantity: decimalString(line.orderedQuantity),
      unitCost: decimalString(line.unitCost),
      discount: decimalString(line.discount),
      taxRate: decimalString(line.taxRate),
      taxAmount: decimalString(line.taxAmount),
      lineTotal: decimalString(line.lineTotal),
    })),
    controls: {
      redacted: true,
      externalActionsAreProposals: true,
      authoritativeRecords: [
        "purchase_order",
        "stock",
        "accounts_payable",
        "accounting",
      ],
    },
  }
}

async function activeActor(
  tx: Prisma.TransactionClient,
  organizationId: string,
  userId: string,
) {
  const actor = await tx.user.findFirst({
    where: { id: userId, organizationId, isActive: true },
    select: { id: true },
  })
  if (!actor) throw new NotFoundError("Active buyer not found")
  return actor
}

async function createOrReuseEnvelopeInTx(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    purchaseOrderId: string
    createdById: string
    idempotencyKey: string
    correlationId: string
    now: Date
  },
) {
  const purchaseOrder = await tx.purchaseOrder.findFirst({
    where: {
      id: input.purchaseOrderId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      orderDate: true,
      expectedDeliveryDate: true,
      paymentTerms: true,
      subtotal: true,
      taxAmount: true,
      shippingCost: true,
      discount: true,
      total: true,
      updatedAt: true,
      organization: {
        select: { name: true, tradeName: true, currency: true },
      },
      supplier: {
        select: { id: true, name: true, preferredLocale: true, isActive: true },
      },
      location: { select: { id: true, name: true } },
      lines: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          orderedQuantity: true,
          unitCost: true,
          discount: true,
          taxRate: true,
          taxAmount: true,
          lineTotal: true,
          item: { select: { nameEn: true, nameFr: true, sku: true } },
        },
      },
    },
  })
  if (!purchaseOrder) throw new NotFoundError("Purchase order not found")
  if (purchaseOrder.status !== "APPROVED") {
    throw new BusinessRuleError(
      "Only an approved purchase order can be shared with a supplier",
    )
  }
  if (!purchaseOrder.supplier.isActive) {
    throw new BusinessRuleError("The purchase order supplier is inactive")
  }
  if (!purchaseOrder.lines.length) {
    throw new BusinessRuleError("The purchase order has no lines to share")
  }

  const payload = buildEnvelopePayload(purchaseOrder)
  const contentHash = hashBusinessPayload(payload)
  const sourceStateHash = hashBusinessPayload({
    purchaseOrderId: purchaseOrder.id,
    status: purchaseOrder.status,
    updatedAt: purchaseOrder.updatedAt.toISOString(),
    payload,
  })
  const existing = await tx.supplierPoEnvelope.findFirst({
    where: {
      organizationId: input.organizationId,
      purchaseOrderId: purchaseOrder.id,
      contentHash,
    },
  })
  if (existing) return { envelope: existing, payload, purchaseOrder }

  const event = await recordBusinessEventInTx(tx, {
    organizationId: input.organizationId,
    eventType: "supplier.po.envelope.created",
    eventSource: "INTERNAL",
    schemaVersion: 1,
    idempotencyKey: "supplier-po-envelope:" + contentHash,
    payload: {
      purchaseOrderId: purchaseOrder.id,
      orderNumber: purchaseOrder.orderNumber,
      supplierId: purchaseOrder.supplier.id,
      sourceStateHash,
      contentHash,
      redacted: true,
      authoritativeMutation: false,
    },
    occurredAt: input.now,
    actorId: input.createdById,
    locationId: purchaseOrder.location.id,
    sourceType: "SUPPLIER_PO_ACKNOWLEDGEMENT",
    sourceId: purchaseOrder.id,
    documentHash: contentHash,
    metadata: { boundary: "supplier-po-acknowledgement-pilot" },
    outboxMessages: [],
  })
  const envelope = await tx.supplierPoEnvelope.create({
    data: {
      organizationId: input.organizationId,
      purchaseOrderId: purchaseOrder.id,
      supplierId: purchaseOrder.supplier.id,
      preferredLocale: purchaseOrder.supplier.preferredLocale,
      payload: asJson(payload),
      sourceStateHash,
      contentHash,
      idempotencyKey: "supplier-po-envelope:" + contentHash,
      correlationId: input.correlationId,
      businessEventId: event.event.id,
      createdById: input.createdById,
      createdAt: input.now,
    },
  })
  await markBusinessEventAppliedInTx(
    tx,
    input.organizationId,
    event.event.id,
  )
  return { envelope, payload, purchaseOrder }
}

function reconstructToken(input: {
  organizationId: string
  purchaseOrderId: string
  envelopeId: string
  envelopeContentHash: string
  idempotencyKey: string
  issuedAt: Date
  expiresAt: Date
  allowRespond: boolean
}) {
  const ttlSeconds = Math.round(
    (input.expiresAt.getTime() - input.issuedAt.getTime()) / 1000,
  )
  return createSupplierPoAccessToken({
    organizationId: input.organizationId,
    purchaseOrderId: input.purchaseOrderId,
    envelopeId: input.envelopeId,
    envelopeContentHash: input.envelopeContentHash,
    jti: hashBusinessPayload({
      scope: "supplier-po-invite",
      organizationId: input.organizationId,
      idempotencyKey: input.idempotencyKey,
    }),
    allowRespond: input.allowRespond,
    now: input.issuedAt,
    ttlSeconds,
  })
}

export async function issueSupplierPoInvite(
  input: IssueSupplierPoInviteInput & {
    organizationId: string
    issuedById: string
    now?: Date
  },
  client: typeof db = db,
) {
  const parsed = issueSupplierPoInviteInputSchema.parse(input)
  const organizationId = requiredText(input.organizationId, "Organization")
  const issuedById = requiredText(input.issuedById, "Invite issuer")
  const now = input.now ? new Date(input.now.getTime()) : new Date()

  return client.$transaction(async (tx) => {
    const actor = await activeActor(tx, organizationId, issuedById)
    const envelopeData = await createOrReuseEnvelopeInTx(tx, {
      organizationId,
      purchaseOrderId: parsed.purchaseOrderId,
      createdById: actor.id,
      idempotencyKey: parsed.idempotencyKey,
      correlationId: parsed.correlationId,
      now,
    })
    const existing = await tx.supplierPoAccessToken.findFirst({
      where: { organizationId, idempotencyKey: parsed.idempotencyKey },
      include: { envelope: true },
    })
    if (existing) {
      if (
        existing.envelope.purchaseOrderId !== parsed.purchaseOrderId ||
        existing.envelopeContentHash !== envelopeData.envelope.contentHash ||
        existing.correlationId !== parsed.correlationId
      ) {
        throw new ConflictError("Supplier PO invite idempotency key was reused")
      }
      if (
        existing.status !== SupplierPoAccessTokenStatus.ACTIVE ||
        existing.revokedAt ||
        existing.expiresAt.getTime() <= now.getTime()
      ) {
        throw new ConflictError(
          "The replayed supplier PO invitation is no longer active",
        )
      }
      const token = reconstructToken({
        organizationId,
        purchaseOrderId: parsed.purchaseOrderId,
        envelopeId: existing.envelopeId,
        envelopeContentHash: existing.envelopeContentHash,
        idempotencyKey: existing.idempotencyKey,
        issuedAt: existing.issuedAt,
        expiresAt: existing.expiresAt,
        allowRespond: existing.allowRespond,
      })
      if (!token || hashValue(token) !== existing.tokenHash) {
        throw new ConflictError(
          "Supplier PO invitation replay evidence cannot be reconstructed",
        )
      }
      return {
        token,
        tokenId: existing.id,
        envelopeId: existing.envelopeId,
        purchaseOrderId: parsed.purchaseOrderId,
        preferredLocale: envelopeData.envelope.preferredLocale,
        expiresAt: existing.expiresAt.toISOString(),
        replayed: true,
      }
    }

    const ttlSeconds = parsed.ttlSeconds
    const jti = hashBusinessPayload({
      scope: "supplier-po-invite",
      organizationId,
      idempotencyKey: parsed.idempotencyKey,
    })
    const token = createSupplierPoAccessToken({
      organizationId,
      purchaseOrderId: parsed.purchaseOrderId,
      envelopeId: envelopeData.envelope.id,
      envelopeContentHash: envelopeData.envelope.contentHash,
      jti,
      allowRespond: true,
      now,
      ttlSeconds,
    })
    if (!token) {
      throw new BusinessRuleError(
        "Supplier PO token signing is not configured or the token contract is invalid",
      )
    }
    const tokenHash = hashValue(token)
    const jtiHash = hashValue(jti)
    const recipientHash = optionalHash(parsed.recipientReference)
    const effectiveTtlSeconds = ttlSeconds ?? 7 * 24 * 60 * 60
    const expiresAt = new Date(now.getTime() + effectiveTtlSeconds * 1000)
    const event = await recordBusinessEventInTx(tx, {
      organizationId,
      eventType: "supplier.po.invite.issued",
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey: "supplier-po-invite:" + parsed.idempotencyKey,
      payload: {
        purchaseOrderId: parsed.purchaseOrderId,
        envelopeId: envelopeData.envelope.id,
        envelopeContentHash: envelopeData.envelope.contentHash,
        tokenHashPrefix: tokenHash.slice(0, 12),
        jtiHashPrefix: jtiHash.slice(0, 12),
        recipientHashPrefix: recipientHash?.slice(0, 12) ?? null,
        expiresAt: expiresAt.toISOString(),
        allowRespond: true,
        authoritativeMutation: false,
      },
      occurredAt: now,
      actorId: actor.id,
      sourceType: "SUPPLIER_PO_ACKNOWLEDGEMENT",
      sourceId: envelopeData.envelope.id,
      documentHash: envelopeData.envelope.contentHash,
      metadata: { boundary: "supplier-po-acknowledgement-pilot" },
      outboxMessages: [],
    })
    const row = await tx.supplierPoAccessToken.create({
      data: {
        organizationId,
        envelopeId: envelopeData.envelope.id,
        tokenHash,
        jtiHash,
        envelopeContentHash: envelopeData.envelope.contentHash,
        recipientHash,
        allowView: true,
        allowRespond: true,
        status: SupplierPoAccessTokenStatus.ACTIVE,
        idempotencyKey: parsed.idempotencyKey,
        correlationId: parsed.correlationId,
        businessEventId: event.event.id,
        issuedById: actor.id,
        issuedAt: now,
        expiresAt,
        metadata: asJson({ rawTokenStored: false, inviteOnly: true }),
      },
    })
    await markBusinessEventAppliedInTx(tx, organizationId, event.event.id)
    await tx.auditLog.create({
      data: {
        organizationId,
        entityType: "SupplierPoAccessToken",
        entityId: row.id,
        action: "SUPPLIER_PO_INVITE_ISSUED",
        userId: actor.id,
        changes: asJson({
          after: {
            purchaseOrderId: parsed.purchaseOrderId,
            envelopeId: envelopeData.envelope.id,
            envelopeContentHash: envelopeData.envelope.contentHash,
            tokenHashPrefix: tokenHash.slice(0, 12),
            recipientHashPrefix: recipientHash?.slice(0, 12) ?? null,
            issuedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            businessEventId: event.event.id,
          },
        }),
      },
    })
    return {
      token,
      tokenId: row.id,
      envelopeId: envelopeData.envelope.id,
      purchaseOrderId: parsed.purchaseOrderId,
      preferredLocale: envelopeData.envelope.preferredLocale,
      expiresAt: expiresAt.toISOString(),
      replayed: false,
    }
  }, { isolationLevel: SERIALIZABLE })
}

async function resolveSupplierPoAccessInTx(
  tx: Prisma.TransactionClient,
  input: {
    envelopeId: string
    token?: string | null
    action: SupplierPoAccessAction
    now: Date
  },
): Promise<ResolvedSupplierPoAccess> {
  const envelopeId = requiredText(input.envelopeId, "Supplier PO envelope")
  const verification = verifySupplierPoAccessToken({
    token: input.token,
    envelopeId,
    now: input.now,
  })
  if (!verification.ok) {
    throw new NotFoundError("Supplier purchase order not found")
  }
  const tokenHash = hashValue(input.token ?? "")
  const jtiHash = hashValue(verification.payload.jti)
  const row = await tx.supplierPoAccessToken.findFirst({
    where: {
      organizationId: verification.payload.organizationId,
      envelopeId,
      tokenHash,
      jtiHash,
      envelopeContentHash: verification.payload.envelopeContentHash,
    },
    include: {
      envelope: {
        select: {
          id: true,
          purchaseOrderId: true,
          preferredLocale: true,
          payload: true,
          sourceStateHash: true,
          contentHash: true,
          createdAt: true,
        },
      },
      proposal: {
        include: {
          lines: true,
          states: { orderBy: { version: "asc" } },
        },
      },
    },
  })
  const permission =
    input.action === SupplierPoAccessAction.VIEW ? "view" : "respond"
  if (
    !row ||
    row.status !== SupplierPoAccessTokenStatus.ACTIVE ||
    row.revokedAt ||
    row.expiresAt.getTime() <= input.now.getTime() ||
    row.envelope.purchaseOrderId !== verification.payload.purchaseOrderId ||
    row.envelope.contentHash !== verification.payload.envelopeContentHash ||
    !verification.payload.permissions.includes(permission) ||
    (permission === "respond" && !row.allowRespond)
  ) {
    throw new NotFoundError("Supplier purchase order not found")
  }
  assertEnvelopeIntegrity(row.envelope)
  return {
    organizationId: row.organizationId,
    envelopeId: row.envelopeId,
    tokenId: row.id,
    tokenHashPrefix: tokenHash.slice(0, 12),
    envelopeContentHash: row.envelopeContentHash,
    expiresAt: row.expiresAt,
    permissions: verification.payload.permissions,
    envelope: row.envelope,
    proposal: row.proposal,
  }
}

async function recordSupplierPoAccessInTx(
  tx: Prisma.TransactionClient,
  input: ResolvedSupplierPoAccess & {
    action: SupplierPoAccessAction
    responseHash: string
    ipAddress?: string | null
    userAgent?: string | null
    occurredAt: Date
  },
) {
  await tx.supplierPoAccessToken.update({
    where: { id: input.tokenId, organizationId: input.organizationId },
    data: {
      lastAccessedAt: input.occurredAt,
      accessCount: { increment: 1 },
    },
  })
  return tx.supplierPoAccessLog.create({
    data: {
      organizationId: input.organizationId,
      envelopeId: input.envelopeId,
      tokenId: input.tokenId,
      action: input.action,
      outcome: SupplierPoAccessOutcome.GRANTED,
      envelopeContentHash: input.envelopeContentHash,
      tokenHashPrefix: input.tokenHashPrefix,
      ipHash: optionalHash(input.ipAddress),
      userAgentHash: optionalHash(input.userAgent),
      responseHash: input.responseHash,
      denialReason: null,
      occurredAt: input.occurredAt,
    },
  })
}

export async function getPublicSupplierPoEnvelope(
  input: {
    envelopeId: string
    token?: string | null
    now?: Date
    ipAddress?: string | null
    userAgent?: string | null
  },
  client: typeof db = db,
) {
  const now = input.now ? new Date(input.now.getTime()) : new Date()
  return client.$transaction(async (tx) => {
    const access = await resolveSupplierPoAccessInTx(tx, {
      envelopeId: input.envelopeId,
      token: input.token,
      action: SupplierPoAccessAction.VIEW,
      now,
    })
    const payload = assertEnvelopeIntegrity(access.envelope)
    const proposal = access.proposal
      ? proposalResult(access.proposal, false)
      : null
    const result = {
      envelopeId: access.envelope.id,
      purchaseOrderId: access.envelope.purchaseOrderId,
      contentHash: access.envelope.contentHash,
      sourceStateHash: access.envelope.sourceStateHash,
      capturedAt: access.envelope.createdAt.toISOString(),
      expiresAt: access.expiresAt.toISOString(),
      preferredLocale: access.envelope.preferredLocale,
      permissions: access.permissions,
      payload,
      proposal,
      controls: {
        redacted: true as const,
        rawTokenStored: false as const,
        requestMetadataHashed: true as const,
        externalActionsAreProposals: true as const,
        authoritativeMutation: false as const,
      },
    }
    const responseHash = hashBusinessPayload(result)
    await recordSupplierPoAccessInTx(tx, {
      ...access,
      action: SupplierPoAccessAction.VIEW,
      responseHash,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      occurredAt: now,
    })
    return { ...result, responseHash }
  }, { isolationLevel: SERIALIZABLE })
}

function normalizedRequestedDate(
  value: string | null | undefined,
  now: Date,
) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new BusinessRuleError("Requested delivery date is invalid")
  }
  const max = new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000)
  if (date.getTime() <= now.getTime() || date.getTime() > max.getTime()) {
    throw new BusinessRuleError(
      "Requested delivery date must be within the next two years",
    )
  }
  return date
}

export async function submitSupplierPoProposal(
  input: SubmitSupplierPoProposalInput & { now?: Date },
  client: typeof db = db,
) {
  const parsed = submitSupplierPoProposalInputSchema.parse(input)
  const now = input.now ? new Date(input.now.getTime()) : new Date()
  return client.$transaction(async (tx) => {
    const access = await resolveSupplierPoAccessInTx(tx, {
      envelopeId: parsed.envelopeId,
      token: parsed.token,
      action: SupplierPoAccessAction.RESPOND,
      now,
    })
    const payload = assertEnvelopeIntegrity(access.envelope)
    const proposalType = SupplierPoProposalType[parsed.proposalType]
    const note = optionalNote(parsed.note)
    let requestedDeliveryDate: Date | null = null
    let changes: Array<{
      purchaseOrderLineId: string
      originalOrderedQuantity: Prisma.Decimal
      requestedQuantity: Prisma.Decimal
    }> = []

    if (proposalType === SupplierPoProposalType.ACCEPT) {
      if (parsed.requestedDeliveryDate || parsed.quantityChanges.length) {
        throw new BusinessRuleError(
          "An acceptance cannot include date or quantity changes",
        )
      }
    } else if (proposalType === SupplierPoProposalType.REJECT) {
      if (!note) throw new BusinessRuleError("A rejection reason is required")
      if (parsed.requestedDeliveryDate || parsed.quantityChanges.length) {
        throw new BusinessRuleError(
          "A rejection cannot include date or quantity changes",
        )
      }
    } else {
      if (!note) {
        throw new BusinessRuleError("A change request explanation is required")
      }
      requestedDeliveryDate = normalizedRequestedDate(
        parsed.requestedDeliveryDate,
        now,
      )
      const uniqueLineIds = new Set<string>()
      changes = parsed.quantityChanges.map((change) => {
        if (uniqueLineIds.has(change.purchaseOrderLineId)) {
          throw new BusinessRuleError("A line can only be changed once")
        }
        uniqueLineIds.add(change.purchaseOrderLineId)
        const line = payload.lines.find(
          (candidate) =>
            candidate.purchaseOrderLineId === change.purchaseOrderLineId,
        )
        if (!line) {
          throw new BusinessRuleError(
            "A requested quantity line is not part of this envelope",
          )
        }
        const original = decimal(line.orderedQuantity)
        const requested = decimal(change.requestedQuantity)
        if (requested.eq(original)) {
          throw new BusinessRuleError(
            "Requested quantity must differ from the ordered quantity",
          )
        }
        return {
          purchaseOrderLineId: line.purchaseOrderLineId,
          originalOrderedQuantity: original,
          requestedQuantity: requested,
        }
      })
      const originalDate = payload.purchaseOrder.expectedDeliveryDate
        ? new Date(payload.purchaseOrder.expectedDeliveryDate)
        : null
      if (
        requestedDeliveryDate &&
        originalDate &&
        requestedDeliveryDate.toISOString().slice(0, 10) ===
          originalDate.toISOString().slice(0, 10)
      ) {
        throw new BusinessRuleError(
          "Requested delivery date must differ from the purchase order date",
        )
      }
      if (!requestedDeliveryDate && !changes.length) {
        throw new BusinessRuleError(
          "A change request must include a new date or quantity",
        )
      }
    }

    const noteHash = note ? hashBusinessPayload(note) : null
    const payloadHash = hashBusinessPayload({
      organizationId: access.organizationId,
      envelopeId: access.envelopeId,
      envelopeContentHash: access.envelopeContentHash,
      tokenId: access.tokenId,
      proposalType,
      requestedDeliveryDate:
        requestedDeliveryDate?.toISOString() ?? null,
      quantityChanges: changes.map((change) => ({
        purchaseOrderLineId: change.purchaseOrderLineId,
        originalOrderedQuantity: decimalString(
          change.originalOrderedQuantity,
        ),
        requestedQuantity: decimalString(change.requestedQuantity),
      })),
      note,
      idempotencyKey: parsed.idempotencyKey,
      correlationId: parsed.correlationId,
    })
    const existing = await tx.supplierPoProposal.findFirst({
      where: { organizationId: access.organizationId, tokenId: access.tokenId },
      include: {
        lines: true,
        states: { orderBy: { version: "asc" } },
      },
    })
    if (existing) {
      if (
        existing.idempotencyKey !== parsed.idempotencyKey ||
        existing.correlationId !== parsed.correlationId ||
        existing.payloadHash !== payloadHash
      ) {
        throw new ConflictError(
          "This supplier invitation already has a different response",
        )
      }
      const result = proposalResult(existing, true)
      const responseHash = hashBusinessPayload(result)
      await recordSupplierPoAccessInTx(tx, {
        ...access,
        action: SupplierPoAccessAction.RESPOND,
        responseHash,
        ipAddress: parsed.ipAddress,
        userAgent: parsed.userAgent,
        occurredAt: now,
      })
      return result
    }

    const evidenceHash = hashBusinessPayload({
      envelopeContentHash: access.envelopeContentHash,
      tokenId: access.tokenId,
      payloadHash,
    })
    const stateHash = hashBusinessPayload({
      organizationId: access.organizationId,
      envelopeId: access.envelopeId,
      payloadHash,
      version: 1,
      status: SupplierPoProposalStatus.SUBMITTED,
      actorType: SupplierPoProposalActorType.SUPPLIER,
      effectiveAt: now.toISOString(),
      previousStateHash: null,
      evidenceHash,
    })
    const event = await recordBusinessEventInTx(tx, {
      organizationId: access.organizationId,
      eventType: "supplier.po.proposal.submitted",
      eventSource: "API",
      schemaVersion: 1,
      idempotencyKey: "supplier-po-proposal:" + parsed.idempotencyKey,
      payload: {
        envelopeId: access.envelopeId,
        purchaseOrderId: access.envelope.purchaseOrderId,
        envelopeContentHash: access.envelopeContentHash,
        proposalType,
        requestedDeliveryDate:
          requestedDeliveryDate?.toISOString() ?? null,
        quantityChanges: changes.map((change) => ({
          purchaseOrderLineId: change.purchaseOrderLineId,
          originalOrderedQuantity: decimalString(
            change.originalOrderedQuantity,
          ),
          requestedQuantity: decimalString(change.requestedQuantity),
        })),
        noteHash,
        payloadHash,
        stateHash,
        authoritativeMutation: false,
      },
      occurredAt: now,
      sourceType: "SUPPLIER_PO_ACKNOWLEDGEMENT",
      sourceId: access.envelopeId,
      documentHash: access.envelopeContentHash,
      metadata: {
        boundary: "supplier-po-acknowledgement-pilot",
        tokenHashPrefix: access.tokenHashPrefix,
      },
      outboxMessages: [],
    })
    const proposal = await tx.supplierPoProposal.create({
      data: {
        organizationId: access.organizationId,
        envelopeId: access.envelopeId,
        tokenId: access.tokenId,
        proposalType,
        requestedDeliveryDate,
        supplierNote: note,
        noteHash,
        payloadHash,
        idempotencyKey: parsed.idempotencyKey,
        correlationId: parsed.correlationId,
        businessEventId: event.event.id,
        lines: {
          create: changes.map((change) => ({
            organizationId: access.organizationId,
            purchaseOrderLineId: change.purchaseOrderLineId,
            originalOrderedQuantity: change.originalOrderedQuantity,
            requestedQuantity: change.requestedQuantity,
          })),
        },
      },
      include: { lines: true },
    })
    const state = await tx.supplierPoProposalState.create({
      data: {
        organizationId: access.organizationId,
        proposalId: proposal.id,
        version: 1,
        status: SupplierPoProposalStatus.SUBMITTED,
        effectiveAt: now,
        actorType: SupplierPoProposalActorType.SUPPLIER,
        actorId: null,
        reason: null,
        previousStateHash: null,
        stateHash,
        evidenceHash,
        businessEventId: event.event.id,
      },
    })
    await markBusinessEventAppliedInTx(
      tx,
      access.organizationId,
      event.event.id,
    )
    const hydrated = { ...proposal, states: [state] }
    const result = proposalResult(hydrated, false)
    const responseHash = hashBusinessPayload(result)
    await recordSupplierPoAccessInTx(tx, {
      ...access,
      action: SupplierPoAccessAction.RESPOND,
      responseHash,
      ipAddress: parsed.ipAddress,
      userAgent: parsed.userAgent,
      occurredAt: now,
    })
    await tx.auditLog.create({
      data: {
        organizationId: access.organizationId,
        entityType: "SupplierPoProposal",
        entityId: proposal.id,
        action: "SUPPLIER_PO_PROPOSAL_SUBMITTED",
        userId: null,
        changes: asJson({
          after: {
            purchaseOrderId: access.envelope.purchaseOrderId,
            envelopeId: access.envelopeId,
            envelopeContentHash: access.envelopeContentHash,
            proposalType,
            requestedDeliveryDate:
              requestedDeliveryDate?.toISOString() ?? null,
            quantityChangeCount: changes.length,
            noteHash,
            payloadHash,
            stateHash,
            businessEventId: event.event.id,
            authoritativeMutation: false,
          },
        }),
      },
    })
    return result
  }, { isolationLevel: SERIALIZABLE })
}

export async function reviewSupplierPoProposal(
  input: ReviewSupplierPoProposalInput & {
    organizationId: string
    reviewedById: string
    now?: Date
  },
  client: typeof db = db,
) {
  const parsed = reviewSupplierPoProposalInputSchema.parse(input)
  const organizationId = requiredText(input.organizationId, "Organization")
  const reviewedById = requiredText(input.reviewedById, "Buyer reviewer")
  const now = input.now ? new Date(input.now.getTime()) : new Date()
  return client.$transaction(async (tx) => {
    const actor = await activeActor(tx, organizationId, reviewedById)
    const proposal = await tx.supplierPoProposal.findFirst({
      where: { id: parsed.proposalId, organizationId },
      include: {
        envelope: { select: { purchaseOrderId: true, contentHash: true } },
        lines: true,
        states: { orderBy: { version: "asc" } },
      },
    })
    if (!proposal) throw new NotFoundError("Supplier proposal not found")
    const current = proposal.states[proposal.states.length - 1]
    if (!current) {
      throw new ConflictError("Supplier proposal state evidence is missing")
    }
    const status =
      parsed.decision === "ACCEPT"
        ? SupplierPoProposalStatus.BUYER_ACCEPTED
        : SupplierPoProposalStatus.BUYER_REJECTED
    if (current.status !== SupplierPoProposalStatus.SUBMITTED) {
      if (current.status !== status || current.reason !== parsed.reason) {
        throw new ConflictError("Supplier proposal has already been reviewed")
      }
      return proposalResult(proposal, true)
    }

    const evidenceHash = hashBusinessPayload({
      envelopeContentHash: proposal.envelope.contentHash,
      proposalPayloadHash: proposal.payloadHash,
      previousStateHash: current.stateHash,
      decision: parsed.decision,
      reason: parsed.reason,
    })
    const stateHash = hashBusinessPayload({
      organizationId,
      proposalId: proposal.id,
      version: 2,
      status,
      actorType: SupplierPoProposalActorType.BUYER,
      actorId: actor.id,
      effectiveAt: now.toISOString(),
      reason: parsed.reason,
      previousStateHash: current.stateHash,
      evidenceHash,
    })
    const event = await recordBusinessEventInTx(tx, {
      organizationId,
      eventType:
        parsed.decision === "ACCEPT"
          ? "supplier.po.proposal.buyer_accepted"
          : "supplier.po.proposal.buyer_rejected",
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey: "supplier-po-review:" + parsed.idempotencyKey,
      payload: {
        proposalId: proposal.id,
        envelopeId: proposal.envelopeId,
        purchaseOrderId: proposal.envelope.purchaseOrderId,
        proposalPayloadHash: proposal.payloadHash,
        decision: parsed.decision,
        reason: parsed.reason,
        previousStateHash: current.stateHash,
        stateHash,
        authoritativeMutation: false,
      },
      occurredAt: now,
      actorId: actor.id,
      sourceType: "SUPPLIER_PO_ACKNOWLEDGEMENT",
      sourceId: proposal.id,
      documentHash: proposal.envelope.contentHash,
      metadata: { boundary: "supplier-po-acknowledgement-pilot" },
      outboxMessages: [],
    })
    const nextState = await tx.supplierPoProposalState.create({
      data: {
        organizationId,
        proposalId: proposal.id,
        version: 2,
        status,
        effectiveAt: now,
        actorType: SupplierPoProposalActorType.BUYER,
        actorId: actor.id,
        reason: parsed.reason,
        previousStateHash: current.stateHash,
        stateHash,
        evidenceHash,
        businessEventId: event.event.id,
      },
    })
    await markBusinessEventAppliedInTx(tx, organizationId, event.event.id)
    await tx.auditLog.create({
      data: {
        organizationId,
        entityType: "SupplierPoProposal",
        entityId: proposal.id,
        action:
          parsed.decision === "ACCEPT"
            ? "SUPPLIER_PO_PROPOSAL_BUYER_ACCEPTED"
            : "SUPPLIER_PO_PROPOSAL_BUYER_REJECTED",
        userId: actor.id,
        changes: asJson({
          after: {
            purchaseOrderId: proposal.envelope.purchaseOrderId,
            proposalId: proposal.id,
            status,
            reason: parsed.reason,
            previousStateHash: current.stateHash,
            stateHash,
            businessEventId: event.event.id,
            authoritativeMutation: false,
          },
        }),
      },
    })
    return proposalResult(
      { ...proposal, states: [...proposal.states, nextState] },
      false,
    )
  }, { isolationLevel: SERIALIZABLE })
}

export async function revokeSupplierPoInvite(
  input: {
    organizationId: string
    tokenId: string
    revokedById: string
    reason: string
    now?: Date
  },
  client: typeof db = db,
) {
  const organizationId = requiredText(input.organizationId, "Organization")
  const tokenId = requiredText(input.tokenId, "Supplier PO token")
  const reason = optionalNote(input.reason)
  if (!reason) throw new BusinessRuleError("Revocation reason is required")
  const now = input.now ? new Date(input.now.getTime()) : new Date()
  return client.$transaction(async (tx) => {
    const actor = await activeActor(tx, organizationId, input.revokedById)
    const existing = await tx.supplierPoAccessToken.findFirst({
      where: { id: tokenId, organizationId },
      include: { envelope: { select: { purchaseOrderId: true } } },
    })
    if (!existing) throw new NotFoundError("Supplier PO token not found")
    if (
      existing.status === SupplierPoAccessTokenStatus.REVOKED &&
      existing.revokedAt
    ) {
      return { tokenId, status: existing.status, replayed: true }
    }
    if (existing.status !== SupplierPoAccessTokenStatus.ACTIVE) {
      throw new ConflictError("Supplier PO token is not active")
    }
    const claimed = await tx.supplierPoAccessToken.updateMany({
      where: {
        id: tokenId,
        organizationId,
        status: SupplierPoAccessTokenStatus.ACTIVE,
        revokedAt: null,
      },
      data: {
        status: SupplierPoAccessTokenStatus.REVOKED,
        revokedById: actor.id,
        revokedAt: now,
        revocationReason: reason,
      },
    })
    if (claimed.count !== 1) {
      throw new ConflictError("Supplier PO token revocation lost a race")
    }
    await tx.auditLog.create({
      data: {
        organizationId,
        entityType: "SupplierPoAccessToken",
        entityId: tokenId,
        action: "SUPPLIER_PO_INVITE_REVOKED",
        userId: actor.id,
        changes: asJson({
          after: {
            purchaseOrderId: existing.envelope.purchaseOrderId,
            envelopeId: existing.envelopeId,
            status: SupplierPoAccessTokenStatus.REVOKED,
            revokedAt: now.toISOString(),
            reason,
            tokenHashPrefix: existing.tokenHash.slice(0, 12),
          },
        }),
      },
    })
    return {
      tokenId,
      status: SupplierPoAccessTokenStatus.REVOKED,
      replayed: false,
    }
  }, { isolationLevel: SERIALIZABLE })
}

export async function getSupplierPoAcknowledgementWorkbench(input: {
  organizationId: string
  purchaseOrderId: string
  now?: Date
}, client: typeof db = db) {
  const now = input.now ? new Date(input.now.getTime()) : new Date()
  const purchaseOrder = await client.purchaseOrder.findFirst({
    where: {
      id: input.purchaseOrderId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      expectedDeliveryDate: true,
      updatedAt: true,
      supplier: { select: { name: true, email: true, preferredLocale: true } },
      acknowledgementEnvelopes: {
        orderBy: { createdAt: "desc" },
        include: {
          accessTokens: { orderBy: { issuedAt: "desc" } },
          proposals: {
            orderBy: { createdAt: "desc" },
            include: {
              lines: true,
              states: { orderBy: { version: "asc" } },
            },
          },
        },
      },
    },
  })
  if (!purchaseOrder) throw new NotFoundError("Purchase order not found")

  return {
    purchaseOrder: {
      id: purchaseOrder.id,
      orderNumber: purchaseOrder.orderNumber,
      status: purchaseOrder.status,
      expectedDeliveryDate:
        purchaseOrder.expectedDeliveryDate?.toISOString() ?? null,
      updatedAt: purchaseOrder.updatedAt.toISOString(),
      supplier: {
        name: purchaseOrder.supplier.name,
        email: purchaseOrder.supplier.email,
        preferredLocale: purchaseOrder.supplier.preferredLocale,
      },
    },
    envelopes: purchaseOrder.acknowledgementEnvelopes.map((envelope) => ({
      id: envelope.id,
      contentHash: envelope.contentHash,
      sourceStateHash: envelope.sourceStateHash,
      preferredLocale: envelope.preferredLocale,
      createdAt: envelope.createdAt.toISOString(),
      tokens: envelope.accessTokens.map((token) => ({
        id: token.id,
        status:
          token.status === SupplierPoAccessTokenStatus.ACTIVE &&
          token.expiresAt.getTime() <= now.getTime()
            ? SupplierPoAccessTokenStatus.EXPIRED
            : token.status,
        tokenHashPrefix: token.tokenHash.slice(0, 12),
        recipientHashPrefix: token.recipientHash?.slice(0, 12) ?? null,
        issuedAt: token.issuedAt.toISOString(),
        expiresAt: token.expiresAt.toISOString(),
        revokedAt: token.revokedAt?.toISOString() ?? null,
        revocationReason: token.revocationReason,
        accessCount: token.accessCount,
      })),
      proposals: envelope.proposals.map((proposal) =>
        proposalResult(proposal, false),
      ),
    })),
    controls: {
      externalActionsAreProposals: true as const,
      purchaseOrderAuthoritative: true as const,
      stockAuthoritative: true as const,
      accountsPayableAuthoritative: true as const,
      accountingAuthoritative: true as const,
    },
  }
}
