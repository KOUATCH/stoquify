# POS WhatsApp Receipt EOF Fix

Date: 2026-07-30

## Incident

POS checkout waited for WhatsApp receipt transport after the accounting transaction had committed. A provider or process-pipe `write EOF` could therefore interrupt the browser action response even though the sale boundary was already complete. The POS service also dropped `whatsAppCustomerOptInConfirmed` before calling receipt delivery.

## Changes

- WhatsApp delivery is scheduled with Next.js `after()` and no longer blocks the completed-sale response.
- A scheduling failure returns a receipt-level `FAILED` result while preserving the successful sale.
- Provider exceptions such as `write EOF` are normalized to retryable delivery failures.
- Customer WhatsApp opt-in proof is forwarded through the POS service.
- Denied POS-module access cannot commit a sale or schedule receipt delivery.

## Verification

- Focused Jest: 3 suites, 25 tests passed.
- TypeScript: `npm run typecheck` passed.
- Focused ESLint: passed with zero warnings.
- Receipt-token browser smoke dry-run: authorized and denied operator paths, `pos.receipts.revoke`, sale-search requirement, output manifest, and screenshot directory are configured.
- Fresh Next.js 15.5.18 server: ready on port 3001; `/en/dashboard/pos` returned the expected unauthenticated `307`.
- Runtime log scan: zero `write EOF` or `Uncaught exception` matches.

Evidence:

- `what-next/pos-whatsapp-receipt/dev-server-3001.stdout.log`
- `what-next/pos-whatsapp-receipt/dev-server-3001.stderr.log`

## Residual Launch Risk

- No live Meta send was performed. Local WhatsApp mode, live-send flag, phone-number ID, and access token are not configured.
- The authorized and denied Playwright storage-state files are absent locally, so the authenticated browser smoke and screenshots were not rerun.
- Next.js `after()` isolates checkout latency and exceptions but is not a durable delivery queue. A process termination after the sale response can still lose a pending attempt; guaranteed delivery requires a transactional WhatsApp outbox and worker.
- The existing port 3000 process appears attached to an unhealthy output pipe. Use the clean port 3001 instance for verification or restart port 3000 before further checkout testing.
