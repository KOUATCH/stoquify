const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "../..")
const migrationsRoot = path.join(root, "prisma", "migrations")
const historicalTimestamp = "20260818120000"
const historicalNames = [
  "20260818120000_governed_delivery_order_to_cash",
  "20260818120000_pos_electronic_tender_authority",
]
const repairName = "20260818130000_sales_order_reporting_schema_repair"
const repair = fs.readFileSync(
  path.join(migrationsRoot, repairName, "migration.sql"),
  "utf8",
)
const schema = fs.readFileSync(path.join(root, "prisma", "schema.prisma"), "utf8")

function migrationNames() {
  return fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) =>
      fs.existsSync(path.join(migrationsRoot, entry.name, "migration.sql")),
    )
    .map((entry) => entry.name)
    .sort()
}

describe("sales-order reporting schema repair migration", () => {
  it("preserves the applied migration identities and orders the repair after them", () => {
    const names = migrationNames()
    const historical = names.filter((name) => name.startsWith(`${historicalTimestamp}_`))
    const repairTimestamp = repairName.slice(0, 14)

    expect(historical).toEqual(historicalNames)
    expect(repairTimestamp > historicalTimestamp).toBe(true)
    expect(names.filter((name) => name.startsWith(`${repairTimestamp}_`))).toEqual([
      repairName,
    ])
    expect(names.indexOf(repairName)).toBeGreaterThan(
      Math.max(...historicalNames.map((name) => names.indexOf(name))),
    )
  })

  it("is an idempotent forward repair for the daily-report scalar projection", () => {
    expect(repair).toContain(
      'ADD COLUMN IF NOT EXISTS "channel" "SalesOrderChannel" NOT NULL DEFAULT \'POS\'',
    )
    expect(repair).toContain('ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0')
    expect(repair).toContain('ADD COLUMN IF NOT EXISTS "deliveryAddress" JSONB')
    expect(repair).toContain(
      'ADD COLUMN IF NOT EXISTS "reservedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0',
    )
    expect(repair).toContain(
      'CREATE INDEX IF NOT EXISTS "sales_orders_organizationId_channel_status_orderDate_idx"',
    )
    expect(repair).toContain("sales_orders.channel schema repair did not reach the required state")
    expect(repair).not.toMatch(/\b(?:DROP|TRUNCATE|DELETE)\b/i)
  })

  it("matches the Prisma channel type, default, and reporting index", () => {
    const salesOrder = schema.match(/model SalesOrder \{[\s\S]*?\n\}/)?.[0] ?? ""
    const channel = schema.match(/enum SalesOrderChannel \{[\s\S]*?\n\}/)?.[0] ?? ""

    expect(salesOrder).toMatch(/channel\s+SalesOrderChannel\s+@default\(POS\)/)
    expect(salesOrder).toContain("@@index([organizationId, channel, status, orderDate])")
    expect(channel).toMatch(/\bPOS\b/)
    expect(channel).toMatch(/\bDELIVERY\b/)
  })
})
