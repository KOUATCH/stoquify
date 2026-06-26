CREATE TYPE "PayrollCnpsFamilyAllowanceSector" AS ENUM ('GENERAL', 'AGRICULTURE', 'PRIVATE_EDUCATION');
CREATE TYPE "PayrollCnpsOccupationalRiskGroup" AS ENUM ('A', 'B', 'C');

ALTER TABLE "organization_accounting_settings"
  ADD COLUMN "payrollCnpsFamilyAllowanceSector" "PayrollCnpsFamilyAllowanceSector",
  ADD COLUMN "payrollCnpsOccupationalRiskGroup" "PayrollCnpsOccupationalRiskGroup";
