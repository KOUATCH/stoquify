# Notification Provider Architecture

## Contract Preservation

Preserve existing provider hooks and helper methods unless a breaking migration is explicitly requested. Add capabilities by extending notification metadata:

- `id`
- `type`
- `title`
- `message`
- `category`
- `priority`
- `severity`
- `deliveryState`
- `readAt`
- `dismissedAt`
- `createdAt`
- `source`
- `channel`
- `correlationId`

Keep old callers valid by applying defaults in the provider or notify helper.

## Layering

Use this layering when the repo supports it:

1. Notification service: dispatch rules, persistence, preferences, idempotency, tenant scope.
2. Server actions or route handlers: authenticated mutations and queries.
3. Hooks: TanStack Query fetch/mutate wrappers and invalidation.
4. Provider: global in-app queue, toasts, UI state, browser events.
5. Components: bell, center, inbox, settings, cards, filters.

The UI should not decide who may receive a notification, which tenant it belongs to, or whether an administrative broadcast is allowed.

## Event Bridge

When a legacy `notify` helper dispatches browser events:

- Keep event names stable.
- Normalize legacy payloads at the edge.
- Treat `dismiss` and `clear` actions as first-class.
- Avoid storing unsafe React nodes or HTML in persisted messages.

## Persistence Scope

If persistence is not already present, do not invent a full notification database unless the user asks for it. A strong session provider plus a clear settings surface can be the right first modernization.

When persistence is in scope, model:

- notification template
- recipient
- read state
- delivery attempt
- user preferences
- channel preference
- source entity
- tenant/organization id
- audit metadata

## Idempotency

Use a deterministic idempotency key for server-generated notifications, commonly:

```text
tenantId + recipientId + eventType + sourceType + sourceId + semanticVersion
```

Use this key to prevent duplicate critical notifications.
