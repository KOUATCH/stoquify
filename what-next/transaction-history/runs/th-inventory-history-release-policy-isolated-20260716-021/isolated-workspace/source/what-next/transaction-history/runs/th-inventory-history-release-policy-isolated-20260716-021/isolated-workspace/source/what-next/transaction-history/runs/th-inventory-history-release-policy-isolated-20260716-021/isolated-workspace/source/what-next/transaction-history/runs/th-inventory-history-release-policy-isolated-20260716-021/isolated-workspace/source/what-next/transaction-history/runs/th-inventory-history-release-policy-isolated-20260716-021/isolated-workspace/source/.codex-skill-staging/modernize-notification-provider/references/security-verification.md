# Security And Verification

## Security Controls

For server-backed notifications:

- derive tenant scope from the authenticated session
- never trust `organizationId` from client payloads
- enforce RBAC before administrative broadcasts
- restrict source entity access before linking notifications
- avoid sensitive data in public messages
- validate all server inputs with the local validation pattern
- audit critical broadcasts and security alerts
- rate-limit high-volume senders when the app has rate limiting

For client-only providers:

- keep messages plain text
- avoid dangerous HTML rendering
- keep local storage preferences minimal
- preserve safe default behavior when storage is unavailable

## Verification Checklist

Run the most focused available checks:

- TypeScript check for changed files or full typecheck if practical.
- Component lint/build check if available.
- Unit tests for helper normalization when tests exist.
- Manual browser smoke test for the notification settings route if a dev server is available.

Verify behavior:

- success, info, warning, and error notifications render
- dismiss removes one notification
- clear removes all notifications
- sound preference toggles and survives reload when local storage is used
- high-priority notifications are visually distinct without relying on color alone
- text remains inside cards on mobile widths
- existing callers still compile

## Report Template

Use this compact completion report:

```text
Implemented:
- ...

Verified:
- ...

Deferred:
- ...
```
