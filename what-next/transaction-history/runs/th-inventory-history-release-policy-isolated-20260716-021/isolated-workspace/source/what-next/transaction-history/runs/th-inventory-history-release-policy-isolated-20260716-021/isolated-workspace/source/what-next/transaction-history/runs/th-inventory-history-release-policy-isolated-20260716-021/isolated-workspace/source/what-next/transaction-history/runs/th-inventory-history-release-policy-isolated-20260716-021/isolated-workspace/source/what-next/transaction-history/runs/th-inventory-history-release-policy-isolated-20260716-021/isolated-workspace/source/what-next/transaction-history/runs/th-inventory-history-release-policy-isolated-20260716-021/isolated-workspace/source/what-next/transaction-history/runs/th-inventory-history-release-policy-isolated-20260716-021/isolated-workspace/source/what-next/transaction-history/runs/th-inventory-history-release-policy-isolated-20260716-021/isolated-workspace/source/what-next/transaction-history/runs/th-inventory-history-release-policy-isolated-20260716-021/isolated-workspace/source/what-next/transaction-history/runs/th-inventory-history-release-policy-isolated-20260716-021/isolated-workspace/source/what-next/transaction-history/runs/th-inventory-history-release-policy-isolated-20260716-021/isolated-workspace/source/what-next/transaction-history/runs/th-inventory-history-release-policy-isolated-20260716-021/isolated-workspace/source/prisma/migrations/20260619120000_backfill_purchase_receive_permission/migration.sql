-- Ensure operational manager roles can execute the guarded purchase-order
-- receiving workflow through the canonical RBAC permission.
UPDATE "roles"
SET "permissions" = array_append(array_remove("permissions", 'RECEIVE_GOODS'), 'purchases.orders.receive')
WHERE lower("code") IN ('manager', 'branch_manager')
  AND NOT ('*' = ANY("permissions"))
  AND NOT ('purchases.orders.receive' = ANY("permissions"));

UPDATE "roles"
SET "permissions" = array_remove("permissions", 'RECEIVE_GOODS')
WHERE 'RECEIVE_GOODS' = ANY("permissions");
