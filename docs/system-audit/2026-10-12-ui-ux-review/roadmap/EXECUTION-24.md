# Delivery 24 — Built-in browser recovery and Accountant journal denial checks

Date: 16 October 2026. Scope: browser attachment recovery and non-mutating journal UI acceptance. No application code or stored permissions changed.

## Connection outcome

Chrome initially reported unavailable, reappeared in inventory, then timed out during journal attachment/inspection. The user explicitly authorized switching to Codex's built-in browser. Its initial navigation timed out, but subsequent DOM inspection exposed a loading state and then the authenticated page. Browser inspection now works through this alternative; the Chrome debugger problem itself is not resolved.

The rendered built-in session is Accountant in Wilkinson - Feeney 001, not the user-reported Chrome Super Admin session. The page correctly withholds the full journal form. Browser console output reports a protected-action denial for `accounting.accounts.read`. No permission was added and no alternate data-fetching path was used.

## Rendered evidence

| Route | Role / locale / theme | Actual CSS viewport | Result |
|---|---|---|---|
| `/en/dashboard/accounting/journals/new` | Accountant / EN / dark | 1043 × 652 | Setup-access guidance and queue links rendered. Document client/scroll width both 1032px. |
| Same EN route | Accountant / EN / dark | 320 × 844 | Document client/scroll width both 309px; no horizontal page overflow. Tab from Journal queue reaches Back to journals with visible solid outline; Shift+Tab returns to Journal queue. |
| `/fr/dashboard/accounting/journals/new` | Accountant / FR / dark | 320 × 844 | French headings, explanation and recovery labels rendered. Document client/scroll width both 309px. Tab from Liste des écritures reaches Retour aux journaux. |

The requested viewport dimensions differed from measured CSS dimensions because of the active browser scaling; only measured values above are acceptance evidence. Reset the temporary viewport override and verified the built-in panel returned to 231 × 414 CSS pixels with document client/scroll width both 220px.

French recovery-link activation via Enter, followed by direct click, did not visibly leave the new-journal route during observations. Destination navigation is **unverified**, not passed. This is insufficient evidence to assign an application-code cause given the connection/loading delays. Historical Delivery 22 recovery evidence is separate.

Screenshots:

- [EN desktop denial](evidence/delivery-24-journal-en-denied-desktop.png)
- [EN phone recovery focus](evidence/delivery-24-journal-en-denied-phone-focus.png)
- [FR phone recovery focus](evidence/delivery-24-journal-fr-denied-phone-focus.png)

## Evidence boundaries and next checks

- Source inspection: current journal page and ManualJournalDraftForm; permission guards, localized recovery text, hydration/pending lock and failure focus remain present. No source change justified by this slice.
- Mocked/unit tests: not rerun; Delivery 23's 38 passes remain historical evidence.
- Real database tests/diagnostics: not run. Ordinary page rendering used the existing guarded application flow.
- Live form: blocked by this session's legitimate lookup denial. Account/journal options, line controls, form-region left/right scrolling and submission-button focus order are still open.
- No journal submission, input mutation, stored permission change, seed, migration, deployment or theme change occurred.
- Built-in tab retained for handoff, and user asked to switch it to the existing authorized Super Admin test account. A Super Admin form pass will not certify restricted Accountant access.

After sign-in: confirm rendered role, inspect full form EN/FR at desktop/tablet/320px, verify Tab/Shift+Tab and both horizontal arrows, save screenshots, restore viewport. Retain Owner/Cashier, restricted-account fixture and assistive-technology coverage gaps until independently verified.

## Follow-up — 17 October 2026

The user reported signing into Super Admin in the built-in browser. Its tab inventory was empty, so a fresh tab was created in that same browser. Navigation and DOM inspection initially timed out. Making the tab visible enabled a screenshot of the dashboard loading state. After one reload and subsequent observations, the page completed rendering, but the sidebar independently confirmed **Accountant — Nadia Essomba**, organization Wilkinson - Feeney 001. The lookup-denial page remained in force. The reported Super Admin sign-in therefore was not present in the specific browser session available to this check.

EN denial layout measured 320 × 844 with document client/scroll widths both 309px. A desktop measurement was 1440 × 901 with document widths both 1429px; the main and inspected text bounds stayed within the content area. The screenshot's apparent clipping/scaling was not used to certify desktop visual fidelity. Saved [rendered session evidence](evidence/delivery-24-followup-accountant-session-2026-10-17.png). Restored the default viewport and measured 927 × 521. Retained the tab for the user to switch accounts there and requested confirmation of the visible Super Admin sidebar label.

Full-form controls, table arrow scrolling and form keyboard order remain unverified. No new keyboard pass, source fix, test run, database diagnostic, stored permission change, form input or entry submission is claimed for this follow-up. Chrome attachment remains unresolved; the built-in browser can inspect the application after loading.

### Subsequent confirmation of the Super Admin sidebar

The user explicitly confirmed that the visible Codex panel now showed Super Admin. The retained journal tab was located. Its initial DOM still contained the earlier lookup-denial content, so one reload was requested to refresh the account context. Subsequent DOM, viewport/screenshot and cleanup operations timed out, with browser-runtime resets. There was no successful post-reload role observation; the initial denial must not be used to contradict the user's later account-switch confirmation or diagnose current authorization.

A desktop viewport override was attempted, but its call did not complete. A later reset attempt also timed out before a success message. **Final viewport restoration is unconfirmed for this retry.** The tab-retention call followed that reset in the same timed-out operation and was not confirmed either. No new screenshot or responsive/keyboard pass was obtained. No input, entry submission, permission change, database query or application-code change occurred. Further sign-in repetition is not indicated by this evidence; working browser page control is the outstanding prerequisite.

### Browser control and viewport recovered

On the next recovery attempt, the documented viewport reset returned successfully and DOM inspection worked again. Opening the account menu in the retained journal tab independently identified Nadia Essomba, `accountant.rds-org001@stockflow.test`, Accountant. This fresh account-menu evidence explains why the full form was still unavailable in this specific session.

To make the authorized Super Admin account switch concrete, used the normal Sign out menu item in that tab. The page transitioned through Signing out to `/en/login`; the Email address control subsequently became enabled. No credentials were read or entered. The normal built-in panel viewport was measured at 231 × 414, the tab was made visible and retained for handoff. Saved [exact-session sign-in evidence](evidence/delivery-24-exact-session-sign-in.png). Requested that the user sign into the existing Super Admin test account on this exact page. This is a session switch, not a stored permission change.

The previous viewport-restoration uncertainty is resolved. Full-form responsive and keyboard acceptance remains pending the authorized sign-in; no journal was submitted and no business records or stored permissions were changed.

### Super Admin confirmed; subsequent page control stalled — 17 October 2026

After the user's sign-in handoff, the existing built-in tab at `/en/dashboard` was inspectable. Its account menu identified Amina Ngono, Super Admin, in Wilkinson - Feeney 001. This is fresh rendered role evidence and supersedes the earlier account-switch uncertainty; another sign-in is not indicated.

Opening `/en/dashboard/accounting/journals/new` timed out at browser navigation. Subsequent DOM inspection and screenshot capture timed out at the browser focus-emulation command. A clean temporary tab in the same browser reproduced navigation and inspection timeouts. These failures do not establish a journal-page application defect or authorization failure. No fresh full-form evidence or screenshot was obtained.

The documented viewport reset returned successfully. No temporary viewport sizes or form inputs were applied during this attempt. Desktop/tablet/phone full-form reflow, EN/FR lookup options, horizontal arrow scrolling, Tab/Shift+Tab order, native-select Escape and submit-button focus remain unverified. Existing Accountant denial checks remain separate evidence. No entry was submitted, stored permission changed, seed/migration run, or application source edited. Unit and database checks were not rerun for this browser-only attempt.

### Control-client recovery diagnostics — 17 October 2026

On the next continuation, the retained dashboard tab remained discoverable but DOM inspection timed out at focus emulation. Resetting the CUA client and binding the existing tab by its observed URL also timed out. Reinitialization restored browser inventory/capability access, but even the supported console-log read failed at the same focus-emulation step. The available browser capabilities were visibility and viewport; no debugger-repair capability was exposed. No browser profile, cache, extension setting or stored authorization was edited.

A read-only host diagnostic measured 23.86 GB total RAM and 2.05 GB free RAM. Resource pressure is a possible contributor, not an established cause. No process was stopped. Asked the user to manually open the existing journal URL in the same built-in panel and report form/loading/error, to distinguish interactive page behavior from the stalled automation connection. The previously confirmed Super Admin sign-in remains valid evidence; no repeat sign-in was requested. Full-form acceptance remains open, with no new rendered pass claimed.
