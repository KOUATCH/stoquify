# API Route Guard Inventory

Fail mode: this inventory exits non-zero when active guard issues are present.

## Summary

- Generated at: 2026-08-12T19:18:08.548Z
- Status: ready
- Mode: fail
- API routes inventoried: 14
- Supporting guard evidence files inventoried: 2
- Evidence files inventoried: 16
- Surface kind: api_route=14, guard_evidence=2
- Issues flagged: 0
- Module access: none=11, enforced=5
- Module applicability: not_applicable_public=4, review_required=4, not_applicable_session_claims=1, required=5, delegated_uploadthing_core=1, not_applicable_public_service=1

## Issues

- None

## Routes And Evidence

| File | Surface | Evidence For | Methods | Classification | Guard | Org Source | Permission | Module Access | Module | Expected Module | Module Applicability | Data Class | Response | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| app/.well-known/security.txt/route.ts | api_route |  | GET | public-intentional | none | none |  | none |  |  | not_applicable_public | security contact policy | unknown |  |
| app/api/auth/[...all]/route.ts | api_route |  | handler | public-auth-provider | none | none |  | none |  |  | not_applicable_public | auth provider response | unknown |  |
| app/api/customer-statements/[statementId]/actions/route.ts | api_route |  | POST | unclassified | none | none |  | none |  |  | review_required | json response | success envelope with safe error envelope |  |
| app/api/customer-statements/[statementId]/route.ts | api_route |  | GET | unclassified | none | none |  | none |  |  | review_required | json response | success envelope with safe error envelope |  |
| app/api/internal/agents/reconcile-abandoned/route.ts | api_route |  | GET, POST | unclassified | none | none |  | none |  |  | review_required | json response | NextResponse.json |  |
| app/api/me/permissions/route.ts | api_route |  | GET | authenticated | getOptionalRbacContext | rbac ctx |  | none |  |  | not_applicable_session_claims | permission claims | NextResponse.json |  |
| app/api/receipts/[receiptId]/route.ts | api_route |  | GET | public-receipt-lookup | none | none |  | none |  |  | not_applicable_public | public receipt payload | success envelope with safe error envelope |  |
| app/api/referrals/[referralCode]/route.ts | api_route |  | GET | unclassified | none | none |  | none |  |  | review_required | response | success envelope with safe error envelope |  |
| app/api/security-txt/route.ts | api_route |  | GET | public-intentional | none | none |  | none |  |  | not_applicable_public | security contact policy | unknown |  |
| app/api/uploads/[...path]/route.ts | api_route |  | GET | tenant-scoped | requireApiSessionForCurrentOrg | rbac ctx | dashboard.read | enforced | dashboard | dashboard | required | uploaded asset | safe route error body |  |
| app/api/uploadthing/core.ts | guard_evidence | app/api/uploadthing/route.ts | n/a | tenant-scoped | requireApiSessionForCurrentOrg | rbac ctx | inventory.items.create | inventory.items.update | enforced | inventory | inventory | required | upload handler | not_api_response |  |
| app/api/uploadthing/route.ts | api_route |  | handler | delegated-upload-handler | none | none |  | none |  |  | delegated_uploadthing_core | upload handler | unknown |  |
| app/api/v1/organisations/[id]/briefItems/route.ts | api_route |  | GET, POST | tenant-scoped | requireApiSessionForOrg | route params id | inventory.items.read | enforced | inventory | inventory | required | brief inventory item DTO | safe route error body |  |
| app/api/v1/organisations/[id]/items/route.ts | api_route |  | GET, POST | tenant-scoped | requireApiSessionForOrg | route params id | inventory.items.read | enforced | inventory | inventory | required | inventory item DTO | safe route error body |  |
| app/api/v1/organisations/route.ts | api_route |  | GET, POST | tenant-scoped | requireApiSessionForCurrentOrg | rbac ctx | MANAGE_SYSTEM_SETTINGS | enforced | settings | settings | required | json response | safe route error body |  |
| services/pos/receipt.service.ts | guard_evidence | app/api/receipts/[receiptId]/route.ts | n/a | public-receipt-service-evidence | assertPublicReceiptAccessToken | token-bound receipt access |  | none |  |  | not_applicable_public_service | public receipt service payload | not_api_response |  |
