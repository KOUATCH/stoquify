import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import type {
  AgentActivationState,
  AgentDefinitionStatus,
  AgentRolloutMode,
} from "@prisma/client";

import { db } from "@/prisma/db";

type CertificationState = {
  organizationId: string;
  packageId: string;
};

type DefinitionBaseline = {
  status: AgentDefinitionStatus;
  rolloutMode: AgentRolloutMode;
};

type ReleaseBaseline = {
  state: AgentActivationState;
  manifestHash: string;
  allowedRoleCodes: string[];
  suspendedAt: Date | null;
  suspensionReason: string | null;
  approvals: Array<{
    id: string;
    approvalType: "PRODUCT" | "SECURITY";
    expiresAt: Date;
  }>;
  owners: Array<{
    id: string;
    validUntil: Date | null;
  }>;
};

const crossTenantAuthStatePath =
  process.env.PLAYWRIGHT_AGENT_CROSS_TENANT_STORAGE_STATE ??
  "playwright/.auth/command-agent-cross-tenant.json";
const crossTenantOrganizationId =
  process.env.AQSTOQFLOW_AGENT_CROSS_TENANT_ORG_ID ??
  "org_command_agent_cross_tenant_e2e";

const state = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      process.env.STOQUIFY_AGENT_E2E_STATE_PATH ??
        "what-next/agents-runtime/command-agent-enabled-e2e-state.json",
    ),
    "utf8",
  ),
) as CertificationState;

let definitionBaseline: DefinitionBaseline;
let releaseBaseline: ReleaseBaseline;

test.describe.configure({ mode: "serial", timeout: 360_000 });

test.beforeAll(async () => {
  definitionBaseline = await db.agentDefinition.findUniqueOrThrow({
    where: { key: "command-agent" },
    select: { status: true, rolloutMode: true },
  });
  releaseBaseline = await db.agentActivationPackage.findFirstOrThrow({
    where: {
      id: state.packageId,
      organizationId: state.organizationId,
      environment: "e2e",
    },
    select: {
      state: true,
      manifestHash: true,
      allowedRoleCodes: true,
      suspendedAt: true,
      suspensionReason: true,
      approvals: {
        select: {
          id: true,
          approvalType: true,
          expiresAt: true,
        },
      },
      owners: {
        select: {
          id: true,
          validUntil: true,
        },
      },
    },
  });
});

test.afterEach(async () => {
  await restoreControlPlane();
});

test.afterAll(async () => {
  await restoreControlPlane();
  await db.$disconnect();
});

test("fails closed when the governed definition is DRAFT", async ({ page }) => {
  await db.agentDefinition.update({
    where: { key: "command-agent" },
    data: { status: "DRAFT", rolloutMode: "SHADOW" },
  });

  await expectDeniedWithoutPersistence(
    page,
    "Command Agent governance definitions are not ready.",
  );
});

test("fails closed when the release role scope no longer matches", async ({
  page,
}) => {
  await db.agentActivationPackage.update({
    where: { id: state.packageId },
    data: { allowedRoleCodes: ["UNRELATED_E2E_ROLE"] },
  });

  await expectDeniedWithoutPersistence(page, "Forbidden");
});

test("fails closed when the release manifest no longer matches", async ({
  page,
}) => {
  await db.agentActivationPackage.update({
    where: { id: state.packageId },
    data: { manifestHash: `sha256:${"0".repeat(64)}` },
  });

  await expectDeniedWithoutPersistence(
    page,
    "Command Agent release controls are not ready.",
  );
});

test("fails closed when a required approval has expired", async ({ page }) => {
  const approval = releaseBaseline.approvals.find(
    (candidate) => candidate.approvalType === "PRODUCT",
  );
  if (!approval) throw new Error("Product approval baseline is missing.");

  await db.agentActivationApproval.update({
    where: { id: approval.id },
    data: { expiresAt: new Date(0) },
  });

  await expectDeniedWithoutPersistence(
    page,
    "Command Agent release controls are not ready.",
  );
});

test("fails closed when required owner coverage has expired", async ({
  page,
}) => {
  const owner = releaseBaseline.owners[0];
  if (!owner) throw new Error("Owner coverage baseline is missing.");

  await db.agentActivationOwner.update({
    where: { id: owner.id },
    data: { validUntil: new Date(0) },
  });

  await expectDeniedWithoutPersistence(
    page,
    "Command Agent release controls are not ready.",
  );
});

test("denies a second tenant without a governed release package", async ({
  browser,
}) => {
  const releasePackages = await db.agentActivationPackage.count({
    where: { organizationId: crossTenantOrganizationId },
  });
  const runsBefore = await db.agentRun.count({
    where: { organizationId: crossTenantOrganizationId },
  });
  expect(releasePackages).toBe(0);
  const context = await browser.newContext({
    storageState: crossTenantAuthStatePath,
    viewport: { width: 1440, height: 1000 },
  });
  try {
    const page = await context.newPage();
    await page.goto("/en/dashboard/daily-digest", { waitUntil: "networkidle" });
    const panel = page.getByTestId("command-agent-panel");
    await expect(panel).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "Generate brief" }),
    ).toBeDisabled();
    await expect(panel.getByRole("status")).toContainText(
      "Command Agent is not available for this role.",
    );
    await expect(panel.getByTestId("command-agent-brief")).toHaveCount(0);
    await expect
      .poll(
        () =>
          db.agentRun.count({
            where: { organizationId: crossTenantOrganizationId },
          }),
        { timeout: 10_000 },
      )
      .toBe(runsBefore);
  } finally {
    await context.close();
  }
});

test("shows a safe rollback state after release suspension", async ({
  page,
}) => {
  await db.agentActivationPackage.update({
    where: { id: state.packageId },
    data: {
      state: "SUSPENDED",
      suspendedAt: new Date(),
      suspensionReason: "Controlled E2E rollback surface certification.",
    },
  });

  await expectDeniedWithoutPersistence(
    page,
    "Command Agent release controls are not ready.",
  );
});

async function expectDeniedWithoutPersistence(
  page: Page,
  expectedMessage: string,
) {
  const runsBefore = await db.agentRun.count({
    where: { organizationId: state.organizationId },
  });
  await page.goto("/en/dashboard/daily-digest", { waitUntil: "networkidle" });
  const panel = page.getByTestId("command-agent-panel");
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "Generate brief" }).click();
  await expect(panel.getByRole("alert")).toContainText(expectedMessage, {
    timeout: 90_000,
  });
  await expect(panel.getByTestId("command-agent-brief")).toHaveCount(0);
  await expect
    .poll(
      () =>
        db.agentRun.count({
          where: { organizationId: state.organizationId },
        }),
      { timeout: 10_000 },
    )
    .toBe(runsBefore);
}

async function restoreControlPlane() {
  if (definitionBaseline) {
    await db.agentDefinition.update({
      where: { key: "command-agent" },
      data: definitionBaseline,
    });
  }
  if (releaseBaseline) {
    await db.agentActivationPackage.update({
      where: { id: state.packageId },
      data: {
        state: releaseBaseline.state,
        manifestHash: releaseBaseline.manifestHash,
        allowedRoleCodes: releaseBaseline.allowedRoleCodes,
        suspendedAt: releaseBaseline.suspendedAt,
        suspensionReason: releaseBaseline.suspensionReason,
      },
    });
    await Promise.all(
      releaseBaseline.approvals.map((approval) =>
        db.agentActivationApproval.update({
          where: { id: approval.id },
          data: { expiresAt: approval.expiresAt },
        }),
      ),
    );
    await Promise.all(
      releaseBaseline.owners.map((owner) =>
        db.agentActivationOwner.update({
          where: { id: owner.id },
          data: { validUntil: owner.validUntil },
        }),
      ),
    );
  }
}
