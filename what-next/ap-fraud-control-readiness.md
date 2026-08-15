# AP Fraud Control Readiness Inventory

Report mode is read-only; fail mode blocks critical gaps.

## Summary

- Generated at: 2026-08-12T19:18:20.868Z
- Mode: fail
- Checks: 9
- Ready: 9
- Gaps: 0
- Critical gaps: 0

## Checks

| ID | Risk | Status | Evidence | Missing | Recommendation |
|---|---|---|---|---|---|
| supplier-bank-request.action-boundary | high | ready | Action requires purchasing.supplier.bank.request.<br>Action derives organizationId and requestedById from the RBAC context.<br>Schema keeps request payload explicit before service handling. |  |  |
| supplier-bank-approval.action-boundary | critical | ready | Action requires purchasing.supplier.bank.approve.<br>Fresh authentication is configured before RBAC/service work.<br>Client-supplied approvedById and organizationId are overwritten with RBAC context values. |  |  |
| supplier-bank-approval.shared-control-policy | critical | ready | Shared sensitive-action policy marks supplier bank approval critical.<br>Policy requires fresh auth, self-approval blocking, audit action, and detector signals.<br>RBAC risk catalog classifies purchasing.supplier.bank.approve as critical. |  |  |
| supplier-bank-approval.service-control | critical | ready | Service loads the requested bank-change subject before sensitive-action evaluation.<br>Service blocks requester self-approval before bank account mutation.<br>Allowed approval writes business event and audit evidence inside the service transaction. |  |  |
| supplier-payment-release.action-boundary | critical | ready | Action requires purchasing.ap.payment.release.<br>Fresh authentication is configured before RBAC/service work.<br>Client-supplied approval actors are not forwarded by the release action; the releaser is derived from RBAC context. |  |  |
| supplier-payment-release.shared-control-policy | critical | ready | Shared sensitive-action policy marks supplier payment release critical.<br>Policy requires fresh auth, self-approval blocking, audit action, and detector signals.<br>RBAC risk catalog classifies purchasing.ap.payment.release as critical. |  |  |
| supplier-payment-release.service-control | critical | ready | Service blocks requester/approver, requester/releaser, and approver/releaser conflicts.<br>Service blocks release while supplier bank changes are pending or destination is unapproved.<br>Release requires an approved supplier payment before writing supplier ledger, business event, audit, ledger posting status, and reconciliation queue evidence. |  |  |
| supplier-payment-approval.action-boundary | critical | ready | Shared policy exists for supplier.payment.approve.<br>Action scan expects a dedicated purchasing.ap.payment.approve boundary before release enforcement hardens. |  |  |
| ap-fraud-control.policy-gate-wiring | critical | ready | Fail-mode AP fraud-control gate is available as an npm script.<br>The release policy path runs the AP fraud-control gate after the purchasing/AP gate. |  |  |
