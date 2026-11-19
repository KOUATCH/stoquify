# HR-18 — Daily HR queue and operating metrics

IN_PROGRESS, automatic continuation. HR-17 sealed 68 hashes with zero drift, 44 mocked unit/action/component/navigation tests, 12 real database cases including browser, 60 shared regressions and 14 browser records. Baseline HEAD `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886` plus preserved shared changes. Prior dependency evidence remains scoped/historical.

Implement one read-only derived HR queue, reusing source owners and current employee scope. No second task/outcome truth store. Counts must derive from the same authorized detail collection, filters and snapshot time. Source identity deduplicates work; current source closure removes it. Show owner/responsibility, due/freshness, reason and permitted source action. Restricted salary/document/correction/task facts must be excluded before counting for unauthorized roles.

Default beside existing HR pages until real pilot acceptance. Test empty/200 employee datasets, scope/filter counts, source resolution and stale/error states. Use existing UI primitives and bilingual 360/768/1440 layouts. No predictive scoring, employee surveillance, new external messages, production migration or deployment. Independent source review, real database/browser checks and existing register evidence are required.
