# Close server-denial revalidation

The current-source rerun [`attempt-a8675761fb/RESULT.json`](attempt-a8675761fb/RESULT.json) passed on 2026-11-09 after the close workspace began recording server command/recovery `FORBIDDEN` and `AUTH_REQUIRED` responses in its existing read-denial latch. The private body and forms disappear immediately; a newer successful protected dashboard read can restore the workspace. Fresh-password, separation-of-duties and business-rule failures retain their distinct handling.

The real component/hooks rendered with explicitly mocked authentication/actions in English and French at widths 390 and 1440. All original eight cases described in [the earlier report](RENDERED_UI_REPORT.md) passed again, plus:

1. A draft command returning `FORBIDDEN` immediately hides the cached private workspace and its drafts without exposing the diagnostic. Removing the mock denial alone does not restore the body. Manual refresh through a newer successful read restores it.
2. A retained-file recovery returning `AUTH_REQUIRED` hides private data and offers the existing sign-in link.

These are 40 recorded cases across four locale/viewport combinations. Original retained downloads still match SHA-256 `f500b0192fdab24d7c889915e4cbcd0e7c3b4d53163eff889825de539b12d20e`. No page/console errors, external requests or horizontal overflow occurred. Both owned Edge and static server closed.

[`SOURCE_BINDING.json`](attempt-a8675761fb/SOURCE_BINDING.json), SHA-256 `7c683f8bd6e6e02ca002d931ea664e54d7dae3973122c70f20499ea7049057bb`, binds the changed component, imported source, fixture and generated assets. Source hashes were checked again at completion. Earlier attempts and their receipts were preserved.

- [English mobile denial](attempt-a8675761fb/en-server-denial-390.png)
- [English desktop denial](attempt-a8675761fb/en-server-denial-1440.png)
- [French mobile denial](attempt-a8675761fb/fr-server-denial-390.png)
- [French desktop denial](attempt-a8675761fb/fr-server-denial-1440.png)

The French mobile denial screenshot was visually inspected. Automated axe checks again recorded zero violations and an incomplete color-contrast assessment. These fixture observations do not establish full accessibility, real session/module revocation, authenticated application behavior, PostgreSQL safety or hosted deployment readiness. No application server, database or provider was started.
