# Inventory reversal review correction

The independent review identified a false premise in the new unit test named `retains a nullable legacy journal period`: `JournalEntry.periodId` is required in the Prisma schema. Its null fixture bypassed the real ordered invalidator through a mock and could not establish supported production behavior.

The test now retains the required original journal period and gives the retained posting batch a distinct period. It verifies that this additional period enters the complete requested scope and that both inventory and journal invalidators receive the same returned period union. Shared helper tests own actual period resolution and tenant checks.

No production code was changed for this correction. The original test bytes are retained in `inventory-test-review-before-8a5a7dec-14ee-47cd-bc3a-8fb42d2bcdfd/inventory-adjustment-reversal.service.test.ts`, SHA-256 `f92d7bb189847f796bfa80c213d2fd916b7a1a017271e5fee7a0fd7c32513af1`. Verification remains with the parent's serialized test lane; no test was executed for this correction by its author.
