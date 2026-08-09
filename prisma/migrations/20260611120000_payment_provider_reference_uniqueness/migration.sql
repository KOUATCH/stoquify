-- Prevent duplicate electronic payment capture across card, mobile-money, and bank-transfer rails.
-- PostgreSQL unique indexes allow multiple NULL values, so cash/credit rows without provider refs remain valid.
CREATE UNIQUE INDEX "payments_org_method_txn_key"
  ON "payments"("organizationId", "method", "transactionId");

CREATE UNIQUE INDEX "payments_org_method_auth_key"
  ON "payments"("organizationId", "method", "authorizationCode");

CREATE UNIQUE INDEX "payments_org_momo_ref_key"
  ON "payments"("organizationId", "mobileMoneyProvider", "mobileMoneyReference");

CREATE UNIQUE INDEX "payments_org_method_bank_ref_key"
  ON "payments"("organizationId", "method", "bankReference");
