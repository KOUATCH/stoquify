---
name: modernize-notification-provider
description: Modernize SaaS notification providers into professional enterprise notification systems. Use when Codex must upgrade NotificationProvider, toast feedback, notification centers, inboxes, read/unread state, preferences, delivery states, tenant-aware dispatch, role-aware targeting, notification UI, or notification service/action/hook architecture in a Next.js or TypeScript application.
---

# Modernize Notification Provider

## Operating Rule

Modernize the notification system as a product surface, not as decoration. Preserve existing call sites unless the user explicitly asks for a breaking rewrite.

## Discovery

Before editing:

1. Search for the active provider, renderer, notify helper, settings route, hooks, server actions, services, schema, and tests.
2. Read the app shell/provider composition to understand where global notifications mount.
3. Identify the current public API used by callers, especially methods such as `success`, `error`, `warning`, `info`, `formSuccess`, and domain-specific helpers.
4. Inspect the existing dashboard design tokens and sibling settings pages before changing UI.
5. If the repo has graphify outputs or architecture reports, use them only for relationship questions or impact analysis.

## Implementation Workflow

1. Stabilize the contract.
   - Keep existing provider exports and method names working.
   - Add richer metadata through optional fields instead of forcing callers to change.
   - Normalize legacy inputs at the boundary.

2. Upgrade the data model.
   - Support severity, category, priority, read state, delivery state, source entity, created timestamp, dismissed timestamp, correlation id, and channel metadata where useful.
   - Treat in-memory notifications as a first-class session queue if persistence is not in scope.
   - Add service/action/hook persistence only when the repository already has the necessary backend pattern or the user asks for it.

3. Modernize the UI.
   - Build a professional notification bell, unread count, toast stack, and notification center or settings surface.
   - Include loading, empty, error, active, read, unread, dismissed, and high-priority states.
   - Use restrained motion, stable spacing, accessible buttons, keyboard-friendly controls, and mobile-responsive layouts.
   - Avoid toy demo styling, ornamental clutter, and business logic in UI components.

4. Harden the enterprise behavior.
   - Enforce tenant isolation and RBAC in server-side notification actions and services.
   - Avoid leaking sensitive internal details in public notification messages.
   - Use safe rendering; never render untrusted HTML.
   - Make dispatch idempotent when persistence or external delivery is implemented.
   - Log delivery failures with correlation ids when a logging layer exists.

5. Wire provider feedback.
   - Keep global notification events compatible with existing `notify` helpers.
   - Make provider state observable by settings or inbox surfaces.
   - Integrate form, mutation, and error-handling feedback without duplicating business rules in UI.

6. Verify before reporting done.
   - Run the most focused type, lint, or test command available for changed files.
   - If frontend UI changed, inspect the target route when a dev server/browser path is available.
   - Report any intentionally deferred pieces, such as persisted inbox storage, email, SMS, WhatsApp, push, or external delivery adapters.

## Reference Loading

Load only the reference needed for the task:

- For provider architecture, service boundaries, and compatibility: `references/architecture.md`.
- For notification center, settings, bell, toast, and visual design: `references/ui-experience.md`.
- For security, tenant isolation, RBAC, and enterprise verification: `references/security-verification.md`.

## Deliverable Standard

Finish with:

- Files changed.
- Provider and UI capabilities added.
- Compatibility preserved.
- Verification performed.
- Limitations or deferred enterprise channels.
