# Disposable delivery scenario

`prisma/disposable-delivery-scenarios.ts` exports `seedDeliveryScenario(org, actors, out)` for the existing isolated runner. It has no executable entry point. Run once per organization, sequentially after historical simulation, with the child `Date` fixed at `2026-10-28T20:00:00.000Z`. The helper validates the retained schema-verified manifest, schema digest, loopback URL and connected database identity before invoking any business service.

The helper uses the authenticated `actors.owner` supplied by `signIn`. It reloads that account's current organization-scoped role permissions and current session before proceeding. Billing additionally requires persisted password assurance within five minutes. Required permissions follow the existing action definitions: `sales.orders.create`, `sales.orders.update`, `inventory.levels.adjust` and explicit `accounting.journal.post`. A wildcard alone is not assumed to grant critical permissions.

## Fixture and resulting records

Each of `synth12_douala`, `synth12_yaounde` and `synth12_bafoussam` gets one central-store delivery to its fictional `customer_10`:

| Item | Quantity | Catalogue unit price | Line total |
| --- | ---: | ---: | ---: |
| `item_4` — A4 paper | 2 | 3,000 XAF | 6,000 XAF |
| `item_6` — ledger notebook | 3 | 1,600 XAF | 4,800 XAF |

The catalogue's synthetic zero-tax setting produces a 10,800 XAF invoice, due 2026-11-11. This setting is fixture data, not statutory tax guidance. Required prerequisites are supported inventory-tracked items, sufficient central-store stock, customer credit headroom, sales-module access, an open October period, an active sales journal and the existing delivery posting mappings (`COGS`, `INVENTORY`, `ACCOUNTS_RECEIVABLE`, `SALES_REVENUE`, `OUTPUT_VAT`). The real posting services ensure their default delivery posting rules; the helper does not insert financial or stock records directly.

Expected per organization:

- One `DELIVERY` sales order with two lines, status `COMPLETED`, version 3, payment `PENDING`.
- One consumed reservation with two lines, one goods issue with two lines, one posted billing outcome with two lines.
- Four inventory transactions: two zero-quantity/value reservation movements and two negative sale movements.
- Two balanced posted journals, one invoice-grade receivable with its initial unpaid lifecycle state, and one customer ledger sale debit.
- Four applied delivery lifecycle command events, plus the events and audit evidence produced by the inventory, accounting and receivable services.
- Optional local fiscal artifact and sandbox certification queue entry, determined by the existing country metadata. No worker or external provider is invoked.

## Replay and evidence

Stable keys are `<organization>:delivery-fixture:v1:create`, `:confirm`, `:issue`, `:bill`. Original expected versions are always 0, 1 and 2; recomputing them from the current state would change a retained command's payload. Calling the helper again replays already committed stages and continues the remaining stages. Each successful run explicitly replays all four commands and checks stable identities and unchanged stock/financial record counts.

The immutable fictional request file is retained at `synthetic-documents/<organization>-delivery-fixture-v1.json`; its actual byte hash is included in the order notes/address and report. A differing retained document causes a failure. Per-organization output `<organization>-delivery-scenario.json` contains source IDs, journal/movement IDs, totals, checks and replay result. A service failure records the exact stage and error, without bypassing the service boundary. All retained documents state that no real-world delivery, transfer or statutory certification occurred.

## Validation boundary

Source inspection covers the delivery schemas/services/actions, stock reservation/issue kernel, delivery accounting posting, receivable service, current authentication evidence and existing disposable seed conventions. The current graph exports do not contain the delivery service; current source was used for behavioral contracts.

The workflow contract check and source-only TypeScript validation were run during authoring. No database simulation, mocked test suite or browser check was run by the implementation agent. Runtime assertions are intended for the parent's owned disposable execution and are not evidence of HTTP action authorization or browser behavior.
