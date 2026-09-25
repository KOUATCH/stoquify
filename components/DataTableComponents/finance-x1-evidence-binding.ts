import { z } from "zod";

const evidenceBindingFileListSchema = z.array(z.string().min(1)).min(1);

export const financeX1RequiredEvidenceRoutes = [
  {
    key: "receivables-history",
    path: "/dashboard/finance/receivables/history",
    requiredPermissions: ["CUSTOMER_RECEIVABLES_READ", "FINANCE_READ"],
  },
  {
    key: "payables",
    path: "/dashboard/finance/payables",
    requiredPermissions: ["SUPPLIER_PAYABLES_READ", "FINANCE_READ"],
  },
  {
    key: "cash-flow",
    path: "/dashboard/finance/cash-flow",
    requiredPermissions: ["CASH_FLOW_READ", "FINANCE_READ"],
  },
  {
    key: "journals",
    path: "/dashboard/accounting/journals",
    requiredPermissions: ["VIEW_JOURNAL_ENTRIES"],
  },
  {
    key: "trial-balance",
    path: "/dashboard/accounting/reports/trial-balance",
    requiredPermissions: ["FINANCIAL_REPORTS_READ"],
  },
  {
    key: "financial-statements",
    path: "/dashboard/accounting/reports/financial-statements",
    requiredPermissions: ["FINANCIAL_REPORTS_READ"],
  },
  {
    key: "accountant-portal",
    path: "/dashboard/accounting/accountant-portal",
    requiredPermissions: ["VIEW_FINANCIAL_AUDIT_TRAIL"],
  },
] as const;

export const financeX1ExternalAccountantForbiddenPermissions = [
  "GENERATE_FINANCIAL_STATEMENTS",
  "APPROVE_FINANCIAL_STATEMENTS",
  "PUBLISH_FINANCIAL_STATEMENTS",
  "CREATE_JOURNAL_ENTRIES",
  "APPROVE_JOURNAL_ENTRIES",
  "POST_JOURNAL_ENTRIES",
  "REVERSE_JOURNAL_ENTRIES",
  "MANAGE_FINANCIAL_CONTROLS",
  "CONFIGURE_FINANCIAL_SYSTEM",
  "MANAGE_FINANCIAL_PERMISSIONS",
  "MANAGE_FINANCIAL_PERIODS",
  "CLOSE_FINANCIAL_PERIODS",
  "MANAGE_CASH_TRANSACTIONS",
] as const;

const financeX1BudgetApprovalSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("pending"),
      budgetContractVersion: z.literal(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("approved"),
      budgetContractVersion: z.literal(1),
      approvalReference: z.string().min(1),
      approvedByUserId: z.string().min(1),
      approvedByRole: z.literal("product_approver"),
      approvedAt: z.string().datetime(),
      scope: z.literal("X1-finance-accounting-performance-budgets"),
    })
    .strict(),
]);

const financeX1EvidenceAuthorizationSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }).strict(),
  z
    .object({
      status: z.literal("approved"),
      environment: z.literal("non-production"),
      credentialApprovalReference: z.string().min(1),
      seededDataApprovalReference: z.string().min(1),
      authorizedFixtureTenantId: z.string().min(1),
      approvedByUserId: z.string().min(1),
      approvedAt: z.string().datetime(),
    })
    .strict(),
]);

const financeX1EvidenceArtifactSchema = z
  .object({
    artifactId: z.string().min(1),
    artifactPath: z.string().min(1),
    runId: z.string().min(1),
    organizationId: z.string().min(1),
    personaRole: z.string().min(1),
    locale: z.enum(["en", "fr"]),
    viewport: z.enum(["desktop", "tablet", "mobile"]),
    route: z.string().min(1),
    browser: z.string().min(1),
    capturedAt: z.string().datetime(),
    authenticated: z.literal(true),
    checks: z
      .object({
        routeLoaded: z.literal(true),
        authorizationVerified: z.literal(true),
        tenantIsolationVerified: z.literal(true),
        redactionVerified: z.literal(true),
        layoutUsable: z.literal(true),
        accessibilityReviewed: z.literal(true),
      })
      .strict(),
    measurements: z
      .object({
        viewportWidthPx: z.number().int().positive(),
        renderedRowCount: z.number().int().nonnegative(),
        measurementVersion: z.literal(2).optional(),
        resultKind: z.enum(["table-rows", "table-empty", "summary"]).optional(),
        navigationMs: z.number().nonnegative().optional(),
        authCheckMs: z.number().nonnegative().optional(),
        accessibilityMs: z.number().nonnegative().optional(),
        screenshotMs: z.number().nonnegative().optional(),
        captureElapsedMs: z.number().nonnegative().optional(),
        loadingIndicatorMs: z.number().nonnegative().optional(),
        usefulResultMs: z.number().nonnegative().optional(),
        interactionLatencyMs: z.number().nonnegative().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const financeX1EvidenceBindingSchema = z
  .object({
    schemaVersion: z.literal(1),
    routeFamily: z.literal("RF-05-finance-accounting"),
    implementationFiles: evidenceBindingFileListSchema,
    pilotFiles: evidenceBindingFileListSchema,
    focusedTestFiles: evidenceBindingFileListSchema,
    requiredLocales: z.tuple([z.literal("en"), z.literal("fr")]),
    requiredViewports: z.tuple([
      z.literal("desktop"),
      z.literal("tablet"),
      z.literal("mobile"),
    ]),
    requiredPersonaRoles: z.tuple([z.literal("external_accountant")]),
    requiredRoutes: z.tuple([
      z.literal("/dashboard/finance/receivables/history"),
      z.literal("/dashboard/finance/payables"),
      z.literal("/dashboard/finance/cash-flow"),
      z.literal("/dashboard/accounting/journals"),
      z.literal("/dashboard/accounting/reports/trial-balance"),
      z.literal("/dashboard/accounting/reports/financial-statements"),
      z.literal("/dashboard/accounting/accountant-portal"),
    ]),
    authentication: z
      .object({
        authenticatedRequired: z.literal(true),
        credentialsApprovalRequired: z.literal(true),
        seededDataApprovalRequired: z.literal(true),
      })
      .strict(),
    budgetApproval: financeX1BudgetApprovalSchema,
    evidenceAuthorization: financeX1EvidenceAuthorizationSchema,
    evidenceStatus: z.enum([
      "blocked-awaiting-approval",
      "approved-awaiting-evidence",
      "evidence-collected-awaiting-review",
    ]),
    claims: z
      .object({
        screenshotsAvailable: z.boolean(),
        measurementsAvailable: z.boolean(),
        productionBudgetsApproved: z.boolean(),
      })
      .strict(),
    evidenceArtifactPaths: z.array(z.string().min(1)),
    evidenceArtifacts: z.array(financeX1EvidenceArtifactSchema),
  })
  .strict()
  .superRefine((binding, context) => {
    const budgetApproved = binding.budgetApproval.status === "approved";
    const evidenceApproved = binding.evidenceAuthorization.status === "approved";
    const hasArtifacts = binding.evidenceArtifacts.length > 0;
    const hasMeasurements = binding.evidenceArtifacts.some(
      (artifact) => artifact.measurements !== undefined,
    );
    const artifactPaths = binding.evidenceArtifacts.map(
      (artifact) => artifact.artifactPath,
    );

    if (binding.claims.productionBudgetsApproved !== budgetApproved) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["claims", "productionBudgetsApproved"],
        message: "Budget approval claims require a traceable approved record.",
      });
    }

    if (binding.claims.screenshotsAvailable !== hasArtifacts) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["claims", "screenshotsAvailable"],
        message: "Screenshot claims must match the bound evidence artifacts.",
      });
    }

    if (binding.claims.measurementsAvailable !== hasMeasurements) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["claims", "measurementsAvailable"],
        message: "Measurement claims must match artifact measurements.",
      });
    }

    if (
      artifactPaths.length !== binding.evidenceArtifactPaths.length ||
      artifactPaths.some(
        (artifactPath) => !binding.evidenceArtifactPaths.includes(artifactPath),
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceArtifactPaths"],
        message: "Artifact paths must exactly match the bound artifacts.",
      });
    }

    if (
      new Set(binding.evidenceArtifactPaths).size !==
        binding.evidenceArtifactPaths.length ||
      new Set(binding.evidenceArtifacts.map((artifact) => artifact.artifactId))
        .size !== binding.evidenceArtifacts.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceArtifacts"],
        message: "Artifact paths and IDs must be unique.",
      });
    }

    for (const [index, artifact] of binding.evidenceArtifacts.entries()) {
      if (!artifact.route.startsWith(`/${artifact.locale}/`)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidenceArtifacts", index, "route"],
          message: "Artifact route locale must match the declared locale.",
        });
      }
    }

    if (binding.evidenceStatus === "blocked-awaiting-approval") {
      if (budgetApproved && evidenceApproved) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidenceStatus"],
          message: "Approved inputs must advance to awaiting evidence.",
        });
      }
      if (hasArtifacts) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidenceArtifacts"],
          message: "Evidence cannot be bound before approvals are complete.",
        });
      }
      return;
    }

    if (!budgetApproved || !evidenceApproved) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceStatus"],
        message: "Budget and evidence authorization approvals are required.",
      });
      return;
    }

    if (binding.evidenceStatus === "approved-awaiting-evidence") {
      if (hasArtifacts) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidenceArtifacts"],
          message: "Collected artifacts must advance to review.",
        });
      }
      return;
    }

    if (
      binding.budgetApproval.status !== "approved" ||
      binding.evidenceAuthorization.status !== "approved"
    ) {
      return;
    }

    const approvalCutoff = Math.max(
      Date.parse(binding.budgetApproval.approvedAt),
      Date.parse(binding.evidenceAuthorization.approvedAt),
    );
    const runIds = new Set(
      binding.evidenceArtifacts.map((artifact) => artifact.runId),
    );

    if (runIds.size !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceArtifacts"],
        message: "The evidence matrix must come from one authenticated run.",
      });
    }

    for (const [index, artifact] of binding.evidenceArtifacts.entries()) {
      if (
        artifact.organizationId !==
        binding.evidenceAuthorization.authorizedFixtureTenantId
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidenceArtifacts", index, "organizationId"],
          message: "Artifact tenant must match the authorized fixture tenant.",
        });
      }
      if (Date.parse(artifact.capturedAt) < approvalCutoff) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidenceArtifacts", index, "capturedAt"],
          message: "Authenticated evidence must be captured after approvals.",
        });
      }
    }

    const requiredCoverage = binding.requiredPersonaRoles.flatMap((personaRole) =>
      binding.requiredLocales.flatMap((locale) =>
        binding.requiredViewports.flatMap((viewport) =>
          binding.requiredRoutes.map(
            (route) => `${personaRole}:${locale}:${viewport}:/${locale}${route}`,
          ),
        ),
      ),
    );
    const actualCoverage = new Set(
      binding.evidenceArtifacts.map(
        (artifact) =>
          `${artifact.personaRole}:${artifact.locale}:${artifact.viewport}:${artifact.route}`,
      ),
    );

    if (
      !hasArtifacts ||
      requiredCoverage.some((coverage) => !actualCoverage.has(coverage))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceArtifacts"],
        message: "Authenticated EN/FR desktop, tablet, and mobile evidence is required.",
      });
    }
  });

export type FinanceX1EvidenceBinding = z.infer<
  typeof financeX1EvidenceBindingSchema
>;

export const financeX1EvidenceBinding: FinanceX1EvidenceBinding =
  financeX1EvidenceBindingSchema.parse({
    schemaVersion: 1,
    routeFamily: "RF-05-finance-accounting",
    implementationFiles: [
      "components/DataTableComponents/table-system-contract.ts",
      "components/DataTableComponents/finance-accounting-contracts.ts",
      "components/DataTableComponents/next-phase-contracts.ts",
      "services/accounting/finance-statement-export.service.ts",
      "actions/accounting/finance-statement-export.actions.ts",
      "components/accounting/CloseAssuranceCenter.tsx",
    ],
    pilotFiles: [
      "components/finance/AROpenItemsHistoryWorkbench.tsx",
      "components/purchasing/APHistoryWorkbench.tsx",
      "components/finance/CashPaymentHistoryWorkbench.tsx",
      "components/finance/FinanceCommandCenterDashboard.tsx",
    ],
    focusedTestFiles: [
      "components/DataTableComponents/__tests__/NextPhaseContracts.test.ts",
      "components/accounting/__tests__/CloseAssuranceCenter.test.tsx",
      "services/accounting/__tests__/finance-statement-export-operations.service.test.ts",
      "actions/accounting/__tests__/finance-statement-export.actions.test.ts",
    ],
    requiredLocales: ["en", "fr"],
    requiredViewports: ["desktop", "tablet", "mobile"],
    requiredPersonaRoles: ["external_accountant"],
    requiredRoutes: financeX1RequiredEvidenceRoutes.map((route) => route.path),
    authentication: {
      authenticatedRequired: true,
      credentialsApprovalRequired: true,
      seededDataApprovalRequired: true,
    },
    budgetApproval: {
      status: "pending",
      budgetContractVersion: 1,
    },
    evidenceAuthorization: {
      status: "pending",
    },
    evidenceStatus: "blocked-awaiting-approval",
    claims: {
      screenshotsAvailable: false,
      measurementsAvailable: false,
      productionBudgetsApproved: false,
    },
    evidenceArtifactPaths: [],
    evidenceArtifacts: [],
  });
