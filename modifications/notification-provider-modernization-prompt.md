# Notification Provider Modernization Prompt

Modernize and transform the existing Notification Provider system into a professional, enterprise-grade, high-quality notification experience.

Do not only make it visually attractive. Rebuild it as a polished, secure, scalable notification platform that feels suitable for a serious SaaS product.

## Goal

Create a modern Notification Provider system that supports:

- In-app notifications
- Toast feedback
- Notification inbox/center
- Read/unread states
- Priority levels
- Delivery status tracking
- User preferences
- Tenant-aware notifications
- Role-aware audience targeting
- Event-driven notification dispatch
- Future channel expansion for email, SMS, WhatsApp, and push notifications

## Architecture Requirements

First inspect the existing notification provider, server actions, hooks, services, dashboard patterns, and UI conventions.

Then modernize the system using the existing app architecture:

- Server-only service layer for notification logic
- Authenticated server actions for mutations
- TanStack Query hooks for fetching, reading, dismissing, and updating preferences
- NotificationProvider for global app feedback
- Reusable notification UI components
- Strong TypeScript types
- Zod validation at server boundaries
- Tenant isolation on every query and mutation
- RBAC checks for administrative notification actions

The UI must not own business logic. Business rules belong in services and server actions.

## UI/UX Requirements

Make the notification experience clean, modern, and attractive:

- Professional notification bell with unread count
- Slide-over notification center or command-style inbox
- Clear notification cards with icon, title, message, timestamp, priority, and status
- Filters for all, unread, priority, system, security, finance, inventory, approvals, and messages
- Empty, loading, error, and success states
- Smooth but restrained animations
- Accessible keyboard navigation
- Mobile-responsive layout
- Clear visual hierarchy
- Consistent spacing, typography, and color semantics
- No decorative clutter, no toy UI, no generic demo styling

The result should feel like a polished enterprise SaaS notification system, not a simple toast wrapper.

## Enterprise Features

Include support for:

- Notification categories
- Severity levels: info, success, warning, error, critical
- Delivery states: queued, sent, delivered, read, failed, dismissed
- Source entity linking, such as invoice, payment, stock movement, approval, user, report, or task
- User notification preferences
- Per-channel preference settings
- Notification templates
- Audit trail for important notifications
- Idempotent dispatch to avoid duplicates
- Retry-ready delivery model
- Safe rendering to prevent XSS or unsafe HTML
- Correlation IDs for debugging
- Structured logs for dispatch failures

## Security Requirements

Enforce:

- Tenant isolation
- RBAC and permission checks
- No cross-tenant notification leaks
- No sensitive data in unsafe public messages
- Server-side validation
- Safe error handling
- Rate limiting or throttling where needed
- Audit logging for administrative broadcasts and critical alerts

## Deliverables

Produce or update:

- Notification service layer
- Notification server actions
- NotificationProvider improvements
- TanStack Query hooks
- Notification inbox/center components
- Notification bell component
- Notification preference UI
- Type definitions and validation schemas
- Focused tests for tenant isolation, read/unread behavior, preferences, dispatch idempotency, and permission checks

## Verification

Before finishing, verify:

- Notifications render correctly on desktop and mobile
- Read/unread state updates correctly
- Tenant isolation cannot be bypassed
- Unauthorized users cannot send or manage restricted notifications
- Toasts and persistent notifications behave consistently
- The provider works across dashboard routes
- Type checks and focused tests pass

The final result must be modern, professional, attractive, secure, robust, maintainable, and enterprise grade.
