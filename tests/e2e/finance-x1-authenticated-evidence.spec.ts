import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { measureFinanceX1Route, readFinanceX1Result, waitForFinanceX1Result } from "./finance-x1-route-observation";

import {
  financeX1EvidenceBindingSchema,
  financeX1ExternalAccountantForbiddenPermissions,
  financeX1RequiredEvidenceRoutes,
  type FinanceX1EvidenceBinding,
} from "../../components/DataTableComponents/finance-x1-evidence-binding";

test.describe.configure({ mode: "serial", timeout: 240_000 });

const approvalManifestPath =
  process.env.FINANCE_X1_EVIDENCE_APPROVAL_MANIFEST ??
  "what-next/evidence/finance-x1/finance-x1-evidence-manifest.pending.json";
const runId =
  process.env.FINANCE_X1_EVIDENCE_RUN_ID ?? "missing-approved-run-id";
const foreignTenantId =
  process.env.FINANCE_X1_FOREIGN_TENANT_ID ?? "missing-foreign-tenant-id";
const runDirectory = join(
  process.cwd(),
  "what-next",
  "evidence",
  "finance-x1",
  runId,
);

type EvidenceArtifact = FinanceX1EvidenceBinding["evidenceArtifacts"][number];
type Viewport = FinanceX1EvidenceBinding["requiredViewports"][number];

let approvedBinding: FinanceX1EvidenceBinding;
const evidenceArtifacts: EvidenceArtifact[] = [];

function evidenceRelativePath(absolutePath: string): string {
  return relative(process.cwd(), absolutePath).replace(/\\/g, "/");
}

function viewportFromProject(projectName: string): Viewport {
  if (projectName.endsWith("-desktop")) return "desktop";
  if (projectName.endsWith("-tablet")) return "tablet";
  if (projectName.endsWith("-mobile")) return "mobile";
  throw new Error(`Unknown finance X1 viewport project: ${projectName}`);
}

async function loadApprovedBinding(): Promise<FinanceX1EvidenceBinding> {
  const parsed = financeX1EvidenceBindingSchema.parse(
    JSON.parse(await readFile(approvalManifestPath, "utf8")),
  );
  if (
    parsed.evidenceStatus !== "approved-awaiting-evidence" ||
    parsed.budgetApproval.status !== "approved" ||
    parsed.evidenceAuthorization.status !== "approved"
  ) {
    throw new Error(
      "Finance X1 browser capture requires traceable approved-awaiting-evidence input.",
    );
  }
  return parsed;
}

async function expectAuthorizedReadOnlyContext(
  page: Page,
  requiredPermissions: readonly string[],
  organizationId: string,
): Promise<void> {
  await expect(page).not.toHaveURL(/\/(?:login|unauthorized)(?:\?|$)/);
  await expect(page.locator("body")).not.toContainText(
    /Application error|Internal Server Error/i,
  );

  const permissionsResponse = await page.request.get("/api/auth/permissions");
  expect(permissionsResponse.ok()).toBe(true);
  const permissionsPayload = (await permissionsResponse.json()) as {
    organizationId?: string;
    permissions?: string[];
    roles?: Array<{ code?: string }>;
  };
  const permissions = permissionsPayload.permissions ?? [];
  const roles = (permissionsPayload.roles ?? []).map((role) => role.code);

  expect(permissionsPayload.organizationId).toBe(organizationId);
  expect(roles).toContain("external_accountant");
  expect(
    requiredPermissions.some((permission) => permissions.includes(permission)),
  ).toBe(true);
  for (const forbiddenPermission of
    financeX1ExternalAccountantForbiddenPermissions) {
    expect(permissions).not.toContain(forbiddenPermission);
  }

  const tenantOverrideResponse = await page.request.get(
    "/api/auth/permissions",
    { headers: { "x-organization-id": foreignTenantId } },
  );
  expect(tenantOverrideResponse.ok()).toBe(true);
  const tenantOverridePayload = (await tenantOverrideResponse.json()) as {
    organizationId?: string;
  };
  expect(tenantOverridePayload.organizationId).toBe(organizationId);
}

async function auditAccessibility(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const seriousViolations = await page.evaluate(async () => {
    const browserAxe = (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: Record<string, unknown>,
          ) => Promise<{
            violations: Array<{
              id: string;
              impact?: string | null;
              help: string;
              nodes: unknown[];
            }>;
          }>;
        };
      }
    ).axe;
    const result = await browserAxe.run(document, {
      resultTypes: ["violations"],
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    });
    return result.violations
      .filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical",
      )
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact ?? null,
        help: violation.help,
        nodeCount: violation.nodes.length,
      }));
  });
  expect(seriousViolations).toEqual([]);

  await page.keyboard.press("Tab");
  const focusState = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return { tag: "none", visible: false };
    const rect = active.getBoundingClientRect();
    return {
      tag: active.tagName.toLowerCase(),
      visible: rect.width > 0 && rect.height > 0,
    };
  });
  expect(focusState.tag).not.toBe("body");
  expect(focusState.visible).toBe(true);
}

async function auditLayout(page: Page) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const documentWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body?.scrollWidth ?? documentWidth;
    const clippedControls = Array.from(
      document.querySelectorAll<HTMLElement>(
        "a, button, input, select, textarea, [role='button'], [role='tab']",
      ),
    )
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity || "1") > 0 &&
          rect.width > 1 &&
          rect.height > 1 &&
          (rect.left < -2 || rect.right > viewportWidth + 2)
        );
      })
      .map((element) =>
        (
          element.innerText ||
          element.getAttribute("aria-label") ||
          element.id ||
          element.tagName
        )
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 100),
      );
    return {
      viewportWidth,
      hasDocumentOverflow:
        Math.max(documentWidth, bodyWidth) > viewportWidth + 8,
      clippedControls,
    };
  });
}

test.beforeAll(async () => {
  approvedBinding = await loadApprovedBinding();
});

test.afterAll(async ({}, testInfo) => {
  if (evidenceArtifacts.length === 0) return;
  const viewport = viewportFromProject(testInfo.project.name);
  await mkdir(runDirectory, { recursive: true });
  await writeFile(
    join(runDirectory, `fragment-${viewport}.json`),
    `${JSON.stringify(
      {
        status: "PASS",
        runId,
        viewport,
        project: testInfo.project.name,
        artifactCount: evidenceArtifacts.length,
        artifacts: evidenceArtifacts,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
});

for (const locale of ["en", "fr"] as const) {
  for (const route of financeX1RequiredEvidenceRoutes) {
    test(`${locale} ${route.key} is authenticated, read-only, usable, and discoverable`, async ({
      page,
    }, testInfo) => {
      if (approvedBinding.evidenceAuthorization.status !== "approved") {
        throw new Error("Evidence authorization is not approved.");
      }
      const organizationId =
        approvedBinding.evidenceAuthorization.authorizedFixtureTenantId;
      const viewport = viewportFromProject(testInfo.project.name);
      const localizedRoute = `/${locale}${route.path}`;
      const startedAt = Date.now();

      const routeTiming = await measureFinanceX1Route(page, localizedRoute, route.key);
      const authStartedAt = Date.now();
      await expectAuthorizedReadOnlyContext(
        page,
        route.requiredPermissions,
        organizationId,
      );
      const authCheckMs = Date.now() - authStartedAt;
      await expect(page.locator("body")).not.toContainText(
        /module is not enabled|module n'est pas activé|module n’est pas activé/i,
      );

      const bodyText = await page.locator("body").innerText();
      expect(bodyText).not.toMatch(
        /super-secret|provider-token|private-salary|private-payment/i,
      );
      const protectedMutationButton = page.getByRole("button", {
        name: /post journal|approve statement|publish statement|reverse journal|close period|reopen period|create journal|comptabiliser|approuver l'état|publier l'état|contrepasser|clôturer la période|rouvrir la période|créer une écriture/i,
      });
      await expect(protectedMutationButton).toHaveCount(0);

      const accessibilityStartedAt = Date.now();
      await auditAccessibility(page);
      const accessibilityMs = Date.now() - accessibilityStartedAt;
      const layout = await auditLayout(page);
      expect(layout.hasDocumentOverflow).toBe(false);
      expect(layout.clippedControls).toEqual([]);

      await mkdir(runDirectory, { recursive: true });
      const screenshotPath = join(
        runDirectory,
        `${route.key}-${locale}-${viewport}.png`,
      );
      const result = await waitForFinanceX1Result(page, route.key);
      const screenshotStartedAt = Date.now();
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: "disabled",
      });
      const screenshotMs = Date.now() - screenshotStartedAt;
      expect(await page.evaluate(readFinanceX1Result, route.key)).toEqual(result);

      evidenceArtifacts.push({
        artifactId: `${runId}-${route.key}-${locale}-${viewport}`,
        artifactPath: evidenceRelativePath(screenshotPath),
        runId,
        organizationId,
        personaRole: "external_accountant",
        locale,
        viewport,
        route: localizedRoute,
        browser:
          page.context().browser()?.browserType().name() ?? "chromium",
        capturedAt: new Date().toISOString(),
        authenticated: true,
        checks: {
          routeLoaded: true,
          authorizationVerified: true,
          tenantIsolationVerified: true,
          redactionVerified: true,
          layoutUsable: true,
          accessibilityReviewed: true,
        },
        measurements: {
          viewportWidthPx: layout.viewportWidth,
          measurementVersion: 2,
          renderedRowCount: result.renderedRowCount,
          resultKind: result.resultKind,
          ...routeTiming,
          authCheckMs,
          accessibilityMs,
          screenshotMs,
          captureElapsedMs: Date.now() - startedAt,
        },
      });
    });
  }
}
