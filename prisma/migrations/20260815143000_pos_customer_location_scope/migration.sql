-- Explicit tenant-safe customer/location associations for POS visibility.
-- Existing assignments are derived only from non-draft historical sales;
-- customers without location evidence intentionally remain unassigned.

CREATE TYPE "CustomerLocationSource" AS ENUM ('HISTORICAL_SALE', 'POS_CREATION', 'MANUAL');

CREATE UNIQUE INDEX "customers_organizationId_id_key"
ON "customers"("organizationId", "id");

CREATE TABLE "customer_locations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "source" "CustomerLocationSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_locations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_locations_org_customer_location_key"
ON "customer_locations"("organizationId", "customerId", "locationId");

CREATE INDEX "customer_locations_org_location_customer_idx"
ON "customer_locations"("organizationId", "locationId", "customerId");

CREATE INDEX "customer_locations_org_customer_idx"
ON "customer_locations"("organizationId", "customerId");

ALTER TABLE "customer_locations"
ADD CONSTRAINT "customer_locations_organization_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_locations"
ADD CONSTRAINT "customer_locations_customer_fkey"
FOREIGN KEY ("organizationId", "customerId") REFERENCES "customers"("organizationId", "id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_locations"
ADD CONSTRAINT "customer_locations_location_fkey"
FOREIGN KEY ("organizationId", "locationId") REFERENCES "locations"("organizationId", "id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "customer_locations" (
    "id",
    "organizationId",
    "customerId",
    "locationId",
    "source",
    "createdAt",
    "updatedAt"
)
SELECT
    'cloc_' || md5(
        sales."organizationId" || ':' || sales."customerId" || ':' || sales."locationId"
    ),
    sales."organizationId",
    sales."customerId",
    sales."locationId",
    'HISTORICAL_SALE'::"CustomerLocationSource",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT
        orders."organizationId",
        orders."customerId",
        orders."locationId"
    FROM "sales_orders" orders
    INNER JOIN "customers" customers
        ON customers."id" = orders."customerId"
       AND customers."organizationId" = orders."organizationId"
    INNER JOIN "locations" locations
        ON locations."id" = orders."locationId"
       AND locations."organizationId" = orders."organizationId"
    WHERE orders."status" <> 'DRAFT'
      AND customers."code" IS DISTINCT FROM 'WALK_IN'
) sales
ON CONFLICT ("organizationId", "customerId", "locationId") DO NOTHING;
