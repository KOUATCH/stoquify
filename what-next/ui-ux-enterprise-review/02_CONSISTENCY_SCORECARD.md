# UI/UX consistency scorecard (non-table components)

Scale: 1 = major inconsistency, 5 = enterprise-grade consistency.

| Module family | Target score | Current score | Key gaps | Enterprise move |
| --- | ---: | ---: | --- | --- |
| Dashboard shell (sidebar + navbar + route shell) | 5 | 3 | token-level visual variance across domains; command availability not fully uniform | Introduce shell contract spec with explicit shared interaction states |
| Module visibility & permissions in nav | 5 | 4 | permission logic exists but labeling/affordance consistency varies | Standardize label schema + tooltip semantics + disabled-action explainers |
| Command center / quick action surfaces | 5 | 2 | inconsistent trigger behavior, result ranking, and empty handling | Single command registry + deterministic keyboard map + action confidence badges |
| Form/workflow ergonomics | 5 | 3 | dense workflows vary in step grouping and recovery handling | Define enterprise form patterns, staged validation, and explicit recovery states |
| Overlay system (modal/dialog/drawer) | 5 | 3 | inconsistent sizing and close/escape semantics; focus handling uneven | Implement shared overlay primitives with accessibility-compliant focus and ARIA |
| Feedback state system (toast/alert/empty/error/loading) | 5 | 3 | duplicate components and inconsistent severity language | Unify state vocabulary and escalation policy (info/warn/error/blocker) |
| Visual design tokens & typography | 5 | 4 | token overrides in domain modules; gradient/shadow overuse | Governance on token boundaries; reduce decorative effects in enterprise workbenches |
| Localization + copy consistency | 5 | 2 | terminology drift and mixed microcopy patterns | Copy taxonomy + bilingual review gates per module release |
| Mobile/compact responsiveness | 5 | 3 | navigation and overlays have variable behavior across feature paths | Define compact-mode spec + responsive shell tests |
| Accessibility + keyboard ergonomics | 5 | 2 | partial role/aria/keyboard coverage; focus states uneven | Mandatory audit plan with component-by-component acceptance criteria |
| Error prevention and destructive safety | 5 | 4 | most paths have confirmation but not always clear consequence message | Standard consequence callout + explicit rollback note |

## Scorecard summary

- Weighted current average: **3.0 / 5**
- Target enterprise threshold: **4.5 / 5**
- Delta to reach target: **+1.5** across module-family behaviors
- Highest priority acceleration levers:
  1. Unify command/overlay/accessibility state systems
  2. Normalize terminology and microcopy
  3. Enforce responsive compact shell behavior

## By reviewer lens (cross-team view)

- Architecture lens: modular boundaries present but lack explicit UI contracts at family level.
- Security/IAM lens: permission-aware nav is good foundation; consistency of entitlement messaging needs work.
- Product lens: workflow friction remains in long operational flows due inconsistent state and confirmation patterns.
- QA lens: current regression surfaces should add state-specific contract tests before rollout.

