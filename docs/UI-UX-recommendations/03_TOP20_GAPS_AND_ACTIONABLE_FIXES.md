# Top 20 enterprise-grade gaps and 20 fixes (non-table UI/UX components only)

Severity: H = High, M = Medium, L = Low  
Effort: S = Small, M = Medium, L = Large  
Control impact: H = High (auditable user action impact), M = Medium, L = Low

| # | Component family | Gap | Severity | Effort | Control impact | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Dashboard shell | Sidebar actions are inconsistent across modules in icon size, spacing, and naming, creating operator confusion in frequent navigation paths. | M | S | M | Enforce a shared shell token contract (`menu item`, `section`, `danger action`) and linting checks for spacing/labeling rules. |
| 2 | Sidebar/nav visibility | Permission state and disabled actions are not consistently explained with user-centric rationale. | H | S | H | Add standardized entitlement tooltip pattern (`No access because...`) and action request/request-upgrade path. |
| 3 | Command palette | Duplicate command implementations create different keyboard expectations and result ranking behavior. | H | M | M | Introduce one global command registry and route-command schema with shared ranking and permission gate semantics. |
4 | Command palette | No uniform “no matches” guidance with next-step actions. | M | S | L | Add empty-state command copy: suggestions + last search memory + shortcut hint. |
| 5 | Forms/workflows | Long operational forms are not consistently grouped into risk-based phases. | H | M | H | Introduce 4-step enterprise form scaffold: intake, verify, confirm, finalize across workflows. |
| 6 | Forms/workflows | Recovery after partial errors is inconsistent; users lose context after failure. | H | M | H | Add inline recovery map and preserve user input state with explicit fix instructions per field group. |
7 | Modals/dialogs | Close behavior, width, and focus order differs by module; keyboard-only users can lose flow. | H | M | H | Ship shared modal/drawer primitive with explicit role, aria, focus trap, restore-focus, and escape rules. |
| 8 | Drawers | No standard max width or persistent anchor behavior on larger workflows. | M | M | M | Standardize drawer widths + mobile behavior profile with sticky actions and scroll lock policy. |
| 9 | Confirmation flows | Some critical actions lack consequence framing (audit/compliance impact wording). | H | S | H | Add confirmation contract requiring `action`, `consequence`, `impact`, `can undo` fields. |
| 10 | Alert/toast | Mixed vocabulary (`success`, `saved`, `done`, etc.) leads to non-actionable support incidents. | M | S | M | Define canonical alert taxonomy and map each API/business result into one of 6 statuses. |
| 11 | Empty states | Several non-table workflows show empty state as decorative only, without next task call-to-action. | M | S | M | Require each empty state to include action, documentation link, and nearest next workflow step. |
| 12 | Loading states | Inconsistent transition patterns; spinners block user awareness of background tasks. | M | M | M | Introduce loading state taxonomy with inline progress, cancellable tasks, and queue-aware badges. |
| 13 | Error states | Error copy often omits recoverability path and support classification. | H | M | H | Add remediation taxonomy (`retry`, `validate`, `contact support`, `open audit`) and support code generation. |
| 14 | Breadcrumb/flow context | Deep pages have weak context breadcrumbs and navigation history in complex operations. | M | M | M | Implement canonical breadcrumb component with module + case path and quick return anchors. |
| 15 | Search/filter | Search/filter interaction patterns vary across pages; operators are not documented consistently. | M | S | M | Add shared search/filter spec with operator hints, clear filters, and persisted filter chips by context. |
| 16 | Accessibility | Focus-visible and keyboard contracts are not uniformly documented and enforced. | H | L | H | Add focus token policy + keyboard table per component family and route-level audit gates. |
| 17 | Accessibility | Some labels rely on visual-only state (badge/icon color) without text alternatives. | M | L | M | Add explicit text/status labels and fallback semantics for non-visual users for all action chips/badges. |
| 18 | Localization | Cross-module terminology divergence weakens enterprise training and support consistency. | M | M | H | Create cross-module terminology dictionary with bilingual validation in release checklists. |
| 19 | Design tokens | Finance module styling introduces localized visual drift from global enterprise visual system. | M | M | M | Introduce token inheritance policy: module themes may extend, not override core enterprise constraints. |
| 20 | Visual rhythm/perf | Decorative effects (dense shadow, blurred backgrounds) are overused in operational screens and can harm clarity/readability. | M | M | L | Apply performance-safe profile: effect budget thresholds, contrast tests, and reduced-motion alternatives. |

## Non-table exclusions explicitly applied

- Excluded components: data tables, grid sorting/filtering rows, row actions, bulk selects on tabular views.
- Excluded analyses: table virtualization, column schema strategy, sort/filter keyboard for row data.
- Included in this list only: non-table command, navigation, shell, modal, state, workflow, and localization components.

## Validation for evidence-backed triage

- H-level items tied to user safety, finance workflows, and audit context should be validated before any major release.
- M-level items should be batched with design QA and product operations checkpoints.
- L-level items should be executed as refactoring tasks when dependencies are ready.

