import { randomUUID } from "crypto"
import { LocationType, PrismaClient, ProductionBatchStatus } from "@prisma/client"

const prisma = new PrismaClient()

const ORGANIZATION_ID = "org_stockflow_production_demo"
const LOCATION_ID = "loc_production_demo"

const now = () => new Date()

const ensureOrganization = () =>
  prisma.organization.upsert({
    where: { slug: "stockflow-production-demo" },
    create: {
      id: ORGANIZATION_ID,
      name: "StockFlow Production Demo",
      slug: "stockflow-production-demo",
      industry: "Food production",
      country: "Cameroon",
      currency: "XAF",
      timezone: "Africa/Douala",
      updatedAt: now(),
    },
    update: {
      name: "StockFlow Production Demo",
      updatedAt: now(),
    },
  })

const ensureLocation = () =>
  prisma.location.upsert({
    where: {
      organizationId_code: {
        organizationId: ORGANIZATION_ID,
        code: "PROD-001",
      },
    },
    create: {
      id: LOCATION_ID,
      name: "Production Kitchen",
      code: "PROD-001",
      type: LocationType.MANUFACTURING,
      address: "Douala production floor",
      organizationId: ORGANIZATION_ID,
      updatedAt: now(),
    },
    update: {
      name: "Production Kitchen",
      type: LocationType.MANUFACTURING,
      updatedAt: now(),
    },
  })

const ensureItem = async (data: {
  id: string
  sku: string
  slug: string
  nameEn: string
  nameFr: string
  descriptionEn: string
  descriptionFr: string
  costPrice: number
  sellingPrice: number
  quantityOnHand: number
  reorderPoint: number
}) => {
  const item = await prisma.item.upsert({
    where: {
      organizationId_sku: {
        organizationId: ORGANIZATION_ID,
        sku: data.sku,
      },
    },
    create: {
      id: data.id,
      slug: data.slug,
      sku: data.sku,
      nameEn: data.nameEn,
      nameFr: data.nameFr,
      descriptionEn: data.descriptionEn,
      descriptionFr: data.descriptionFr,
      imageUrls: [],
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      trackInventory: true,
      minStockLevel: data.reorderPoint,
      reorderLevel: data.reorderPoint,
      reorderQuantity: data.reorderPoint * 2,
      organizationId: ORGANIZATION_ID,
      updatedAt: now(),
    },
    update: {
      nameEn: data.nameEn,
      nameFr: data.nameFr,
      descriptionEn: data.descriptionEn,
      descriptionFr: data.descriptionFr,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      reorderLevel: data.reorderPoint,
      updatedAt: now(),
    },
  })

  await prisma.inventoryLevel.upsert({
    where: {
      itemId_locationId: {
        itemId: item.id,
        locationId: LOCATION_ID,
      },
    },
    create: {
      id: randomUUID(),
      itemId: item.id,
      locationId: LOCATION_ID,
      quantityOnHand: data.quantityOnHand,
      quantityAvailable: data.quantityOnHand,
      quantityReserved: 0,
      quantityInTransit: 0,
      quantityOnOrder: 0,
      reorderPoint: data.reorderPoint,
      averageCost: data.costPrice,
      totalValue: data.quantityOnHand * data.costPrice,
      lastCountDate: now(),
      lastTransactionAt: now(),
      updatedAt: now(),
    },
    update: {
      quantityOnHand: data.quantityOnHand,
      quantityAvailable: data.quantityOnHand,
      reorderPoint: data.reorderPoint,
      averageCost: data.costPrice,
      totalValue: data.quantityOnHand * data.costPrice,
      lastCountDate: now(),
      lastTransactionAt: now(),
      updatedAt: now(),
    },
  })

  return item
}

const seedProductionData = async () => {
  await ensureOrganization()
  await ensureLocation()

  const flour = await ensureItem({
    id: "prod_item_flour",
    sku: "RAW-FLOUR-25KG",
    slug: "wheat-flour-25kg",
    nameEn: "Wheat Flour 25 kg",
    nameFr: "Farine de ble 25 kg",
    descriptionEn: "Bulk flour for bakery production",
    descriptionFr: "Farine en vrac pour production boulangere",
    costPrice: 18_000,
    sellingPrice: 0,
    quantityOnHand: 50,
    reorderPoint: 10,
  })
  const sugar = await ensureItem({
    id: "prod_item_sugar",
    sku: "RAW-SUGAR-25KG",
    slug: "white-sugar-25kg",
    nameEn: "White Sugar 25 kg",
    nameFr: "Sucre blanc 25 kg",
    descriptionEn: "Bulk sugar for bakery production",
    descriptionFr: "Sucre en vrac pour production boulangere",
    costPrice: 20_000,
    sellingPrice: 0,
    quantityOnHand: 30,
    reorderPoint: 8,
  })
  const bread = await ensureItem({
    id: "prod_item_bread",
    sku: "FG-BREAD-LOAF",
    slug: "sandwich-bread-loaf",
    nameEn: "Sandwich Bread Loaf",
    nameFr: "Pain de mie",
    descriptionEn: "Finished sandwich bread loaf",
    descriptionFr: "Pain de mie fini",
    costPrice: 450,
    sellingPrice: 800,
    quantityOnHand: 120,
    reorderPoint: 30,
  })
  const cookies = await ensureItem({
    id: "prod_item_cookies",
    sku: "FG-COOKIE-PACK",
    slug: "butter-cookie-pack",
    nameEn: "Butter Cookie Pack",
    nameFr: "Paquet de biscuits au beurre",
    descriptionEn: "Finished cookie retail pack",
    descriptionFr: "Paquet de biscuits fini pour la vente",
    costPrice: 300,
    sellingPrice: 600,
    quantityOnHand: 180,
    reorderPoint: 45,
  })

  const recipeIds = ["prod_recipe_bread", "prod_recipe_cookies"]
  await prisma.productionBatch.deleteMany({ where: { recipeId: { in: recipeIds } } })
  await prisma.recipeIngredient.deleteMany({ where: { recipeId: { in: recipeIds } } })
  await prisma.recipe.deleteMany({ where: { id: { in: recipeIds } } })

  const breadRecipe = await prisma.recipe.create({
    data: {
      id: "prod_recipe_bread",
      nameEn: "Sandwich Bread Recipe",
      nameFr: "Recette pain de mie",
      outputItemId: bread.id,
      outputQuantity: 100,
      laborCost: 12_000,
      overheadCost: 5_000,
      version: 1,
      notes: "Current-schema bilingual production recipe.",
      organizationId: ORGANIZATION_ID,
      updatedAt: now(),
    },
  })

  await prisma.recipeIngredient.createMany({
    data: [
      {
        id: randomUUID(),
        recipeId: breadRecipe.id,
        itemId: flour.id,
        quantity: 2,
        wastePercent: 2,
        notes: "Primary flour input",
        updatedAt: now(),
      },
      {
        id: randomUUID(),
        recipeId: breadRecipe.id,
        itemId: sugar.id,
        quantity: 0.25,
        wastePercent: 1,
        notes: "Sweetener input",
        updatedAt: now(),
      },
    ],
  })

  const cookieRecipe = await prisma.recipe.create({
    data: {
      id: "prod_recipe_cookies",
      nameEn: "Butter Cookie Recipe",
      nameFr: "Recette biscuits au beurre",
      outputItemId: cookies.id,
      outputQuantity: 160,
      laborCost: 15_000,
      overheadCost: 7_500,
      version: 1,
      notes: "Current-schema bilingual production recipe.",
      organizationId: ORGANIZATION_ID,
      updatedAt: now(),
    },
  })

  await prisma.recipeIngredient.createMany({
    data: [
      {
        id: randomUUID(),
        recipeId: cookieRecipe.id,
        itemId: flour.id,
        quantity: 1.5,
        wastePercent: 2,
        notes: "Primary flour input",
        updatedAt: now(),
      },
      {
        id: randomUUID(),
        recipeId: cookieRecipe.id,
        itemId: sugar.id,
        quantity: 0.75,
        wastePercent: 1,
        notes: "Sweetener input",
        updatedAt: now(),
      },
    ],
  })

  await prisma.productionBatch.createMany({
    data: [
      {
        id: "prod_batch_bread_001",
        batchNumber: "PROD-BREAD-001",
        recipeId: breadRecipe.id,
        plannedQuantity: 100,
        actualQuantity: 96,
        status: ProductionBatchStatus.COMPLETED,
        startedAt: new Date("2026-05-20T06:00:00.000Z"),
        completedAt: new Date("2026-05-20T10:30:00.000Z"),
        totalInputCost: 65_000,
        unitCost: 677.08,
        notes: "Completed bread demo batch",
        locationId: LOCATION_ID,
        organizationId: ORGANIZATION_ID,
        updatedAt: now(),
      },
      {
        id: "prod_batch_cookie_001",
        batchNumber: "PROD-COOKIE-001",
        recipeId: cookieRecipe.id,
        plannedQuantity: 160,
        actualQuantity: 0,
        status: ProductionBatchStatus.PLANNED,
        startedAt: new Date("2026-05-27T08:00:00.000Z"),
        totalInputCost: 84_000,
        unitCost: 525,
        notes: "Planned cookie demo batch",
        locationId: LOCATION_ID,
        organizationId: ORGANIZATION_ID,
        updatedAt: now(),
      },
    ],
  })
}

seedProductionData()
  .then(() => {
    console.log("Production seed complete")
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
