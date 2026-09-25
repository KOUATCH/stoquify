# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: finance-x1-local-authenticated-evidence.spec.ts >> en cash-flow local authenticated evidence
- Location: tests\e2e\finance-x1-local-authenticated-evidence.spec.ts:172:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 285

- Array []
+ Array [
+   Object {
+     "description": "Ensure buttons have discernible text",
+     "help": "Buttons must have discernible text",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/button-name?application=axeAPI",
+     "id": "button-name",
+     "impact": "critical",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "button-has-visible-text",
+             "impact": "critical",
+             "message": "Element does not have inner text that is visible to screen readers",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-label",
+             "impact": "critical",
+             "message": "aria-label attribute does not exist or is empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-labelledby",
+             "impact": "critical",
+             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "messageKey": "noAttr",
+             },
+             "id": "non-empty-title",
+             "impact": "critical",
+             "message": "Element has no title attribute",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "implicit-label",
+             "impact": "critical",
+             "message": "Element does not have an implicit (wrapped) <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "explicit-label",
+             "impact": "critical",
+             "message": "Element does not have an explicit <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "presentational-role",
+             "impact": "critical",
+             "message": "Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element does not have inner text that is visible to screen readers
+   aria-label attribute does not exist or is empty
+   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
+   Element has no title attribute
+   Element does not have an implicit (wrapped) <label>
+   Element does not have an explicit <label>
+   Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+         "html": "<button type=\"button\" role=\"combobox\" aria-expanded=\"false\" aria-autocomplete=\"none\" dir=\"ltr\" data-state=\"closed\" class=\"flex w-full items-ce...\">",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "div:nth-child(1) > .ring-offset-background.placeholder\\:text-muted-foreground.focus\\:ring-1",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "button-has-visible-text",
+             "impact": "critical",
+             "message": "Element does not have inner text that is visible to screen readers",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-label",
+             "impact": "critical",
+             "message": "aria-label attribute does not exist or is empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-labelledby",
+             "impact": "critical",
+             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "messageKey": "noAttr",
+             },
+             "id": "non-empty-title",
+             "impact": "critical",
+             "message": "Element has no title attribute",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "implicit-label",
+             "impact": "critical",
+             "message": "Element does not have an implicit (wrapped) <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "explicit-label",
+             "impact": "critical",
+             "message": "Element does not have an explicit <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "presentational-role",
+             "impact": "critical",
+             "message": "Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element does not have inner text that is visible to screen readers
+   aria-label attribute does not exist or is empty
+   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
+   Element has no title attribute
+   Element does not have an implicit (wrapped) <label>
+   Element does not have an explicit <label>
+   Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+         "html": "<button type=\"button\" role=\"combobox\" aria-expanded=\"false\" aria-autocomplete=\"none\" dir=\"ltr\" data-state=\"closed\" class=\"flex w-full items-ce...\">",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "div:nth-child(2) > .ring-offset-background.placeholder\\:text-muted-foreground.focus\\:ring-1",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "button-has-visible-text",
+             "impact": "critical",
+             "message": "Element does not have inner text that is visible to screen readers",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-label",
+             "impact": "critical",
+             "message": "aria-label attribute does not exist or is empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-labelledby",
+             "impact": "critical",
+             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "messageKey": "noAttr",
+             },
+             "id": "non-empty-title",
+             "impact": "critical",
+             "message": "Element has no title attribute",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "implicit-label",
+             "impact": "critical",
+             "message": "Element does not have an implicit (wrapped) <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "explicit-label",
+             "impact": "critical",
+             "message": "Element does not have an explicit <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "presentational-role",
+             "impact": "critical",
+             "message": "Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element does not have inner text that is visible to screen readers
+   aria-label attribute does not exist or is empty
+   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
+   Element has no title attribute
+   Element does not have an implicit (wrapped) <label>
+   Element does not have an explicit <label>
+   Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+         "html": "<button type=\"button\" role=\"combobox\" aria-expanded=\"false\" aria-autocomplete=\"none\" dir=\"ltr\" data-state=\"closed\" class=\"flex w-full items-ce...\">",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "div:nth-child(3) > .ring-offset-background.placeholder\\:text-muted-foreground.focus\\:ring-1",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.name-role-value",
+       "wcag2a",
+       "wcag412",
+       "section508",
+       "section508.22.a",
+       "TTv5",
+       "TT6.a",
+       "EN-301-549",
+       "EN-9.4.1.2",
+       "ACT",
+       "RGAAv4",
+       "RGAA-11.9.1",
+     ],
+   },
+   Object {
+     "description": "Ensure elements that have scrollable content are accessible by keyboard in Safari",
+     "help": "Scrollable region must have keyboard access",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/scrollable-region-focusable?application=axeAPI",
+     "id": "scrollable-region-focusable",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "focusable-content",
+             "impact": "serious",
+             "message": "Element should have focusable content",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "focusable-element",
+             "impact": "serious",
+             "message": "Element should be focusable",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element should have focusable content
+   Element should be focusable",
+         "html": "<div data-radix-scroll-area-viewport=\"\" class=\"h-full w-full rounded-[inherit]\" style=\"overflow: scroll;\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".rounded-\\[inherit\\]",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.keyboard",
+       "wcag2a",
+       "wcag211",
+       "wcag213",
+       "TTv5",
+       "TT4.a",
+       "EN-301-549",
+       "EN-9.2.1.1",
+       "EN-9.2.1.3",
+       "RGAAv4",
+       "RGAA-7.3.2",
+     ],
+   },
+ ]
```

# Test source

```ts
  19  |   "finance-x1",
  20  |   "local-simulation",
  21  |   runId,
  22  | )
  23  | const preflightPath = join(
  24  |   process.cwd(),
  25  |   "what-next",
  26  |   "evidence",
  27  |   "finance-x1",
  28  |   "local-simulation",
  29  |   "local-evidence-preflight.json",
  30  | )
  31  | 
  32  | type Viewport = "desktop" | "tablet" | "mobile"
  33  | type LocalArtifact = {
  34  |   artifactId: string
  35  |   artifactPath: string
  36  |   runId: string
  37  |   organizationId: "rds_org_001"
  38  |   foreignIsolationProbeTenantId: "rds_org_002"
  39  |   personaRole: "external_accountant"
  40  |   locale: "en" | "fr"
  41  |   viewport: Viewport
  42  |   route: string
  43  |   browser: string
  44  |   capturedAt: string
  45  |   authenticated: true
  46  |   authoritative: false
  47  |   approvedForReleaseEvidence: false
  48  |   checks: {
  49  |     routeLoaded: true
  50  |     authorizationVerified: true
  51  |     tenantIsolationVerified: true
  52  |     redactionBoundaryVerified: true
  53  |     layoutUsable: true
  54  |     accessibilityReviewed: true
  55  |   }
  56  |   measurements: {
  57  |     viewportWidthPx: number
  58  |     renderedRowCount: number
  59  |     measurementVersion: 2
  60  |     resultKind: FinanceX1Result["resultKind"]
  61  |     navigationMs: number
  62  |     authCheckMs: number
  63  |     accessibilityMs: number
  64  |     screenshotMs: number
  65  |     captureElapsedMs: number
  66  |     usefulResultMs: number
  67  |     bodyOverflowPx: number
  68  |   }
  69  | }
  70  | 
  71  | const artifacts: LocalArtifact[] = []
  72  | let projectFailed = false
  73  | 
  74  | function viewportFromProject(projectName: string): Viewport {
  75  |   if (projectName.endsWith("-desktop")) return "desktop"
  76  |   if (projectName.endsWith("-tablet")) return "tablet"
  77  |   if (projectName.endsWith("-mobile")) return "mobile"
  78  |   throw new Error(`Unknown local finance X1 viewport project: ${projectName}`)
  79  | }
  80  | 
  81  | async function verifyAuthenticatedBoundary(page: Page, requiredPermissions: readonly string[]) {
  82  |   const response = await page.request.get("/api/auth/permissions")
  83  |   expect(response.ok()).toBe(true)
  84  |   const payload = (await response.json()) as {
  85  |     organizationId?: string
  86  |     permissions?: string[]
  87  |     roles?: Array<{ code?: string }>
  88  |   }
  89  |   const permissions = payload.permissions ?? []
  90  |   const roles = (payload.roles ?? []).map((role) => role.code)
  91  | 
  92  |   expect(payload.organizationId).toBe("rds_org_001")
  93  |   expect(roles).toContain("external_accountant")
  94  |   expect(requiredPermissions.some((permission) => permissions.includes(permission))).toBe(true)
  95  |   for (const forbiddenPermission of financeX1ExternalAccountantForbiddenPermissions) {
  96  |     expect(permissions).not.toContain(forbiddenPermission)
  97  |   }
  98  | 
  99  |   const isolationResponse = await page.request.get("/api/auth/permissions", {
  100 |     headers: { "x-organization-id": "rds_org_002" },
  101 |   })
  102 |   expect(isolationResponse.ok()).toBe(true)
  103 |   const isolationPayload = (await isolationResponse.json()) as { organizationId?: string }
  104 |   expect(isolationPayload.organizationId).toBe("rds_org_001")
  105 | }
  106 | 
  107 | async function verifyAccessibility(page: Page) {
  108 |   await page.addScriptTag({ content: axe.source })
  109 |   const violations = await page.evaluate(async () => {
  110 |     const engine = (window as unknown as { axe: typeof axe }).axe
  111 |     const result = await engine.run(document, {
  112 |       resultTypes: ["violations"],
  113 |       runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
  114 |     })
  115 |     return result.violations.filter((violation) =>
  116 |       violation.impact === "serious" || violation.impact === "critical",
  117 |     )
  118 |   })
> 119 |   expect(violations).toEqual([])
      |                      ^ Error: expect(received).toEqual(expected) // deep equality
  120 | }
  121 | 
  122 | test.beforeAll(async () => {
  123 |   expect(process.env.X1_ALLOW_LOCAL_SIMULATION).toBe("true")
  124 |   expect(runId).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]{5,80}$/)
  125 |   const preflight = JSON.parse(await readFile(preflightPath, "utf8")) as {
  126 |     status?: string
  127 |     classification?: string
  128 |     storageStatePresent?: boolean
  129 |     blockerCount?: number
  130 |   }
  131 |   expect(preflight).toMatchObject({
  132 |     status: "ready-for-local-authenticated-capture",
  133 |     classification: "LOCAL_SIMULATION_PREFLIGHT_NOT_RELEASE_EVIDENCE",
  134 |     storageStatePresent: true,
  135 |     blockerCount: 0,
  136 |   })
  137 | })
  138 | 
  139 | test.afterEach(async ({}, testInfo) => {
  140 |   if (testInfo.status !== testInfo.expectedStatus) projectFailed = true
  141 | })
  142 | 
  143 | test.afterAll(async ({}, testInfo) => {
  144 |   const viewport = viewportFromProject(testInfo.project.name)
  145 |   await mkdir(runDirectory, { recursive: true })
  146 |   await writeFile(
  147 |     join(runDirectory, `fragment-${viewport}.json`),
  148 |     `${JSON.stringify(
  149 |       {
  150 |         schemaVersion: 1,
  151 |         classification: "LOCAL_SIMULATION_AUTHENTICATED_EVIDENCE_FRAGMENT",
  152 |         authoritative: false,
  153 |         approvedForReleaseEvidence: false,
  154 |         releaseGate: "BLOCKED_EXTERNAL_APPROVAL_REQUIRED",
  155 |         status:
  156 |           !projectFailed && artifacts.length === financeX1RequiredEvidenceRoutes.length * 2
  157 |             ? "PASS"
  158 |             : "FAIL",
  159 |         runId,
  160 |         viewport,
  161 |         artifacts,
  162 |       },
  163 |       null,
  164 |       2,
  165 |     )}\n`,
  166 |     "utf8",
  167 |   )
  168 | })
  169 | 
  170 | for (const locale of ["en", "fr"] as const) {
  171 |   for (const route of financeX1RequiredEvidenceRoutes) {
  172 |     test(`${locale} ${route.key} local authenticated evidence`, async ({ page, browserName }, testInfo) => {
  173 |       const viewport = viewportFromProject(testInfo.project.name)
  174 |       const routePath = `/${locale}${route.path}`
  175 |       const startedAt = Date.now()
  176 | 
  177 |       const routeTiming = await measureFinanceX1Route(page, routePath, route.key)
  178 |       await expect(page).not.toHaveURL(/\/(?:login|unauthorized)(?:\?|$)/)
  179 |       await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i)
  180 |       const authStartedAt = Date.now()
  181 |       await verifyAuthenticatedBoundary(page, route.requiredPermissions)
  182 |       const authCheckMs = Date.now() - authStartedAt
  183 |       await expect(page.locator("body")).not.toContainText("rds_org_002")
  184 |       const accessibilityStartedAt = Date.now()
  185 |       await verifyAccessibility(page)
  186 |       const accessibilityMs = Date.now() - accessibilityStartedAt
  187 | 
  188 |       const layout = await page.evaluate(() => ({
  189 |         clientWidth: document.documentElement.clientWidth,
  190 |         scrollWidth: document.documentElement.scrollWidth,
  191 |       }))
  192 |       const bodyOverflowPx = Math.max(0, layout.scrollWidth - layout.clientWidth)
  193 |       expect(bodyOverflowPx).toBeLessThanOrEqual(2)
  194 | 
  195 |       const screenshotPath = join(
  196 |         runDirectory,
  197 |         "screenshots",
  198 |         viewport,
  199 |         locale,
  200 |         `${route.key}.png`,
  201 |       )
  202 |       await mkdir(join(runDirectory, "screenshots", viewport, locale), { recursive: true })
  203 |       const result = await waitForFinanceX1Result(page, route.key)
  204 |       const screenshotStartedAt = Date.now()
  205 |       await page.screenshot({ path: screenshotPath, fullPage: true })
  206 |       const screenshotMs = Date.now() - screenshotStartedAt
  207 |       expect(await page.evaluate(readFinanceX1Result, route.key)).toEqual(result)
  208 | 
  209 |       const viewportSize = page.viewportSize()
  210 |       expect(viewportSize).not.toBeNull()
  211 |       artifacts.push({
  212 |         artifactId: `${runId}-${viewport}-${locale}-${route.key}`,
  213 |         artifactPath: relative(process.cwd(), screenshotPath).replace(/\\/g, "/"),
  214 |         runId,
  215 |         organizationId: "rds_org_001",
  216 |         foreignIsolationProbeTenantId: "rds_org_002",
  217 |         personaRole: "external_accountant",
  218 |         locale,
  219 |         viewport,
```