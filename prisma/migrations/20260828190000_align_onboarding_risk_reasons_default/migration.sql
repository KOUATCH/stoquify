-- Align the replayed database with the canonical Prisma model. The original
-- risk-tier migration introduced a database default, while schema.prisma
-- requires callers to provide the non-null risk-reason array explicitly.
ALTER TABLE "onboarding_import_batches"
ALTER COLUMN "riskReasons" DROP DEFAULT;
