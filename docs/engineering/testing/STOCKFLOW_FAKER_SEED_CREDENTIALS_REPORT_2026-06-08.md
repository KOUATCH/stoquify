# StockFlow Faker Seed Credentials Report

Date: 2026-06-08

Seed file: `prisma/comprehensive-seed.ts`

Seed command: `npm run seed`

## Summary

The configured Prisma seed is Faker-backed and uses deterministic Faker seed `20260527`.

This report lists the seeded demo users, their login emails, and their plaintext development passwords. These credentials are for local development, demos, QA, and test data only. Do not use these passwords in production.

## Seed Repair Applied

The configured seed already generated comprehensive data with Faker, but its credential `Account` rows did not store the BetterAuth credential password hash.

The seed was repaired so every seeded user now has:

- A `User.password` Argon2id hash.
- A BetterAuth credential `Account` row with `providerId="credential"`.
- `Account.accountId` set to the seeded user id, matching BetterAuth's email/password account pattern.
- `Account.password` set to the same Argon2id hash expected by BetterAuth sign-in.

The seed also now prints all 50 seeded credentials at completion instead of only the 12 named demo credentials.

## Login Credentials

Use the email as the username when signing in.

| # | User ID | Name | Role | Username / Email | Password |
| ---: | --- | --- | --- | --- | --- |
| 1 | cmp_user_001 | Amina Ngono | Super Admin | `super.admin@stockflow.test` | `SuperAdmin@2026` |
| 2 | cmp_user_002 | Marc Dubois | Admin | `admin@stockflow.test` | `Admin@2026` |
| 3 | cmp_user_003 | Claire Mballa | Branch Manager | `branch.manager@stockflow.test` | `BranchManager@2026` |
| 4 | cmp_user_004 | Jean Talla | Inventory Manager | `inventory.manager@stockflow.test` | `InventoryManager@2026` |
| 5 | cmp_user_005 | Sophie Kamdem | Sales Manager | `sales.manager@stockflow.test` | `SalesManager@2026` |
| 6 | cmp_user_006 | Grace Etame | Cashier/POS User | `cashier@stockflow.test` | `Cashier@2026` |
| 7 | cmp_user_007 | Patrick Fouda | Purchaser | `purchaser@stockflow.test` | `Purchaser@2026` |
| 8 | cmp_user_008 | Nadia Essomba | Accountant | `accountant@stockflow.test` | `Accountant@2026` |
| 9 | cmp_user_009 | Luc Biya | HR Manager | `hr.manager@stockflow.test` | `HrManager@2026` |
| 10 | cmp_user_010 | Helene Mbarga | Auditor | `auditor@stockflow.test` | `Auditor@2026` |
| 11 | cmp_user_011 | Yann Njock | Read-only/User | `readonly@stockflow.test` | `ReadOnly@2026` |
| 12 | cmp_user_012 | Emma Fotso | User | `user@stockflow.test` | `User@2026` |
| 13 | cmp_user_013 | Amanda Cruickshank | Direct Integration Associate Demo Role 013 | `demo.user.013@stockflow.test` | `StockFlowSeed@2026` |
| 14 | cmp_user_014 | Edna Mitchell | Forward Security Specialist Demo Role 014 | `demo.user.014@stockflow.test` | `StockFlowSeed@2026` |
| 15 | cmp_user_015 | Flora Jacobi | Customer Markets Architect Demo Role 015 | `demo.user.015@stockflow.test` | `StockFlowSeed@2026` |
| 16 | cmp_user_016 | Lydia Waters | Legacy Usability Manager Demo Role 016 | `demo.user.016@stockflow.test` | `StockFlowSeed@2026` |
| 17 | cmp_user_017 | Jodi Treutel | Customer Identity Administrator Demo Role 017 | `demo.user.017@stockflow.test` | `StockFlowSeed@2026` |
| 18 | cmp_user_018 | Stuart Deckow | Dynamic Data Administrator Demo Role 018 | `demo.user.018@stockflow.test` | `StockFlowSeed@2026` |
| 19 | cmp_user_019 | Jerrell Dickens-Nikolaus | Investor Paradigm Coordinator Demo Role 019 | `demo.user.019@stockflow.test` | `StockFlowSeed@2026` |
| 20 | cmp_user_020 | Vance Kautzer | Senior Markets Executive Demo Role 020 | `demo.user.020@stockflow.test` | `StockFlowSeed@2026` |
| 21 | cmp_user_021 | Mindy Tromp | National Response Designer Demo Role 021 | `demo.user.021@stockflow.test` | `StockFlowSeed@2026` |
| 22 | cmp_user_022 | Pietro Jaskolski | Senior Marketing Designer Demo Role 022 | `demo.user.022@stockflow.test` | `StockFlowSeed@2026` |
| 23 | cmp_user_023 | Eddie Kuhic | Investor Quality Producer Demo Role 023 | `demo.user.023@stockflow.test` | `StockFlowSeed@2026` |
| 24 | cmp_user_024 | Adelia Towne-Strosin | Regional Group Designer Demo Role 024 | `demo.user.024@stockflow.test` | `StockFlowSeed@2026` |
| 25 | cmp_user_025 | Lena Jakubowski | Corporate Optimization Executive Demo Role 025 | `demo.user.025@stockflow.test` | `StockFlowSeed@2026` |
| 26 | cmp_user_026 | Graham Stroman | Customer Infrastructure Planner Demo Role 026 | `demo.user.026@stockflow.test` | `StockFlowSeed@2026` |
| 27 | cmp_user_027 | Rashad Torphy | Principal Brand Administrator Demo Role 027 | `demo.user.027@stockflow.test` | `StockFlowSeed@2026` |
| 28 | cmp_user_028 | Lilian Johnson | Principal Assurance Agent Demo Role 028 | `demo.user.028@stockflow.test` | `StockFlowSeed@2026` |
| 29 | cmp_user_029 | Christy Skiles | Legacy Accounts Engineer Demo Role 029 | `demo.user.029@stockflow.test` | `StockFlowSeed@2026` |
| 30 | cmp_user_030 | Mae Kunde | International Solutions Strategist Demo Role 030 | `demo.user.030@stockflow.test` | `StockFlowSeed@2026` |
| 31 | cmp_user_031 | Stacey Harvey | Global Web Strategist Demo Role 031 | `demo.user.031@stockflow.test` | `StockFlowSeed@2026` |
| 32 | cmp_user_032 | Sterling Blick | Product Creative Analyst Demo Role 032 | `demo.user.032@stockflow.test` | `StockFlowSeed@2026` |
| 33 | cmp_user_033 | Caroline Champlin | Human Operations Officer Demo Role 033 | `demo.user.033@stockflow.test` | `StockFlowSeed@2026` |
| 34 | cmp_user_034 | Steve Willms | Chief Security Officer Demo Role 034 | `demo.user.034@stockflow.test` | `StockFlowSeed@2026` |
| 35 | cmp_user_035 | Sophie Koelpin | Senior Applications Director Demo Role 035 | `demo.user.035@stockflow.test` | `StockFlowSeed@2026` |
| 36 | cmp_user_036 | Malika Cronin-Fisher | Lead Quality Developer Demo Role 036 | `demo.user.036@stockflow.test` | `StockFlowSeed@2026` |
| 37 | cmp_user_037 | Erick Dibbert | Future Assurance Specialist Demo Role 037 | `demo.user.037@stockflow.test` | `StockFlowSeed@2026` |
| 38 | cmp_user_038 | Vena Bailey | Internal Integration Technician Demo Role 038 | `demo.user.038@stockflow.test` | `StockFlowSeed@2026` |
| 39 | cmp_user_039 | Valentin Crist | Forward Integration Supervisor Demo Role 039 | `demo.user.039@stockflow.test` | `StockFlowSeed@2026` |
| 40 | cmp_user_040 | Gilberto Boehm | Product Paradigm Director Demo Role 040 | `demo.user.040@stockflow.test` | `StockFlowSeed@2026` |
| 41 | cmp_user_041 | Cesar Ortiz | Direct Intranet Strategist Demo Role 041 | `demo.user.041@stockflow.test` | `StockFlowSeed@2026` |
| 42 | cmp_user_042 | Melanie Yost | Corporate Solutions Manager Demo Role 042 | `demo.user.042@stockflow.test` | `StockFlowSeed@2026` |
| 43 | cmp_user_043 | Emely Berge | National Tactics Engineer Demo Role 043 | `demo.user.043@stockflow.test` | `StockFlowSeed@2026` |
| 44 | cmp_user_044 | Berenice Morissette | Global Security Associate Demo Role 044 | `demo.user.044@stockflow.test` | `StockFlowSeed@2026` |
| 45 | cmp_user_045 | Conor Howell | International Intranet Orchestrator Demo Role 045 | `demo.user.045@stockflow.test` | `StockFlowSeed@2026` |
| 46 | cmp_user_046 | Carleton Von | Corporate Functionality Representative Demo Role 046 | `demo.user.046@stockflow.test` | `StockFlowSeed@2026` |
| 47 | cmp_user_047 | Cecelia Gleichner | Human Division Developer Demo Role 047 | `demo.user.047@stockflow.test` | `StockFlowSeed@2026` |
| 48 | cmp_user_048 | Celestino Abernathy | Future Brand Architect Demo Role 048 | `demo.user.048@stockflow.test` | `StockFlowSeed@2026` |
| 49 | cmp_user_049 | Alton Cartwright | Internal Markets Specialist Demo Role 049 | `demo.user.049@stockflow.test` | `StockFlowSeed@2026` |
| 50 | cmp_user_050 | Adrianna Friesen | Senior Solutions Consultant Demo Role 050 | `demo.user.050@stockflow.test` | `StockFlowSeed@2026` |

## Verification Notes

- `npm run prisma:validate` passed.
- `npm run typecheck` passed for the application typecheck configuration.
- `npx tsc --noEmit --module CommonJS --moduleResolution node --target ES2020 --esModuleInterop --skipLibCheck prisma/comprehensive-seed.ts` passed for the configured seed file.
- The actual seed command was not run during this repair, because `npm run seed` mutates the configured database.
