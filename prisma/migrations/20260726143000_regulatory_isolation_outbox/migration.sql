-- Additive outbox states for deferred regulatory processing.
ALTER TYPE "BusinessOutboxChannel" ADD VALUE IF NOT EXISTS 'FISCALIZATION';
ALTER TYPE "BusinessOutboxStatus" ADD VALUE IF NOT EXISTS 'DEFERRED';
