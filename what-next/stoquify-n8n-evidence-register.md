# Stoquify automation and integration assessment — evidence register

Assessment date: **20 September 2026**. Workspace: E:/ohada saas/Focused projects/stoquify. HEAD: a05a41e. Findings concern the current working tree, which contained 1,327 status entries during discovery, not a frozen release candidate. Only the three assessment artifacts were intentionally changed.

Companions: [assessment](<E:/ohada saas/Focused projects/stoquify/what-next/stoquify-n8n-integration-assessment.md>) and [editable cost inputs/results](<E:/ohada saas/Focused projects/stoquify/what-next/stoquify-n8n-cost-model.csv>).

## Evidence labels

- **S — source-confirmed:** inspected current source; does not imply production deployment.
- **T — tested:** the specific mocked invariants exercised in this assessment.
- **V — vendor-documented:** official published information, not independently benchmarked.
- **A — assumption/proposal:** planning input or architectural judgment, not observed fact.
- **U — unknown:** information unavailable without actual operations, customer research, a trial, or a commercial quote.

No live databases, customer records, credentials, vendor accounts or financial transactions were accessed. No vendors were contacted. No external automation was installed.

## Repository evidence

All paths below were inspected on the assessment date. Line references are navigation aids for this mutable working tree.

| ID | Source | Finding / confidence boundary |
|---|---|---|
| R01 | [package.json](<E:/ohada saas/Focused projects/stoquify/package.json>) | Next.js/React/TypeScript, Prisma/PostgreSQL, Redis clients, Resend, next-intl, Jest and Playwright are declared. An installed dependency is not proof of an operated service. No shortlisted orchestrator dependency found in the inspected manifest/source search. S |
| R02 | [module catalog](<E:/ohada saas/Focused projects/stoquify/services/modules/module-catalog.service.ts:72>) | Inventory, sales, POS, cash drawer, accounting, close, compliance, purchasing, presence, payroll and other module ownership/permission/dependency definitions. “Available” in catalog is not release certification. S |
| R03 | [business event gateway](<E:/ohada saas/Focused projects/stoquify/services/events/business-event.service.ts:172>) | Transactional event/outbox recording, deterministic payload hashes, same-key replay and conflict evidence. S/T |
| R04 | [outbox service](<E:/ohada saas/Focused projects/stoquify/services/events/business-event-outbox.service.ts:112>) | Tenant scope, compare-and-set claims, stale leases, bounded attempts, exponential backoff, dead letters and audited completion. Generic worker accepts a supplied handler at line 445. S/T; no deployed worker throughput established. |
| R05 | [item API](<E:/ohada saas/Focused projects/stoquify/app/api/v1/organisations/[id]/items/route.ts:6>) | GET uses a session, org authorization, module and permission checks; POST returns method-not-allowed. This sampled API is not a third-party write API. S |
| R06 | [server authorization](<E:/ohada saas/Focused projects/stoquify/lib/security/server-authz.ts:45>) | Organization/session authority; requireApiModuleAccess explicitly enforces at line 122. A connector must not impersonate browser sessions. S |
| R07 | [module entitlements](<E:/ohada saas/Focused projects/stoquify/services/modules/module-entitlement.service.ts:28>) and [default mode](<E:/ohada saas/Focused projects/stoquify/services/modules/module-control-contracts.ts:1>) | Persisted managed configuration/grants and dependency-aware decisions exist. Default mode is observe; inspected API explicitly overrides to enforce. No universal enforcement conclusion. S |
| R08 | [POS commit](<E:/ohada saas/Focused projects/stoquify/services/pos/pos.service.ts:2210>) | Checkout ownership, existing idempotency, stock/ledger boundaries and serializable commit; postSale/postPayment invoked within the domain path. S |
| R09 | [checkout state](<E:/ohada saas/Focused projects/stoquify/services/pos/checkout-state.ts>) and [20 September recovery report](<E:/ohada saas/Focused projects/stoquify/what-next/pos-cart-lifecycle-and-interruption-recovery.md>) | Durable pending request, cart lifecycle and ownership recovery recently implemented. Prior browser/137 regression/5 PostgreSQL results are historical evidence, not rerun here. S/history |
| R10 | [offline synchronization](<E:/ohada saas/Focused projects/stoquify/services/pos/offline-sync.service.ts:1955>) | Device/signature/replay/conflict control paths exist; legacy-unverified state also exists. No claim every deployment enforces signatures for every enrolled device. S |
| R11 | [provider event capture](<E:/ohada saas/Focused projects/stoquify/services/payments/provider-event.service.ts:23>) | Original payload hash, signature/timestamp checks, provider identity and duplicate/tamper/rejection outcomes. A generic workflow notification must not become verified payment truth. S |
| R12 | [payment inbox worker](<E:/ohada saas/Focused projects/stoquify/services/payments/payment-reconciliation-inbox-worker.service.ts:332>) | Domain-owned lease/completion/failure processing is already present. Live bank/mobile-money agreement and provider certification unverified. S/U |
| R13 | [WhatsApp receipt worker](<E:/ohada saas/Focused projects/stoquify/services/communication/whatsapp-receipt-worker.service.ts:235>) | Payload tenant match, configuration/live-send gate, current receipt validation and retry/dead-letter states. Inspecting this gate does not reveal whether production sends are enabled. S |
| R14 | [master-data onboarding](<E:/ohada saas/Focused projects/stoquify/services/onboarding/master-data-import.service.ts:32>) | Staging/validation/approval and domain-owned customer/supplier/item creation; high-risk independent approval. Explicit exclusions include opening balances, stock and ledger migration. S |
| R15 | [supplier participation](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/supplier-po-acknowledgement.service.ts:204>) | Supplier proposal hashes/history and buyer authority exist; external proposal is distinct from stock/AP/accounting truth. S |
| R16 | [accountant access](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-access.service.ts:30>) | Role, consent, effective dates, expiration and revocation govern accountant participation. S |
| R17 | [close assurance](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:1770>) | Evidence/provenance and unresolved suspense/close conditions exist. Workflow completion is not an accounting certificate. S |
| R18 | [authority adapter worker](<E:/ohada saas/Focused projects/stoquify/services/payroll/authority-adapter-worker.service.ts:384>) and [country review intake](<E:/ohada saas/Focused projects/stoquify/services/payroll/payroll-country-pack-review-intake.service.ts:235>) | Default injected authority adapter falls back to sandbox; country review evidence has its own contract. This is not proof of live statutory submission. S |
| R19 | [agent policy](<E:/ohada saas/Focused projects/stoquify/services/agents/agent-policy.service.ts:26>) and [runner](<E:/ohada saas/Focused projects/stoquify/services/agents/agent-runner.service.ts:213>) | Inspected deterministic runner records governed steps/evidence; registry rejects write tools and specified financial/access operations. External AI nodes must not bypass this. S/T |
| R20 | [release CI](<E:/ohada saas/Focused projects/stoquify/.github/workflows/ci.yml:1>), [monitoring](<E:/ohada saas/Focused projects/stoquify/lib/error-handling/monitoring.ts>) and [internal reconciler](<E:/ohada saas/Focused projects/stoquify/app/api/internal/agents/reconcile-abandoned/route.ts:1>) | CI and authenticated scheduler/reconciler surfaces exist. They do not establish real scheduler deployment, alert delivery, backup restore, or operational SLA. S/U |
| R21 | [Graphify actions report](<E:/ohada saas/Focused projects/stoquify/graphify-out/GRAPH_REPORT_actions.md>) and canonical JSON graphs | Parsed actions, app, components and hooks graphs. Navigation only; sources include August timestamps. Examples below. |
| R22 | [6 September product assessment](<E:/ohada saas/Focused projects/stoquify/what-next/2026-09-06-ohada-product-competitive-audit.md>), [roadmap](<E:/ohada saas/Focused projects/stoquify/what-next/2026-09-06-stoquify-enterprise-execution-roadmap.md>), [15 August portfolio](<E:/ohada saas/Focused projects/stoquify/what-next/enterprise-workflow-portfolio-audit-2026-08-15.md>) | Historical strategy and readiness context. Old defect/status claims were not promoted to fresh findings without source inspection. |
| R23 | [adoption/pricing surface](<E:/ohada saas/Focused projects/stoquify/components/landing/pricing-section.tsx:27>) | Operations/finance/people adoption paths, retail/reconciliation/intelligence extensions and onboarding/country/provider/assurance services. No actual ARPU or willingness-to-pay established. S/U |
| R24 | [finance export worker](<E:/ohada saas/Focused projects/stoquify/services/accounting/finance-statement-export.service.ts:400>) | Actual reuse of the generic business outbox with tenant-checked export manifests. Thus “no worker callers exist” would be incorrect. S |
| R25 | [inventory read model](<E:/ohada saas/Focused projects/stoquify/services/inventory/inventory-read.service.ts:574>) and [cash command](<E:/ohada saas/Focused projects/stoquify/services/cash-command/cash-command.service.ts:95>) | Stock availability/reorder inputs and cash/evidence composition exist. Advanced forecast accuracy and complete replenishment optimization unverified. S/U |

Graph examples: actions node accounting_accountant_access_actions_getaccountantportfolioaction, community 58; app node locale_dashboard_dashboard_pos_page_tsx, community 140; components node accounting_accountantportfolio_tsx, community 140; hooks node payments_usepaymentreconciliationdashboard_usepaymentreconciliationdashboard, community 2. These relationships informed discovery; current service controls determined recommendations.

## Official external sources

All accessed **2026-09-20**. SaaS tariffs can change; the report records the displayed plan/term instead of assuming a permanent price. Vendor claims are not independently proven availability or compliance.

| ID | Primary source | Use / caveat |
|---|---|---|
| W01 | [n8n pricing](https://n8n.io/pricing/) | Cloud/self-host tiers, quotas, concurrency, feature gates, annual terms and overages. |
| W02 | [n8n license text](https://raw.githubusercontent.com/n8n-io/n8n/master/LICENSE.md) | Sustainable Use License 1.0 and enterprise-code exclusions. Qualified contract review still needed. |
| W03 | [n8n Community license FAQ](https://docs.n8n.io/n8n-community-license/sustainable-use-license) | Community internal-use limits and user-credential example. Final recheck located the moved canonical page; pair this with W43 for paid backend versus OEM arrangements. |
| W04 | [n8n edition comparison](https://docs.n8n.io/deploy/host-n8n/community-edition-features) | Community feature exclusions, queue versus multi-main distinction. |
| W05 | [n8n queue architecture](https://docs.n8n.io/deploy/host-n8n/configure-n8n/scaling/enable-queue-mode) | Workers, Redis, DB, shared credential encryption key, binary-storage and latency considerations. |
| W06 | [source control/environments](https://docs.n8n.io/administer/use-source-control-and-environments) | Business/Enterprise Git feature; not itself an approval policy. |
| W07 | [execution counting](https://docs.n8n.io/build/understand-workflows/understand-executions) | Production/manual, schedules, polling, webhooks, subworkflows and error-workflow quota distinctions. |
| W08 | [error handling](https://docs.n8n.io/build/flow-logic/handle-errors-gracefully) | Error workflows and failure inspection. |
| W09 | [wait behavior](https://docs.n8n.io/build/flow-logic/wait) | Pause/resume through time or event. |
| W10 | [execution-data redaction](https://docs.n8n.io/deploy/host-n8n/configure-n8n/security/redact-execution-data) | Enterprise feature; visibility redaction is not deletion or an immutable evidence archive. |
| W11 | [n8n releases](https://github.com/n8n-io/n8n/releases) | Stable tag observed at 2.39.8 dated 18 September; 2.40.3 marked prerelease. No runtime installed or tested. |
| W12 | [Activepieces pricing](https://www.activepieces.com/pricing) | Canonical monthly display used; cached annual/older pricing variants were not mixed into calculations. |
| W13 | [Activepieces license](https://raw.githubusercontent.com/activepieces/activepieces/main/LICENSE) | MIT core with explicitly excluded enterprise directories. |
| W14 | [Activepieces embedding](https://www.activepieces.com/docs/embedding/overview) | Enterprise SDK, customer provisioning and embedded builder. |
| W15 | [Make pricing](https://www.make.com/en/pricing) | Displayed 10k-credit entry tiers; confirm billing toggle/term before procurement. |
| W16 | [Make credit changes](https://help.make.com/adjustments-to-plans-and-pricing) | Extra-credit purchase premium and tier behavior. |
| W17 | [Zapier pricing](https://zapier.com/pricing) | Starting prices, task tiers and plan capabilities; starting price does not size growth workloads. |
| W18 | [Zapier task rates](https://zapier.com/pricing/rates) | Standard-step, built-in-tool, AI and MCP units differ. |
| W19 | [Pipedream pricing documentation](https://pipedream.com/docs/pricing) | Connect external-user/compute units versus Workflows segment/time/memory units. Numeric current tariff unverified: public pricing page returned no readable content. Community dollar figures deliberately excluded. |
| W20 | [Nango pricing](https://nango.dev/pricing) | Minimum monthly credits and connection/compute/data-transfer rates. |
| W21 | [Nango architecture](https://nango.dev/docs/getting-started/intro-to-nango) | Embedded account authorization and TypeScript integration functions. |
| W22 | [Inngest pricing](https://www.inngest.com/pricing) | Included execution volume; executions count function runs plus steps, not n8n-style runs. |
| W23 | [Inngest functions](https://www.inngest.com/docs/learn/inngest-functions) | Retryable functions, step checkpoints and own-compute responsibility. |
| W24 | [Temporal pricing](https://temporal.io/pricing) | Actions, storage time and support; worker infrastructure is additional. |
| W25 | [Temporal TypeScript guide](https://docs.temporal.io/develop/typescript) | Workflows/Activities/Workers, testing, safe deployment and versioning. |
| W26 | [Windmill pricing](https://www.windmill.dev/pricing) | Configurable seats/compute example, community limits and commercial feature boundaries. |
| W27 | [Windmill license](https://raw.githubusercontent.com/windmill-labs/windmill/main/LICENSE) | Source licenses differ from prebuilt Community images; managed-service/wrapping restrictions need review. |
| W28 | [Power Automate pricing](https://www.microsoft.com/en-us/power-platform/products/power-automate/pricing) | Annual USD user/bot pricing. |
| W29 | [ECB USD reference rates](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-usd.en.html) | 18 September 2026: EUR 1 = USD 1.1460. Informational reference, not a bank settlement rate. |
| W30 | [BEAC exchange-rate explanation](https://www.beac.int/billets-pieces/mission-de-beac/) | EUR 1 = XAF 655.957. Taxes, bank fees and conversion spreads excluded. |
| W31 | [Airbyte pricing](https://airbyte.com/pricing) | Volume/capacity product; warehouse costs additional. |
| W32 | [Metabase pricing](https://www.metabase.com/pricing) | BI/embedding tiers, seat and hosting choices; external embedded users also count. |
| W33 | [n8n credential advisory](https://github.com/n8n-io/n8n/security/advisories/GHSA-9rhv-fhr8-7q5r) | 16 September advisory; patched in 2.39.6/2.40.1. Informs upgrade ownership, not a claim the inspected stable release remains vulnerable. |
| W34 | [n8n approval advisory](https://github.com/n8n-io/n8n/security/advisories/GHSA-597w-c3jh-g8fg) | Approval boundary merits independent application authorization. No exploit attempted. |
| W35 | [Microsoft licensing FAQ](https://learn.microsoft.com/en-us/power-platform/admin/power-automate-licensing/faqs) | User/process licensing and premium/custom connector distinction; exact customer scenario needs licensing validation. |
| W36 | [n8n overview](https://docs.n8n.io/) | API integration, custom nodes and AI scope. |
| W37 | [AI human review](https://docs.n8n.io/build/integrate-ai/ai-examples/human-in-the-loop-for-tools) | AI tool approval channels; not a replacement for Stoquify authorization. |
| W38 | [Credential encryption key](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/configuration-examples/set-a-custom-encryption-key) | Encrypted stored credentials; queue workers require the same key. |
| W39 | [Workflow timeouts](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/configuration-examples/configure-workflow-timeouts) | Configurable execution limits; process-dependent soft cancellation. |
| W40 | [Execution-data pruning](https://docs.n8n.io/deploy/host-n8n/configure-n8n/scaling/manage-execution-data) | Save/prune controls; unfinished and annotated runs need separate retention attention. |
| W41 | [Workflow review feature](https://docs.n8n.io/build/manage-workflows/workflow-reviews) | Enterprise preview from 2.37; optional publishing review excludes credentials/settings/subworkflows. Vendor advises against production reliance. |
| W42 | [Backup and restore](https://docs.n8n.io/deploy/host-n8n/keep-n8n-running/backup-and-restore) | Full recovery requires database, encryption key and applicable storage/config; workflow exports alone are incomplete. |
| W43 | [n8n backend versus OEM](https://docs.n8n.io/deploy/host-n8n/deploy-as-an-oem-integration) | Current documentation says hidden backend available on paid plans without separate agreement; exposed editor needs OEM agreement and branding. Confirm exact contract/customer-credential scope; do not conflate this with free Community rights. |

## Verification performed

Read-only discovery used Get-Content, rg, manifest parsing, graph JSON parsing and git status/rev-parse. Several guessed source paths were absent; actual paths were subsequently located. No absence claim relies on those failed guesses. Targeted source searches found no integration with the shortlisted platforms; this is scoped discovery, not proof about external infrastructure.

Fresh focused test command (database mocked by Jest setup and injected test clients):

    $env:TS_NODE_TRANSPILE_ONLY='true'
    $env:TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}'
    node node_modules/jest/bin/jest.js --runInBand --silent --roots services/events services/agents --testPathPatterns 'business-event.service.test.ts|business-event-outbox.service.test.ts|agent-tool-registry.service.test.ts'

Result: **3 suites, 27 tests passed; exit 0; 2.862 seconds** on the final run. The first run also passed 27 tests but exited 1 after EPERM while writing an optional JSON result file. The final run omitted that output-file option. No JSON test-result artifact was created or claimed.

These tests substantiate event replay/conflict, tenant-scoped outbox claims/delivery/failure and agent-tool permission restrictions. They do not benchmark an orchestrator, validate production scheduling, or certify the entire platform. Full builds/migrations/end-to-end financial tests were unnecessary for this documentation-only assessment and were not run.

Final artifact checks passed: 33 cost rows across 11 option/scenario combinations, arithmetic and low/base/high coverage, source IDs, 68 reference definitions and 64 local link occurrences. Direct content checks found no whitespace/conflict-marker errors. Scoped Git check exited 0; files are new/untracked, so direct validation was used as well. Git warned that the global ignore file was unreadable; this did not prevent the scoped checks.

## Assumption register and unresolved procurement questions

A01: Staff day rates EUR 250/450/750 are hypothetical low/base/high budgeting inputs, not local wage research or quotes. One person-day is eight hours. Setup includes a 20% uncertainty allowance; recurring budgets do not include an extra contingency multiplier.

A02: Tenant counts 1/50/500 and execution volumes 1,500/25,000/250,000 per month are illustrative. They are not measured Stoquify usage. Re-delivery allowance is 10%; real billing depends on platform-specific units.

A03: Hosting, backup, monitoring, API consumption, legal/material costs and maintenance days are planning allowances, not purchased capacity. Staff costs include opportunity cost even when already salaried. No live deployment SLA or RTO/RPO has been demonstrated.

U01: Current customer count, willingness to pay, workflow demand, developer capacity, staff costs, existing cloud spend, retention requirements, country/data-residency obligations and actual provider contracts remain unknown. Paid backend and embedded editor arrangements must be distinguished using W43.

U02: n8n must confirm in writing the exact product backend/customer-credential/OEM rights, required governance features, tenant model, execution tiers, overage and support. Paying for Business must not be assumed to grant every embedding right.

U03: Activepieces must confirm embedded usage/hosting/governance charges above its published entry floor, customer limits and exit/export terms. A permissive core license does not include enterprise SDK features.

U04: Pipedream must supply a current price for external-user tiers, credits, environments, residency and support; old community posts are insufficient.

U05: Every candidate needs an acceptance test against the actual target API action, OAuth scopes, rate limits, webhook authentication, retry semantics, locale/date/money formats and deletion/retention behavior. Connector counts do not prove any specific Cameroon provider or authority integration.

U06: No “impossible without n8n” capability was established. Technical benefits are reusable connectors, workflow authoring and operational tooling; provider access, regulatory approval and reliable source data remain independent requirements.
