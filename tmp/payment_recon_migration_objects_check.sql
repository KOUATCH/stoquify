DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paymentrailtype') THEN
    missing := array_append(missing, 'enum:PaymentRailType');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paymentreconciliationinboxstatus') THEN
    missing := array_append(missing, 'enum:PaymentReconciliationInboxStatus');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_rails') THEN
    missing := array_append(missing, 'table:payment_rails');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'provider_accounts') THEN
    missing := array_append(missing, 'table:provider_accounts');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_reconciliation_inbox_items') THEN
    missing := array_append(missing, 'table:payment_reconciliation_inbox_items');
  END IF;

  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'migration objects missing: %', array_to_string(missing, ',');
  END IF;
END $$;
