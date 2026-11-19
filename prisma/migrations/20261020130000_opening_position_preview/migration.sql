-- Separate immutable financial-opening evidence; no financial apply in AF09.
CREATE TABLE "financial_opening_revisions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "cutoverDate" TEXT NOT NULL CHECK ("cutoverDate" = '2026-10-01'),
  "revision" INTEGER NOT NULL CHECK ("revision" BETWEEN 1 AND 100),
  "sourceFilename" TEXT NOT NULL, "controlsFilename" TEXT NOT NULL,
  "sourceContent" TEXT NOT NULL CHECK (octet_length("sourceContent") <= 100000),
  "controlsContent" TEXT NOT NULL CHECK (octet_length("controlsContent") <= 100000),
  "sourceHash" TEXT NOT NULL, "controlsHash" TEXT NOT NULL, "mappingHash" TEXT NOT NULL, "datasetHash" TEXT NOT NULL,
  "mappings" JSONB NOT NULL, "manifest" JSONB NOT NULL, "manifestDigest" TEXT NOT NULL,
  "commandHash" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
  "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'STAGED' CHECK ("status" IN ('STAGED', 'REVIEWED', 'CHANGES_REQUESTED')),
  "reviewedById" TEXT, "reviewedAt" TIMESTAMP(3), "reviewDigest" TEXT,
  "reviewKey" TEXT, "reviewCommandHash" TEXT, "conclusion" TEXT,
  CONSTRAINT "financial_opening_review_shape" CHECK (
    ("status" = 'STAGED' AND "reviewedById" IS NULL AND "reviewedAt" IS NULL AND "reviewDigest" IS NULL AND "reviewKey" IS NULL AND "reviewCommandHash" IS NULL AND "conclusion" IS NULL)
    OR ("status" <> 'STAGED' AND "reviewedById" IS NOT NULL AND "reviewedById" <> "createdById" AND "reviewedAt" IS NOT NULL AND "reviewDigest" IS NOT NULL AND "reviewKey" IS NOT NULL AND "reviewCommandHash" IS NOT NULL AND length("conclusion") BETWEEN 10 AND 2000))
);
CREATE UNIQUE INDEX "financial_opening_revisions_organizationId_cutoverDate_revision_key" ON "financial_opening_revisions"("organizationId", "cutoverDate", "revision");
CREATE UNIQUE INDEX "financial_opening_revisions_organizationId_idempotencyKey_key" ON "financial_opening_revisions"("organizationId", "idempotencyKey");
CREATE INDEX "financial_opening_revisions_organizationId_cutoverDate_sourceHash_idx" ON "financial_opening_revisions"("organizationId", "cutoverDate", "sourceHash");
CREATE FUNCTION "financial_opening_preserve_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Financial opening evidence is retained'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','reviewedById','reviewedAt','reviewDigest','reviewKey','reviewCommandHash','conclusion'])
    IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','reviewedById','reviewedAt','reviewDigest','reviewKey','reviewCommandHash','conclusion'])
    OR OLD."status" <> 'STAGED' THEN
    RAISE EXCEPTION 'Financial opening evidence is immutable; stage a new revision';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "financial_opening_preserve_evidence"
BEFORE UPDATE OR DELETE ON "financial_opening_revisions"
FOR EACH ROW EXECUTE FUNCTION "financial_opening_preserve_evidence"();
