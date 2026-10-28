# Evidence Map

## Core Evidence

- `services/payments/`
- `services/reconciliation/`
- `services/accounting/`
- `actions/payments/`
- `components/reconciliation/`
- `docs/domains/payments-reconciliation/`
- `prisma/schema.prisma`

## Cash Truth States

- Imported statement line
- Matched payment
- Unmatched payment
- Suspense proposal
- Suspense approval
- Posted suspense
- Close blocker
- Certified reconciliation run

## Evidence Questions

- What source hash proves the external evidence?
- Is the provider account active and current?
- Is the payment matched, excepted, or suspended?
- Who approved the posting?
- Which period and close pack are affected?
