import "server-only";
import { db } from "@/prisma/db";
import { hasRbacPermission } from "@/lib/security/rbac-permissions";
import { NotFoundError } from "@/services/_shared/action-errors";
import { assertSetupManager, type SetupActor } from "./setup-reviewer.service";
import { getHrisEmployeeProfile } from "./employee.service";
import { getHrisEmployeeContractRegister } from "./contract.service";
import { getHrisEmployeeCompensation } from "./compensation.service";
import { getHrisPaymentDestinationStatus } from "./payment-destination.service";
import {
  pendingHrisLifecycleFromMetadata,
  getHrisEmployeeLifecycleTimeline,
} from "./lifecycle.service";
import { pendingHrisContractDocumentEvidenceFromMetadata } from "./document-evidence.service";
import { getEmployeeContractWorkflow } from "@/services/payroll/contract.service";

// Composition only: each existing owner still controls visibility and mutations.
export async function getPeopleAuthoring(
  actor: SetupActor,
  employeeId?: string,
  client = db,
) {
  return client.$transaction(
    async (tx) => {
      await assertSetupManager(tx, actor);
      const roles = await tx.$queryRaw<
        Array<{ permissions: string[] }>
      >`SELECT r.permissions FROM roles r JOIN "_UserRoles" m ON m."A" = r.id WHERE m."B" = ${actor.actorId} AND r."organizationId" = ${actor.organizationId} FOR SHARE OF r, m`;
      const current = {
        ...actor,
        actorPermissions: roles.flatMap((r) => r.permissions),
      };
      const employees = await tx.payrollEmployee.findMany({
        where: { organizationId: actor.organizationId, deletedAt: null },
        select: { id: true, employeeNumber: true, displayName: true },
        orderBy: { employeeNumber: "asc" },
        take: 201,
      });
      const users = await tx.user.findMany({
        where: { organizationId: actor.organizationId, isActive: true },
        select: { id: true, name: true },
        take: 250,
      });
      const locations = await tx.location.findMany({
        where: { organizationId: actor.organizationId },
        select: { id: true, name: true },
        take: 250,
      });
      const organization = await tx.organization.findUniqueOrThrow({
        where: { id: actor.organizationId },
        select: { country: true, currency: true },
      });
      const summary = {
        employees,
        users,
        locations,
        organization,
        canAuthorContract: hasRbacPermission(
          current.actorPermissions,
          "payroll.contracts.manage",
        ),
        completeEmployeeList: employees.length <= 200,
      };
      if (!employeeId) return { ...summary, selected: null };
      const employee = await tx.payrollEmployee.findFirst({
        where: {
          id: employeeId,
          organizationId: actor.organizationId,
          deletedAt: null,
        },
        select: {
          id: true,
          employeeNumber: true,
          displayName: true,
          userId: true,
          hireDate: true,
          countryCode: true,
          locationId: true,
          department: true,
          jobTitle: true,
          status: true,
          updatedAt: true,
          metadata: true,
        },
      });
      if (!employee)
        throw new NotFoundError(
          "Employee is unavailable in this organization.",
        );
      const context = { ...current, employeeId };
      const profile = await getHrisEmployeeProfile(context, tx);
      const contracts = await getHrisEmployeeContractRegister(context, tx);
      const contractMoney = hasRbacPermission(
        current.actorPermissions,
        "payroll.contracts.read",
      )
        ? await getEmployeeContractWorkflow(context, tx)
        : null;
      const compensation = await getHrisEmployeeCompensation(context, tx);
      const payment = await getHrisPaymentDestinationStatus(context, tx);
      const timeline = await getHrisEmployeeLifecycleTimeline(context, tx);
      const docs = await tx.payrollContract.findMany({
        where: {
          organizationId: actor.organizationId,
          employeeId,
          deletedAt: null,
        },
        select: { id: true, metadata: true, updatedAt: true },
      });
      return {
        ...summary,
        selected: JSON.parse(
          JSON.stringify({
            employee: { ...employee, metadata: undefined },
            blockers: profile.employee.blockers,
            lifecycle: pendingHrisLifecycleFromMetadata(employee.metadata),
            contracts: (contracts.employee?.contracts ?? []).map((c) => {
              const amount = contractMoney?.employees[0]?.contracts.find(
                (m) => m.id === c.id,
              );
              return {
                ...c,
                baseSalary: amount?.baseSalary ?? null,
                currency: amount?.currency ?? null,
                canReviewAmounts: Boolean(amount && !amount.redactions.length),
              };
            }),
            documentRequests: docs.map((c) => {
              const pending = pendingHrisContractDocumentEvidenceFromMetadata(
                c.metadata,
              );
              return {
                contractId: c.id,
                pending: pending
                  ? {
                      artifactHash: pending.artifactHash,
                      malwareScanEvidenceHash: pending.malwareScanEvidenceHash,
                      malwareScanProvider: pending.malwareScanProvider,
                      malwareScannedAt: pending.malwareScannedAt,
                      signedAt: pending.signedAt,
                      retentionPolicyCode: pending.retentionPolicyCode,
                      retentionBasis: pending.retentionBasis,
                      retainUntil: pending.retainUntil,
                      legalHold: pending.legalHold,
                    }
                  : null,
              };
            }),
            compensation,
            payment: payment.employee,
            timeline,
          }),
        ),
      };
    },
    { timeout: 20000 },
  );
}
export type PeopleAuthoringView = Awaited<
  ReturnType<typeof getPeopleAuthoring>
>;
