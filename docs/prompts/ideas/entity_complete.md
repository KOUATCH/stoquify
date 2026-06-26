professional-create-item-workflow
description: Use this skill whenever the user wants to design, build, redesign, upgrade, or "make professional" a create-item flow, new-product wizard, add-entity form, onboarding flow, multi-step form, stepper, wizard, guided form, or any multi-page data-entry experience for a real application — even when they don't use the word "wizard" or "multi-step." Triggers on phrases like "build me a create item form", "the new item page is overwhelming", "split this form into steps", "make a wizard for adding products", "redesign the add inventory flow", "I need a guided form", "the create form is too long", "add a stepper", "make the new product page professional", "build the onboarding flow for X", or "the form that runs after clicking + New". This skill produces a modern, enterprise-grade, design-led multi-step create-item workflow that (1) inherits the visual semantics, typography, spacing, color tokens, motion language, and component grammar of the project's existing landing/marketing page so the system feels whole, (2) is wired to REAL database data through the project's existing data layer (Prisma, server actions, TanStack Query hooks, zod schemas) — never mocked, never placeholder, with proper transactional create semantics, draft persistence, and optimistic UI, (3) respects the project's bilingual/i18n system and dark/light theme system as first-class concerns (every label, helper text, validation message, empty state, and success toast is translated and theme-aware), (4) is preceded by a hard-blocking research phase against 7 radically innovative, intentionally-new, design-forward references for multi-step forms / wizards / guided onboarding / progressive disclosure so the result is not a generic "Step 1 of 5" admin template, and (5) implements professional form ergonomics — per-step validation, smart defaults, contextual help, autosave drafts, keyboard navigation, resumable sessions, smooth transitions, accessible focus management, and a confident review-and-submit final step. Outputs are uncluttered, scannable, low-friction, fast to complete on a slow day, recoverable on a bad day, and architecturally consistent with the rest of the codebase. Do NOT skip the research phase or the design contract — design quality and ergonomics are non-negotiable.
---
What changed vs. your input
Your input	Refinement
"create item workflow multi step form"	Expanded the trigger surface: wizard, stepper, guided form, onboarding flow, add-entity, multi-page data-entry. Many users won't say "multi-step form."
"blends with landing page semantics"	Itemized the semantics (typography, spacing, tokens, motion, component grammar) so the skill body can verify each one.
"linked to real database data"	Specified your actual stack (Prisma + server actions + TanStack Query + zod) and added create-flow specifics: transactional create, draft persistence, optimistic UI.
"useful, not cluttered, user-friendly"	Translated into concrete form ergonomics: per-step validation, smart defaults, autosave, keyboard nav, resumable sessions, accessible focus, review step. These are testable.
"visit 7 radically new websites"	Kept as a hard-blocking research phase (matches your dashboard skill) and pointed it at the right reference class — multi-step forms / wizards / guided onboarding / progressive disclosure, not generic websites.
Bilingual + dark/light	Made first-class and listed what must be translated/themed (labels, helpers, validation, empty states, success toasts) so the skill body can enforce it.
Suggested SKILL.md body sections (not yet written — preview only)
Mirroring your dashboard skill so they pair cleanly:

Hard-blocking research phase — 7 references, screenshot or summarize, extract 3 reusable patterns each
Design contract — copy tokens from landing root; declare step model, progress indicator style, transition language, validation timing
Data contract — locate the existing Prisma model, server action, zod schema, and TanStack Query hook for the entity; if missing, define them before any UI
Step decomposition rules — group fields by user mental model (identity → details → relationships → review), not by database table shape
Ergonomics checklist — per-step validation, autosave to localStorage keyed by user+entity, resume banner, keyboard map (Enter advances, Esc cancels with confirm), focus management
i18n + theme checklist — every string in messages/en.json + messages/fr.json; every surface uses CSS tokens, no hard-coded hex
Review step contract — read-only summary grouped by step with "Edit" affordances back to each step
Success state — toast + redirect with clear next action (view, create another, back to list)
Questions before we lock it in
Asked
Entity scope
Which entity should this skill primarily target?

Any create-entity flow

Should I write the SKILL.md body now, or just lock in the description for now?

Write the full SKILL.md now

I'll write the full SKILL.md now. Adjusting the name to professional-create-entity-workflow since you chose any-entity scope, with item/product/customer/supplier triggers all prominent.


Ran 2 commands, read a file
Now I have the pattern. The dashboard skill is an "override" that pairs with a global skill. I'll write the new skill in the same style — self-contained with both workflow + StockFlow specifics — since there's no global parent yet for this one.

Created
SKILL.md
+422
-0
Skill written at skills/professional-create-entity-workflow/SKILL.md.

What's in it:

Refined frontmatter description — broad trigger surface (item, product, customer, supplier, PO, generic wizard/stepper/guided-form language), pushy enough to fire on near-misses, and pins down the 5 non-negotiables: landing-page semantics, real DB wiring, bilingual, dark/light, 7-reference research phase.
8 phases with explicit acceptance per phase: Phase 0 hard-blocking research → Phase 1 codebase discovery → Phase 2 design contract from the landing page → Phase 3 data contract from existing actions/hooks → Phase 4 step decomposition by user mental model → Phase 5 ergonomics + i18n + theme → Phase 6 review + success → Phase 7 quality gates + commits.
StockFlow-locked rules mirrored from your dashboard skill: no services layer, no direct Prisma in components, no parallel toast system, no duplicate actions, excluded domains list.
Form ergonomics checklist (13 items) and i18n checklist (5 items) made testable, not vibes.
Commit convention with a concrete suggested sequence.
Pre-flight checklist so the skill self-detects if the project has drifted.
Two things worth noting:

The skill is self-contained (not a "global override" like the dashboard skill is). If you later install a global parent, this file can be slimmed down to just the StockFlow-specific overrides, like the dashboard one.
I named it professional-create-entity-workflow (matching your "any create-entity" answer) but the description leads with item/product/customer/supplier triggers so it still fires reliably when you say "create item form".
Want me to also generate matching trigger evals (queries that should/shouldn't trigger this skill) so we can later tune the description for triggering accuracy?