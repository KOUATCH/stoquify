# Delivery 25 — Super Admin journal form browser verification

Date: 17 October 2026. Source revision inspected: `b044764248f1ac47705371c235c2ba273dd973a7`, with existing local changes preserved. Scope: non-submitting live journal form checks in the built-in browser. No application source or stored permissions changed.

## Recovery and fixture

The user reported that manual navigation displayed the full form. Fresh automation inspection then worked and exposed a Next.js Runtime ChunkLoadError for the dashboard page chunk. Captured [error evidence](evidence/delivery-25-journal-chunk-error.png), reloaded the journal route, and observed loading followed by the full form. Page reads, screenshots, viewport changes and keyboard operations subsequently worked. This demonstrates recovery during this session; it does not establish the root cause of previous debugger timeouts or a permanent platform repair.

The rendered sidebar confirmed Super Admin, Amina Ngono, Wilkinson - Feeney 001. The form loaded five manual journal options and four account options, with six entry lines. This is Super Admin evidence, not acceptance of restricted Accountant, Owner or Cashier access.

## Live coverage

| Route | Locale / role | Measured CSS viewport | Evidence |
|---|---|---|---|
| `/en/dashboard/accounting/journals/new` | EN / Super Admin / dark | 1440 × 901 | Full form; document client/scroll width 1429/1429; line region 1058/1058. |
| Same | EN / Super Admin / dark | 1024 × 768 | Document 1013/1013; line region client/scroll width 642/1040. |
| Same | EN / Super Admin / dark | 320 × 844 | Document 309/309; line region 233/1040. Horizontal overflow is contained in the table region. |
| `/fr/dashboard/accounting/journals/new` | FR / Super Admin / dark | 320 × 844 | Localized headings, labels and accessible line names; document 309/309; line region 233/1040. |
| Same | FR / Super Admin / light setting | 1024 × 768 and 1440 × 901 | Document widths 1013/1013 and 1429/1429. Light appearance is **not accepted**; see finding below. |

Requested dimensions differed from measured dimensions because of browser scaling. Measurements above use actual DOM CSS pixels. Screenshots also exhibited scaling/cropping differences; they are supporting observations, not proof that every desktop pixel was reviewed.

## Keyboard results

- EN Memo → Tab reaches the named Journal entry lines region with solid focus outline. Shift+Tab returns to Memo, confirmed through the focused control's label.
- EN ArrowRight changed region scrollLeft from 0 to approximately 28.99; ArrowLeft returned it to 0. Focus stayed on the region.
- EN region → Account line 1 → Description line 1 → Debit line 1 → Credit line 1 follows the expected tab sequence.
- EN Credit line 6 → Tab focuses Create draft without activation. Its DOM bounds were inside the 844px viewport (top 767.51, bottom 807.51); computed outline was present. The immediate screenshot did not reliably show the same scrolled focus state, so visual proof of the button's focus appearance remains limited.
- FR Libellé → region and reverse navigation pass. Both arrows reproduce the same movement and retain focus. Region → Compte ligne 1 → Description ligne 1 → Débit ligne 1 → Crédit ligne 1 passes; Crédit ligne 6 → Tab reaches Créer le brouillon without activation.
- EN/FR Journal received Alt+ArrowDown followed by Escape; selection remained empty and focus returned/stayed on Journal. Native popup appearance was not independently captured.

## Remaining findings

1. **French queue activation remains unverified; destination rendering passed.** Enter and click on Liste des écritures left the form visible during observation, despite the correct localized href. A direct navigation subsequently reached the queue URL and rendered Écritures comptables with one existing draft and 80 posted/reversed records. Saved [queue evidence](evidence/delivery-25-journal-fr-queue.png). A later return-link check encountered localhost connection refusal before the form was visible. Do not treat link activation as passed or assign a code cause from this alone.
2. **Light-theme mismatch observed.** Selecting light theme changed the document class to `light` and the toggle to its dark-theme action, but the journal select retained dark colors: background `rgb(31, 49, 57)`, text `rgb(247, 250, 248)`. Screenshot also remained dark. Review this against the approved authenticated-theme contract before any theme-wide change. The original dark setting was restored.
3. Screen reader, forced colors, touch, reduced motion, all-field traversal, other restricted roles and submission/error-server journeys remain outside this pass. No financial mutation was attempted.

## Evidence and controls

- [EN desktop](evidence/delivery-25-journal-en-desktop.png)
- [EN tablet](evidence/delivery-25-journal-en-tablet.png)
- [EN phone capture after submit-button focus](evidence/delivery-25-journal-en-phone-submit-focus.png) — capture limitation described above
- [FR phone table focus](evidence/delivery-25-journal-fr-phone-table-focus.png)
- [FR light-setting observation](evidence/delivery-25-journal-fr-light-observation.png)

Source inspection: journal page, ManualJournalDraftForm, AccountingLinkButton and current workflow definitions. The queue action renders a locale-aware Link via Button asChild; no source change was justified from the navigation delay alone.

Workflow verification: inspected package definition, command registry and `scripts/verify-agent-workflow-contract.js`, then ran `npm run agent:workflow:check`: **passed**, 196 scripts outside reviewed manifest. No application/database commands are executed by that check. Unit/mock tests and database diagnostics were not rerun. Source-file reads that used two incorrect paths failed and were corrected; those are not verification results.

All journal/reference/memo/account/description/debit/credit fields were verified empty after the checks; date remained 2026-10-17 and currency XAF. No entry was submitted, no grants changed, and no seed, migration or deployment ran. The temporary viewport override was reset and subsequently measured at the normal 231 × 414 panel size. Existing local application changes were preserved.

## Local server recovery follow-up

After queue rendering, returning to the form encountered ERR_CONNECTION_REFUSED. A host listener check found no listener on port 3000. Reviewed `dev`, its `predev` hook, `scripts/dev-app-safe.js` and `scripts/ensure-prisma-client.js`: startup may prepare generated Prisma Client and allocates isolated local build output; it does not run migrations or role seeds. Started `npm run dev -- --port 3000` to recover the unavailable local app. This is application startup with configuration/build side effects, separate from the read-only workflow check and browser evidence above. No existing process was terminated.

The restart exited 1 during Prisma generation: Windows EPERM while renaming `query_engine-windows.dll.node.tmp20180` onto `query_engine-windows.dll.node` in the generated client directory. The development launcher did not run, so this attempt did not allocate a fresh build session or restore port 3000. Generated-client preparation may have modified local generated output before the rename failure; no application-source, schema, migration or permission edit was made. Other Node/Prisma processes were observed, but the exact DLL lock owner was not established and no concurrent process was terminated. Local server recovery remains blocked on resolving that engine lock and completing the standard startup. The browser remains retained at normal viewport, with the most recent navigation reporting localhost connection refusal.
