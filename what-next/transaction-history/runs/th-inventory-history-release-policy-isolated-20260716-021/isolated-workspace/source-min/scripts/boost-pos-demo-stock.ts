import { Prisma, PrismaClient, TransactionReferenceType, TransactionType } from "@prisma/client"

// @inventory-boundary-demo-script
// Demo-only stock booster for local POS stress testing. Do not use for runtime tenant stock workflows.
const prisma = new PrismaClient()

const DEFAULT_TARGET_STOCK = "12500"
const DEFAULT_ITEMS_PER_ORG = 50

function argValue(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
}

function intArg(name: string, fallback: number) {
  const raw = argValue(name)
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function decimalArg(name: string, fallback: string) {
  const raw = argValue(name) || fallback
  const value = new Prisma.Decimal(raw)
  if (value.lte(12445)) {
    throw new Error(`--${name} must be greater than 12445 for POS stress testing`)
  }
  return value.toDecimalPlaces(3)
}

function money(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

function qty(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(3)
}

function isDryRun() {
  return process.argv.includes("--dry-run")
}

function isVerifyOnly() {
  return process.argv.includes("--verify")
}

async function verifyStock(threshold: Prisma.Decimal) {
  const organizations = await prisma.organization.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  })

  let allPassed = true

  for (const organization of organizations) {
    const highStockLevels = await prisma.inventoryLevel.findMany({
      where: {
        item: {
          organizationId: organization.id,
          trackInventory: true,
          isActive: true,
          isDiscontinued: false,
          deletedAt: null,
        },
        location: {
          organizationId: organization.id,
          isActive: true,
          deletedAt: null,
        },
        quantityOnHand: { gt: threshold },
        quantityAvailable: { gt: threshold },
      },
      select: {
        itemId: true,
        locationId: true,
      },
    })
    const highStockItems = new Set(highStockLevels.map((level) => level.itemId))
    const passed = highStockItems.size > 0 && highStockLevels.length > 0
    allPassed = allPassed && passed

    console.log(
      `${organization.name}: ${highStockItems.size} items and ${highStockLevels.length} inventory levels above ${threshold.toFixed(3)} units.`,
    )
  }

  if (!allPassed) {
    throw new Error("One or more organizations still have no POS-visible high-stock items.")
  }
}

async function main() {
  const dryRun = isDryRun()
  const verifyOnly = isVerifyOnly()
  const targetStock = decimalArg("target", DEFAULT_TARGET_STOCK)
  const verifyThreshold = new Prisma.Decimal(12445).toDecimalPlaces(3)
  const itemsPerOrg = intArg("items", DEFAULT_ITEMS_PER_ORG)
  const now = new Date()
  const referenceNumber = `POS-DEMO-STOCK-${now.toISOString().slice(0, 10).replace(/-/g, "")}`

  if (verifyOnly) {
    await verifyStock(verifyThreshold)
    return
  }

  const organizations = await prisma.organization.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  })

  if (organizations.length === 0) {
    console.log("No active organizations found.")
    return
  }

  let totalLevelsTouched = 0
  let totalMovementsCreated = 0
  let totalItemsTouched = 0

  for (const [orgIndex, organization] of organizations.entries()) {
    const [locations, items] = await Promise.all([
      prisma.location.findMany({
        where: {
          organizationId: organization.id,
          isActive: true,
          deletedAt: null,
        },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          code: true,
        },
      }),
      prisma.item.findMany({
        where: {
          organizationId: organization.id,
          isActive: true,
          isDiscontinued: false,
          deletedAt: null,
          trackInventory: true,
        },
        orderBy: [{ nameEn: "asc" }, { sku: "asc" }],
        take: itemsPerOrg,
        select: {
          id: true,
          nameEn: true,
          sku: true,
          costPrice: true,
          inventoryLevels: {
            select: {
              id: true,
              locationId: true,
              quantityOnHand: true,
              quantityAvailable: true,
              averageCost: true,
            },
          },
        },
      }),
    ])

    if (locations.length === 0 || items.length === 0) {
      console.log(
        `${organization.name}: skipped (${locations.length} active locations, ${items.length} tracked items).`,
      )
      continue
    }

    const orgTarget = targetStock.plus(orgIndex * 100).toDecimalPlaces(3)
    const plannedLevels = locations.length * items.length
    totalItemsTouched += items.length
    totalLevelsTouched += plannedLevels

    console.log(
      `${organization.name}: ${items.length} items x ${locations.length} locations -> ${plannedLevels} inventory levels at ${orgTarget.toFixed(3)}+ units.`,
    )

    if (dryRun) continue

    const movementsCreated = await prisma.$transaction(
      async (tx) => {
        let movementCount = 0

        for (const [itemIndex, item] of items.entries()) {
          const baseQuantity = orgTarget.plus(itemIndex).toDecimalPlaces(3)
          const averageCost = money(
            item.costPrice && new Prisma.Decimal(item.costPrice).gt(0)
              ? item.costPrice
              : 1,
          )
          const existingByLocation = new Map(
            item.inventoryLevels.map((level) => [level.locationId, level]),
          )

          for (const [locationIndex, location] of locations.entries()) {
            const targetQuantity = baseQuantity.plus(locationIndex).toDecimalPlaces(3)
            const existing = existingByLocation.get(location.id)
            const currentOnHand = qty(existing?.quantityOnHand ?? 0)
            const nextOnHand = currentOnHand.gt(targetQuantity)
              ? currentOnHand
              : targetQuantity
            const delta = nextOnHand.minus(currentOnHand).toDecimalPlaces(3)
            const levelAverageCost = existing?.averageCost && new Prisma.Decimal(existing.averageCost).gt(0)
              ? money(existing.averageCost)
              : averageCost
            const totalValue = money(nextOnHand.mul(levelAverageCost))

            if (existing) {
              await tx.inventoryLevel.update({
                where: { id: existing.id },
                data: {
                  quantityOnHand: nextOnHand,
                  quantityReserved: 0,
                  quantityAvailable: nextOnHand,
                  averageCost: levelAverageCost,
                  totalValue,
                  version: { increment: 1 },
                  lastTransactionAt: now,
                },
              })
            } else {
              await tx.inventoryLevel.create({
                data: {
                  itemId: item.id,
                  locationId: location.id,
                  quantityOnHand: nextOnHand,
                  quantityReserved: 0,
                  quantityAvailable: nextOnHand,
                  averageCost: levelAverageCost,
                  totalValue,
                  lastTransactionAt: now,
                },
              })
            }

            if (delta.gt(0)) {
              await tx.inventoryTransaction.create({
                data: {
                  type: existing ? TransactionType.ADJUSTMENT_IN : TransactionType.INITIAL_STOCK,
                  quantity: delta,
                  unitCost: levelAverageCost,
                  totalCost: money(delta.mul(levelAverageCost)),
                  notes: `Demo POS/accounting stock boost for ${item.sku} at ${location.code || location.name}`,
                  itemId: item.id,
                  locationId: location.id,
                  organizationId: organization.id,
                  referenceType: TransactionReferenceType.MANUAL,
                  referenceId: referenceNumber,
                  referenceNumber,
                  serialNumbers: [],
                  balanceAfter: nextOnHand,
                  createdAt: now,
                },
              })
              movementCount += 1
            }
          }
        }

        return movementCount
      },
      {
        maxWait: 10_000,
        timeout: 120_000,
      },
    )

    totalMovementsCreated += movementsCreated
  }

  console.log("")
  if (dryRun) {
    console.log(`Dry run complete. Planned ${totalLevelsTouched} inventory levels across ${totalItemsTouched} item selections.`)
    console.log("Run without --dry-run to apply the demo stock boost.")
  } else {
    console.log(`Stock boost complete. Touched ${totalLevelsTouched} inventory levels and created ${totalMovementsCreated} stock movement rows.`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
