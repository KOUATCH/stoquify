# Local development authentication reference

## Environment

- Login URL: `http://localhost:3000/en/login`
- Database: `stoquify_replay_next_20260830`
- Tenant: `rds_org_001`
- Classification: isolated local development data; never use in production

## Accounts

| Role | Email |
| --- | --- |
| Super Admin | `super.admin.rds-org001@stockflow.test` |
| Admin | `admin.rds-org001@stockflow.test` |
| Accountant | `accountant.rds-org001@stockflow.test` |
| User | `user.rds-org001@stockflow.test` |

## Password handling

The shared development password is intentionally excluded from this report and its PDF because repository documentation may be committed or distributed.

The authorized local secret source is:

`./.seed-artifacts/seed-login-credentials.json`

This artifact is git-ignored and must remain local. Do not copy its plaintext passwords into source control, tickets, reports, screenshots, or production environments.
