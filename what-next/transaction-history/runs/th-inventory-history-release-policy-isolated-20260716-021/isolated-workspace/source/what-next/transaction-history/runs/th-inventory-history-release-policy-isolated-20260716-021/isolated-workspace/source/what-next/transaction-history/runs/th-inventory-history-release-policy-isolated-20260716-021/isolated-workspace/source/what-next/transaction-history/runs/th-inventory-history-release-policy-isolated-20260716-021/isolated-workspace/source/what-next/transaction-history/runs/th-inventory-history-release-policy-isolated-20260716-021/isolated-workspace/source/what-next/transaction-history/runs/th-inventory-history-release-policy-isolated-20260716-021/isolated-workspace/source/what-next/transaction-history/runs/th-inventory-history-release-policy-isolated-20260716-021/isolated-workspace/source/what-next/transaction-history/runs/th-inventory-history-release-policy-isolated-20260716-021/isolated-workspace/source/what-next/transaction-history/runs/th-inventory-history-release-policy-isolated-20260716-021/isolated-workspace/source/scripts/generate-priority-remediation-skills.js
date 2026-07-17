const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const skillsRoot =
  process.env.CODEX_SKILLS_ROOT ||
  "C:\\Users\\J COMPUTER\\.codex\\skills";
const date = "2026-06-16";

const sourceReports = [
  "what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md",
  "what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md",
  "what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md",
  "what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md",
  "what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md",
  "graphify-out/GRAPH_REPORT.md",
];

const sharedControls = [
  "derive tenant and actor from trusted auth context, never caller-supplied organization scope",
  "enforce RBAC permissions at the service boundary and keep actions as validation/orchestration only",
  "enforce maker-checker segregation for approval, posting, certification, and destructive workflows where applicable",
  "reject closed or locked fiscal periods before economic mutation or certification state change",
  "record immutable audit and business-event evidence for economic, compliance, and trust decisions",
  "post valid ledger entries or create explicit close blockers with accountant-review evidence",
  "return typed, user-safe enterprise errors and keep internal details out of client responses",
  "add focused regression tests before deleting or ratcheting legacy paths",
];

const skills = [
  {
    n: "001",
    slug: "green-baseline-ratchets",
    title: "Green Baseline Ratchets",
    purpose:
      "Preserve the current green AqStoqFlow baseline before priority remediation changes continue.",
    priority:
      "Priority 0 from the examination report: do not lose the current working state while the codebase is hardened.",
    risk:
      "Without a stable baseline, later remediation can mix real regressions with pre-existing noise and make release hardening unreliable.",
    depends: "None.",
    inspect: [
      "package.json",
      "prisma/schema.prisma",
      "scripts/*gate*.js",
      "what-next/AQSTOQFLOW_*REPORT*.md",
      "what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md",
    ],
    mayEdit: [
      "package.json verification scripts",
      "scripts/*gate*.js only when a gate is broken or missing",
      "what-next/* baseline and completion reports",
      "focused tests for verification helpers",
    ],
    workflow: [
      "Read the latest enterprise examination, statutory scan, certification scan, and service-boundary report.",
      "Capture the currently passing verification commands and known non-blocking warnings.",
      "Repair only broken verification scripts or missing report-mode gates needed to preserve the baseline.",
      "Do not refactor business modules in this skill unless a baseline command cannot run without a surgical repair.",
      "Save a baseline report under what-next with commands, results, warnings, and next eligible priority skill.",
    ],
    tests: [
      "gate script smoke tests when scripts are touched",
      "no domain workflow tests unless a baseline command needed code repair",
    ],
    verification: [
      "npm run prisma:validate",
      "npm run typecheck",
      "npm run inventory:boundary:fail",
      "node scripts/service-boundary-gate.js --mode report",
    ],
    success:
      "The repo has a current baseline report and all available baseline commands either pass or have explicit, evidence-backed blockers.",
  },
  {
    n: "002",
    slug: "service-boundary-ratchets",
    title: "Service Boundary Ratchets",
    purpose:
      "Ratchet App Router, actions, hooks, and components away from direct Prisma and action-owned business mutation.",
    priority:
      "Priority 1 and Slice 1 from the examination report: stop new service-boundary bypasses before migrating all old ones.",
    risk:
      "Direct Prisma and action-owned economic mutation can bypass tenant isolation, RBAC, audit, typed errors, open-period controls, and service-owned business rules.",
    depends: "priority-001-green-baseline-ratchets.",
    inspect: [
      "scripts/service-boundary-gate.js",
      "scripts/inventory-boundary-gate.js",
      "app/api/v1/**/*",
      "app/[locale]/**/*page.tsx",
      "actions/**/*",
      "components/**/*",
      "hooks/**/*",
      "services/**/*",
    ],
    mayEdit: [
      "scripts/service-boundary-gate.js",
      "scripts/__tests__/service-boundary-gate.test.js",
      "package.json gate scripts",
      "what-next/* boundary reports",
      "thin call-site migrations only when needed to prove the ratchet",
    ],
    workflow: [
      "Read the current service-boundary report and scanner implementation.",
      "Classify direct Prisma imports, Prisma type coupling, action-owned mutation, and economic mutation.",
      "Keep the gate in report mode until known findings are migrated, but fail on new or worsened findings when a baseline exists.",
      "Document each allowed exception with owner, reason, expiry, and replacement service path.",
      "Save markdown and JSON boundary reports under what-next.",
    ],
    tests: [
      "scanner unit tests for each classification",
      "fixture tests for allowed tests/mocks and real violations",
    ],
    verification: [
      "node --check scripts/service-boundary-gate.js",
      "npm test -- scripts/__tests__/service-boundary-gate.test.js --runInBand",
      "node scripts/service-boundary-gate.js --mode report",
      "npm run typecheck",
    ],
    success:
      "The boundary scanner is stable, reportable, tested, and usable as a release ratchet after migration counts reach zero.",
  },
  {
    n: "003",
    slug: "tenant-rbac-maker-checker",
    title: "Tenant RBAC Maker Checker",
    purpose:
      "Harden tenant scope, RBAC, and maker-checker controls across protected service and action boundaries.",
    priority:
      "Priority ordering rule: tenant isolation and RBAC weaknesses must be closed before economic domain migrations are trusted.",
    risk:
      "Legacy actions and routes can accept caller-supplied organization scope or permit approval/posting without proven actor segregation.",
    depends: "priority-001-green-baseline-ratchets and priority-002-service-boundary-ratchets.",
    inspect: [
      "services/_shared/protect.ts",
      "services/_shared/rbac.ts",
      "services/_shared/tenant.ts",
      "actions/**/*",
      "app/api/**/*",
      "services/**/__tests__/*",
    ],
    mayEdit: [
      "services/_shared/*",
      "actions and routes that derive tenant scope incorrectly",
      "service tests proving wrong-tenant and unauthorized rejection",
      "what-next/* tenant/RBAC reports",
    ],
    workflow: [
      "Inventory protected actions and service calls that accept organizationId or actor fields from request payloads.",
      "Ensure trusted context derives organization and actor before handler execution.",
      "Add or extend tenant guard helpers without breaking explicit, reviewed multi-tenant administration paths.",
      "Enforce separate create, approve, reject, post, export, and certify permissions where the domain needs them.",
      "Block same-actor approval unless an existing explicit policy allows it and is documented.",
      "Map failures to typed safe errors and add regression tests.",
    ],
    tests: [
      "wrong-tenant rejection",
      "unauthorized actor rejection",
      "same-maker approval rejection where applicable",
      "safe action result mapping",
    ],
    verification: [
      "npm test -- services/_shared --runInBand",
      "npm test -- actions --runInBand",
      "npm run typecheck",
      "node scripts/service-boundary-gate.js --mode report",
    ],
    success:
      "Tenant, actor, permission, and maker-checker rules are enforced centrally and proven on representative legacy and modern paths.",
  },
  {
    n: "004",
    slug: "inventory-item-action-migrator",
    title: "Inventory Item Action Migrator",
    purpose:
      "Finish migration of inventory and item actions into service-owned stock, item, transfer, reservation, count, adjustment, and write-off workflows.",
    priority:
      "Priority 2 and Slice 2 from the examination report, plus the 010 continuation blockers.",
    risk:
      "Old item and inventory actions still expose direct item mutation, mock inventory data, transfer/reservation logic, hard deletes, and incomplete count/adjustment/write-off service ownership.",
    depends: "priority-001 through priority-003.",
    inspect: [
      "actions/inventory/inventoryActions.ts",
      "actions/inventory/inventoryMovementActions.ts",
      "actions/item/items.ts",
      "actions/item/listItemsAction.ts",
      "actions/itemsShow/*",
      "services/inventory/*",
      "services/item/*",
      "prisma/schema.prisma",
    ],
    mayEdit: [
      "services/inventory/*.schemas.ts",
      "services/inventory/*.errors.ts",
      "services/inventory/*.service.ts",
      "services/item/*.service.ts",
      "actions/inventory/*.ts",
      "actions/item/*.ts",
      "actions/itemsShow/*.ts",
      "services/inventory/__tests__/*",
      "services/item/__tests__/*",
      "actions/**/__tests__/*",
    ],
    workflow: [
      "Read the 010 continuation report and current boundary report before changing code.",
      "Build or reuse service-owned methods for transfers, reservations, stock counts, adjustments, write-offs, item updates, and initial stock.",
      "Enforce open-period guards, business events, audit, idempotency, maker-checker where applicable, and ledger posting or close blockers.",
      "Migrate actions so they parse input, derive context, call services, map errors, and revalidate only.",
      "Quarantine or delete mock inventory exports only after callers are moved or proven unused.",
      "Delete legacy action-owned mutation only after service replacement and regression coverage exist.",
    ],
    tests: [
      "successful transfer/reservation/item update through service-backed action",
      "successful stock adjustment and write-off request/approval path",
      "closed-period rejection",
      "unauthorized and wrong-tenant rejection",
      "ledger posting path or close-blocker fallback",
      "boundary gate no longer reports migrated action paths",
    ],
    verification: [
      "npm run inventory:boundary:fail",
      "npm test -- services/inventory services/item actions/inventory actions/item actions/itemsShow --runInBand",
      "node scripts/service-boundary-gate.js --mode report",
      "npm run typecheck",
      "npm run prisma:validate",
    ],
    success:
      "No stock, transfer, reservation, count, write-off, adjustment, or item economic update remains action-owned.",
  },
  {
    n: "005",
    slug: "purchasing-ap-consolidator",
    title: "Purchasing AP Consolidator",
    purpose:
      "Consolidate legacy purchase-order behavior into the statutory purchasing/AP service path.",
    priority:
      "Priority 3 and Slice 3 from the examination report.",
    risk:
      "Split ownership between services/purchase-order and services/purchasing can bypass AP controls, raw error handling, receipt stock discipline, ledger evidence, reconciliation, and country-pack blockers.",
    depends: "priority-001 through priority-004.",
    inspect: [
      "services/purchase-order/purchase-order.service.ts",
      "services/purchasing/*",
      "actions/purchase-order*",
      "actions/purchasing/*",
      "components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx",
      "services/inventory/*",
      "services/accounting/*",
      "services/payments/*",
    ],
    mayEdit: [
      "services/purchasing/*",
      "services/purchase-order/* only to route legacy callers to canonical AP services or retire old paths",
      "actions/purchasing/*",
      "actions/purchase-order*",
      "focused AP, inventory, ledger, and action tests",
    ],
    workflow: [
      "Map all PO submit, approve, receive, invoice, pay, cancel, and delete call sites.",
      "Pick services/purchasing as the canonical owner unless current evidence proves otherwise.",
      "Route goods receipt stock effects through inventory services and preserve ledger/reconciliation evidence.",
      "Replace placeholder approval actors with trusted actor context.",
      "Convert hard deletes to draft cancellation, reversal, or soft delete with audit evidence.",
      "Retire legacy purchase-order methods only after callers and tests are migrated.",
    ],
    tests: [
      "PO submit/approve/receive/invoice/pay happy path",
      "wrong tenant and unauthorized actor rejection",
      "closed fiscal period rejection",
      "inventory receipt path through inventory service",
      "ledger posting or AP blocker path",
      "no placeholder system-user approvals",
    ],
    verification: [
      "npm test -- services/purchasing services/purchase-order actions/purchasing --runInBand",
      "npm run inventory:boundary:fail",
      "node scripts/service-boundary-gate.js --mode report",
      "npm run typecheck",
      "npm run prisma:validate",
    ],
    success:
      "Purchase order, receipt, invoice, supplier payment, stock, ledger, and reconciliation evidence flow through one controlled AP service path.",
  },
  {
    n: "006",
    slug: "hard-delete-immutability",
    title: "Hard Delete Immutability",
    purpose:
      "Add and enforce hard-delete policy for evidence-bearing AqStoqFlow records.",
    priority:
      "Slice 4 from the examination report and a prerequisite for trustworthy audit, close, and compliance workflows.",
    risk:
      "Economic or audit-bearing records can be physically deleted instead of cancelled, reversed, soft-deleted, or draft-cleaned with evidence.",
    depends: "priority-001 through priority-005 where domain deletes depend on canonical services.",
    inspect: [
      "actions/itemsShow/deleteItem.ts",
      "actions/item/items.ts",
      "services/purchase-order/purchase-order.service.ts",
      "services/unit/unit.service.ts",
      "services/tax-rate/tax-rate.service.ts",
      "actions/users/deleteUser.ts",
      "actions/locations/deleteLocation.ts",
      "prisma/schema.prisma",
    ],
    mayEdit: [
      "scripts/hard-delete-gate.js",
      "scripts/__tests__/hard-delete-gate.test.js",
      "domain services that need cancellation, reversal, or soft delete",
      "delete actions after service replacements exist",
      "focused delete-policy tests",
    ],
    workflow: [
      "Scan for delete/deleteMany and classify each path as config cleanup, draft cleanup, soft delete, cancellation, reversal, or forbidden.",
      "Create or repair hard-delete gate report mode before failing builds.",
      "Move evidence-bearing deletes behind service-owned cancellation/reversal/soft-delete methods.",
      "Require audit, business event, actor, reason, and tenant evidence for each non-draft deletion alternative.",
      "Reject posted/final economic record hard deletes with typed user-safe errors.",
      "Delete old direct delete functions only after usage reaches zero.",
    ],
    tests: [
      "posted/final economic delete is rejected",
      "draft cleanup remains allowed where policy permits",
      "soft delete or cancellation emits audit/business event",
      "hard-delete scanner classifies representative paths",
    ],
    verification: [
      "node scripts/hard-delete-gate.js --mode report",
      "npm test -- scripts/__tests__/hard-delete-gate.test.js --runInBand",
      "npm test -- actions services --runInBand",
      "npm run typecheck",
    ],
    success:
      "Every hard delete is intentionally categorized, and forbidden economic deletes are blocked by service code and static gates.",
  },
  {
    n: "007",
    slug: "error-response-normalizer",
    title: "Error Response Normalizer",
    purpose:
      "Normalize raw errors into typed, user-safe enterprise errors across priority economic services, actions, and routes.",
    priority:
      "Priority 4 and Slice 5 from the examination report, plus the statutory scan raw-error findings.",
    risk:
      "Raw throw/rethrow/console error patterns can leak internals, produce inconsistent UX, and bypass error classifications needed for support and controls.",
    depends: "priority-001 through priority-006.",
    inspect: [
      "services/_shared/*error*",
      "lib/error-handling/*",
      "services/purchase-order/purchase-order.service.ts",
      "services/pos/pos.service.ts",
      "services/accounting/posting.service.ts",
      "services/accounting/journals.service.ts",
      "actions/inventory/inventoryMovementActions.ts",
      "app/api/v1/*",
    ],
    mayEdit: [
      "services/*/*.errors.ts",
      "services/*/*.service.ts for typed error replacements",
      "actions/**/* for safe action result mapping",
      "app/api/**/* for safe route envelopes",
      "focused error-handling tests",
    ],
    workflow: [
      "Read existing enterprise error helpers and pick the local pattern as canonical.",
      "Prioritize economic services first: inventory, purchasing/AP, POS, accounting, payments, close assurance.",
      "Replace raw Error construction with typed domain errors carrying code, severity, safe message, retryability, and safe metadata.",
      "Map Prisma and infrastructure errors into safe classifications at service/action/route boundaries.",
      "Keep internal details in logs with correlation/request id, not in client payloads.",
      "Add representative tests before broad ratcheting.",
    ],
    tests: [
      "safe action error envelope for domain error",
      "safe route error envelope for unexpected error",
      "Prisma/infrastructure error is classified without leaking internals",
      "typed economic service error includes code and safe metadata",
    ],
    verification: [
      "npm test -- services/_shared lib/error-handling actions app/api --runInBand",
      "npm run typecheck",
      "rg -n \"throw new Error\\(|throw error|console.error\\(\" services actions app lib",
    ],
    success:
      "New and migrated priority paths return consistent safe errors, and raw internal exceptions cannot cross client boundaries.",
  },
  {
    n: "008",
    slug: "demo-report-trust-cleaner",
    title: "Demo Report Trust Cleaner",
    purpose:
      "Remove production-visible mock/demo paths and make reports display real provenance, freshness, and certification state.",
    priority:
      "Priority 5 and Slice 6 from the examination report.",
    risk:
      "Mock inventory, monitoring, and report placeholders can make dashboards and reports appear more operationally trustworthy than their evidence supports.",
    depends: "priority-001 through priority-007.",
    inspect: [
      "actions/inventory/inventoryActions.ts",
      "app/[locale]/(dashboard)/dashboard/items/new/page.tsx",
      "components/reports/cash-flow-report.tsx",
      "lib/error-handling/monitoring.ts",
      "app/**/*report*",
      "actions/**/*report*",
      "components/**/*report*",
    ],
    mayEdit: [
      "demo/mock actions only to quarantine or replace with service-backed code",
      "report actions/components to add provenance and freshness metadata",
      "monitoring helpers to return explicit not-configured states",
      "tests for no mock production data and report provenance",
    ],
    workflow: [
      "Search production paths for mock, demo, TODO, placeholder, fake metrics, and report trust language.",
      "Move true demo examples behind explicit demo-only namespaces that cannot be imported by production routes.",
      "Replace production mock data with service-backed reads or explicit not-configured responses.",
      "Add report provenance fields: source, period, generatedAt, freshness, certification/internal evidence status, and known blockers.",
      "Add a no-mock-production-data gate or extend an existing scanner.",
      "Save a cleanup report with remaining intentional demo-only files.",
    ],
    tests: [
      "production route/action does not return mock business data",
      "report component/action exposes provenance and freshness",
      "scanner catches representative mock production import",
    ],
    verification: [
      "rg -n \"Mock implementation|mockItems|mockTransactions|mockAdjustments|mockTransfers|demo route|TODO: Update the import path\" actions app components lib services",
      "npm test -- actions components services --runInBand",
      "npm run typecheck",
    ],
    success:
      "No production route or action exports mock stock, finance, payment, payroll, compliance, or report-trust data.",
  },
  {
    n: "009",
    slug: "offline-pos-replay-finalizer",
    title: "Offline POS Replay Finalizer",
    purpose:
      "Convert accepted offline POS envelopes into final POS, inventory, payment, fiscal, and ledger truth through controlled replay services.",
    priority:
      "Slice 7 from the examination report and residual blocker from the offline POS sync implementation report.",
    risk:
      "Offline POS accepted envelopes remain pending replay and cannot yet become final legal or accounting truth safely.",
    depends: "priority-001 through priority-008, especially inventory and error normalization.",
    inspect: [
      "services/pos/offline-sync.service.ts",
      "services/pos/pos.service.ts",
      "services/pos/receipt.service.ts",
      "services/inventory/*",
      "services/compliance/*",
      "services/payments/*",
      "services/accounting/*",
      "actions/pos/sync.actions.ts",
      "components/pos/offline/*",
    ],
    mayEdit: [
      "services/pos/offline-sync.service.ts",
      "services/pos/offline-replay.service.ts",
      "services/pos/*.schemas.ts",
      "actions/pos/sync.actions.ts",
      "data-trust and close blocker integrations",
      "focused POS/offline replay tests",
    ],
    workflow: [
      "Read the 014 execution report and current offline POS service contracts.",
      "Design replay as a server-owned state machine with idempotency, sequence evidence, and conflict quarantine.",
      "Call existing POS, inventory, payment, compliance/fiscal, drawer, and ledger services instead of writing final truth directly.",
      "Preserve provisional receipt safety until legal numbering and fiscal evidence are complete.",
      "Create close blockers for pending replay, conflicts, failed postings, or missing provider evidence.",
      "Expose dashboard status without allowing UI to mutate final truth.",
    ],
    tests: [
      "accepted envelope replays idempotently into final POS effects",
      "duplicate replay does not double stock, ledger, receipt, payment, or drawer effects",
      "conflict remains quarantined",
      "missing fiscal or ledger prerequisite creates close blocker",
      "wrong tenant or unauthorized replay is rejected",
    ],
    verification: [
      "npm test -- services/pos services/inventory services/compliance services/accounting services/payments --runInBand",
      "npm run inventory:boundary:fail",
      "node scripts/service-boundary-gate.js --mode report",
      "npm run typecheck",
    ],
    success:
      "PENDING_REPLAY offline POS envelopes can become final truth only through controlled replay, or remain blocked with explicit evidence.",
  },
  {
    n: "010",
    slug: "certification-assurance-hardener",
    title: "Certification Assurance Hardener",
    purpose:
      "Harden close-pack certification readiness while preserving explicit statutory certification blockers.",
    priority:
      "Certification assurance scan next step: add stale/invalidation evidence and connect inventory valuation assurance into close findings and annexes.",
    risk:
      "The system has internal evidence certification language, but automatic invalidation, inventory valuation annexes, and truthful statutory blockers require stronger service-owned controls.",
    depends: "priority-001 through priority-009 where inventory/offline evidence affects close readiness.",
    inspect: [
      "services/accounting/close-assurance.service.ts",
      "services/accounting/close-assurance-pack.service.ts",
      "services/accounting/data-trust.service.ts",
      "services/inventory/inventory-reconciliation.service.ts",
      "services/events/business-event.service.ts",
      "services/compliance/adapters/*",
      "services/regulatory/country-packs/*",
      "prisma/schema.prisma",
    ],
    mayEdit: [
      "services/accounting/close-assurance*.ts",
      "services/accounting/data-trust.service.ts",
      "services/inventory/* reconciliation and annex metadata",
      "services/compliance/* blocker/status models",
      "focused close assurance and certification tests",
    ],
    workflow: [
      "Read the certification assurance scan and hardener run report before editing code.",
      "Separate internal system evidence status from statutory authority certification status in code and UI/export wording.",
      "Add service-owned stale detection when source business events, ledger postings, inventory valuation, or compliance prerequisites change after certification/export.",
      "Connect inventory valuation reconciliation findings into close assurance blockers and close pack annex metadata.",
      "Keep expert review, country pack, sandbox adapter, and authority configuration blockers explicit.",
      "Do not claim statutory certification unless real authority adapter, country pack validation, and expert/legal approval exist.",
    ],
    tests: [
      "post-certification source change marks evidence stale",
      "inventory valuation drift blocks close pack readiness",
      "sandbox authority adapter remains statutory blocker",
      "expert-review country-pack value blocks statutory certification",
      "close pack annex includes inventory valuation evidence metadata",
    ],
    verification: [
      "node C:\\Users\\J COMPUTER\\.codex\\skills\\aqstoqflow-certification-assurance-hardener\\scripts\\certification-assurance-scan.js --root .",
      "npm test -- services/accounting services/inventory services/compliance --runInBand",
      "npm run typecheck",
      "npm run prisma:validate",
    ],
    success:
      "Close packs distinguish internal evidence readiness from statutory certification and become stale/blocked when source evidence changes or valuation assurance fails.",
  },
  {
    n: "011",
    slug: "compliance-provider-integration",
    title: "Compliance Provider Integration",
    purpose:
      "Move production compliance, country-pack, payment provider, and statutory payroll integrations from represented blockers toward real readiness gates.",
    priority:
      "Priority 6 from the examination report: production compliance and external integrations after protected backend truth is stable.",
    risk:
      "Provider credentials, authority adapters, country-pack expert review, statutory payroll parameters, and external statements remain incomplete, so production/legal readiness can be overstated.",
    depends: "priority-001 through priority-010.",
    inspect: [
      "services/compliance/adapters/*",
      "services/regulatory/country-packs/*",
      "services/payments/*",
      "services/payroll/*",
      "services/accounting/data-trust.service.ts",
      "prisma/schema.prisma",
      "what-next/PAYMENT_RECON*.md",
    ],
    mayEdit: [
      "services/compliance/adapters/*",
      "services/regulatory/country-packs/*",
      "services/payments/* provider readiness and statement ingestion",
      "services/payroll/* country-pack readiness blockers",
      "data-trust/close blocker integrations",
      "focused provider/compliance/payroll tests",
    ],
    workflow: [
      "Inventory each external dependency and classify it as not configured, sandbox only, provider integrated, expert review required, or production ready.",
      "Add typed readiness statuses and blockers instead of treating placeholder/sandbox code as production.",
      "Protect provider credentials and signing keys through server-only configuration and safe error mapping.",
      "Require statement/completeness evidence before payment reconciliation can certify provider-backed balances.",
      "Keep payroll statutory values blocked until country-pack parameters have source, effective date, expert review, and tests.",
      "Emit business-event and audit evidence for readiness transitions.",
    ],
    tests: [
      "sandbox adapter cannot produce statutory production-ready status",
      "missing provider credentials create blocker not raw error",
      "payment statement absence blocks reconciliation certification",
      "payroll expert-review-required parameter blocks statutory readiness",
      "readiness transition emits audit/business event",
    ],
    verification: [
      "npm test -- services/compliance services/payments services/payroll services/accounting --runInBand",
      "npm run typecheck",
      "npm run prisma:validate",
    ],
    success:
      "The platform truthfully distinguishes system-ready, provider-integrated, expert-review-blocked, sandbox-only, and statutorily certified states.",
  },
  {
    n: "012",
    slug: "ci-release-gate-modernizer",
    title: "CI Release Gate Modernizer",
    purpose:
      "Create a release-ready verification command that runs Prisma, typecheck, lint, tests, build, and policy gates.",
    priority:
      "Slice 8 from the examination report and the final ratchet after priority migrations are underway.",
    risk:
      "Deprecated lint commands, no-lint builds, and disconnected policy gates can let regressions pass release checks.",
    depends: "priority-001 through priority-011, or run earlier only in report mode.",
    inspect: [
      "package.json",
      ".github/**/*",
      ".husky/**/*",
      "scripts/*gate*.js",
      "jest.config*",
      "next.config*",
      "eslint.config*",
    ],
    mayEdit: [
      "package.json scripts",
      "CI workflow files",
      "gate scripts after their findings are migrated or baseline allowlists exist",
      "lightweight verification documentation under what-next",
    ],
    workflow: [
      "Read current package scripts and CI config before editing.",
      "Replace deprecated or ineffective lint/build commands with supported equivalents.",
      "Create one verify command that runs Prisma validation, typecheck, lint, focused tests or configured test suite, build, and policy gates.",
      "Keep report-mode gates for known legacy findings until migrations reach zero.",
      "Avoid adding CI failures for untriaged legacy findings without an explicit baseline/ratchet plan.",
      "Save a release gate report with exact commands and remaining blockers.",
    ],
    tests: [
      "gate scripts have unit tests or smoke checks",
      "verify command runs locally or documented blockers are explicit",
    ],
    verification: [
      "npm run verify:repo",
      "npm run lint",
      "npm test -- --runInBand",
      "npm run build:linted",
      "node scripts/service-boundary-gate.js --mode report",
    ],
    success:
      "A single release verification path exists and cannot hide important lint, type, test, build, Prisma, or service-boundary failures.",
  },
];

function escYaml(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function mdList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function skillMarkdown(skill) {
  const name = `priority-${skill.n}-${skill.slug}`;
  const description = `Priority ${skill.n} ${skill.title} remediates an AqStoqFlow priority implementation class. Use when executing the ordered priority remediation suite, hardening this codebase priority, migrating legacy code into service-owned workflows, adding OHADA controls, or validating this release gate.`;

  return `---\nname: ${name}\ndescription: "${escYaml(description)}"\n---\n\n# ${skill.title}\n\n## Purpose\n\n${skill.purpose}\n\n## When To Use\n\nUse this skill when:\n\n- this is the next eligible item in the ordered AqStoqFlow priority remediation suite;\n- the user asks to continue, implement, remediate, harden, validate, or report on this specific priority;\n- all dependent lower-numbered priority skills are complete, not applicable, or explicitly blocked with evidence.\n\nDo not use this skill when:\n\n- a lower-numbered priority skill has an unresolved dependency that this work needs;\n- the requested change would bypass service ownership, tenant isolation, RBAC, audit evidence, fiscal-period controls, or OHADA accounting discipline;\n- the user only wants a high-level plan and not implementation, except safe readiness/report mode.\n\n## Source Reports To Read\n\n${mdList(sourceReports)}\n\nRead only the relevant sections and files after the initial source reports. Prefer current code over stale report assumptions when they conflict.\n\n## Priority Being Solved\n\n${skill.priority}\n\nRisk: ${skill.risk}\n\nDependencies: ${skill.depends}\n\n## Required Architecture\n\nUse the statutory service pattern:\n\n\`\`\`text\nservices/<domain>/*.schemas.ts\nservices/<domain>/*.errors.ts\nservices/<domain>/*.service.ts\nservices/<domain>/__tests__/*.test.ts\n\nactions/<domain>/*.actions.ts     -> thin validation/orchestration only\nhooks/<domain>/*.ts               -> data fetching/cache only\ncomponents/...                    -> UI only\n\`\`\`\n\nProtected business truth must never be owned directly by server actions, App Router pages, route handlers, hooks, UI components, mock/demo helpers, or direct Prisma calls outside approved services.\n\n## Files And Patterns To Inspect\n\n${mdList(skill.inspect)}\n\n## Edit Boundary\n\nMay edit:\n\n${mdList(skill.mayEdit)}\n\nMust not edit:\n\n- unrelated domains or UI surfaces;\n- generated files unless the project command generates them as part of the verified change;\n- historical evidence records through destructive changes;\n- statutory or legal certification claims without real authority-adapter, country-pack, and expert-review prerequisites.\n\n## Implementation Workflow\n\n${skill.workflow.map((step, index) => `${index + 1}. ${step}`).join("\n")}\n\n## Security And Compliance Controls\n\n${mdList(sharedControls)}\n\n## Legacy Migration Rules\n\n- Build or confirm the service-owned replacement first.\n- Move every caller to the service-backed action or route.\n- Add regression tests proving the old behavior still works through the new path.\n- Add or update a static/boundary gate so the legacy pattern cannot return.\n- Delete old files/functions only after usage reaches zero.\n- Preserve behavior unless it conflicts with tenant safety, RBAC, auditability, fiscal periods, ledger integrity, maker-checker controls, or OHADA accounting discipline.\n\n## Regression Test Requirements\n\n${mdList(skill.tests)}\n\n## Static And Boundary Gate Requirements\n\n- Run the relevant domain gate before and after migration.\n- Update report-mode findings with exact file paths, classifications, and replacement service owners.\n- Move a gate from report mode to fail mode only when active findings for that class reach zero or have explicit expiring allowlist entries.\n- Keep \`npm run inventory:boundary:fail\` green when touching inventory or stock producers.\n- Keep \`node scripts/service-boundary-gate.js --mode report\` current when touching actions, app routes, hooks, or components.\n\n## Verification Commands\n\n\`\`\`powershell\n${skill.verification.join("\n")}\n\`\`\`\n\n## Completion Report Format\n\nSave a report under \`what-next/\` named \`AQSTOQFLOW_PRIORITY_${skill.n}_${skill.slug.toUpperCase().replace(/-/g, "_")}_REPORT_${date}.md\` containing:\n\n- priority skill name and number;\n- source reports and files inspected;\n- current priority status before changes;\n- files changed;\n- services added or reused;\n- actions, routes, hooks, or UI callers migrated;\n- security, tenant, RBAC, maker-checker, audit, business-event, ledger, and close-blocker controls added;\n- tests added or changed;\n- static/boundary gates run;\n- verification commands and results;\n- remaining blockers and the next priority skill to run.\n\n## Stop Conditions And Blocker Reporting\n\nStop and save a blocker report when:\n\n- required schema or service ownership cannot be determined from current code;\n- a migration would require deleting evidence-bearing data without an approved replacement path;\n- a statutory, payroll, tax, or legal claim would require expert approval not present in the repo;\n- a lower-numbered priority dependency is still open and this skill would build on unstable ground;\n- verification reveals unrelated failures that make the touched-slice result impossible to isolate.\n\n## Success Criteria\n\n${skill.success}\n`;
}

function runReportMarkdown(skill) {
  const name = `priority-${skill.n}-${skill.slug}`;
  return `# ${skill.title} Readiness Report\n\nDate: ${date}\n\nSkill: \`${name}\`\n\n## Safe Run Mode\n\nThis is a readiness/report-mode run. No application code is changed by this report.\n\n## What This Skill Will Implement\n\n${skill.purpose}\n\n## Priority Evidence\n\n- ${skill.priority}\n- ${skill.risk}\n- Source reports: ${sourceReports.join(", ")}\n\n## Files It Will Inspect\n\n${mdList(skill.inspect)}\n\n## Gates It Will Enforce\n\n${mdList(skill.verification)}\n\n## Success Looks Like\n\n${skill.success}\n\n## Dependencies\n\n${skill.depends}\n`;
}

function manifestMarkdown() {
  const rows = skills
    .map((skill) => {
      const name = `priority-${skill.n}-${skill.slug}`;
      return `| ${skill.n} | \`${name}\` | ${skill.risk} | ${skill.depends} | \`${skill.verification[0]}\` |`;
    })
    .join("\n");

  return `# AqStoqFlow Priority Remediation Skill Suite Manifest\n\nDate: ${date}\n\n## Source Material\n\n${mdList(sourceReports)}\n\n## Suite Order\n\n| Priority | Skill | Risk Solved | Depends On | First Verification Command |\n| --- | --- | --- | --- | --- |\n${rows}\n\n## Ordering Rationale\n\nThe suite follows the examination report order: preserve the green baseline, stop new service-boundary bypasses, harden tenant/RBAC controls, migrate protected economic truth paths, enforce immutability, normalize errors, remove mock/report trust gaps, finish offline and certification evidence, then ratchet release gates.\n\n## Execution Rule\n\nRun skills in numeric order unless production breakage requires a narrow emergency fix. Every implementation run must save a completion report under \`what-next/\` before the next priority skill starts.\n`;
}

function consolidatedReport() {
  const installed = skills
    .map((skill) => `- \`priority-${skill.n}-${skill.slug}\`: ${skill.purpose}`)
    .join("\n");

  return `# AqStoqFlow Priority Remediation Skill Suite Report\n\nDate: ${date}\n\n## Extracted Priorities\n\n${installed}\n\n## Ordering Rationale\n\nThe suite converts the enterprise examination priorities and latest scan findings into implementation-capable skills. It starts with the baseline and static boundaries because later domain migrations need reliable gates. Inventory and purchasing/AP come before certification and CI because stock, ledger, payment, and close evidence must be service-owned before release hardening can be truthful.\n\n## Installed Skills\n\n${installed}\n\n## Validation Plan\n\nValidate every installed skill with:\n\n\`\`\`powershell\npython \"C:\\Users\\J COMPUTER\\.codex\\skills\\.system\\skill-creator\\scripts\\quick_validate.py\" \"C:\\Users\\J COMPUTER\\.codex\\skills\\<skill-name>\"\n\`\`\`\n\n## Recommended Execution Sequence\n\n${skills.map((skill) => `${Number(skill.n)}. priority-${skill.n}-${skill.slug}`).join("\n")}\n\n## Known Blockers\n\n- Existing service-boundary findings remain and must be migrated domain by domain.\n- Statutory certification remains blocked until real authority adapters, expert-reviewed country packs, and legal/accounting approval exist.\n- Provider integrations must distinguish not-configured, sandbox-only, provider-integrated, and statutory-ready states.\n\n## Next Skill To Execute First\n\nRun \`priority-001-green-baseline-ratchets\` first unless a saved baseline already proves all current gates are green. Then continue with \`priority-002-service-boundary-ratchets\`.\n`;
}

function writeFileEnsured(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function installSkill(skill) {
  const name = `priority-${skill.n}-${skill.slug}`;
  const skillContent = skillMarkdown(skill);
  const agentYaml = `interface:\n  display_name: "${skill.title}"\n  short_description: "${escYaml(skill.purpose).slice(0, 90)}"\n  default_prompt: "Use $${name} to remediate AqStoqFlow priority ${skill.n}: ${escYaml(skill.title)}."\n`;

  for (const root of [
    path.join(repoRoot, ".codex-skill-drafts"),
    skillsRoot,
  ]) {
    const dir = path.join(root, name);
    writeFileEnsured(path.join(dir, "SKILL.md"), skillContent);
    writeFileEnsured(path.join(dir, "agents", "openai.yaml"), agentYaml);
  }

  writeFileEnsured(
    path.join(
      repoRoot,
      "what-next",
      "priority-suite-runs",
      `${name}-readiness-report-${date}.md`,
    ),
    runReportMarkdown(skill),
  );
}

for (const skill of skills) {
  installSkill(skill);
}

writeFileEnsured(
  path.join(
    repoRoot,
    "what-next",
    `AQSTOQFLOW_PRIORITY_REMEDIATION_SKILL_SUITE_MANIFEST_${date}.md`,
  ),
  manifestMarkdown(),
);

writeFileEnsured(
  path.join(
    repoRoot,
    "what-next",
    `AQSTOQFLOW_PRIORITY_REMEDIATION_SKILL_SUITE_REPORT_${date}.md`,
  ),
  consolidatedReport(),
);

console.log(`Installed ${skills.length} priority skills into ${skillsRoot}`);
for (const skill of skills) {
  console.log(`priority-${skill.n}-${skill.slug}`);
}
