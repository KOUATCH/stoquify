-- POS writes sales orders and therefore requires the Sales module entitlement.
-- Repair registrations created before that dependency was included in the bundle.
UPDATE "organizations"
SET
  "requestedModules" = array_append("requestedModules", 'Sales'),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1 FROM unnest("requestedModules") AS module_name
  WHERE lower(trim(module_name)) IN ('pos', 'point of sale', 'point_of_sale')
)
AND NOT EXISTS (
  SELECT 1 FROM unnest("requestedModules") AS module_name
  WHERE lower(trim(module_name)) = 'sales'
);
