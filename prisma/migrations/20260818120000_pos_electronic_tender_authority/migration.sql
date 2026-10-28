-- Additive POS electronic-tender authority boundary.
-- This migration does not create provider credentials, enable a production
-- adapter, or rewrite existing payment, sale, provider, or ledger history.

ALTER TYPE "PaymentTransactionState" ADD VALUE IF NOT EXISTS 'UNKNOWN';

ALTER TABLE "payment_transactions"
  ADD COLUMN "providerAuthorityEventId" TEXT;

CREATE UNIQUE INDEX "provider_events_organizationId_id_key"
  ON "provider_events"("organizationId", "id");

CREATE UNIQUE INDEX "payment_transactions_providerAuthorityEventId_key"
  ON "payment_transactions"("providerAuthorityEventId");

CREATE UNIQUE INDEX "payment_transactions_organizationId_providerAuthorityEventId_key"
  ON "payment_transactions"("organizationId", "providerAuthorityEventId");

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_organizationId_providerAuthorityEventId_fkey"
  FOREIGN KEY ("organizationId", "providerAuthorityEventId")
  REFERENCES "provider_events"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "payment_transactions_enforce_authority_event_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD."providerAuthorityEventId" IS NOT NULL
    AND OLD."providerAuthorityEventId" IS DISTINCT FROM NEW."providerAuthorityEventId" THEN
    RAISE EXCEPTION 'Payment transaction provider authority event is immutable once linked';
  END IF;

  IF NEW."providerAuthorityEventId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "provider_events" provider_event
    WHERE provider_event."id" = NEW."providerAuthorityEventId"
      AND provider_event."organizationId" = NEW."organizationId"
      AND provider_event."providerAccountId" = NEW."providerAccountId"
      AND provider_event."providerTransactionId" = NEW."providerTransactionId"
  ) THEN
    RAISE EXCEPTION 'Payment transaction authority event does not match its tenant, provider account, and provider transaction';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "payment_transactions_enforce_authority_event_scope_trigger"
BEFORE INSERT OR UPDATE OF "providerAuthorityEventId", "organizationId", "providerAccountId", "providerTransactionId"
ON "payment_transactions"
FOR EACH ROW EXECUTE FUNCTION "payment_transactions_enforce_authority_event_scope"();
