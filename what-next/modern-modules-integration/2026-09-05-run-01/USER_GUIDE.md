# Configure a Stoquify workspace

This guide covers native workspace configuration, preparation and supported stops on new business operations. It uses your organization's existing access. It does not purchase modules, approve X1 or certify statutory or operational readiness.

## Open the builder

Sign in to the intended organization and open **Settings → Modules**. The route requires **MANAGE_SYSTEM_SETTINGS**. Check the organization name before editing.

- English: `/en/dashboard/settings/modules`
- Français : `/fr/dashboard/settings/modules`

Use the application's existing language control to switch languages. The same organization and controls apply in either language. Ordinary employees continue to use their permitted sidebar and workspace destinations; they do not gain configuration access from these instructions.

For this run's isolated preview, open `http://127.0.0.1:3107/en/dashboard/settings/modules` or its `/fr/` equivalent. The local test accounts and random password are recorded in the ignored `playwright/.auth/modern-modules-local.json` file: use an email from `fixtures` and the shared `password` field. These accounts belong only to synthetic verification organizations. Your normal database/login is a separate target; the rollout instructions must be followed before using the integration there.

## Choose and adapt a starting point

On **Configure / Configurer**, choose a recipe:

| Starting point | Initial selection | Typical use |
| --- | --- | --- |
| **Retailer / Commerce de détail** | Inventory, Sales, Point of sale, Cash accountability | Goods, checkout and cash operations. Required connections are added automatically. |
| **Service business / Entreprise de services** | Sales, Finance, Accounting, Reports | Services, customer activity and finance without selecting Inventory or Point of sale. |
| **Current configuration / Configuration actuelle** | Latest saved selection | Adapt the current workspace instead of a recipe. |

A recipe changes your draft only. Use the search field or category list to find a capability, then select its checkbox. The blue selection means **selected in the draft**, not approved or operationally ready.

A required connection is checked automatically and names the capability that depends on it. To remove that connection, first deselect the dependent capability. For example, **Payment reconciliation / Rapprochement des paiements** requires **Finance** and **Accounting / Comptabilité**.

Access and setup are separate. A card can show an existing access grant and several outstanding setup requirements. Accounting and provider requirements appear independently. The server checks their actual source records before activating a requested workspace; each business operation still applies its own controls. A catalogue entry with no supported destination is not offered as a new operational capability.

## Choose whether to stop new operations

Changing the catalogue selection changes workspace visibility. To propose an operational stop, separately expand **Control new business operations / Contrôler les nouvelles opérations métier** and select the intended capability. Existing stops begin selected; all other capabilities retain their established behavior unless you explicitly choose a supported stop.

An unavailable control explains why its stop is not supported. In particular, a capability whose accepted offline work lacks a verified continuation process cannot be stopped through this builder. Do not treat a hidden shortcut as a substitute for the operational control.

At this continuation checkpoint, **Inventory, Purchasing and Payroll** have supported stop controls. The server reviews their actual existing work before allowing retained state. Stops for **Sales, Point of sale, Payment reconciliation and Accounting** remain unavailable pending their owner continuation/admission controls. Accounting is a required dependency of reconciliation: stopping Accounting would also block new reconciliation work before that continuation path is resolved. Their ordinary workspace configuration and authorized historical access are separate. Consult the current server-rendered options and feature-status record before attempting an operational stop.

Keeping an existing stop selected preserves it. Clearing it proposes resuming new admission only after fresh review and successful preparation. You can prepare another reviewed configuration while a previous request is waiting; previously accepted stops remain effective until an explicit resumption completes.

## Supply an existing payroll or compliance scope

If Payroll is selected, **Payroll period to verify / Période de paie à vérifier** lists actual periods returned for this organization. Choose the intended period and verify its country, start/end dates and pay date. Obtain these details from the payroll owner and the organization's approved payroll schedule. If no period is available, an authorized payroll owner must create or correct one in the existing Payroll workspace, then return and refresh. The builder does not invent periods or payroll approval.

If Compliance is selected, choose an existing **Authority connection to verify / Connexion à une autorité à vérifier**. Check the country, authority channel and environment against the compliance owner's actual setup. A **Sandbox / Bac à sable** connection remains a test environment, even after its setup checks pass. It does not establish production filing readiness. An unsupported production scope remains unresolved.

Changing either scope requires a new preview. Resuming preparation reuses the recorded scope rather than silently switching to another period or authority connection. The browser draft and durable draft preserve the chosen references.

## Save your work or review it

**Save draft / Enregistrer le brouillon** records a durable draft without changing the workspace. It then appears in **Change history / Historique**.

Saving or reopening a draft can also require the existing password confirmation when your verified identity is no longer fresh. The challenge names the draft action and retries the same recorded request after verification. It does not activate the draft.

The browser also preserves unsaved selections and proposed stops for the same user and organization in the current browser session. It is a convenience, not proof of access. Use **Save draft** when you need a server-recorded draft.

On mobile and narrower tablets, the review button stays near the bottom of the screen while you browse the catalogue. The page leaves space below its content so the final items can scroll clear of the button. Closing review returns keyboard focus to that control.

Choose **Review configuration / Examiner la configuration**. The server checks the current organization, catalogue, rights and revision. The review shows:

1. **Join workspace / Rejoignent l'espace**: newly included destinations.
2. **Stay in workspace / Restent dans l'espace**: destinations preserved in the selection.
3. **Leave workspace / Quittent l'espace**: shortcuts omitted from the new workspace.
4. Existing rights that remain preserved.
5. Missing access, unavailable dependencies, setup information and other current conditions.
6. Explicit new-work stops and resumptions, affected dependent capabilities, permitted continuation operations, and counts of existing work in the server's checked scope.

Removing a shortcut **does not stop its business operations or revoke existing access**. The separate stop controls affect only the operations named in the server's review. They do not delete orders, invoices, journals, employee records or history. A record may appear in several observation categories; the displayed total is not a claim of unique records or universal readiness.

An accepted stop may prevent new admission immediately while existing obligations or workspace preparation remain pending. Review the permitted continuation work carefully. Final retained state is unavailable until the checked outstanding work is resolved. Unsupported stops cannot be applied.

If you try to create a transfer or purchase order, or calculate new payroll work after an applicable stop, the affected form explains the denial in your current language: **New work is stopped / Les nouvelles opérations sont arrêtées**. Your attempted operation has not succeeded. Existing records and permitted completion workflows remain available; ask an authorized configuration owner to prepare a reviewed reactivation if new work is needed. Older labels in those domain forms may still be English.

For a transfer, this explanation stays inside the open dialog above its action buttons. The chosen locations, item quantities and notes remain in your draft. Closing or retrying the form does not override the stop.

No new subscription is purchased. A capability requiring a grant needs a real eligible grant supplied through the organization's authorized access process. A selection checkbox cannot create it.

## Apply the reviewed configuration

If the authoritative review permits the change, choose **Apply configuration / Appliquer la configuration**. The server applies the exact reviewed revision. It rechecks authority and evidence; another administrator's intervening change cannot silently overwrite the review.

If fresh identity confirmation is required:

1. Enter your **Current password / Mot de passe actuel** in the existing password challenge.
2. Choose **Verify identity and apply / Vérifier et appliquer**.
3. Wait for the server result. The password is cleared after verification.

The header distinguishes **Requested revision / Révision demandée** from **Active workspace revision / Révision active de l’espace**. A request with outstanding inputs is recorded without replacing the last verified active workspace. The preparation panel shows actual recorded steps and observation times; completed steps and their evidence can be expanded.

**Requested / Demande enregistrée** means preparation remains outstanding. **Preparing / En préparation** means the recorded operation is being processed. **Failed / Échec** identifies a failed attempt. None means activation succeeded.

When preparation completes, **My workspace / Mon espace** opens and navigation refreshes. **Records retained / Documents conservés** additionally means the reviewed stopped capabilities have no outstanding work in the checked retention scope. Historical links are returned by the server for your current permissions. They do not enable unrestricted new work.

Workspace cards for directly stopped capabilities explicitly identify that new work is stopped and describe authorized historical/continuation use. If another administrator has submitted a newer request before an earlier response returns, the interface shows the latest server state and identifies that newer request rather than announcing its completion.

**Applied / Appliquée** means the workspace configuration is saved and active. It does not mean every accounting, payment, payroll or compliance operation is ready to run.

## Use history and recover

**Change history / Historique** lists server-recorded drafts and lifecycle outcomes with revision, time and recorded stops. Expand **Record / Référence** to inspect the record ID, recording actor and previous selection. The preparation panel exposes the current operation reference and recorded step evidence.

**Reopen as new draft / Rouvrir dans un nouveau brouillon** copies an earlier selection into a new draft. It does not undo transactions or immediately reactivate an old configuration. Review it against current conditions before applying.

When offered, **Check inputs and resume preparation / Vérifier les données et reprendre** rechecks the existing recorded operation. Complete the listed inputs first. The server preserves completed effects and rechecks evidence; the existing identity challenge may be required again. If the operation cannot be resumed, refresh or prepare a new reviewed configuration rather than inventing a completed step.

Under stopped capabilities, **Prepare reactivation / Préparer la réactivation** creates a proposed draft change. It removes the selected stop and adds the capability to the draft. Nothing resumes until the new review, authority checks and preparation succeed.

| What you see | What to do | Information needed and where it comes from |
| --- | --- | --- |
| Access required or suspended/expired grant | Ask the organization's authorized administrator to resolve eligibility. | Organization, capability and grant condition shown on the card/review. Do not use a prototype approval or invented reference. |
| Required connection unavailable | Resolve that connection or remove the dependent capability from the draft. | The review names the dependency; the catalogue explains what requires it. |
| Accounting setup needed | Follow **Open setup / Ouvrir la configuration**, then complete the accounting workflow before affected operations. | Real organization, country, chart/period and other setup data requested by that existing workflow; obtain them from the responsible accountant. Workspace selection does not verify them. |
| Payment-provider setup needed | Open the linked setup and complete the supported provider workflow. | The actual organization/provider account and verification data from your provider or finance owner. Do not put credentials in a configuration note. |
| Point-of-sale setup needed | Open the linked terminal settings and complete the existing terminal, active location and required cash-drawer configuration. | Real terminal/location information from the operations administrator. Cashier, fiscal and offline checks still apply to each operation. |
| Payroll scope needed | Choose the intended existing period, or ask the payroll owner to create/correct it; review the new scope. | Country, period dates and pay date from the actual payroll period and payroll owner. The server applies the existing payroll readiness controls. |
| Compliance scope unavailable | Ask the compliance owner to correct the existing country, authority channel and operating environment; review the new scope. | The actual registered connection and owner evidence. A sandbox success cannot substitute for production setup. |
| Configuration or evidence changed | Choose **Refresh current state / Actualiser l'état actuel**, then review again. | The fresh server revision replaces the stale comparison. Your edited draft remains visible. |
| Input needed | Follow each setup link, supply the real source information, then use the permitted resume action. | The panel identifies every outstanding requirement and its owner workspace. Earlier verified workspace and accepted stops remain in place. |
| Preparation failed | Correct the reported issue and use **Check inputs and resume preparation** when offered. Otherwise refresh and create a fresh review. | The recorded operation, step evidence and current issue. Completed effects are not fabricated or repeated as a new activation. |
| Existing work prevents retained state | Open the affected domain and complete or reconcile the work using its existing authorized controls; then recheck preparation. | Draft/obligation categories in the server preview and their source records. Do not delete records to manufacture a zero count. |
| Unsupported stop | Remove that proposed stop; retain workspace-only changes if useful. | The server's stated policy limitation. A hidden navigation entry does not close the operational boundary. |
| Connection lost after applying | Use the permitted retry of the same reviewed configuration to learn whether it committed. If the server reports stale evidence, refresh and review again. | The retained request reference; repeating it cannot apply the same command twice. |
| Load failed | Retry the route or refresh current state. | No successful empty configuration is inferred from a failed query. The last successful snapshot remains identified when available. |
| No permitted workspace destinations | Review the selection or ask the administrator about your role. | Actual role permissions and tenant access. Configuration membership alone cannot grant permission. |
| Session or permission error | Reauthenticate or contact the authorized role administrator. | Use the application's existing identity and access process. |

## What you need to decide separately

This workspace builder does not require you to invent a new approval register just to save a draft. It does require the existing authorized role and fresh identity confirmation when applying.

Commercial prices, new paid grants, retention-policy decisions, irreversible retirement/deletion, country-pack approval, agent activation and X1 evidence remain separate real decisions when their own workflows require them. Supported stops preserve records and narrowly permit existing work; they do not establish a new retention period or commercial termination. The builder does not manufacture those facts. Proposed HRIS, internal ledger and assisted-work packages are not automatically added as new operational modules.

The [implementation report](IMPLEMENTATION_REPORT.md), [feature status](FEATURE_STATUS.md) and [verification record](VERIFICATION.md) distinguish delivered configuration behavior from remaining platform lifecycle work and record the actual tested scope.
