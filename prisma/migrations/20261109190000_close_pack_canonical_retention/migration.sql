-- Retain exact new close-pack documents in their original export transaction.
-- Historical receipts are intentionally not backfilled or regenerated.
ALTER TABLE "close_pack_exports"
  ADD COLUMN "canonicalContent" TEXT,
  ADD COLUMN "canonicalContentSha256" TEXT,
  ADD COLUMN "exportRequestHash" TEXT;

ALTER TABLE "close_pack_exports"
  ADD CONSTRAINT "close_pack_exports_canonical_retention_shape" CHECK (
    ("canonicalContent" IS NULL AND "canonicalContentSha256" IS NULL AND "exportRequestHash" IS NULL)
    OR
    ("canonicalContent" IS NOT NULL AND length("canonicalContent") > 0
      AND "canonicalContentSha256" IS NOT NULL AND "canonicalContentSha256" ~ '^sha256:[a-f0-9]{64}$'
      AND "exportRequestHash" IS NOT NULL AND "exportRequestHash" ~ '^sha256:[a-f0-9]{64}$'
      AND "canonicalContentSha256" = 'sha256:' || encode(sha256(convert_to("canonicalContent", 'UTF8')), 'hex'))
  );

CREATE FUNCTION "close_pack_exports_retain_canonical"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."canonicalContent" IS NOT NULL THEN
      RAISE EXCEPTION 'Retained close pack documents cannot be deleted' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."canonicalContent" IS NULL AND NEW."canonicalContent" IS NOT NULL THEN
    RAISE EXCEPTION 'Historical close pack documents cannot be reconstructed by updating a receipt' USING ERRCODE = '23514';
  END IF;

  IF OLD."canonicalContent" IS NOT NULL AND ROW(
    NEW."id", NEW."organizationId", NEW."periodId", NEW."closeRunId", NEW."fileType", NEW."watermarkId",
    NEW."contentHash", NEW."rowCount", NEW."isCertified", NEW."exportedById", NEW."exportedAt", NEW."correlationId",
    NEW."canonicalContent", NEW."canonicalContentSha256", NEW."exportRequestHash", NEW."createdAt"
  ) IS DISTINCT FROM ROW(
    OLD."id", OLD."organizationId", OLD."periodId", OLD."closeRunId", OLD."fileType", OLD."watermarkId",
    OLD."contentHash", OLD."rowCount", OLD."isCertified", OLD."exportedById", OLD."exportedAt", OLD."correlationId",
    OLD."canonicalContent", OLD."canonicalContentSha256", OLD."exportRequestHash", OLD."createdAt"
  ) THEN
    RAISE EXCEPTION 'Retained close pack document and receipt identity are immutable' USING ERRCODE = '23514';
  END IF;
  -- Existing source-invalidation metadata and updatedAt remain writable.
  RETURN NEW;
END;
$$;

CREATE TRIGGER "close_pack_exports_retain_canonical_trigger"
BEFORE UPDATE OR DELETE ON "close_pack_exports"
FOR EACH ROW EXECUTE FUNCTION "close_pack_exports_retain_canonical"();
