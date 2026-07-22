# Stage 06 Frontend Delivery - AP Supplier History

Status: PASS

Run: `th-ap-supplier-history-readmodel-implementation-20260717-027`  
Slice: `ap-ar`  
Active lane: `ap`  
Agent: Frontend Developer

## Product Result

Supplier/AP transaction history is now visible at:

- `/[locale]/dashboard/purchases/payables/history`

## Exact Edits

- `app/[locale]/(dashboard)/dashboard/purchases/payables/history/page.tsx`
- `components/purchasing/APHistoryWorkbench.tsx`
- `hooks/useAPHistoryWorkbench.ts`
- `messages/en.json`
- `messages/fr.json`

## Implemented UX

- Protected AP history route with `purchasing.ap.invoice.view` and enforced `purchasing` module entitlement.
- Shared transaction-history workbench shell with AP labels, KPIs, filters, table, mobile cards, pagination, export preparation, and drawer.
- URL-owned filters for lane, dates, page size, cursor, and selected row.
- Server action consumption through `getAPHistoryAction` and export preparation through `prepareAPHistoryExportAction`.
- AP drawer sections for business identity, accounting proof fields, supplier attribution, and bank destination/redaction display.
- EN/FR `apHistory` message namespace.

## Verification

- PASS: `npx eslint "app/[locale]/(dashboard)/dashboard/purchases/payables/history/page.tsx" components/purchasing/APHistoryWorkbench.tsx hooks/useAPHistoryWorkbench.ts actions/purchasing/ap-history.actions.ts services/purchasing/ap-history.service.ts services/purchasing/ap-history.schemas.ts`.
- PASS: `npm test -- services/purchasing/__tests__/ap-history.service.test.ts --runInBand` - 1 suite / 2 tests.
- PASS: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); console.log('messages parse ok')"`.

## Residual Release Risks

- Focused frontend React tests were not added in this pass.
- Authenticated browser/mobile/a11y smoke was not run.
- Full repo typecheck previously timed out without diagnostics and remains Stage 07 evidence work.
- AR/customer history remains excluded until AR prerequisites pass.

## Stage 07 Eligibility

Stage 07 is now eligible for AP supplier history release review, with the residual checks above carried forward.