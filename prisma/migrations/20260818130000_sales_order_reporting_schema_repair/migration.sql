-- Forward-only repair for the historical 20260818120000 migration collision.
-- Do not rename either historical migration: both names may already be present
-- in _prisma_migrations. This uniquely ordered migration is safe whether the
-- governed-delivery migration ran normally or was recorded without its schema.

DO $$
BEGIN
  CREATE TYPE "SalesOrderChannel" AS ENUM ('POS', 'DELIVERY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TYPE "SalesOrderChannel" ADD VALUE IF NOT EXISTS 'POS';
ALTER TYPE "SalesOrderChannel" ADD VALUE IF NOT EXISTS 'DELIVERY';

-- Prisma selects every scalar field when the daily report includes orders and
-- lines. Repair the full scalar projection introduced with `channel` so fixing
-- the first missing column cannot expose the next one on the following request.
ALTER TABLE "sales_orders"
  ADD COLUMN IF NOT EXISTS "channel" "SalesOrderChannel" NOT NULL DEFAULT 'POS',
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deliveryAddress" JSONB,
  ADD COLUMN IF NOT EXISTS "priceTaxSnapshotHash" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirmedById" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredById" TEXT;

ALTER TABLE "sales_order_lines"
  ADD COLUMN IF NOT EXISTS "reservedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deliveredQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "billedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0;

-- Normalize required defaults and nullability if a partial/manual repair left
-- the columns present but weaker than the Prisma schema contract.
UPDATE "sales_orders"
SET "channel" = 'POS'
WHERE "channel" IS NULL;

UPDATE "sales_orders"
SET "version" = 0
WHERE "version" IS NULL;

UPDATE "sales_order_lines"
SET
  "reservedQuantity" = COALESCE("reservedQuantity", 0),
  "deliveredQuantity" = COALESCE("deliveredQuantity", 0),
  "billedQuantity" = COALESCE("billedQuantity", 0)
WHERE "reservedQuantity" IS NULL
  OR "deliveredQuantity" IS NULL
  OR "billedQuantity" IS NULL;

ALTER TABLE "sales_orders"
  ALTER COLUMN "channel" SET DEFAULT 'POS',
  ALTER COLUMN "channel" SET NOT NULL,
  ALTER COLUMN "version" SET DEFAULT 0,
  ALTER COLUMN "version" SET NOT NULL;

ALTER TABLE "sales_order_lines"
  ALTER COLUMN "reservedQuantity" SET DEFAULT 0,
  ALTER COLUMN "reservedQuantity" SET NOT NULL,
  ALTER COLUMN "deliveredQuantity" SET DEFAULT 0,
  ALTER COLUMN "deliveredQuantity" SET NOT NULL,
  ALTER COLUMN "billedQuantity" SET DEFAULT 0,
  ALTER COLUMN "billedQuantity" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "sales_orders_organizationId_channel_status_orderDate_idx"
  ON "sales_orders"("organizationId", "channel", "status", "orderDate");

-- Fail closed if the repair did not establish the runtime contract expected by
-- the generated Prisma client.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'sales_orders'
      AND column_name = 'channel'
      AND udt_name = 'SalesOrderChannel'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'sales_orders.channel schema repair did not reach the required state';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_type.typname = 'SalesOrderChannel'
      AND pg_namespace.nspname = current_schema()
      AND pg_enum.enumlabel = 'POS'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_type.typname = 'SalesOrderChannel'
      AND pg_namespace.nspname = current_schema()
      AND pg_enum.enumlabel = 'DELIVERY'
  ) THEN
    RAISE EXCEPTION 'SalesOrderChannel must contain POS and DELIVERY';
  END IF;
END
$$;
