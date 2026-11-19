# Current-source map

18 October 2026; line anchors rechecked during P08. Hashes in BASELINE/VALIDATION are the durable provenance when line numbers move.

| Owner | Current source anchor | P08 implication |
|---|---|---|
| Manager read model | `services/daily-habit/daily-habit-digest.service.ts:287` | Server loads organization snapshots and module access; P08 does not fetch extra evidence client-side. |
| Action identity | Same service `:803` | `actionLinkFromItem` preserves queue item ID, next step, route and required permission. |
| Matching risk | Same service `:871` | `riskFromAction` carries that action link, source state and freshness. P08 joins by this exact ID. |
| Changed action row | `components/daily-habit/DailyHabitDigestDashboard.tsx:308` | Existing Button/Link/theme reuse; title, next step, source warning and accessible link name. |
| State interpretation | Same component `:337` | Failed/unavailable/permission-denied source is explicit; stale/partial remain warnings. Unavailable drill-through has no link. |
| Cashier read recovery | `components/pos/ProfessionalPOSSystem.tsx:1076` | Existing original request is sent to recovery action; unchanged by P08. |
| Cashier acknowledgement | Same component `:1102` | Existing explicit clearing of the matched retained intent; unchanged by P08. |
| Cashier focus/reference | Same component `:1467` | Focusable recovery section, original reference and state-specific actions. |
| Manager authorization | `app/[locale]/(dashboard)/dashboard/daily-digest/daily-digest-route-access.tsx` | Fresh server permission evaluation before protected read. |
| Source authorization | `app/[locale]/(dashboard)/dashboard/inventory/inventory-route-access.tsx` | Source route separately requires permissions and inventory module access. |
| Stockout source | `services/snapshots/inventory-cash-snapshot.service.ts`, `services/signals/business-signal-rules.service.ts:325` | Actual nonpositive available stock generates the signal. The fixture does not fabricate a client signal. |
| Existing localization limit | `services/item/item.service.ts:399` | Inventory list maps `name` from `nameEn`; source identity verification uses SKU and item-ID link. No inventory-owner edits. |

Graph discovery: component nodes `daily_habit_dailyhabitdigestdashboard_tsx` community 156 and `pos_professionalpossystem_tsx` community 1; August 9 refresh. Current source controls these conclusions.
