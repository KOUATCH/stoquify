# Next execution boundary

**Next eligible work: P04-R02 full-application qualification, coordinated with P04-V02 real-auth/browser evidence.**

Exact first action: capture a fresh immutable candidate and create a synthetic-tenant, disposable-database full-app qualification fixture using the real session/authorization adapters and private artifact layout. Review its build/launch commands and explicit targets before execution.

Advancement requires a source-bound full artifact, no private bytes or unintended writes on real-session denial (including expiry/revocation/changed grants), authorized legacy/API reads, private UI consumer checks, stored-reference/mapping reconciliation and independent review. Hosted ingress/static/CDN exclusion and operator cutover acceptance remain release requirements; no deployment is authorized.

The implementation and isolated gates already pass; do not repeat the original public-exposure repair. See [repair result](P04-R02/repair/RESULT.md) and [current matrix](P04-R02/repair/advancement-gates.json). P04-R01/R03 remain separate repairs, P04-D01 a business decision, and parent/dependent production advancement remains blocked.
