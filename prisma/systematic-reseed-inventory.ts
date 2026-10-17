import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

export const SYSTEMATIC_INVENTORY_MINIMUM = "1500.000";

type StockLocation = {
  locationId: string;
  quantityOnHand: Prisma.Decimal.Value;
};

/** Divide only the shortage, retaining the catalog's established stocking locations. */
export function planInventoryMinimum(
  levels: StockLocation[],
  stockingLocationIds: string[],
  minimum: Prisma.Decimal.Value = SYSTEMATIC_INVENTORY_MINIMUM,
  quantityStep: "1" | "0.001" = "0.001",
) {
  const target = new Prisma.Decimal(minimum);
  if (!target.isFinite() || target.lte(0) || target.decimalPlaces() > 3) {
    throw new Error("The stock minimum must be positive with at most three decimal places.");
  }
  const before = levels.reduce((sum, level) => sum.plus(level.quantityOnHand), new Prisma.Decimal(0));
  const step = new Prisma.Decimal(quantityStep);
  const deficit = Prisma.Decimal.max(target.minus(before), 0).div(step).ceil().times(step).toDecimalPlaces(3);
  if (deficit.eq(0)) return { before: before.toFixed(3), deficit: "0.000", allocations: [] };
  const locations = [...new Set(stockingLocationIds)].sort();
  if (!locations.length) throw new Error("No active stocking location is available.");
  const mills = deficit.div(step);
  const each = mills.div(locations.length).floor();
  let remainder = mills.minus(each.times(locations.length)).toNumber();
  const allocations = locations.flatMap((locationId) => {
    const quantity = each.plus(remainder-- > 0 ? 1 : 0).times(step);
    return quantity.gt(0) ? [{ locationId, quantity: quantity.toFixed(3) }] : [];
  });
  return { before: before.toFixed(3), deficit: deficit.toFixed(3), allocations };
}

export type SystematicInventoryOptions = {
  datasetVersion: string;
  referenceDate: Date;
  minimum?: Prisma.Decimal.Value;
  organizationIds?: string[];
  /** Supplied only after the runner actually verifies the protected synthetic credentials. */
  verifiedActorAuth?: Record<string, Date | string>;
};

type ItemOutcome = {
  organizationId: string;
  itemId: string;
  sku: string;
  name: string;
  before: string;
  after: string;
  status: "ALREADY_SUFFICIENT" | "REPLENISHED" | "EXCEPTION" | "BLOCKED";
  reason?: string;
  adjustments?: Array<{ adjustmentId: string; locationId: string; quantity: string; eventId: string; journalEntryId: string }>;
};

function localSeedTarget() {
  const raw = process.env.DATABASE_URL?.replace(/\$\{([^}]+)\}/g, (_, name: string) => process.env[name] ?? "");
  if (!raw) throw new Error("DATABASE_URL is required.");
  const target = new URL(raw);
  if (process.env.NODE_ENV === "production" ||
      !["localhost", "127.0.0.1", "[::1]", "::1"].includes(target.hostname) ||
      !/(dev|local|test|reseed|replay|disposable)/i.test(target.pathname)) {
    throw new Error("Systematic inventory reseeding requires a named local development database.");
  }
}

function seedEventKey(datasetVersion: string, organizationId: string, itemId: string, locationId: string) {
  return `systematic-stock:${createHash("sha256").update(JSON.stringify([datasetVersion, organizationId, itemId, locationId])).digest("hex")}`;
}

function syntheticLot(itemId: string, name: string, locationId: string, date: Date) {
  const shelfLifeDays = /juice|nectar/i.test(name) ? 180 : /soap|cleaner|detergent|toothpaste|lotion/i.test(name) ? 730 : 365;
  return {
    batchNumber: `SYN-${createHash("sha256").update(`${itemId}:${locationId}:${date.toISOString().slice(0, 10)}`).digest("hex").slice(0, 16).toUpperCase()}`,
    expiryDate: new Date(date.getTime() + shelfLifeDays * 86_400_000),
  };
}

/** Reconstruct omitted synthetic opening records; repair impossible cache values by replay. */
export async function reconstructSyntheticInventoryHistory(client: PrismaClient, options: SystematicInventoryOptions) {
  localSeedTarget();
  const { rebuildInventoryProjection } = await import("../services/inventory/inventory-projection-rebuild.service");
  const { getOpenPeriodForDate } = await import("../services/accounting/periods.service");
  const { recordBusinessEventInTx, markBusinessEventAppliedInTx } = await import("../services/events/business-event.service");
  const organizations = await client.organization.findMany({ where: options.organizationIds ? { id: { in: options.organizationIds } } : {}, select: { id: true } });
  const changes: Array<Record<string, unknown>> = [];
  for (const organization of organizations) {
    const baseline = await rebuildInventoryProjection({ organizationId: organization.id }, client);
    const projections = new Map(baseline.projections.map((row) => [`${row.itemId}:${row.locationId}`, row]));
    const keys = new Set(baseline.drifts.map((row) => `${row.itemId}:${row.locationId}`));
    const levels = await client.inventoryLevel.findMany({ where: { item: { organizationId: organization.id } }, include: { item: true, location: true }, orderBy: { id: "asc" } });
    for (const level of levels.filter((row) => keys.has(`${row.itemId}:${row.locationId}`))) {
      const projection = projections.get(`${level.itemId}:${level.locationId}`);
      const projectedQuantity = new Prisma.Decimal(projection?.quantityOnHand ?? 0);
      const projectedValue = new Prisma.Decimal(projection?.totalValue ?? 0);
      const missingQuantity = level.quantityOnHand.minus(projectedQuantity);
      const missingValue = level.totalValue.minus(projectedValue);
      const before = { quantity: level.quantityOnHand.toFixed(3), value: level.totalValue.toFixed(2), averageCost: level.averageCost.toFixed(2), movementQuantity: projectedQuantity.toFixed(3), movementValue: projectedValue.toFixed(2) };
      if (!level.itemId.startsWith("rds_") || level.location.organizationId !== organization.id) {
        changes.push({ status: "BLOCKED", levelId: level.id, reason: "Unproven synthetic provenance or cross-tenant location; no historical reconstruction performed.", before });
        continue;
      }
      const reference = seedEventKey(`${options.datasetVersion}:opening-reconstruction`, organization.id, level.itemId, level.locationId);
      try {
        const outcome = await client.$transaction(async (tx) => {
          await getOpenPeriodForDate(organization.id, options.referenceDate, tx);
          await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "inventory_levels" WHERE "id" = ${level.id} FOR UPDATE`);
          const current = await tx.inventoryLevel.findUniqueOrThrow({ where: { id: level.id } });
          if (current.version !== level.version || !current.quantityOnHand.eq(level.quantityOnHand) || !current.totalValue.eq(level.totalValue)) throw new Error("Inventory changed after the reconstruction snapshot.");
          if (missingQuantity.gt(0) && missingValue.gte(0)) {
            const lot = syntheticLot(level.itemId, level.item.nameEn, level.locationId, options.referenceDate);
            const movement = await tx.inventoryTransaction.create({ data: {
              id: `${reference}:movement`, organizationId: organization.id, itemId: level.itemId, locationId: level.locationId,
              type: "INITIAL_STOCK", quantity: missingQuantity, unitCost: missingValue.div(missingQuantity).toDecimalPlaces(2), totalCost: missingValue, balanceAfter: level.quantityOnHand, serialNumbers: [],
              referenceType: "MANUAL", referenceId: reference, referenceNumber: "SYNTHETIC-OPENING-RECONSTRUCTION",
              notes: `Synthetic opening reconstructed now from retained seed projection; not evidence of a historical physical count. Quantity/value delta ${missingQuantity.toFixed(3)}/${missingValue.toFixed(2)}; exact total value retained, inferred unit cost rounded to two decimals.`,
              ...(level.item.trackBatches ? { batchNumber: lot.batchNumber } : {}),
              ...(level.item.trackExpiry ? { expiryDate: lot.expiryDate } : {}),
              effectiveAt: options.referenceDate, recordedAt: new Date(), timeProvenance: "EXPLICIT_SOURCE_TIME",
            } });
            const event = await recordBusinessEventInTx(tx, { organizationId: organization.id, eventType: "inventory.synthetic_opening.reconstructed", eventSource: "SYSTEM", idempotencyKey: reference,
              occurredAt: options.referenceDate, sourceType: "OPENING_BALANCE", sourceId: reference, locationId: level.locationId,
              payload: { synthetic: true, datasetVersion: options.datasetVersion, before, movementId: movement.id, provenance: "Current reconstruction of omitted synthetic seed opening history from backed-up inventory projection; no historical approval claimed." } });
            await markBusinessEventAppliedInTx(tx, organization.id, event.event.id);
            return { status: "OPENING_RECONSTRUCTED", movementId: movement.id, eventId: event.event.id };
          }
          // A positive opening cannot explain a negative value gap. The immutable
          // movement log is authoritative; rebuild only its mutable projection.
          if (projectedQuantity.lt(current.quantityReserved) || projectedQuantity.lt(0) || projectedValue.lt(0)) throw new Error("Movement replay cannot produce a nonnegative projection consistent with reservations.");
          const averageCost = projectedQuantity.eq(0) ? new Prisma.Decimal(0) : projectedValue.div(projectedQuantity).toDecimalPlaces(2);
          const repaired = await tx.inventoryLevel.updateMany({ where: { id: level.id, version: level.version }, data: {
            quantityOnHand: projectedQuantity, quantityAvailable: projectedQuantity.minus(current.quantityReserved), totalValue: projectedValue, averageCost, version: { increment: 1 },
          } });
          if (repaired.count !== 1) throw new Error("Inventory projection compare-and-swap failed.");
          await tx.ledgerAuditEvent.create({ data: { organizationId: organization.id, action: "SYNTHETIC_INVENTORY_PROJECTION_REBUILT", resourceType: "InventoryLevel", resourceId: level.id,
            message: "Local synthetic projection rebuilt from immutable movement replay because a negative opening value was impossible; source-document inconsistencies remain separately reported.",
            metadata: { synthetic: true, datasetVersion: options.datasetVersion, before, after: { quantity: projectedQuantity.toFixed(3), value: projectedValue.toFixed(2), averageCost: averageCost.toFixed(2) } } } });
          return { status: "PROJECTION_REBUILT", after: { quantity: projectedQuantity.toFixed(3), value: projectedValue.toFixed(2), averageCost: averageCost.toFixed(2) } };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
        changes.push({ levelId: level.id, itemId: level.itemId, locationId: level.locationId, before, ...outcome });
      } catch (error) { changes.push({ status: "BLOCKED", levelId: level.id, before, reason: error instanceof Error ? error.message : String(error) }); }
    }
  }
  return { changes, reconstructed: changes.filter((row) => row.status === "OPENING_RECONSTRUCTED").length, rebuilt: changes.filter((row) => row.status === "PROJECTION_REBUILT").length, blocked: changes.filter((row) => row.status === "BLOCKED").length };
}

/** Add a narrowly effective rule for this positive synthetic replenishment only. */
export async function ensureSyntheticInventoryPostingRule(client: PrismaClient, options: SystematicInventoryOptions) {
  localSeedTarget();
  const { getActivePostingRule } = await import("../services/accounting/posting-rules.service");
  const organizations = await client.organization.findMany({ where: { items: { some: {} }, ...(options.organizationIds ? { id: { in: options.organizationIds } } : {}) }, select: { id: true } });
  const outcomes = [];
  for (const organization of organizations) {
    const existing = await getActivePostingRule(organization.id, { sourceType: "STOCK_ADJUSTMENT", postingPurpose: "INVENTORY_ADJUSTMENT", effectiveAt: options.referenceDate }, client);
    if (existing) { outcomes.push({ organizationId: organization.id, ruleId: existing.id, added: false }); continue; }
    const accounts = await client.chartOfAccount.findMany({ where: { organizationId: organization.id, mappingKey: { in: ["INVENTORY", "INVENTORY_VARIANCE"] }, isActive: true, deletedAt: null, children: { none: {} } } });
    const inventory = accounts.find((account) => account.mappingKey === "INVENTORY");
    const variance = accounts.find((account) => account.mappingKey === "INVENTORY_VARIANCE");
    if (!inventory || !variance) throw new Error(`Organization ${organization.id} is missing canonical inventory/variance leaf accounts.`);
    const rule = await client.postingRule.create({ data: { organizationId: organization.id, code: `SYNTHETIC-INBOUND-${options.referenceDate.toISOString().slice(0, 10)}`, nameEn: "Synthetic positive inventory replenishment", nameFr: "Réapprovisionnement synthétique positif du stock", descriptionEn: "Local development inbound-only rule, effective only at the recorded seed instant; not a generic outbound adjustment rule.", sourceType: "STOCK_ADJUSTMENT", postingPurpose: "INVENTORY_ADJUSTMENT", effectiveFrom: options.referenceDate, effectiveTo: options.referenceDate,
      lines: { create: [
        { organizationId: organization.id, lineNumber: 1, accountId: inventory.id, side: "DEBIT", amountSource: "SOURCE_AMOUNT", multiplier: 1, description: "Synthetic stock received into inventory" },
        { organizationId: organization.id, lineNumber: 2, accountId: variance.id, side: "CREDIT", amountSource: "SOURCE_AMOUNT", multiplier: 1, description: "Synthetic positive inventory adjustment" },
      ] } } });
    outcomes.push({ organizationId: organization.id, ruleId: rule.id, added: true });
  }
  return outcomes;
}

/** Make current synthetic serial identities agree with stock, retaining every existing row. */
export async function completeSyntheticInventorySerials(client: PrismaClient, options: SystematicInventoryOptions) {
  localSeedTarget();
  const { postInventoryReservation } = await import("../services/inventory/inventory-stock-event.service");
  const levels = await client.inventoryLevel.findMany({ where: { item: { trackSerialNumbers: true, ...(options.organizationIds ? { organizationId: { in: options.organizationIds } } : {}) } }, include: { item: true } });
  const outcomes = [];
  for (const level of levels) {
    if (!level.itemId.startsWith("rds_") || !level.quantityOnHand.isInteger() || !level.quantityReserved.isInteger()) {
      outcomes.push({ levelId: level.id, status: "BLOCKED", reason: "Serial reconciliation requires an identified synthetic item and whole-unit stock." }); continue;
    }
    const prefix = `SYN-${createHash("sha256").update(`${level.itemId}:${level.locationId}`).digest("hex").slice(0, 16).toUpperCase()}`;
    const rows = await client.serialNumber.groupBy({ by: ["status"], where: { itemId: level.itemId, locationId: level.locationId, organizationId: level.item.organizationId }, _count: { _all: true } });
    const existingReserved = rows.find((row) => row.status === "RESERVED")?._count._all ?? 0;
    if (new Prisma.Decimal(existingReserved).gt(level.quantityReserved)) {
      const actor = await client.user.findFirst({ where: { organizationId: level.item.organizationId, isActive: true, isLocked: false, roles: { some: { permissions: { has: "inventory.stock.adjust" } } } }, orderBy: { id: "asc" } });
      if (!actor) { outcomes.push({ levelId: level.id, status: "BLOCKED", reason: "An authorized stock operator is required to reconcile preserved serial reservations." }); continue; }
      const delta = new Prisma.Decimal(existingReserved).minus(level.quantityReserved);
      await postInventoryReservation({ organizationId: level.item.organizationId, itemId: level.itemId, locationId: level.locationId, quantity: delta, actorId: actor.id,
        reason: "Synthetic baseline reconstruction of existing reserved serial identities; their original states are preserved.", occurredAt: options.referenceDate,
        idempotencyKey: seedEventKey(`${options.datasetVersion}:serial-reservation`, level.item.organizationId, level.itemId, level.locationId) }, client);
      level.quantityReserved = new Prisma.Decimal(existingReserved);
      level.quantityAvailable = level.quantityOnHand.minus(level.quantityReserved);
    }
    const wanted = [{ status: "AVAILABLE" as const, count: level.quantityOnHand.minus(level.quantityReserved).toNumber() }, { status: "RESERVED" as const, count: level.quantityReserved.toNumber() }];
    let created = 0;
    let blocked = false;
    for (const target of wanted) {
      let existing = rows.find((row) => row.status === target.status)?._count._all ?? 0;
      if (existing > target.count && target.status === "AVAILABLE") {
        // Remove only this run's unconsumed surplus identities after a resumed
        // reservation repair. Pre-existing serial numbers are never changed.
        const surplus = await client.serialNumber.findMany({ where: { itemId: level.itemId, locationId: level.locationId, status: "AVAILABLE", serialNumber: { startsWith: prefix }, notes: { contains: options.datasetVersion } }, orderBy: { serialNumber: "desc" }, take: existing - target.count, select: { id: true } });
        if (surplus.length === existing - target.count) {
          await client.serialNumber.deleteMany({ where: { id: { in: surplus.map((row) => row.id) }, status: "AVAILABLE", notes: { contains: options.datasetVersion } } });
          existing = target.count;
        }
      }
      if (existing > target.count) { outcomes.push({ levelId: level.id, status: "BLOCKED", reason: `Existing ${target.status} serial identities exceed projected stock; no original serial status was changed.` }); blocked = true; break; }
      const data = Array.from({ length: target.count - existing }, (_, index) => ({
        id: `${prefix}-${target.status}-${String(existing + index + 1).padStart(6, "0")}`,
        serialNumber: `${prefix}-${target.status}-${String(existing + index + 1).padStart(6, "0")}`,
        status: target.status, organizationId: level.item.organizationId, itemId: level.itemId, locationId: level.locationId,
        notes: `Synthetic current stock identity reconstructed during ${options.datasetVersion}; not manufacturer-issued provenance or historical warranty evidence.`,
      }));
      if (data.length) created += (await client.serialNumber.createMany({ data })).count;
    }
    if (!blocked) outcomes.push({ levelId: level.id, status: "RECONCILED", created });
  }
  return { outcomes, created: outcomes.reduce((sum, row) => sum + (row.created ?? 0), 0), blocked: outcomes.filter((row) => row.status === "BLOCKED").length };
}

/** Post source-owned synthetic capital-in-stock without enabling manual control-account posting. */
export async function reconcileSyntheticInventoryLedger(client: PrismaClient, options: SystematicInventoryOptions) {
  localSeedTarget();
  const { createLedgerPostingBatch, linkAccountingSource } = await import("../services/accounting/posting.service");
  const { getOpenPeriodForDate } = await import("../services/accounting/periods.service");
  const { assertBalancedJournalEntry } = await import("../services/accounting/invariants");
  const { evaluateSensitiveAction, auditSensitiveActionDecision, assertSensitiveActionAllowed } = await import("../services/controls/sensitive-action.service");
  const { recordBusinessEventInTx, markBusinessEventAppliedInTx, hashBusinessPayload } = await import("../services/events/business-event.service");
  const { recordPostedJournalCloseInvalidationInTx } = await import("../services/accounting/journal-close-invalidation.service");
  const { assertModuleNewWorkInTx } = await import("../services/modules/module-admission.service");
  const organizations = await client.organization.findMany({ where: { items: { some: {} }, ...(options.organizationIds ? { id: { in: options.organizationIds } } : {}) }, select: { id: true, currency: true } });
  const outcomes = [];
  for (const organization of organizations) {
    const reference = `SYNTHETIC-INVENTORY-OPENING:${options.datasetVersion}:${organization.id}`;
    try {
      const [totals, entries, accounts, journal, actors] = await Promise.all([
        client.inventoryLevel.aggregate({ where: { item: { organizationId: organization.id } }, _sum: { totalValue: true } }),
        client.journalEntryLine.aggregate({ where: { organizationId: organization.id, currency: organization.currency, account: { code: { startsWith: "3" } }, journalEntry: { status: { in: ["POSTED", "REVERSED"] }, entryDate: { lte: options.referenceDate } } }, _sum: { debit: true, credit: true } }),
        client.chartOfAccount.findMany({ where: { organizationId: organization.id, mappingKey: { in: ["INVENTORY", "OWNER_CAPITAL"] }, isActive: true, deletedAt: null, children: { none: {} } } }),
        client.journal.findFirst({ where: { organizationId: organization.id, type: "OPENING", isActive: true, allowManualEntries: true } }),
        client.user.findMany({ where: { organizationId: organization.id, isActive: true, isLocked: false, roles: { some: { code: { in: ["inventory_adjustment_maker", "inventory_adjustment_checker"] } } } }, include: { roles: { select: { code: true, permissions: true } } }, orderBy: { id: "asc" } }),
      ]);
      const stockValue = totals._sum.totalValue ?? new Prisma.Decimal(0);
      const ledgerValue = new Prisma.Decimal(entries._sum.debit ?? 0).minus(entries._sum.credit ?? 0);
      const difference = stockValue.minus(ledgerValue).toDecimalPlaces(2);
      if (difference.eq(0)) { outcomes.push({ organizationId: organization.id, status: "RECONCILED", stockValue: stockValue.toFixed(2), ledgerValue: ledgerValue.toFixed(2), added: false }); continue; }
      if (difference.lt(0)) throw new Error("Class 3 exceeds stock value; an opening capital contribution cannot safely explain this difference.");
      const inventory = accounts.find((account) => account.mappingKey === "INVENTORY");
      const capital = accounts.find((account) => account.mappingKey === "OWNER_CAPITAL");
      const maker = actors.find((actor) => actor.roles.some((role) => role.code === "inventory_adjustment_maker" && role.permissions.includes("accounting.journal.create")));
      if (!inventory || !capital || !journal || !maker) throw new Error("Canonical inventory/capital accounts, opening journal and an authorized journal-creation principal are required.");
      const checker = actors.find((actor) => actor.id !== maker.id && actor.roles.some((role) => role.code === "inventory_adjustment_checker" && role.permissions.includes("accounting.journal.post")));
      if (!checker) throw new Error("A different authorized checker is required for the opening entry.");
      const now = new Date();
      const makerAuth = options.verifiedActorAuth?.[maker.id];
      const checkerAuth = options.verifiedActorAuth?.[checker.id];
      if (!makerAuth || !checkerAuth || !Number.isFinite(new Date(makerAuth).getTime()) || !Number.isFinite(new Date(checkerAuth).getTime())) throw new Error("The runner must verify both protected synthetic actor credentials before opening ledger posting.");
      const snapshot = { synthetic: true, datasetVersion: options.datasetVersion, effectiveAt: options.referenceDate.toISOString(), inventorySnapshotValue: stockValue.toFixed(2), priorClass3Value: ledgerValue.toFixed(2), openingCapitalInStock: difference.toFixed(2), makerId: maker.id, checkerId: checker.id, provenance: "Current local synthetic fixture opening reconstruction; no historical or production approval claimed." };
      const documentHash = `sha256:${hashBusinessPayload(snapshot)}`;
      const sourceId = seedEventKey(`${options.datasetVersion}:capital-in-stock`, organization.id, inventory.id, capital.id);
      const entry = await client.$transaction(async (tx) => {
        await assertModuleNewWorkInTx(tx, { organizationId: organization.id, moduleSlug: "accounting", operation: "accounting.opening-balance.create" });
        const period = await getOpenPeriodForDate(organization.id, options.referenceDate, tx);
        const [currentStock, currentLedger] = await Promise.all([
          tx.inventoryLevel.aggregate({ where: { item: { organizationId: organization.id } }, _sum: { totalValue: true } }),
          tx.journalEntryLine.aggregate({ where: { organizationId: organization.id, currency: organization.currency, account: { code: { startsWith: "3" } }, journalEntry: { status: { in: ["POSTED", "REVERSED"] }, entryDate: { lte: options.referenceDate } } }, _sum: { debit: true, credit: true } }),
        ]);
        if (!new Prisma.Decimal(currentStock._sum.totalValue ?? 0).eq(stockValue) || !new Prisma.Decimal(currentLedger._sum.debit ?? 0).minus(currentLedger._sum.credit ?? 0).eq(ledgerValue)) throw new Error("Inventory or ledger changed after the opening snapshot; rerun against a fresh snapshot.");
        if (await tx.journalEntry.findFirst({ where: { organizationId: organization.id, reference } })) throw new Error("The opening source already has an entry; investigate the remaining difference instead of duplicating it.");
        const decision = evaluateSensitiveAction({ action: "accounting.journal.post", actorId: checker.id, organizationId: organization.id, actorPermissions: [...new Set(checker.roles.flatMap((role) => role.permissions))], lastAuthAt: checkerAuth, now, resourceType: "SyntheticOpeningBalance", resourceId: sourceId, subjectActorId: maker.id, amount: difference, currency: organization.currency, metadata: { ...snapshot, documentHash, authenticationContext: "Protected synthetic credentials verified by the seed runner", makerAuthenticatedAt: new Date(makerAuth).toISOString(), checkerAuthenticatedAt: new Date(checkerAuth).toISOString() } });
        await auditSensitiveActionDecision(tx, decision);
        assertSensitiveActionAllowed(decision);
        const lines = [
          { organizationId: organization.id, accountId: inventory.id, lineNumber: 1, debit: difference, credit: new Prisma.Decimal(0), baseDebit: difference, baseCredit: new Prisma.Decimal(0), currency: organization.currency, exchangeRate: new Prisma.Decimal(1), description: "Synthetic opening capital contributed as inventory", metadata: snapshot },
          { organizationId: organization.id, accountId: capital.id, lineNumber: 2, debit: new Prisma.Decimal(0), credit: difference, baseDebit: new Prisma.Decimal(0), baseCredit: difference, currency: organization.currency, exchangeRate: new Prisma.Decimal(1), description: "Synthetic initial owner capital in stock", metadata: snapshot },
        ];
        assertBalancedJournalEntry(lines);
        const batch = await createLedgerPostingBatch({ organizationId: organization.id, periodId: period.id, sourceType: "OPENING_BALANCE", sourceId, postingPurpose: "OPENING_BALANCE", idempotencyKey: sourceId, metadata: { ...snapshot, documentHash } }, tx);
        await tx.ledgerPostingBatch.update({ where: { id: batch.id }, data: { status: "POSTED", postedAt: now } });
        const posted = await tx.journalEntry.create({ data: { organizationId: organization.id, journalId: journal.id, periodId: period.id, postingBatchId: batch.id, entryNumber: `SYN-OPEN-${sourceId.slice(-16)}`, entryDate: options.referenceDate, status: "POSTED", currency: organization.currency, memo: "SYNTHETIC LOCAL DATA: opening capital-in-stock reconstruction, not historic statutory evidence.", reference, sourceType: "OPENING_BALANCE", sourceId, postingPurpose: "OPENING_BALANCE", createdById: maker.id, postedById: checker.id, postedAt: now, lines: { create: lines } } });
        await linkAccountingSource({ organizationId: organization.id, postingBatchId: batch.id, journalEntryId: posted.id, sourceType: "OPENING_BALANCE", sourceId, sourceNumber: reference, sourceDate: options.referenceDate, metadata: { ...snapshot, documentHash } }, tx);
        const event = await recordBusinessEventInTx(tx, { organizationId: organization.id, eventSource: "SYSTEM", eventType: "inventory.synthetic_opening.ledger_posted", idempotencyKey: sourceId, actorId: checker.id, occurredAt: options.referenceDate, sourceType: "OPENING_BALANCE", sourceId, postingBatchId: batch.id, documentHash, payload: { ...snapshot, journalEntryId: posted.id } });
        await markBusinessEventAppliedInTx(tx, organization.id, event.event.id);
        await recordPostedJournalCloseInvalidationInTx(tx, organization.id, { journalEntryId: posted.id, periodId: period.id, entryDate: options.referenceDate, correlationId: batch.id }, { actorId: checker.id, now });
        await tx.ledgerAuditEvent.create({ data: { organizationId: organization.id, actorId: checker.id, action: "SYNTHETIC_INVENTORY_OPENING_POSTED", resourceType: "JournalEntry", resourceId: posted.id, postingBatchId: batch.id, journalEntryId: posted.id, message: "Source-owned local synthetic opening posted with independent principals; manual control-account restrictions preserved.", metadata: { ...snapshot, documentHash } } });
        return posted;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60_000 });
      outcomes.push({ organizationId: organization.id, status: "RECONCILED", stockValue: stockValue.toFixed(2), priorLedgerValue: ledgerValue.toFixed(2), openingValue: difference.toFixed(2), entryId: entry.id, documentHash, snapshot, added: true });
    } catch (error) { outcomes.push({ organizationId: organization.id, status: "BLOCKED", reason: error instanceof Error ? error.message : String(error) }); }
  }
  return { outcomes, blocked: outcomes.filter((row) => row.status === "BLOCKED").length };
}

/**
 * Add synthetic stock through the production adjustment and posting services.
 * Existing balances, identities, immutable movements, and approvals are never reset.
 * Call only after the orchestration runner has restored and validated its backup.
 */
export async function reseedInventoryMinimum(client: PrismaClient, options: SystematicInventoryOptions) {
  localSeedTarget();
  if (!options.datasetVersion.trim() || !Number.isFinite(options.referenceDate.getTime()) || options.referenceDate > new Date()) {
    throw new Error("A stable dataset version and a valid non-future effective date are required.");
  }
  const minimum = new Prisma.Decimal(options.minimum ?? SYSTEMATIC_INVENTORY_MINIMUM).toFixed(3);
  planInventoryMinimum([], ["validate-minimum"], options.minimum ?? SYSTEMATIC_INVENTORY_MINIMUM);
  const { createStockAdjustment, postStockAdjustment } = await import("../services/inventory/inventory-adjustment.service");
  const { rebuildInventoryProjection } = await import("../services/inventory/inventory-projection-rebuild.service");
  const organizations = await client.organization.findMany({
    where: options.organizationIds ? { id: { in: options.organizationIds } } : {},
    select: { id: true, currency: true }, orderBy: { id: "asc" },
  });
  const baselineProjection = [];
  const finalProjection = [];
  const outcomes: ItemOutcome[] = [];
  for (const organization of organizations) {
    baselineProjection.push(await rebuildInventoryProjection({ organizationId: organization.id }, client));
    const [items, locations, actors] = await Promise.all([
      client.item.findMany({ where: { organizationId: organization.id }, orderBy: { id: "asc" }, include: { inventoryLevels: true, unit: true } }),
      client.location.findMany({ where: { organizationId: organization.id, isActive: true, deletedAt: null }, orderBy: [{ isDefault: "desc" }, { id: "asc" }] }),
      client.user.findMany({
        where: { organizationId: organization.id, isActive: true, isLocked: false,
          roles: { some: { organizationId: organization.id, permissions: { has: "inventory.stock.adjust" } } } },
        select: { id: true, roles: { select: { permissions: true } } }, orderBy: { id: "asc" },
      }),
    ]);
    for (const item of items) {
      const before = item.inventoryLevels.reduce((sum, level) => sum.plus(level.quantityOnHand), new Prisma.Decimal(0)).toFixed(3);
      const base = { organizationId: organization.id, itemId: item.id, sku: item.sku, name: item.nameEn, before, after: before };
      if (new Prisma.Decimal(before).gte(minimum)) {
        outcomes.push({ ...base, status: "ALREADY_SUFFICIENT" });
        continue;
      }
      const exception = !item.trackInventory ? "Non-stock item; stock tracking was preserved." :
        item.deletedAt ? "Historical deleted item; lifecycle status was preserved." :
        !item.isActive || item.isDiscontinued ? "Inactive or discontinued item; lifecycle status was preserved." :
        item.trackSerialNumbers ? "Serial-tracked item requires individual serial provenance, which the adjustment service does not create." :
        null;
      if (exception) { outcomes.push({ ...base, status: "EXCEPTION", reason: exception }); continue; }
      try {
        if (organization.currency !== "XAF") throw new Error("The inventory adjustment service currently posts XAF journals; a currency-safe service is required for this organization.");
        const maker = actors.find((actor) => actor.roles.some((role) => role.permissions.includes("accounting.journal.create"))) ?? actors[0];
        const checker = actors.find((actor) => actor.id !== maker?.id && actor.roles.some((role) => role.permissions.includes("inventory.adjust.approve"))) ?? actors.find((actor) => actor.id !== maker?.id);
        if (!maker || !checker) throw new Error("Two distinct active users with inventory.stock.adjust permission are required for maker/checker separation.");
        const activeIds = new Set(locations.map((location) => location.id));
        if (item.inventoryLevels.some((level) => !locations.some((location) => location.id === level.locationId)) && !locations.length) {
          throw new Error("No active stocking location is available.");
        }
        const existingActiveIds = item.inventoryLevels.map((level) => level.locationId).filter((id) => activeIds.has(id));
        const stockingIds = existingActiveIds.length ? existingActiveIds : locations.slice(0, 1).map((location) => location.id);
        const result = await client.$transaction(async (tx) => {
          // Lock the item to serialize this seed's multi-location shortage calculation.
          await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "items" WHERE "id" = ${item.id} AND "organizationId" = ${organization.id} FOR UPDATE`);
          const levels = await tx.inventoryLevel.findMany({ where: { itemId: item.id }, include: { location: { select: { organizationId: true } } } });
          if (levels.some((level) => level.location.organizationId !== organization.id)) throw new Error("Cross-tenant inventory level detected; no stock was added.");
          if (levels.some((level) => level.quantityReserved.lt(0) || !level.quantityAvailable.eq(Prisma.Decimal.max(level.quantityOnHand.minus(level.quantityReserved), 0)))) {
            throw new Error("Existing reserved/available quantities are inconsistent; resolve the baseline before replenishment.");
          }
          const plan = planInventoryMinimum(levels, stockingIds, minimum, !item.unit || item.unit.type === "QUANTITY" ? "1" : "0.001");
          const adjustments = [];
          for (const allocation of plan.allocations) {
            const idempotencyKey = seedEventKey(options.datasetVersion, organization.id, item.id, allocation.locationId);
            const existing = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId: organization.id, eventSource: "INTERNAL", idempotencyKey } } });
            if (existing) throw new Error("This dataset already replenished the item, but later consumption reduced it below minimum; use a separately recorded replenishment phase.");
            const level = levels.find((row) => row.locationId === allocation.locationId);
            const unitCost = level?.averageCost.gt(0) ? level.averageCost : item.costPrice;
            if (unitCost.lte(0)) throw new Error("A positive evidenced unit cost is required for this stock replenishment.");
            const systemQuantity = level?.quantityOnHand ?? new Prisma.Decimal(0);
            const lot = syntheticLot(item.id, item.nameEn, allocation.locationId, options.referenceDate);
            const adjustment = await createStockAdjustment({
              organizationId: organization.id, locationId: allocation.locationId,
              type: "OTHER", reason: "Synthetic development dataset replenishment",
              createdById: maker.id, adjustmentDate: options.referenceDate,
              notes: "SYNTHETIC LOCAL DEVELOPMENT DATA: approved dataset replenishment, not a physical supplier receipt or statutory evidence.",
              metadata: { synthetic: true, purpose: "systematic-development-reseed", datasetVersion: options.datasetVersion, minimumPerItem: minimum, idempotencyKey },
              lines: [{ itemId: item.id, systemQuantity: systemQuantity.toFixed(3), actualQuantity: systemQuantity.plus(allocation.quantity).toFixed(3), adjustedQuantity: allocation.quantity, unitCost: unitCost.toFixed(2), notes: "Synthetic stock for application workflow verification.", ...(item.trackBatches ? { batchNumber: lot.batchNumber } : {}), ...(item.trackExpiry ? { expiryDate: lot.expiryDate } : {}) }],
            }, tx);
            const posted = await postStockAdjustment({ organizationId: organization.id, adjustmentId: adjustment.id, approvedById: checker.id, occurredAt: options.referenceDate, idempotencyKey }, tx);
            if (posted.ledger.status !== "POSTED" || !posted.ledger.journalEntryId) {
              throw new Error(`${posted.ledger.blockerCode ?? "LEDGER_BLOCKED"}: ${posted.ledger.message ?? "Inventory ledger posting failed"}`);
            }
            adjustments.push({ adjustmentId: adjustment.id, locationId: allocation.locationId, quantity: allocation.quantity, eventId: posted.eventId, journalEntryId: posted.ledger.journalEntryId });
          }
          const after = await tx.inventoryLevel.aggregate({ where: { itemId: item.id }, _sum: { quantityOnHand: true } });
          const quantity = after._sum.quantityOnHand ?? new Prisma.Decimal(0);
          if (quantity.lt(minimum)) throw new Error("The replenished item still falls below its minimum.");
          return { after: quantity.toFixed(3), adjustments };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15_000, timeout: 120_000 });
        outcomes.push({ ...base, ...result, status: result.adjustments.length ? "REPLENISHED" : "ALREADY_SUFFICIENT" });
      } catch (error) {
        outcomes.push({ ...base, status: "BLOCKED", reason: error instanceof Error ? error.message : String(error) });
      }
    }
    finalProjection.push(await rebuildInventoryProjection({ organizationId: organization.id }, client));
  }
  return { datasetVersion: options.datasetVersion, minimum, effectiveAt: options.referenceDate.toISOString(), outcomes, baselineProjection, finalProjection,
    summary: { itemCount: outcomes.length, replenished: outcomes.filter((row) => row.status === "REPLENISHED").length, belowMinimum: outcomes.filter((row) => new Prisma.Decimal(row.after).lt(minimum)).length, exceptions: outcomes.filter((row) => row.status === "EXCEPTION").length, blocked: outcomes.filter((row) => row.status === "BLOCKED").length } };
}
