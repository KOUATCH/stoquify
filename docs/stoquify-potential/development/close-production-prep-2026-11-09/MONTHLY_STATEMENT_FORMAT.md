# Full-period statement intake

The operator imports the actual supporting statement file through the existing file picker or raw-content field. A full-period reconciliation command selects an authorized stored OPEN accounting period. The server derives its boundaries and checks them again before signing. Selecting a month does not create statement coverage or an approval.

CSV and legacy JSON arrays retain the earliest/latest observed transaction dates. They do not establish full-period coverage, even if matching and independent reconciliation signing succeed. Existing observed-only evidence is not promoted or widened.

Full-period statement coverage requires a raw JSON envelope with exactly these seven keys. The example below is **synthetic format documentation**; its provider/account/transaction identities and amounts are invented and are not evidence suitable for a real close.

```json
{
  "formatVersion": "stoquify-statement-v1",
  "providerCode": "SYNTHETIC_PILOT",
  "providerAccountId": "synthetic-account-id",
  "currencyCode": "XAF",
  "periodStart": "2026-09-01T00:00:00.000Z",
  "periodEnd": "2026-09-30T23:59:59.999Z",
  "lines": [
    {
      "providerTransactionId": "synthetic-transaction-id",
      "providerReference": "synthetic-reference",
      "direction": "CREDIT",
      "amount": "100.00",
      "currencyCode": "XAF",
      "occurredAt": "2026-09-15T12:00:00.000Z"
    }
  ]
}
```

The declared provider, account and currency must match the actual configured provider account and parser. All line currencies/dates must fit the declaration. Use explicit supported ISO timestamps and uppercase currency codes; `periodEnd` is inclusive. This release supports complete UTC-day accounting periods: midnight start and end at 23:59:59.999 UTC. Use only boundaries justified by the supporting statement. Do not infer them from the selected accounting month or fabricate transaction lines.

The original UTF-8 raw file hash binds the declaration to the uploaded content. Duplicate JSON keys, unsupported versions/keys, reversed bounds, mismatched identities/currencies and empty line arrays fail closed. Server metadata retains declared bounds and observed line minima/maxima separately. The header is a declaration within the retained source; the parser does not authenticate a bank or provider, attest completeness, or create financial truth from user text.

An empty statement is not no-activity proof. Use the separately controlled no-activity workflow when applicable. Full-period reconciliation does not grant close approval or current certification. Independent signing, source freshness, account coverage and the remaining close controls still apply.

Daily and full-period runs currently share the existing organization/account/business-day uniqueness rule. A full-period run uses the stored period's first UTC day. A prior run for that account/day produces an explicit conflict; it is not expanded or rewritten. This release intentionally preserves that limited coexistence rule.

## French operator note

Importer le relevé justificatif réel. Les fichiers CSV et tableaux JSON conservent seulement les dates des transactions observées. Ils ne prouvent pas la couverture du mois. L’enveloppe `stoquify-statement-v1` doit déclarer le fournisseur, le compte, la devise et les bornes exactes justifiées par le relevé, sans déduire les dates du mois sélectionné ni inventer de lignes. Une liste vide ne prouve pas l’absence d’activité. Le serveur vérifie la période ouverte et les contrôles de signature restent applicables.
