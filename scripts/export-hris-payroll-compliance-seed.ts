import "dotenv/config";

import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { Prisma, PrismaClient } from "@prisma/client";

import {
  COMPLIANCE_HRIS_ROLE_CODES,
  COMPLIANCE_HRIS_ROLE_COUNT,
} from "../prisma/compliance-hris-role-seed";

const root = process.cwd();
const outputPath = path.join(
  root,
  "what-next",
  "hris-payroll-compliance-reseed-2026-08-20.json",
);
const credentialArtifactPath = path.join(
  root,
  ".seed-artifacts",
  "seed-login-credentials.json",
);
const sourceDocument =
  "docs/blockers-and-gates/Compliance authorization validation.docx";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function expandEnvValue(value: string) {
  return value.replace(/\$\{([^}]+)\}/g, (_match, key: string) => process.env[key] ?? "");
}

function safeTarget() {
  const configured = process.env.DATABASE_URL?.trim();
  if (!configured) throw new Error("DATABASE_URL is required.");
  const target = new URL(expandEnvValue(configured));
  const database = decodeURIComponent(target.pathname.replace(/^\//, ""));
  if (
    process.env.NODE_ENV === "production" ||
    !LOCAL_HOSTS.has(target.hostname.toLowerCase()) ||
    !/(?:dev|test|local|reconcile|referral)/i.test(database)
  ) {
    throw new Error("Compliance seed snapshot is restricted to a named local development database.");
  }
  return {
    host: target.hostname,
    port: target.port || "5432",
    database,
    schema: target.searchParams.get("schema") || "public",
    environment: process.env.NODE_ENV || "development",
    fingerprint: createHash("sha256")
      .update(`${target.protocol}//${target.hostname}:${target.port || "5432"}/${database}`)
      .digest("hex"),
  };
}

function asNumber(value: bigint | number) {
  return typeof value === "bigint" ? Number(value) : value;
}

async function main() {
  const target = safeTarget();
  const prisma = new PrismaClient();
  try {
    const organizations = await prisma.organization.findMany({
      where: { id: { startsWith: "rds_org_" }, isActive: true, deletedAt: null },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        tradeName: true,
        slug: true,
        country: true,
        countryCode: true,
        currency: true,
        timezone: true,
        defaultLocale: true,
        requestedModules: true,
      },
    });
    const organizationIds = organizations.map((organization) => organization.id);
    const roleRows = await prisma.role.findMany({
      where: {
        organizationId: { in: organizationIds },
        code: { in: COMPLIANCE_HRIS_ROLE_CODES },
      },
      orderBy: [{ organizationId: "asc" }, { code: "asc" }],
      select: {
        id: true,
        organizationId: true,
        code: true,
        nameEn: true,
        nameFr: true,
        description: true,
        permissions: true,
        users: {
          orderBy: { email: "asc" },
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            isActive: true,
            isVerified: true,
            emailVerified: true,
            preferredLocale: true,
          },
        },
      },
    });
    const userIds = roleRows.flatMap((role) => role.users.map((user) => user.id));
    const employees = await prisma.payrollEmployee.findMany({
      where: { organizationId: { in: organizationIds }, userId: { in: userIds } },
      orderBy: [{ organizationId: "asc" }, { employeeNumber: "asc" }],
      select: {
        id: true,
        organizationId: true,
        userId: true,
        employeeNumber: true,
        displayName: true,
        legalName: true,
        status: true,
        hireDate: true,
        department: true,
        jobTitle: true,
        locationId: true,
        metadata: true,
        contracts: {
          where: { status: "ACTIVE", deletedAt: null },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
          select: {
            id: true,
            contractNumber: true,
            type: true,
            status: true,
            effectiveFrom: true,
            effectiveTo: true,
            baseSalary: true,
            currency: true,
            signedDocumentHash: true,
          },
        },
        hrisEmploymentAssignments: {
          where: { type: "PRIMARY", status: "ACTIVE" },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
          select: {
            id: true,
            type: true,
            status: true,
            effectiveFrom: true,
            effectiveTo: true,
            orgUnit: { select: { id: true, code: true, name: true, type: true } },
            position: { select: { id: true, code: true, title: true, locationId: true } },
          },
        },
        hrisWorkSchedules: {
          where: { status: "ACTIVE" },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
          select: {
            id: true,
            name: true,
            timezone: true,
            standardWeeklyMinutes: true,
            effectiveFrom: true,
            effectiveTo: true,
            preparedById: true,
            approvedById: true,
            approvedAt: true,
            approvalEvidenceHash: true,
          },
        },
      },
    });
    const employeeByUserId = new Map(
      employees.filter((employee) => employee.userId).map((employee) => [employee.userId!, employee]),
    );

    const roleCoverage = roleRows.map((role) => {
      const user = role.users[0] ?? null;
      const employee = user ? employeeByUserId.get(user.id) ?? null : null;
      const metadata = employee?.metadata as Record<string, unknown> | null;
      return {
        organizationId: role.organizationId,
        roleId: role.id,
        roleCode: role.code,
        roleName: role.nameEn,
        roleNameFr: role.nameFr,
        roleDescription: role.description,
        permissionCount: role.permissions.length,
        user,
        employee: employee
          ? {
              ...employee,
              baseSalary: employee.contracts[0]?.baseSalary.toString() ?? null,
              contract: employee.contracts[0]
                ? { ...employee.contracts[0], baseSalary: employee.contracts[0].baseSalary.toString() }
                : null,
              assignment: employee.hrisEmploymentAssignments[0] ?? null,
              workSchedule: employee.hrisWorkSchedules[0] ?? null,
              contracts: undefined,
              hrisEmploymentAssignments: undefined,
              hrisWorkSchedules: undefined,
            }
          : null,
        sourceClassification: metadata?.sourceClassification ?? "DATABASE_ROLE_WITHOUT_COMPLIANCE_METADATA",
        authorityStatus: "RBAC_AND_HRIS_CONTEXT_ONLY",
        externalAuthorityClaimed: false,
      };
    });

    const orgWhere = { organizationId: { in: organizationIds } };
    const counts = {
      organizations: organizations.length,
      roles: await prisma.role.count({ where: orgWhere }),
      complianceRoles: roleRows.length,
      users: await prisma.user.count({ where: orgWhere }),
      payrollEmployees: await prisma.payrollEmployee.count({ where: orgWhere }),
      payrollContracts: await prisma.payrollContract.count({ where: orgWhere }),
      payrollRubriques: await prisma.payrollRubrique.count({ where: orgWhere }),
      payrollRubriqueAssignments: await prisma.payrollEmployeeRubriqueAssignment.count({ where: orgWhere }),
      payrollSalaryChangeRequests: await prisma.payrollSalaryChangeRequest.count({ where: orgWhere }),
      payrollPaymentDestinationChangeRequests: await prisma.payrollPaymentDestinationChangeRequest.count({ where: orgWhere }),
      payrollPeriods: await prisma.payrollPeriod.count({ where: orgWhere }),
      payrollAttendanceSnapshots: await prisma.payrollAttendanceSnapshot.count({ where: orgWhere }),
      payrollRuns: await prisma.payrollRun.count({ where: orgWhere }),
      payrollRunLines: await prisma.payrollRunLine.count({ where: orgWhere }),
      payrollPayslips: await prisma.payrollPayslip.count({ where: orgWhere }),
      payrollPayslipLines: await prisma.payrollPayslipLine.count({ where: orgWhere }),
      payrollDeclarations: await prisma.payrollDeclaration.count({ where: orgWhere }),
      payrollDeclarationEvidence: await prisma.payrollDeclarationEvidence.count({ where: orgWhere }),
      payrollPaymentBatches: await prisma.payrollPaymentBatch.count({ where: orgWhere }),
      payrollPaymentAllocations: await prisma.payrollPaymentAllocation.count({ where: orgWhere }),
      payrollEmployeeBalanceCases: await prisma.payrollEmployeeBalanceCase.count({ where: orgWhere }),
      payrollEmployeeBalanceEvents: await prisma.payrollEmployeeBalanceEvent.count({ where: orgWhere }),
      hrisOrgUnits: await prisma.hrisOrgUnit.count({ where: orgWhere }),
      hrisPositions: await prisma.hrisPosition.count({ where: orgWhere }),
      hrisEmploymentAssignments: await prisma.hrisEmploymentAssignment.count({ where: orgWhere }),
      hrisReportingRelationships: await prisma.hrisReportingRelationship.count({ where: orgWhere }),
      hrisManagerDelegations: await prisma.hrisManagerDelegation.count({ where: orgWhere }),
      hrisWorkCalendars: await prisma.hrisWorkCalendar.count({ where: orgWhere }),
      hrisPublicHolidays: await prisma.hrisPublicHoliday.count({ where: orgWhere }),
      hrisWorkSchedules: await prisma.hrisWorkSchedule.count({ where: orgWhere }),
      hrisLeavePolicies: await prisma.hrisLeavePolicy.count({ where: orgWhere }),
      hrisLeaveBalanceEntries: await prisma.hrisLeaveBalanceEntry.count({ where: orgWhere }),
      hrisTimeRequests: await prisma.hrisTimeRequest.count({ where: orgWhere }),
      hrisTimeImportBatches: await prisma.hrisTimeImportBatch.count({ where: orgWhere }),
      hrisTimeEntries: await prisma.hrisTimeEntry.count({ where: orgWhere }),
      hrisAttendanceAnomalies: await prisma.hrisAttendanceAnomaly.count({ where: orgWhere }),
      complianceAdapterConfigs: await prisma.complianceAdapterConfig.count({ where: orgWhere }),
      complianceSubmissions: await prisma.complianceSubmission.count({ where: orgWhere }),
      complianceEvidence: await prisma.complianceEvidence.count({ where: orgWhere }),
      journalEntries: await prisma.journalEntry.count({ where: orgWhere }),
      accountingSourceLinks: await prisma.accountingSourceLink.count({ where: orgWhere }),
      closeRuns: await prisma.closeRun.count({ where: orgWhere }),
      closeAssuranceFindings: await prisma.closeAssuranceFinding.count({ where: orgWhere }),
      closeEvidenceItems: await prisma.closeEvidenceItem.count({ where: orgWhere }),
      workflowAssuranceCheckRuns: await prisma.workflowAssuranceCheckRun.count({ where: orgWhere }),
      workflowAssuranceCheckFindings: await prisma.workflowAssuranceCheckFinding.count({ where: orgWhere }),
      workflowAssuranceIncidents: await prisma.workflowAssuranceIncident.count({ where: orgWhere }),
      workflowAssuranceWaivers: await prisma.workflowAssuranceWaiver.count({ where: orgWhere }),
      auditLogs: await prisma.auditLog.count({ where: orgWhere }),
    };

    const [crossTenantAssignments, selfReportingRelationships] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM hris_employment_assignments assignment
        JOIN payroll_employees employee ON employee.id = assignment."employeeId"
        JOIN hris_positions position ON position.id = assignment."positionId"
        JOIN hris_org_units unit ON unit.id = assignment."orgUnitId"
        WHERE assignment."organizationId" LIKE 'rds_org_%'
          AND (
            assignment."organizationId" <> employee."organizationId"
            OR assignment."organizationId" <> position."organizationId"
            OR assignment."organizationId" <> unit."organizationId"
          )
      `),
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM hris_reporting_relationships
        WHERE "organizationId" LIKE 'rds_org_%'
          AND "managerEmployeeId" = "reportEmployeeId"
      `),
    ]);

    const roleByOrgAndCode = new Map(
      roleCoverage.map((entry) => [`${entry.organizationId}:${entry.roleCode}`, entry]),
    );
    const sodPairs = [
      ["maker", "checker"],
      ["database_migration_operator", "independent_migration_checker"],
      ["payroll_processor", "payroll_approver"],
      ["payments_owner", "controller_approver"],
    ].map(([makerRole, checkerRole]) => ({
      makerRole,
      checkerRole,
      organizations: organizations.map((organization) => {
        const maker = roleByOrgAndCode.get(`${organization.id}:${makerRole}`)?.user;
        const checker = roleByOrgAndCode.get(`${organization.id}:${checkerRole}`)?.user;
        return {
          organizationId: organization.id,
          makerUserId: maker?.id ?? null,
          checkerUserId: checker?.id ?? null,
          result: maker?.id && checker?.id && maker.id !== checker.id ? "PASS_DISTINCT_SUBJECTS" : "FAIL",
        };
      }),
    }));

    const pilot = {
      location: await prisma.location.findUnique({ where: { id: "loc_cm_dla_akwa_cert_001" }, select: { id: true, organizationId: true, name: true, code: true, type: true, isActive: true, isDefault: true, managerId: true, requiresApproval: true } }),
      terminal: await prisma.pOSStation.findUnique({ where: { id: "term_cm_dla_akwa_cert_001" }, select: { id: true, organizationId: true, locationId: true, terminalNumber: true, name: true, isActive: true, hasCashDrawer: true } }),
      drawer: await prisma.cashDrawer.findUnique({ where: { id: "drawer_cm_dla_akwa_cert_001" }, select: { id: true, locationId: true, terminalId: true, drawerNumber: true, name: true, isOpen: true, currentBalance: true, expectedBalance: true } }),
    };

    const credentials = JSON.parse(await readFile(credentialArtifactPath, "utf8")) as {
      generatedAt: string;
      credentialCount: number;
      credentials: Array<{ email: string; roleCodes: string[]; userId?: string | null }>;
    };
    const databaseUsers = await prisma.user.findMany({
      where: orgWhere,
      select: { email: true },
    });
    const databaseEmails = new Set(databaseUsers.map((user) => user.email));
    const roleCoverageEmails = new Set(
      roleCoverage.flatMap((entry) => (entry.user ? [entry.user.email] : [])),
    );
    const requiredCredentialEmails = credentials.credentials.filter((credential) =>
      roleCoverageEmails.has(credential.email),
    );
    const credentialReconciliation = {
      artifactGeneratedAt: credentials.generatedAt,
      artifactCredentialCount: credentials.credentialCount,
      requiredRoleCredentialCount: requiredCredentialEmails.length,
      databaseCredentialMatchCount: credentials.credentials.filter((credential) =>
        databaseEmails.has(credential.email),
      ).length,
      missingFromDatabase: credentials.credentials
        .filter((credential) => !databaseEmails.has(credential.email))
        .map((credential) => credential.email),
      passwordsIncludedInSnapshot: false,
      passwordSource: ".seed-artifacts/seed-login-credentials.json (local, Git-ignored)",
    };

    const primaryOrganizationId = organizations[0]?.id;
    const suppliedIdentityMapping = [
      ["database_migration_operator", "SANGO MALO"],
      ["independent_migration_checker", "MAXIMILLIANO BONGA"],
      ["maker", "Tamen Marceline"],
      ["checker", "Yonga Springfield"],
      ["product_approver", "KOUATCHOUA MARK"],
      ["controller_approver", "KOUATCHOUA MARCELINE"],
    ].map(([roleCode, suppliedName]) => {
      const role = roleByOrgAndCode.get(`${primaryOrganizationId}:${roleCode}`);
      return {
        suppliedName,
        roleCode,
        userId: role?.user?.id ?? null,
        databaseName: role?.user?.name ?? null,
        employeeId: role?.employee?.id ?? null,
        sourceClassification: role?.sourceClassification ?? null,
        signatureClaimed: false,
        qualificationClaimed: false,
      };
    });

    const integrity = {
      requiredRolesPerOrganization: COMPLIANCE_HRIS_ROLE_COUNT,
      expectedComplianceRoleRows: organizations.length * COMPLIANCE_HRIS_ROLE_COUNT,
      actualComplianceRoleRows: roleCoverage.length,
      missingRoleCodesByOrganization: organizations.map((organization) => ({
        organizationId: organization.id,
        missingRoleCodes: COMPLIANCE_HRIS_ROLE_CODES.filter(
          (roleCode) => !roleByOrgAndCode.has(`${organization.id}:${roleCode}`),
        ),
      })),
      rolesWithoutUsers: roleCoverage.filter((role) => !role.user).map((role) => `${role.organizationId}:${role.roleCode}`),
      rolesWithoutEmployees: roleCoverage.filter((role) => !role.employee).map((role) => `${role.organizationId}:${role.roleCode}`),
      employeesWithoutActiveContracts: roleCoverage.filter((role) => !role.employee?.contract).map((role) => `${role.organizationId}:${role.roleCode}`),
      employeesWithoutPrimaryAssignments: roleCoverage.filter((role) => !role.employee?.assignment).map((role) => `${role.organizationId}:${role.roleCode}`),
      employeesWithoutActiveSchedules: roleCoverage.filter((role) => !role.employee?.workSchedule).map((role) => `${role.organizationId}:${role.roleCode}`),
      crossTenantEmploymentAssignmentCount: asNumber(crossTenantAssignments[0]?.count ?? 0),
      selfReportingRelationshipCount: asNumber(selfReportingRelationships[0]?.count ?? 0),
      segregationOfDutiesPairs: sodPairs,
    };

    const gateMatrix = [
      { gate: "Database role and persona coverage", status: integrity.actualComplianceRoleRows === integrity.expectedComplianceRoleRows && !integrity.rolesWithoutUsers.length ? "PASS" : "FAIL", source: "Database roles/users" },
      { gate: "HRIS identity/assignment/contract coverage", status: !integrity.rolesWithoutEmployees.length && !integrity.employeesWithoutActiveContracts.length && !integrity.employeesWithoutPrimaryAssignments.length ? "PASS" : "FAIL", source: "Database HRIS/payroll tables" },
      { gate: "Maker-checker and payroll SoD", status: sodPairs.every((pair) => pair.organizations.every((organization) => organization.result === "PASS_DISTINCT_SUBJECTS")) ? "PASS" : "FAIL", source: "Distinct database user IDs" },
      { gate: "Qualified Cameroon country-pack review", status: "REQUIRES_HUMAN_REVIEW", source: "No authentic qualification evidence supplied" },
      { gate: "Qualified accounting review", status: "REQUIRES_HUMAN_REVIEW", source: "No authentic qualification evidence supplied" },
      { gate: "DGI/MINFI/CNPS signatures", status: "BLOCKED_EXTERNAL", source: "Signature fields remain unsigned" },
      { gate: "Production authorization", status: "BLOCKED_EXTERNAL", source: "Database seed and supplied statement are not production authorization" },
      { gate: "Physical POS hardware certification", status: "NOT_APPLICABLE", source: "Source scope is simulated desktop POS only" },
    ];

    const snapshot = {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      sourceDocument,
      dataSource: target,
      organizations,
      pilot: {
        ...pilot,
        drawer: pilot.drawer
          ? { ...pilot.drawer, currentBalance: pilot.drawer.currentBalance.toString(), expectedBalance: pilot.drawer.expectedBalance.toString() }
          : null,
      },
      counts,
      roleCoverage,
      suppliedIdentityMapping,
      credentialReconciliation,
      integrity,
      gateMatrix,
      unresolvedExternalEvidence: [
        "Product approver signature",
        "DGI signature",
        "MINFI signature",
        "CNPS signature",
        "Operator and checker authentication attestation",
        "Restore rehearsal evidence",
        "Qualified Cameroon reviewer evidence",
        "Qualified accounting reviewer evidence",
        "Production authorization independently verified by an authorized human",
      ],
      assertions: {
        noProductionDataIntroduced: true,
        noRealNationalIdentifiersIntroduced: true,
        noRegulatorCredentialsIntroduced: true,
        noExternalSignatureFabricated: true,
        databaseRowsDoNotConstituteExternalApproval: true,
      },
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
      output: path.relative(root, outputPath).replaceAll("\\", "/"),
      organizations: organizations.length,
      complianceRoles: roleCoverage.length,
      credentials: credentialReconciliation.artifactCredentialCount,
      integrity,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Compliance seed snapshot failed:", error);
  process.exitCode = 1;
});
