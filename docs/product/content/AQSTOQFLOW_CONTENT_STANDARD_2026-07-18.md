# Stoquify Product Content Standard

**Status:** Active
**Date:** 2026-07-18
**Scope:** Public landing, authentication, onboarding, and product UI copy

## Purpose

Stoquify copy must help an operator understand what the system controls, what evidence is retained, what decision is required, and what happens next. The voice is professional and direct, with enough operational detail to be credible to business owners, finance teams, accountants, payroll teams, and controlled frontline operations.

## Core Principles

1. **Truth before intensity.** Describe capabilities that exist in the product or have a proven destination. Do not imply certifications, legal guarantees, automatic compliance, uptime, accuracy, savings, or performance without evidence.
2. **Outcome plus control.** Pair the operational outcome with the control that makes it trustworthy.
3. **Specific before broad.** Prefer concrete objects such as sale, drawer, receipt, transfer, purchase order, journal, payslip, declaration, or close check over generic words such as solution or transformation.
4. **Role and moment.** Write for the person making a decision now: cashier, branch manager, purchaser, finance reviewer, accountant, payroll operator, administrator, or owner.
5. **Calm enterprise tone.** Use confident, concise language. Avoid hype, superlatives, fear, and unsupported promises.
6. **Explainable automation.** State the trigger, resulting action, review point, and retained evidence.
7. **Visible uncertainty.** When a rule, integration, adapter, or authority response is incomplete, say so.
8. **Equivalent localization.** English and French must communicate the same operational meaning, risk, and action.

## Message Architecture

Use this order for high-impact public and product messages:

1. **Context:** the operator, workflow, or control boundary.
2. **Problem or decision:** what must be understood, completed, approved, or resolved.
3. **Outcome:** what the user can achieve.
4. **Control signal:** the source, scope, status, approval, or evidence that supports the outcome.
5. **Action:** a real destination or command, written as a verb.

For use-case cards:

- Label: role, operating model, or moment.
- Title: one credible outcome.
- Body: the connected workflow and business problem.
- Control signal: the evidence or boundary that makes the claim trustworthy.
- CTA: include only when a real route exists.

## Terminology

| Prefer | Avoid in public or auth copy | Reason |
| --- | --- | --- |
| Organization or workspace | Tenant | Tenant is useful internally but less clear to business users. |
| Controlled module access | Module gates | Explain the user outcome, not the implementation term. |
| Access according to role | Permission-aware | Use natural business language. |
| Workspace or control center | Command center everywhere | Reserve control-center language for real operational overview surfaces. |
| Verification for sensitive actions | Step-up alone | State what the control does. |
| Double validation or maker-checker review | Maker-checker without context | Give the business meaning. |
| Point of sale | PDV or POS on first mention | Introduce the full term first. |
| Receivables and payables | AR/AP on first mention | Avoid unexplained abbreviations. |
| Synchronization or replay | Sync or replay alone | State the operational purpose and exception state. |

## Claims Policy

Public and authentication copy may describe:

- Surfaces, workflows, controls, and evidence paths visible in the repository.
- Intended operational outcomes when the controlling mechanism is also named.
- Country-pack and OHADA context as product orientation, not as a legal guarantee.
- Offline continuity when replay identity, status, and exception handling remain explicit.

Public and authentication copy must not claim:

- Certification, regulator approval, legal compliance, or statutory correctness without verified evidence.
- Guaranteed accuracy, uptime, savings, close speed, or business performance.
- Automatic reconciliation, posting, filing, or payment when review or provider dependencies remain.
- Availability of SSO, passkeys, messaging, payments, or external adapters when they are not enabled.
- Percentage scores or numerical maturity indicators that are decorative rather than computed.

## Interface Copy

### Headings

Name the operating decision or outcome. Keep panel headings compact and do not repeat the page title in every card.

### Buttons

Start with a clear verb: Create workspace, Review difference, Approve payment, Open evidence. Use familiar icons for icon-only controls and provide an accessible label and tooltip.

### Empty States

State what is absent, whether it is expected or blocking, the next valid action, and any permission, provider, or setup dependency.

### Errors

State what failed, what remains unchanged or protected, what the user can do now, and a reference or retry status when available. Do not expose internal exception names or provider payloads.

### Success Messages

Name the completed action and resulting state. Avoid generic Success messages when approval, posting, synchronization, payment, or close state can be stated directly.

### Tooltips and Helper Text

Explain scope, consequence, or evidence. Do not restate the visible label.

## Accessibility and Localization

- Keep control labels available to screen readers in both locales.
- Do not rely on color alone to communicate status.
- Keep carousel position, previous, next, and direct-slide controls explicitly labelled.
- Avoid autoplay for operational content unless pause, focus, hover, visibility, and reduced-motion behavior are fully controlled.
- Test long French strings at mobile, tablet, and desktop widths.
- The current message catalog uses ASCII French transliteration. Restoring French diacritics should be a coordinated catalog-wide editorial pass.

## Review Checklist

- Is every claim supported by a current product surface or verified evidence?
- Does the message name the operator, workflow, or decision?
- Is the control signal explicit?
- Is the next action real and correctly routed?
- Are internal terms replaced or explained?
- Are English and French operationally equivalent?
- Does the text fit at mobile, tablet, and desktop widths?
- Are error, empty, loading, permission, and disabled states clear?
- Are legal, compliance, provider, and security statements appropriately qualified?
- Has decorative or invented numerical evidence been removed?
