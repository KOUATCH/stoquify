# Kontava Dashboard Experience Innovation Skill Report

Date: 2026-06-22

Skill created: `dashboard-experience-innovation`

Installed path: `C:\Users\J COMPUTER\.codex\skills\dashboard-experience-innovation`

## Executive Summary

The attached prompt was refined into a reusable Codex skill focused on making Kontava's BI dashboards, Owner War Room, Manager Action Center, Cash Command, and future daily decision centers feel unlike ordinary business dashboards from the first view.

The skill directs Codex to design dashboards as daily business command environments rather than static KPI grids. The core experience question is:

> How can this dashboard make the user instantly understand what changed, what matters, what is risky, what is proven, and what to do next?

This creates a stronger design target than simply adding more charts, cards, or analytics pages.

## Refined Skill Direction

The skill asks Codex to inspect the current Kontava dashboard system before proposing changes, including:

- Owner War Room.
- Manager Action Center.
- Cash Command and finance dashboards.
- Analytics pages.
- Accounting control center.
- Assurance control tower.
- BI components.
- Snapshot/read-model services.
- Business signal and action queue services.
- Proof trail, redaction, RBAC, and module entitlement foundations.

It then guides Codex to propose experience concepts that can make the platform immediately distinctive:

- Daily Business Command Center.
- Owner Morning Brief.
- Business Pulse View.
- Cash Truth Map.
- Risk and Opportunity Radar.
- Action Priority Board.
- What Changed Since Yesterday.
- What Needs Action Today.
- Evidence-Backed Insight Timeline.
- Stock-to-Cash Flow View.
- Profit Leakage Map.
- Branch Health Map.
- Close Readiness Journey.
- Finance Control Tower.
- Accountant Trust Review.
- Manager Daily Run Sheet.
- End-of-Day Business Pulse.
- Weekly Intelligence Digest.

## Important Design Principle

The skill explicitly avoids dashboards that are visually impressive but operationally weak.

It emphasizes:

- Action-first presentation.
- Progressive disclosure from summary to evidence to raw data.
- Role-specific daily experiences.
- Evidence grade, freshness, blockers, and redactions on every meaningful insight.
- Practical daily habit loops.
- Reuse of existing BI, snapshot, signal, proof, module, and security foundations.
- Anti-bloat discipline.

## Skill Files

Installed files:

- `C:\Users\J COMPUTER\.codex\skills\dashboard-experience-innovation\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\dashboard-experience-innovation\agents\openai.yaml`

Workspace staging files:

- `.codex-skill-staging/dashboard-experience-innovation/SKILL.md`
- `.codex-skill-staging/dashboard-experience-innovation/agents/openai.yaml`

## Validation

Validation command:

```powershell
python 'C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'C:\Users\J COMPUTER\.codex\skills\dashboard-experience-innovation'
```

Result:

```text
Skill is valid!
```

## Recommended Usage

Use the skill when asking:

```text
[$dashboard-experience-innovation](C:\Users\J COMPUTER\.codex\skills\dashboard-experience-innovation\SKILL.md) run
```

Best first target:

- Inspect and redesign the Owner War Room and Manager Action Center as the first uncommon daily command experience.

Recommended first output:

- A UX innovation proposal that defines the primary dashboard concept, role-specific journeys, layout strategy, component model, BI prerequisites, and a phased implementation roadmap.

## Restart Note

Restart Codex to pick up the newly installed skill in the available skills list.
