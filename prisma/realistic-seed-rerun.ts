import type { PrismaClient } from "@prisma/client";

type SeedQuality = Array<{
  organizationId: string;
  defaultLocationId: string;
  categoryCount: number;
  unitCount: number;
  activeItemCount: number;
  posReadyItemCount: number;
}>;

export async function reuseCompleteRealisticSeed(input: {
  prisma: PrismaClient;
  organizationIdPrefix: string;
  expectedOrganizationCount: number;
  password: string;
}) {
  const organizationCount = await input.prisma.organization.count({
    where: { id: { startsWith: input.organizationIdPrefix } },
  });
  if (organizationCount === 0) return null;
  if (organizationCount !== input.expectedOrganizationCount) {
    throw new Error(
      `Found a partial realistic seed dataset (${organizationCount}/${input.expectedOrganizationCount} organizations). Use a fresh local development database instead of bypassing immutable evidence controls.`,
    );
  }

  try {
    const [
      roleCount,
      userCount,
      categoryCount,
      unitCount,
      itemCount,
      evidenceCount,
      workflowDefinitionCount,
      workflowWaiverCount,
    ] =
      await Promise.all([
        input.prisma.role.count({
          where: { organizationId: { startsWith: input.organizationIdPrefix } },
        }),
        input.prisma.user.count({
          where: { organizationId: { startsWith: input.organizationIdPrefix } },
        }),
        input.prisma.category.count({
          where: { organizationId: { startsWith: input.organizationIdPrefix } },
        }),
        input.prisma.unit.count({
          where: { organizationId: { startsWith: input.organizationIdPrefix } },
        }),
        input.prisma.item.count({
          where: { organizationId: { startsWith: input.organizationIdPrefix } },
        }),
        input.prisma.payrollDeclarationEvidence.count({
          where: { organizationId: { startsWith: input.organizationIdPrefix } },
        }),
        input.prisma.workflowAssuranceCheckDefinition.count({
          where: { id: { startsWith: "rds_" } },
        }),
        input.prisma.workflowAssuranceWaiver.count({
          where: { organizationId: { startsWith: input.organizationIdPrefix } },
        }),
      ]);
    const minimums = {
      roles: input.expectedOrganizationCount * 12,
      users: input.expectedOrganizationCount * 14,
      categories: input.expectedOrganizationCount * 7,
      units: input.expectedOrganizationCount * 7,
      items: input.expectedOrganizationCount * 12,
      immutablePayrollEvidence: input.expectedOrganizationCount * 12,
      workflowDefinitions: input.expectedOrganizationCount * 12,
      workflowWaivers: input.expectedOrganizationCount * 12,
    };
    const actuals = {
      roles: roleCount,
      users: userCount,
      categories: categoryCount,
      units: unitCount,
      items: itemCount,
      immutablePayrollEvidence: evidenceCount,
      workflowDefinitions: workflowDefinitionCount,
      workflowWaivers: workflowWaiverCount,
    };
    const incomplete = Object.entries(minimums).filter(
      ([key, minimum]) => actuals[key as keyof typeof actuals] < minimum,
    );
    if (incomplete.length > 0) {
      throw new Error(
        `Seed coverage is incomplete: ${incomplete
          .map(([key, minimum]) => `${key}=${actuals[key as keyof typeof actuals]}/${minimum}`)
          .join(", ")}`,
      );
    }

    const organizations = await input.prisma.organization.findMany({
      where: { id: { startsWith: input.organizationIdPrefix } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        locations: {
          where: { isDefault: true, isActive: true, deletedAt: null },
          select: { id: true },
          take: 1,
        },
      },
    });
    const quality: SeedQuality = [];
    for (const organization of organizations) {
      const defaultLocationId = organization.locations[0]?.id;
      if (!defaultLocationId) {
        throw new Error(`Default active location missing for ${organization.id}.`);
      }
      const [categories, units, items, posReady] = await Promise.all([
        input.prisma.category.count({
          where: { organizationId: organization.id, isActive: true, deletedAt: null },
        }),
        input.prisma.unit.count({
          where: { organizationId: organization.id, isActive: true },
        }),
        input.prisma.item.count({
          where: {
            organizationId: organization.id,
            isActive: true,
            isDiscontinued: false,
            deletedAt: null,
          },
        }),
        input.prisma.inventoryLevel.count({
          where: {
            locationId: defaultLocationId,
            quantityAvailable: { gte: 20 },
            item: {
              is: {
                organizationId: organization.id,
                isActive: true,
                isDiscontinued: false,
                deletedAt: null,
              },
            },
          },
        }),
      ]);
      if (categories < 7 || units < 7 || items < 12 || posReady < 10) {
        throw new Error(`Seed quality is incomplete for ${organization.id}.`);
      }
      quality.push({
        organizationId: organization.id,
        defaultLocationId,
        categoryCount: categories,
        unitCount: units,
        activeItemCount: items,
        posReadyItemCount: posReady,
      });
    }
    const users = await input.prisma.user.findMany({
      where: {
        organizationId: { startsWith: input.organizationIdPrefix },
      },
      orderBy: [{ organizationId: "asc" }, { email: "asc" }],
      select: {
        id: true,
        organizationId: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        isVerified: true,
        verificationToken: true,
        roles: { select: { nameEn: true }, take: 1 },
      },
    });
    const credentials = users.map((user) => ({
      organizationId: user.organizationId,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
      email: user.email,
      password: input.password,
      role: user.jobTitle || user.roles[0]?.nameEn || "User",
      userId: user.id,
      note: user.isVerified
        ? undefined
        : `Unverified account for /verify testing. OTP: ${user.verificationToken ?? "not set"}`,
    }));
    console.log(
      "Existing realistic development seed is complete; no database rows were replaced.",
    );
    return { credentials, quality: { organizations: quality } };
  } catch (error) {
    throw new Error(
      "The existing realistic seed dataset is incomplete. Preserve immutable evidence and reseed a fresh local development database.",
      { cause: error },
    );
  }
}
