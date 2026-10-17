/** @jest-environment node */
import { Prisma, PrismaClient, UnitType } from "@prisma/client";
import { verifyPassword } from "../../lib/password";
import { hasRbacPermission } from "../../lib/security/rbac-permissions";
import { COMPLIANCE_HRIS_ROLE_CODES } from "../compliance-hris-role-seed";
import { seedSystematicReferenceData, systematicRoleDefinitions, type SystematicCredential } from "../systematic-reseed-reference-data";

const organization = { id: "rds_org_001", country: "Cameroon", countryCode: "CM", isActive: true, deletedAt: null, defaultLocale: "EN" };

function fixture() {
  const omitted = new Set(["inventory_adjustment_maker", "inventory_adjustment_checker"]);
  const roles = systematicRoleDefinitions().filter((role) => !omitted.has(role.code)).map((role) => ({ ...role, id: `existing-${role.code}`, organizationId: organization.id, permissions: ["dashboard.read"] }));
  roles.push({ id: "custom-role", code: "bespoke_auditor", nameEn: "Established custom role", organizationId: organization.id, permissions: ["custom.review"], source: "custom" });
  const users: Array<Record<string, any>> = roles.map((role) => ({ id: `person-${role.id}`, organizationId: organization.id, name: "Established Person", email: `${role.code}@old.test`, password: "unchanged-existing-hash", isActive: true, isLocked: false, isVerified: true, emailVerified: true, roleId: role.id }));
  const accounts: Array<Record<string, any>> = [];
  const employees: Array<Record<string, any>> = [];
  const units: Array<Record<string, any>> = [];
  const items: Array<Record<string, any>> = [];
  const unitWithCount = (unit: Record<string, any> | undefined) => unit ? ({ ...unit, _count: { items: items.filter((item) => item.unitId === unit.id).length } }) : null;
  const client: Record<string, any> = {
    organization: { findMany: jest.fn(async () => [organization]) },
    role: {
      findUnique: jest.fn(async ({ where }) => roles.find((role) => role.code === where.organizationId_code.code) ?? null),
      create: jest.fn(async ({ data }) => { roles.push(data); return data; }),
    },
    user: {
      findFirst: jest.fn(async ({ where }) => {
        if (where.roles) return users.find((user) => user.roleId === where.roles.some.id && (!where.id?.in || where.id.in.includes(user.id))) ?? null;
        return users.find((user) => where.OR.some((match: any) => (match.id && user.id === match.id) || (match.email && user.email === match.email))) ?? null;
      }),
      create: jest.fn(async ({ data }) => { const { roles: membership, ...user } = data; users.push({ ...user, roleId: membership.connect.id }); return user; }),
    },
    account: { create: jest.fn(async ({ data }) => { accounts.push(data); return data; }) },
    location: { findFirst: jest.fn(async () => ({ id: "existing-location" })) },
    payrollEmployee: { create: jest.fn(async ({ data }) => { employees.push(data); return data; }) },
    unit: {
      findMany: jest.fn(async () => units.map((unit) => unitWithCount(unit))),
      findUnique: jest.fn(async ({ where }) => unitWithCount(units.find((unit) => unit.symbol === where.organizationId_symbol.symbol))),
      create: jest.fn(async ({ data }) => { const unit = { ...data, isActive: true, conversionRate: new Prisma.Decimal(data.conversionRate) }; units.push(unit); return unit; }),
      update: jest.fn(async ({ where, data }) => { const unit = units.find((entry) => entry.id === where.id)!; Object.assign(unit, data); unit.conversionRate = new Prisma.Decimal(unit.conversionRate); return unit; }),
    },
    taxRate: { findMany: jest.fn(async () => []) },
    item: {
      findMany: jest.fn(async ({ where }) => items.filter((item) => !where.nameEn || (item.nameEn === where.nameEn && item.id.startsWith(where.id.startsWith))).map((item) => ({ ...item, unit: unitWithCount(units.find((unit) => unit.id === item.unitId)), taxRate: null }))),
      update: jest.fn(async ({ where, data }) => { const item = items.find((entry) => entry.id === where.id)!; Object.assign(item, data); return item; }),
    },
  };
  client.$transaction = jest.fn(async (operation) => operation(client));
  return { client: client as PrismaClient, roles, users, accounts, units, items, employees };
}

describe("systematic reference and role reseed", () => {
  test("covers repository roles and separates new stock preparation from approval", () => {
    const definitions = systematicRoleDefinitions();
    expect(definitions.map((role) => role.code)).toEqual(expect.arrayContaining(COMPLIANCE_HRIS_ROLE_CODES));
    const maker = definitions.find((role) => role.code === "inventory_adjustment_maker")!;
    const checker = definitions.find((role) => role.code === "inventory_adjustment_checker")!;
    expect(hasRbacPermission(maker.permissions, "inventory.stock.adjust")).toBe(true);
    expect(hasRbacPermission(maker.permissions, "inventory.adjust.approve")).toBe(false);
    expect(hasRbacPermission(checker.permissions, "inventory.adjust.approve")).toBe(true);
    // The current stock action guard is shared by preparation and posting;
    // service-level actor separation remains necessary for stock approval.
    expect(hasRbacPermission(checker.permissions, "inventory.stock.adjust")).toBe(true);
    expect(hasRbacPermission(maker.permissions, "accounting.journal.create")).toBe(true);
    expect(hasRbacPermission(maker.permissions, "accounting.journal.post")).toBe(false);
    expect(hasRbacPermission(checker.permissions, "accounting.journal.post")).toBe(true);
    expect(hasRbacPermission(checker.permissions, "accounting.journal.create")).toBe(false);
    const payrollMaker = definitions.find((role) => role.code === "payroll_processor")!;
    const payrollChecker = definitions.find((role) => role.code === "payroll_approver")!;
    expect(hasRbacPermission(payrollMaker.permissions, "payroll.runs.calculate")).toBe(true);
    expect(hasRbacPermission(payrollMaker.permissions, "payroll.runs.approve")).toBe(false);
    expect(hasRbacPermission(payrollChecker.permissions, "payroll.runs.calculate")).toBe(false);
    expect(hasRbacPermission(payrollChecker.permissions, "payroll.runs.approve")).toBe(true);
    const external = definitions.find((role) => role.code === "external_accountant")!;
    expect(hasRbacPermission(external.permissions, "accounting.journal.post")).toBe(false);
    expect(hasRbacPermission(external.permissions, "payroll.employees.read")).toBe(false);
  });

  test("keeps established identities and privileges byte-for-byte; reruns create nothing", async () => {
    const db = fixture();
    const originalUsers = JSON.stringify(db.users);
    const originalRoles = JSON.stringify(db.roles);
    const beforeUserCount = db.users.length;
    const beforeRoleCount = db.roles.length;
    const credentials: SystematicCredential[] = [];
    const input = { prisma: db.client, referenceDate: "2026-09-27", syntheticOrganizationIds: [], onCredential: async (credential: SystematicCredential) => { credentials.push(credential); } };
    const first = await seedSystematicReferenceData(input);
    expect(JSON.stringify(db.users.slice(0, beforeUserCount))).toBe(originalUsers);
    expect(JSON.stringify(db.roles.slice(0, beforeRoleCount))).toBe(originalRoles);
    expect(credentials).toHaveLength(2);
    expect(db.accounts).toHaveLength(2);
    for (const credential of credentials) {
      const user = db.users.find((entry) => entry.id === credential.userId)!;
      expect(await verifyPassword(credential.password, user.password)).toBe(true);
      expect(db.accounts.find((account) => account.userId === user.id)?.password).toBe(user.password);
      expect(JSON.stringify(first)).not.toContain(credential.password);
    }
    const second = await seedSystematicReferenceData(input);
    expect(second.roles.filter((role) => role.status === "added")).toHaveLength(0);
    expect(second.personas.filter((user) => user.status === "added")).toHaveLength(0);
    expect(credentials).toHaveLength(2);
    expect(db.accounts).toHaveLength(2);
  });

  test("assigns explicit packaging only to known synthetic SKUs and preserves quantities and names", async () => {
    const db = fixture();
    db.units.push({ id: "rds_org_001_unit_002", organizationId: organization.id, symbol: "pack", nameEn: "Pack", type: UnitType.QUANTITY, baseUnit: "piece", conversionRate: new Prisma.Decimal(1), isActive: true });
    db.items.push({ id: "rds_org_001_item_014", organizationId: organization.id, nameEn: "Mineral water, 6-bottle pack", unitId: "rds_org_001_unit_002", quantityOnHand: 1500 }, { id: "human-created-item", organizationId: organization.id, nameEn: "Mineral water, 6-bottle pack", unitId: "rds_org_001_unit_002", quantityOnHand: 23 });
    const input = { prisma: db.client, referenceDate: "2026-09-27", syntheticOrganizationIds: [organization.id], onCredential: async () => {} };
    await seedSystematicReferenceData(input);
    const explicit = db.units.find((unit) => unit.symbol === "pack6btl")!;
    expect(explicit.baseUnit).toBe("btl");
    expect(explicit.conversionRate.toString()).toBe("6");
    expect(db.items[0]).toMatchObject({ nameEn: "Mineral water, 6-bottle pack", quantityOnHand: 1500, unitId: explicit.id });
    expect(db.items[1]).toMatchObject({ quantityOnHand: 23, unitId: "rds_org_001_unit_002" });
    expect(db.units[0]).toMatchObject({ baseUnit: "pack", isActive: true });
    expect((await seedSystematicReferenceData(input)).referenceChanges).toHaveLength(0);
  });

  test("credential persistence failure prevents creation of an unrecoverable login", async () => {
    const db = fixture();
    const count = db.users.length;
    await expect(seedSystematicReferenceData({ prisma: db.client, referenceDate: "2026-09-27", syntheticOrganizationIds: [], onCredential: async () => { throw new Error("Protected credential storage unavailable"); } })).rejects.toThrow("Protected credential storage unavailable");
    expect(db.users).toHaveLength(count);
    expect(db.accounts).toHaveLength(0);
  });

  test("links a new self-service persona to its own draft employee without claiming payroll approval", async () => {
    const db = fixture();
    const existingRole = db.roles.find((role) => role.code === "employee_self_service")!;
    db.users.splice(db.users.findIndex((user) => user.roleId === existingRole.id), 1);
    db.roles.splice(db.roles.indexOf(existingRole), 1);
    const report = await seedSystematicReferenceData({ prisma: db.client, referenceDate: "2026-09-27", syntheticOrganizationIds: [], onCredential: async () => {} });
    const persona = report.personas.find((entry) => entry.code === "employee_self_service")!;
    expect(db.employees).toHaveLength(1);
    expect(db.employees[0]).toMatchObject({ userId: persona.userId, organizationId: organization.id, status: "DRAFT", locationId: "existing-location", metadata: { sourceClassification: "SYNTHETIC_LOCAL_DEVELOPMENT", signaturesOrAppointmentsClaimed: false } });
    expect(report.employeeLinks[0].userId).toBe(persona.userId);
  });

  test("opt-in credential coverage adds a separate persona and preserves the original account and role", async () => {
    const db = fixture();
    const role = db.roles.find((entry) => entry.code === "external_accountant")!;
    const originalUser = db.users.find((user) => user.roleId === role.id)!;
    const originalUserCopy = JSON.stringify(originalUser);
    const originalRoleCopy = JSON.stringify(role);
    const credentials: SystematicCredential[] = [];
    const input = { prisma: db.client, referenceDate: "2026-09-27", syntheticOrganizationIds: [], ensurePersonaCredentialsForRoleCodes: ["external_accountant"], knownCredentialUserIds: [], onCredential: async (credential: SystematicCredential) => { credentials.push(credential); } };
    const report = await seedSystematicReferenceData(input);
    const added = report.personas.find((entry) => entry.code === "external_accountant")!;
    expect(added.status).toBe("added");
    expect(added.userId).not.toBe(originalUser.id);
    expect(db.users.find((user) => user.id === added.userId)?.roleId).toBe(role.id);
    expect(JSON.stringify(originalUser)).toBe(originalUserCopy);
    expect(JSON.stringify(role)).toBe(originalRoleCopy);
    expect(report.roles.find((entry) => entry.code === "external_accountant")?.missingTemplatePermissions.length).toBeGreaterThan(0);
    const addedCredential = credentials.find((entry) => entry.userId === added.userId)!;
    expect(await verifyPassword(addedCredential.password, db.users.find((user) => user.id === added.userId)?.password)).toBe(true);
    const count = credentials.length;
    const rerun = await seedSystematicReferenceData({ ...input, knownCredentialUserIds: credentials.map((entry) => entry.userId) });
    expect(rerun.personas.find((entry) => entry.code === "external_accountant")).toMatchObject({ userId: added.userId, status: "existing" });
    expect(credentials).toHaveLength(count);
  });

  test("opt-in known credentials reuse only a user assigned to that tenant role", async () => {
    const db = fixture();
    const role = db.roles.find((entry) => entry.code === "external_accountant")!;
    const oldUser = db.users.find((user) => user.roleId === role.id)!;
    const report = await seedSystematicReferenceData({ prisma: db.client, referenceDate: "2026-09-27", syntheticOrganizationIds: [], ensurePersonaCredentialsForRoleCodes: ["external_accountant"], knownCredentialUserIds: [oldUser.id], onCredential: async () => {} });
    expect(report.personas.find((entry) => entry.code === "external_accountant")).toMatchObject({ userId: oldUser.id, status: "existing" });
  });
});
