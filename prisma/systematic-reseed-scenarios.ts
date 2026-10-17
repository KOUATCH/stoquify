import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";
import { getModuleCompositionData, previewModuleComposition, saveModuleCompositionDraft } from "../services/modules/module-composition.service";
import { createTimeFoundation, importOperationalTime } from "../services/hris/operational-time.service";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const writeEvidence = (file: string, value: unknown) => {
  const content = JSON.stringify(value, null, 2) + "\n";
  writeFileSync(file, content);
  return createHash("sha256").update(content).digest("hex");
};

/** Create genuine local draft/readiness scenarios; no external approval is asserted. */
export async function seedSystematicScenarios(input: { prisma: PrismaClient; runId: string; outputDirectory: string }) {
  const report: { customerLocationsAdded: number; modules: unknown[]; time: unknown[]; issues: unknown[] } = { customerLocationsAdded: 0, modules: [], time: [], issues: [] };
  const organizations = await input.prisma.organization.findMany({ where: { id: { in: ["rds_org_001", "rds_org_002"] }, isActive: true, deletedAt: null }, orderBy: { id: "asc" } });
  for (const organization of organizations) {
    const people = await input.prisma.user.findMany({ where: { organizationId: organization.id, isActive: true, isLocked: false }, include: { roles: true }, orderBy: { id: "asc" } });
    const permissions = (user: (typeof people)[number]) => [...new Set(user.roles.flatMap(role => role.permissions))];
    const actor = people.find(user => permissions(user).includes("*")) ?? people.find(user => permissions(user).includes("MANAGE_SYSTEM_SETTINGS"));
    if (!actor) { report.issues.push({ organizationId: organization.id, code: "NO_CONFIGURATION_ACTOR" }); continue; }
    const control = { organizationId: organization.id, actorId: actor.id, actorPermissions: permissions(actor) };
    // Scope customers to actual historical sale locations. Do not assign every
    // customer to every branch merely to populate a join table.
    const orders = await input.prisma.salesOrder.findMany({ where: { organizationId: organization.id }, select: { customerId: true, locationId: true }, distinct: ["customerId", "locationId"] });
    for (const order of orders) {
      if (!order.customerId || !order.locationId) continue;
      const key = { organizationId: organization.id, customerId: order.customerId, locationId: order.locationId };
      if (await input.prisma.customerLocation.findUnique({ where: { organizationId_customerId_locationId: key } })) continue;
      await input.prisma.$transaction(async tx => {
        const link = await tx.customerLocation.create({ data: { ...key, source: "MANUAL" } });
        await tx.auditLog.create({ data: { organizationId: organization.id, userId: actor.id, entityType: "CustomerLocation", entityId: link.id, action: "SYNTHETIC_RESEED_CUSTOMER_SCOPE", changes: { source: "existing_sales_order_location", classification: "SYNTHETIC_LOCAL_DEVELOPMENT", runId: input.runId } } });
      });
      report.customerLocationsAdded++;
    }
    try {
      const before = await getModuleCompositionData(control);
      const key = `${input.runId}:module-draft:${organization.id}`;
      const previous = await input.prisma.tenantModuleConfigurationCommand.findUnique({ where: { organizationId_idempotencyKey: { organizationId: organization.id, idempotencyKey: key } } });
      if (!previous) {
        await saveModuleCompositionDraft(control, { selectedModules: before.selectedModules, expectedRevision: before.revision, setupInputs: before.setupInputs, idempotencyKey: key });
      }
      const after = await getModuleCompositionData(control);
      if (JSON.stringify([...before.activeModules].sort()) !== JSON.stringify([...after.activeModules].sort())) throw new Error("Module snapshot changed active access.");
      const preview = await previewModuleComposition(control, { selectedModules: after.selectedModules, expectedRevision: after.revision, setupInputs: after.setupInputs });
      report.modules.push({ organizationId: organization.id, state: "DRAFT", preservedActiveModules: after.activeModules, source: after.source, commandReused: Boolean(previous), readiness: preview.requirements, issues: preview.issues });
    } catch (error) { report.issues.push({ organizationId: organization.id, code: "MODULE_SCENARIO", detail: error instanceof Error ? error.message : String(error) }); }
    try {
      const code = "SYNTHETIC-RESEED-2026";
      const existing = await input.prisma.hrisWorkCalendar.findFirst({ where: { organizationId: organization.id, code, version: 1 } });
      const evidence = { kind: "SYNTHETIC_COMPANY_POLICY_PROPOSAL", countryCode: "CM", effectiveFrom: "2026-09-01", workWeek: "Monday-Friday", scheduledMinutesPerDay: 480, annualEntitlementMinutes: 9600, carryOverLimitMinutes: 0, publicHolidays: [], legalApproval: "NOT_REVIEWED", note: "Illustrative company proposal only; not a statement of statutory entitlement." };
      mkdirSync(path.join(input.outputDirectory, "synthetic-documents"), { recursive: true });
      const policyHash = writeEvidence(path.join(input.outputDirectory, "synthetic-documents", `${organization.id}-time-policy.json`), evidence);
      if (!existing) await createTimeFoundation({ ...control, countryCode: "CM", calendarCode: code, calendarName: "Synthetic company work-calendar proposal", timezone: "Africa/Douala", calendarVersion: 1, effectiveFrom: new Date("2026-09-01T00:00:00Z"), calendarSourceHash: policyHash, holidays: [], leavePolicyCode: code, leavePolicyName: "Synthetic annual-leave proposal — review required", leavePolicyVersion: 1, annualEntitlementMinutes: 9600, carryOverLimitMinutes: 0, accrualRule: { kind: "SYNTHETIC_COMPANY_PROPOSAL", annualMinutes: 9600, legalApproval: "NOT_REVIEWED" }, leavePolicySourceHash: policyHash }, input.prisma);
      const importKey = `${input.runId}:attendance:${organization.id}`;
      const priorImport = await input.prisma.hrisTimeImportBatch.findUnique({ where: { organizationId_idempotencyKey: { organizationId: organization.id, idempotencyKey: importKey } } });
      if (!priorImport) {
        const employees = await input.prisma.payrollEmployee.findMany({ where: { organizationId: organization.id, deletedAt: null }, orderBy: { id: "asc" }, take: 12 });
        const entries = employees.flatMap((employee, index) => [21, 22, 23, 24, 25].map(day => {
          const row = { sourceRecordId: `${employee.id}:2026-09-${day}`, employeeId: employee.id, workDate: new Date(`2026-09-${day}T08:00:00Z`), scheduledMinutes: 480, workedMinutes: index === 0 && day === 25 ? 420 : 480, overtimeMinutes: 0, absenceMinutes: index === 0 && day === 25 ? 60 : 0 };
          return { ...row, sourceHash: hash(row) };
        }));
        const document = { classification: "SYNTHETIC_LOCAL_DEVELOPMENT", certification: "UNAPPROVED_FOR_PAYROLL", entries };
        const documentHash = writeEvidence(path.join(input.outputDirectory, "synthetic-documents", `${organization.id}-attendance.json`), document);
        if (entries.length) await importOperationalTime({ ...control, sourceSystem: "Stoquify synthetic development reseed", sourceFileName: `${organization.id}-attendance.json`, sourceHash: documentHash, idempotencyKey: importKey, entries }, input.prisma);
      }
      report.time.push({ organizationId: organization.id, foundationState: "DRAFT", policyRequiresReview: true, attendanceReused: Boolean(priorImport), certification: "NOT_CERTIFIED_FOR_PAYROLL" });
    } catch (error) { report.issues.push({ organizationId: organization.id, code: "TIME_SCENARIO", detail: error instanceof Error ? error.message : String(error) }); }
  }
  return report;
}
