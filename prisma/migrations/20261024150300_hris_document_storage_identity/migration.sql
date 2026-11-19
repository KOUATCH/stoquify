-- Existing rows cannot silently move to a different deployment's object store.
-- UNBOUND rows require explicit reconciliation; no provider is invented.
ALTER TABLE hris_employee_documents ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'UNBOUND';
