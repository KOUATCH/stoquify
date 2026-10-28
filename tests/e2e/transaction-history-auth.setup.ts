import { expect, test, type APIRequestContext } from "@playwright/test"
import { dirname } from "node:path"
import { existsSync, mkdirSync, rmSync } from "node:fs"

const transactionHistoryAuthStatePath =
  process.env.PLAYWRIGHT_TRANSACTION_HISTORY_STORAGE_STATE ??
  "playwright/.auth/transaction-history.json"
const transactionHistoryOrganizationId =
  process.env.AQSTOQFLOW_TRANSACTION_HISTORY_E2E_ORG_ID ??
  "org_transaction_history_e2e_local"

const requiredPermissions = [
  "dashboard.read",
  "finance.read",
  "finance.payments.read",
  "finance.payables.read",
  "finance.receivables.read",
  "finance.cash-drawer.read",
  "payments.reconciliation.read",
  "pos.read",
  "OPERATE_POS",
  "purchasing.ap.invoice.view",
]

test.setTimeout(90_000)

async function createTransactionHistoryAuthState(input: {
  request: APIRequestContext
  email: string
  password: string
}) {
  if (existsSync(transactionHistoryAuthStatePath)) {
    rmSync(transactionHistoryAuthStatePath)
  }

  const response = await input.request.post("/api/auth/sign-in/email", {
    data: {
      email: input.email,
      password: input.password,
      rememberMe: true,
    },
  })

  const body = await response.text()
  expect(
    response.ok(),
    "Unable to create transaction-history Playwright auth state for " +
      input.email +
      ". Run npm run seed:e2e:transaction-history first. Response: " +
      body,
  ).toBe(true)

  const permissionsResponse = await input.request.get("/api/me/permissions")
  const permissionsBody = await permissionsResponse.text()
  expect(
    permissionsResponse.ok(),
    "Transaction-history auth state did not resolve to a fresh tenant RBAC context. Response: " +
      permissionsBody,
  ).toBe(true)

  const permissionsPayload = JSON.parse(permissionsBody) as {
    organizationId?: string
    permissions?: string[]
    roles?: Array<{ code?: string }>
  }
  expect(permissionsPayload.organizationId).toBe(transactionHistoryOrganizationId)

  for (const permission of requiredPermissions) {
    expect(
      permissionsPayload.permissions ?? [],
      "Transaction-history auth state is missing " +
        permission +
        ". Roles: " +
        JSON.stringify(permissionsPayload.roles ?? []),
    ).toContain(permission)
  }

  mkdirSync(dirname(transactionHistoryAuthStatePath), { recursive: true })
  await input.request.storageState({ path: transactionHistoryAuthStatePath })
}

test("creates a tenant-scoped transaction-history auth state", async ({
  request,
}) => {
  await createTransactionHistoryAuthState({
    request,
    email:
      process.env.AQSTOQFLOW_TRANSACTION_HISTORY_E2E_EMAIL ??
      "transaction.history@stockflow.test",
    password:
      process.env.AQSTOQFLOW_TRANSACTION_HISTORY_E2E_PASSWORD ??
      "TransactionHistory@2026",
  })
})
