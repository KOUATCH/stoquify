# Configure a Stoquify workspace

This guide covers the native module settings integration. It changes the workspace configuration using your organization's existing access. It does not purchase modules, approve X1, certify business readiness or revoke existing rights.

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

Access and setup are separate. A card can show an existing access grant but still point to accounting or payment-provider setup. That setup is checked by the corresponding business workflow. A catalogue entry with no supported destination is not offered as a new operational capability.

## Save your work or review it

**Save draft / Enregistrer le brouillon** records a durable draft without changing the workspace. It then appears in **Change history / Historique**.

The browser also preserves an unsaved selection for the same user and organization in the current browser session. It is a convenience, not proof of access. Use **Save draft** when you need a server-recorded draft.

On mobile and narrower tablets, the review button stays near the bottom of the screen while you browse the catalogue. The page leaves space below its content so the final items can scroll clear of the button. Closing review returns keyboard focus to that control.

Choose **Review configuration / Examiner la configuration**. The server checks the current organization, catalogue, rights and revision. The review shows:

1. **Join workspace / Rejoignent l'espace**: newly included destinations.
2. **Stay in workspace / Restent dans l'espace**: destinations preserved in the selection.
3. **Leave workspace / Quittent l'espace**: shortcuts omitted from the new workspace.
4. Existing rights that remain preserved.
5. Missing access, unavailable dependencies, setup information and other current conditions.

Removing a capability from this workspace **does not stop its business operations or revoke its existing access**. It does not delete orders, invoices, journals, employee records or history. Capability suspension and commercial offboarding need their own supported lifecycle controls.

No new subscription is purchased. A capability requiring a grant needs a real eligible grant supplied through the organization's authorized access process. A selection checkbox cannot create it.

## Apply the reviewed configuration

If the authoritative review permits the change, choose **Apply configuration / Appliquer la configuration**. The server applies the exact reviewed revision. It rechecks authority and evidence; another administrator's intervening change cannot silently overwrite the review.

If fresh identity confirmation is required:

1. Enter your **Current password / Mot de passe actuel** in the existing password challenge.
2. Choose **Verify identity and apply / Vérifier et appliquer**.
3. Wait for the server result. The password is cleared after verification.

The interface shows actual pending states, not the prototype's simulated activation sequence. A confirmed result opens **My workspace / Mon espace**, and the application refreshes its navigation. Each destination still applies its own server permissions and domain controls.

**Applied / Appliquée** means the workspace configuration is saved and active. It does not mean every accounting, payment, payroll or compliance operation is ready to run.

## Use history and recover

**Change history / Historique** lists server-recorded drafts, applied configurations and failed commands with revision and time. Expand **Record / Référence** to inspect the record ID, recording actor and previous selection.

**Reopen as new draft / Rouvrir dans un nouveau brouillon** copies an earlier selection into a new draft. It does not undo transactions or immediately reactivate an old configuration. Review it against current conditions before applying.

| What you see | What to do | Information needed and where it comes from |
| --- | --- | --- |
| Access required or suspended/expired grant | Ask the organization's authorized administrator to resolve eligibility. | Organization, capability and grant condition shown on the card/review. Do not use a prototype approval or invented reference. |
| Required connection unavailable | Resolve that connection or remove the dependent capability from the draft. | The review names the dependency; the catalogue explains what requires it. |
| Accounting setup needed | Follow **Open setup / Ouvrir la configuration**, then complete the accounting workflow before affected operations. | Real organization, country, chart/period and other setup data requested by that existing workflow; obtain them from the responsible accountant. Workspace selection does not verify them. |
| Payment-provider setup needed | Open the linked setup and complete the supported provider workflow. | The actual organization/provider account and verification data from your provider or finance owner. Do not put credentials in a configuration note. |
| Configuration or evidence changed | Choose **Refresh current state / Actualiser l'état actuel**, then review again. | The fresh server revision replaces the stale comparison. Your edited draft remains visible. |
| Preparation failed | Correct the reported issue, refresh current state and create a fresh review before applying again. A terminal failed command is retained and cannot be replayed as success. | The failed command and current issue. The previous successful workspace stays in place. |
| Connection lost after applying | Use the permitted retry of the same reviewed configuration to learn whether it committed. If the server reports stale evidence, refresh and review again. | The retained request reference; repeating it cannot apply the same command twice. |
| Load failed | Retry the route or refresh current state. | No successful empty configuration is inferred from a failed query. The last successful snapshot remains identified when available. |
| No permitted workspace destinations | Review the selection or ask the administrator about your role. | Actual role permissions and tenant access. Configuration membership alone cannot grant permission. |
| Session or permission error | Reauthenticate or contact the authorized role administrator. | Use the application's existing identity and access process. |

## What you need to decide separately

This workspace builder does not require you to invent a new approval register just to save a draft. It does require the existing authorized role and fresh identity confirmation when applying.

Commercial prices, new paid grants, retention policy, irreversible capability deactivation, country-pack approval, agent activation and X1 evidence remain separate real decisions when their own workflows require them. The builder does not manufacture those facts. The proposed HRIS package, internal ledger package and assisted-work package are not automatically added as new operational modules.

The [implementation report](IMPLEMENTATION_REPORT.md), [feature status](FEATURE_STATUS.md) and [verification record](VERIFICATION.md) distinguish delivered configuration behavior from remaining platform lifecycle work and record the actual tested scope.
