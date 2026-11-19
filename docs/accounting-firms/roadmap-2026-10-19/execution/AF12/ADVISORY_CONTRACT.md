# AF12 advisory workflow and operations

**Version:** 1, 25 October 2026. This phase extends AF08 workpapers and AF04 managed engagement authority. It does not introduce a financial calculation engine or a second identity system.

## Reuse and ownership

The AF08 transaction reader supplies the exact period, close run, source revision/hash, review hash, independently approved supporting evidence and decimal-string account/currency balances. Advisory conclusions select one or more of the four existing schedule categories. A current positive workpaper review is required before drafting or advancing a new version. Public action metadata is bounded to ten owner/date/category actions; narrative sections to four. No cash forecast, cross-currency sum, statutory support or close certification is manufactured.

`FirmAdvisoryRevision` is the only added table. It retains engagement/period narrative and action metadata plus the observed AF08 evidence snapshot needed to interpret historical delivery. SQL composite foreign keys bind the client period and firm/client engagement. Update/delete triggers make revisions append-only. The service serializes writers using existing period/source locks; version checks and command hashes distinguish exact retries from changed requests. A failed audit write rolls back the revision.

## State machine

| Command | Preconditions | Result |
|---|---|---|
| DRAFT | Active enrolled firm actor with preparation permission; current independently reviewed AF08 sources; valid client action owners | New DRAFT version; review, agreement and delivery cleared |
| REVIEW | Different firm actor from the draft preparer; current review permission and fresh authentication; latest current DRAFT | REVIEWED with reviewer/time |
| CHANGES_REQUESTED | Same independent-review boundary | CHANGES_REQUESTED; prepare a new draft to continue |
| AGREE | Authenticated client-local actor with Close read/comment permission; latest current REVIEWED version | CLIENT_AGREED with client actor/time |
| DELIVER | Firm actor with current export permission and fresh authentication; latest current CLIENT_AGREED version | DELIVERED, published in the authenticated client workspace |

Each command includes the expected advisory version, source hash and review hash. Clients cannot inject amounts, change narrative during agreement, self-authorize a firm mandate or use an engagement assignment as consent. Owners must still be usable client users with current Close read/comment permissions. New drafts reset earlier approvals. Exact retries return the retained result without another revision; the returned freshness states whether that historical result still matches current sources.

## Public, private and metric boundaries

Client reads show reviewed, client-agreed and delivered versions only. Public DTOs and exports exclude private notes and internal decision reasons. Firm private-note reads require their own preparation permission and current enrolled engagement authority. The separate metrics endpoint requires firm management and client evidence-supervision permissions for every selected cohort. All boundaries revalidate live sessions, grants, assignments, organizations, module access and time validity in their transactions.

The UI uses the existing Accountant Portal and reviewed-workpaper location. It provides English/French copy, native labeled controls, explicit source/decision status, retained versions, password step-up and identical-command retry. Private state clears on reauthorization, scope changes, hidden tabs and pagehide; private text is not saved in local storage. The first UI slice authors one selected schedule conclusion/action per new draft; the service contract supports four conclusions and ten actions. A new draft is a replacement, not an implicit merge.

## Freshness, retained delivery and exports

A changed source hash or workpaper review hash marks existing versions `REVIEW_REQUIRED`. A new publication cannot proceed against stale sources. Historical delivered versions retain their original amounts, narrative, reviewer, client agreement and publication actor/timestamps. They remain evidence of what was published, not proof that those figures are still current.

PDF, CSV and JSON render the same public canonical document. The export envelope includes the immutable delivery hash and a current freshness indicator. A stale historical export is explicitly marked for review; its original delivery record is not rewritten. `ClosePackExport`, existing export-safety evaluation, watermarking and audit logging are reused. CSV uses the existing formula-escaping utility. PDF/CSV include evidence references, currency, retained closing amounts, conclusions and actions; JSON retains the complete observed source balances.

Publication is not email sending, client receipt, statutory submission, payment approval or an audit opinion. No messages are sent by this workflow.

## Deployment, monitoring and rollback

Activation requires the AF12 additive migration, compatible generated Prisma client and the existing accounting/close modules and managed engagement access. AF12 adds no independent flag framework. Production schema promotion and deployment remain outside this execution. The development verification uses explicit disposable loopback databases and an environment-isolated app copy.

Observe safe action denials, stale/conflict results, audit failures, source-limit failures and uncertain retries. Investigate repeated source changes in the existing workpaper/close workflow. Do not bypass consent or fresh authentication to clear a workflow blocker.

Rollback the new advisory panel/actions to the previous application version while retaining the additive table and delivered records. Continue the existing workpaper workflow. Do not delete history or disable the append-only trigger. An actual data-retention change requires a separate reviewed retention process; no such purge is implemented here.

## Bounded pilot constraints

Limits are explicit: ten outcome cohorts, 20 active engagement choices per client, 100 advisory revisions per engagement/period, 100 client owner choices, 50 AF08 account/currency schedules, 100 AF08 review decisions, 1,000 request source rows and 100 review decisions per metric window. Limit violations refuse the operation/report rather than hiding rows or implying complete totals. Large-firm pagination beyond these pilot limits is not claimed.
