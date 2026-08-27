# Side-by-side benchmark matrix (Stoquify vs top platforms)

Benchmark set used: SAP S/4HANA Fiori, Oracle NetSuite, Microsoft Dynamics 365, QuickBooks Online, Zoho One, Odoo.

Method:
- Stoquify: local repository behavior evidence (shell, sidebar, command, overlays, token usage, routes).
- Benchmark: published platform UX guidance + vendor help patterns.
- Confidence scoring:
  - High = official docs + clear pattern alignment.
  - Medium = official docs + implementation inference from multiple product docs.
  - Low = secondary inference.

## Surface comparison

| Surface family | Stoquify current | SAP Fiori | Oracle NetSuite | Dynamics 365 | QuickBooks O | Zoho/Odoo | Confidence | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Enterprise IA + shell navigation** | Good role-aware module list and mobile shell; naming and grouping can drift by domain | Highly role-aware shell with workspace/workbench model and standardized navigation | Role + permission-aware module segmentation with clear role controls | Workspace + App hub + role-aware tiles/menus | Simpler SaaS navigation, less enterprise workspace layering | Menu + menu groups by role/module with configurable views | Medium | P1 |
| **Command palette / global search** | Present in portions but command semantics differ by surface | Fiori patterns emphasize fast discoverability and predictable actions | NetSuite favors global + contextual commands via suite tools and search | Unified command-like quick actions through command interfaces and contextual bar patterns | Basic global search, less command-driven orchestration | Good global search; command depth varies by module | Medium-High | P1 |
| **Dialogs, drawers, modals** | Reused primitives exist, but size/keyboard semantics and confirmation style vary | Consistent, accessible shell patterns with documented accessibility behavior | Strong role-driven workflow patterns and consistent overlays | Mature enterprise modal/dialog conventions with predictable task flow | Functionally sufficient; less enterprise-grade consistency than top-tier ERPs | Mixed quality across modules | Medium-High | P2 |
| **State model (empty/loading/error)** | Coverage exists across modules, but microcopy and recovery flow inconsistent | Strong patterns for guided empty states and clear recovery actions | Better enterprise consistency in guided recovery for action blockers | Standardized progress/empty/error messaging in core areas | Practical baseline, more support-focused than enterprise orchestration | Variable by module | High | P1 |
| **Accessibility baseline (WCAG)** | Partial implementation; need explicit focus and keyboard contracts across all shell actions | Explicitly documented accessibility practices for enterprise usage | Strong enterprise documentation for keyboard/roles in mature modules | Accessibility integrated via Microsoft ecosystem controls | Baseline present; enterprise depth is uneven | Varies by app and community edition | Medium | P1 |
| **Localization + copy governance** | Locale framework exists, but cross-module lexical consistency gaps | Structured global language governance; standardized terminology | Localization and terminology alignment by module family | Large enterprise localization + terminology governance | Bilingual support with functional translation coverage | Mature but varied depending on deployment size | Medium | P2 |
| **High-frequency workflows** | Workflow primitives exist; some long forms and confirmation journeys still inconsistent | Optimized enterprise tasks into modular action chains and role-aware steps | Strong process orchestration and guided task modules in mature areas | Consistent task orchestration in core ERP flows | Good for SMB tasks; less deeply configurable than enterprise | Good where workflows are standardized | High | P1 |
| **Performance/operability signal** | Good performance for main surfaces; visual effects can increase render cost on older endpoints | Strong enterprise performance baseline and predictable shell patterns | Enterprise control over UI performance and caching in high complexity environments | Mature performance telemetry + telemetry hooks | Moderate | Medium-High | P2 |

## Evidence annotations (non-exhaustive)

- Stoquify: layout/shell files and token system show both strong reuse and module drift.
- SAP/Dynamics references indicate role-aware shells, consistent shell controls, and standardized enterprise navigation.
- NetSuite and QuickBooks references were reviewed for role controls, dashboard/permission behavior, and user workflows.
- Zoho/Odoo references show configurable module/role access and customizable navigation/permissions as enterprise baselines.

## Competitive gap interpretation

- Stoquify is closer to enterprise baseline on **navigation governance** than low-touch SMB UIs.
- Stoquify is behind benchmark on **keyboard-level command determinism** and **cross-surface state semantics**.
- Largest upside is in **normalizing action semantics and enterprise micro-interactions**, not inventing entirely new UI primitives.

## Confidence and risk notes

- High-confidence opportunities: unify command/popup state contracts; standardize destructive-action confirmation; stabilize mobile shell behavior.
- Medium-confidence opportunities: full navigation IA modernization and breadcrumbing because internal module-level IA metadata may vary by module owner and country pack behavior.

