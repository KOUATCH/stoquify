# Configure and use a Stoquify workspace

This guide covers the native capability builder, actual preparation, supported operational stops and configuration history. It uses your organization's existing access and approvals.

## Open the builder

Sign in to the intended organization and open **Settings → Modules**. Check the organization name and requested/active revisions. The route requires the existing module-settings authority, including **MANAGE_SYSTEM_SETTINGS**.

- English route: /en/dashboard/settings/modules
- French route: /fr/dashboard/settings/modules

Use the application's language control for the EN/FR experience. Ordinary employees continue through their permitted workspace and sidebar destinations; configuration access does not grant domain permissions.

The isolated verification server uses http://127.0.0.1:3107 when running. For synthetic sign-in, use an email from fixtures and the password in the [local test-account record](<E:/ohada saas/Focused projects/stoquify/playwright/.auth/modern-modules-local.json>). Do not copy its credentials into reports or use these organizations for business. Follow ROLLOUT_AND_RECOVERY.md before using the implementation on another target.

## Choose the business outcome and capabilities

In **Configure / Configurer**, start with one of these editable choices:

| Starting point | Initial capabilities | Suitable starting use |
| --- | --- | --- |
| Retailer / Commerce de détail | Inventory, Sales, Point of sale and Cash accountability | Goods, checkout and cash handling. |
| Service business / Entreprise de services | Sales, Finance, Accounting and Reports | Services, customer work and finance. |
| Current configuration / Configuration actuelle | The organization's current desired selection | Adapt an existing setup. |

Search by capability or business outcome, filter the catalogue, and select what you need. Blue indicates a draft selection. It does not mean approved, active or healthy.

Required connections are shown with the capabilities that depend on them. Payment reconciliation, for example, requires Finance and Accounting. Remove a dependent choice before trying to remove its required connection. The server checks these relationships again during review.

An available feature still needs eligible tenant access, the user's permission and its own business setup. A planned entry or one without a supported destination cannot be made operational by selecting it.

## Decide whether to stop new operations

Removing a capability from the visible workspace removes its shortcuts. It does not stop business operations, revoke established rights or delete records.

To request an operational stop, separately expand **Control new business operations / Contrôler les nouvelles opérations métier**. Existing stops are selected already. Choose a supported stop explicitly and examine its consequences in review.

| Supported stop | New work affected | Work retained under its existing controls |
| --- | --- | --- |
| Inventory | New adjustments, transfers and counts | Existing stock work and required stock effects. |
| Purchasing | New purchase orders | Existing purchasing work and supplier settlement. |
| Payroll | New periods and runs | Existing payroll work, payments and declarations. |
| Accounting | **Creation of new manual journal entries only** | Existing journal work, required ledger posting and reconciliation. |

Accounting's scope is written beside its control and in review. It does not turn off the ledger or make Accounting unavailable as a required reconciliation dependency.

**Sales, Point of sale and direct Payment reconciliation stops are unavailable.** POS/Sales need a verified continuation process for already accepted offline work. Reconciliation needs the appropriate retained scope for later provider evidence. Their ordinary workspace selection and permitted historical use remain separate. Use the actual server-provided availability and reason; hiding a shortcut cannot replace an operational stop.

Clearing an existing stop proposes reactivation. New admission resumes only after a fresh review and successful revalidation. You can prepare another configuration while a request is pending, but accepted stops remain in effect until an explicit resumption completes.

## Provide the required real setup information

The builder shows several outstanding requirements independently. Resolve each in its owner workspace; a selected checkbox cannot supply missing business evidence.

| Requirement | Information needed from your organization | Where to get it and what to do |
| --- | --- | --- |
| Eligible access or valid grant | Intended organization, capability and its actual access condition | Ask the authorized access/commercial administrator to resolve the grant. Use the existing process; do not invent an approval ID. |
| Accounting setup | Correct organization/country, chart, eligible accounts, journals and relevant period information | Obtain these from the responsible accountant and follow the linked Accounting setup workflow. |
| Payment-provider setup | Actual provider/account and supported verification evidence | Use the linked provider setup with the finance/provider owner. Keep credentials out of configuration notes. |
| POS setup | Actual terminal, active location and any required drawer setup | Ask the operations administrator and use the linked terminal settings. Cashier, fiscal and offline controls still apply. |
| Payroll scope | Existing period, country, start/end dates and pay date | Select **Payroll period to verify / Période de paie à vérifier**. Obtain the schedule from the payroll owner. If missing, the owner creates/corrects the period in Payroll; return and refresh. |
| Compliance scope | Registered authority connection, country, channel and environment | Select **Authority connection to verify / Connexion à une autorité à vérifier** using the compliance owner's actual connection. Correct missing information in that owner workflow. |
| Existing work awaiting completion | The actual drafts/obligations named in the review | Open the responsible workspace and complete/reconcile them using its established controls. Do not delete work to manufacture a zero count. |

Payroll periods and authority connections are filtered to this organization and your permissions. Changing the selected source record requires another preview. Resume uses the already recorded scope.

A **Sandbox / Bac à sable** compliance connection remains a test environment after verification. Its success does not authorize production filing. An unavailable production scope remains unresolved.

## Save a draft and review its consequences

**Save draft / Enregistrer le brouillon** records a durable draft without activating it. The browser also retains unsaved choices for the current user, organization and browser session; use Save draft when you need server-recorded work.

Saving or reopening a draft can require the existing password confirmation. Verify through that challenge to retry the same requested draft action.

Choose **Review configuration / Examiner la configuration**. On mobile and narrower tablets, the same review control remains near the bottom of the screen while you browse. The page reserves space beneath the content; closing review returns focus to this control.

The server's preview shows additions, preserved destinations, removed shortcuts, retained access, setup requirements, any explicitly requested stops/resumptions, affected dependencies and permitted continuation work. Its counts describe the checked scope and may overlap; they do not prove that every business obligation is complete.

A supported stop can prevent new admission immediately when the request is accepted, while preparation or existing obligations remain outstanding. Review this timing before applying. Existing orders, payroll records, journals and history remain subject to normal permissions and controls.

The builder does not purchase subscriptions or create a commercial grant. Obtain any required entitlement through the authorized access process.

## Apply and complete preparation

When the authoritative review allows it, choose **Apply configuration / Appliquer la configuration**. If requested, enter your current password and use the existing identity-verification action. The password is cleared after verification.

The submission is bound to the reviewed configuration and evidence. If another administrator or source update makes it stale, refresh and review again. The edited draft remains available.

| State shown | Meaning and next action |
| --- | --- |
| Requested / Demande enregistrée | The request is recorded; required preparation remains. Follow its listed inputs. |
| Preparing / En préparation | The durable operation is being processed. Keep the recorded operation reference. |
| Failed / Échec | A step or attempt failed. Correct its reported issue and use the permitted resume action. |
| Applied / Appliquée | The verified workspace configuration is active. Domain operations still enforce their own setup and permissions. |
| Records retained / Documents conservés | The reviewed stopped work has completed the checked retention transition. Use the permitted historical/continuation links. |

The requested revision can be newer than the active workspace revision. The last verified workspace remains available while preparation is incomplete. The panel shows actual steps, missing inputs, attempt/check times and evidence; expand completed steps when needed.

After correcting inputs, use **Check inputs and resume preparation / Vérifier les données et reprendre** when offered. This rechecks the existing operation and its recorded scope. Fresh identity confirmation may be required again. If resume is unavailable, refresh and prepare a new reviewed request.

## Use the workspace and history

**My workspace / Mon espace** contains authorized destinations derived from actual capability access and your permissions. Navigation refreshes after successful application. Directly stopped capabilities explain that new work is stopped and identify their retained use.

**Change history / Historique** initially shows 25 recorded changes. Use **Load earlier changes / Charger les modifications précédentes** to fetch the next page. Repeat until the required record is visible. A loading failure preserves the current entries and your draft and offers retry.

Earlier pages show the status returned when they were loaded. Use **Refresh current state / Actualiser l'état actuel** to reload history before relying on a status that may have changed. A permission or configuration change can return the view to refreshed recent records; load earlier pages again as needed. Reopening always checks your current authority.

After a page loads, the screen announces its record count and keyboard focus moves to its first entry. Press Tab to reach that entry's action. Expand **Record / Référence** to inspect its reference, actor and previous selection.

**Reopen as new draft / Rouvrir dans un nouveau brouillon** copies an earlier configuration into a new durable draft. It does not alter the historical record, reverse transactions or restore old authority. Review current eligibility, setup, stop/resumption consequences and permissions before applying. The password challenge can be required for reopening.

For a stopped capability, **Prepare reactivation / Préparer la réactivation** prepares a draft that clears its stop and includes the capability. New work resumes only after review, authority checks and preparation succeed.

## Recover from a denied or uncertain operation

If a stopped Inventory, Purchasing or Payroll operation is attempted, its affected caller explains **New work is stopped / Les nouvelles opérations sont arrêtées**. The attempted new work has not succeeded; existing records and permitted completion workflows remain accessible. Ask an authorized configuration owner for a reviewed reactivation when needed.

Transfer creation keeps the denial inside its open dialog, above the actions. Its locations, quantities and notes remain entered while the form stays open.

The manual-journal form explains **New manual journals are stopped / Les nouvelles écritures manuelles sont arrêtées**. No journal is created by that denied request. Its entered journal, date, memo/reference and lines remain in the form, and focus moves to the inline explanation. Use **Open journal queue / Ouvrir la liste des écritures** to inspect existing work. Refreshing or leaving a form is not a promise of durable draft storage.

If the manual-journal result cannot be confirmed after a connection problem, check the journal queue before submitting again. This avoids treating an unknown outcome as a definite failure. If account/journal setup could not load, retry that load; a query failure is different from valid empty setup. Some older domain-form labels remain English; the newly introduced denial and recovery messages are translated.

For configuration submission, use the offered retry for the same request. If the server reports stale evidence, refresh and review again. Do not repeatedly create different requests to compensate for an unknown result.

If no workspace destination is permitted, ask the role administrator to review your current permissions and tenant access. A configuration record does not grant authority to use a domain operation.

## Separate decisions and verification

Prices, new paid grants, irreversible retirement/deletion, retention-policy changes, verified country-pack approval, agent activation and X1 evidence remain separate decisions in their existing workflows. This builder does not require an invented approval register to save a draft and cannot manufacture any required signature or approval.

The operational catalogue uses existing canonical modules. Proposed HRIS packaging, internal-ledger packaging and assisted-work products are not automatically operational capabilities.

The native module journey and its new recovery feedback are available in English and French. Some older domain-screen labels remain English, as noted above.

The final isolated browser checks passed the builder and review in EN/FR at genuine 200% and 400% zoom. At 400%, the French history check loaded the next 25 records and reached the newly loaded entry's reopen action using the keyboard. Vertical scrolling remains necessary at high zoom; the reviewed controls stayed visible and reachable. These checks did not apply or reopen a configuration. Existing narrow-width reflow evidence is a separate result. The implementation, feature-status, verification and rollout records state the exact tested scope and remaining external actions.
