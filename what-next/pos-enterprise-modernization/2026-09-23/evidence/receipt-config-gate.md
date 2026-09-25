# Public Receipt Token Config Gate

Generated: 2026-09-23T20:21:43.971Z
Mode: `fail`
Root: `E:\ohada saas\Focused projects\stoquify`

## Summary

- Status: `ready`
- Release secret enforcement: `off`
- Checks ready: 4/4
- Blockers: 0
- Warnings: 1
- Secret configured: no
- Secret value printed: no

## Checks

| Status | Check |
| --- | --- |
| ready | Public receipt token helper exists |
| ready | Token helper signs, expires, and compares safely |
| ready | Public receipt route requires a token before service access |
| ready | Public receipt service verifies token and registry before lookup |

## Blockers

No public receipt token configuration blockers detected.

## Warnings

- receipt_token_secret: Production public receipt token secret is not configured.

## Safety Notes

- This gate never prints secret values.
- Local development can run without a receipt token secret; production/release mode cannot.
- Public receipt URLs remain unsafe for launch unless token signing is configured in the release environment.
