# Next eligible action

**P04-R04 — normalize the separate item-list action failure response.** P04-R03 is locally verified for its nine historical catches; the distinct list action remains source-confirmed and unimplemented. Parent P04 and production remain blocked.

Exact first action: read [the supplemental finding](P04-R03/qualification-20261104-r1/supplemental-findings.json), refresh actions/item/listItemsAction.ts and hooks/itemsHooks/useItemHooks.ts#useListItems against current authorization/Prisma dependencies, and capture source hashes plus the client response envelope. Preserve its distinction from the repaired same-named export in actions/item/items.ts.

The bounded repair must remove arbitrary guard/service/Prisma/provider exception text, preserve server-owned tenant/permission boundaries and authorized list/filter/pagination results, and prove denied requests disclose no private data or unauthorized business writes in isolation. Independent review is required before advancement. No rendered consumer or actual HTTP/session qualification follows from source inspection.

[P04-R03 evidence](P04-R03/qualification-20261104-r1/RESULT.md) records224 unit and43 native tests, source-bound review and owned cleanup. P04-R04 implementation is not included in the completed nine-path authorization; it is now a separate planned package and a prerequisite of parent P04, V01 and V02. All prior production, deferred and external-decision boundaries persist. No commit, push, production changes or deployment.
