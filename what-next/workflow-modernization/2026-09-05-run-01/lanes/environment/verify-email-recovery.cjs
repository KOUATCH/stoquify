"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { randomUUID, randomInt, createHash } = require("node:crypto");
const ROOT = path.resolve(__dirname, "../../../../..");
process.chdir(ROOT);
const helper = require(path.join(ROOT, "scripts/modern-modules-local-verification.js"));
const { PrismaClient } = require("@prisma/client");
const { chromium, expect: baseExpect } = require("@playwright/test");
const expect = baseExpect.configure({ timeout: 30000 });
const target = helper.targetUrl();
assert.equal(target.pathname.slice(1), helper.DATABASE_NAME);
assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname));
assert.notEqual(process.env.NODE_ENV, "production");
const db = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [] });
const organizationId = "org_modules_legacy_en_desktop";
const prefix = "workflow_otp_20260905_";
const attempt = randomUUID().replaceAll("-", "").slice(0, 10);
const sourcePaths = ["services/users/user-identity.service.ts", "actions/users/verifyOtp.ts", "actions/users/resendVerificationCode.ts", "components/auth/v2/VerifyV2Form.tsx", "services/security/public-identity-abuse.service.ts", "app/[locale]/(auth)/verify/[userId]/page.tsx"];
const sha = value => createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const sources = () => Object.fromEntries(sourcePaths.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const receipt = { attempt, database: helper.DATABASE_NAME, organizationId, startedAt: new Date().toISOString(), sourcesBefore: sources(), checks: [], blockedBrowserOrigins: [], providerBoundary: "Resend submitted only with mismatched email. Real service predicate must return before rotation/mail; no provider key, transport stub or delivery claim." };
const secrets = new Set([target.toString()]);
function safe(error) { let value = String(error?.message ?? error); for (const secret of secrets) value = value.split(secret).join("[redacted]"); return value.split("Failing row contains")[0].slice(0, 1500); }
async function originalState() {
  return {
    users: await db.user.findMany({ where: { id: { not: { startsWith: prefix } } }, orderBy: { id: "asc" }, include: { roles: { orderBy: { id: "asc" } }, accounts: { orderBy: { id: "asc" } } } }),
    organizations: await db.organization.findMany({ orderBy: { id: "asc" } }),
    configuration: await db.tenantModuleConfiguration.findMany({ orderBy: { organizationId: "asc" } }),
    grants: await db.tenantModuleGrant.findMany({ orderBy: { id: "asc" } }),
  };
}
let originalHash;
async function main() {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, helper.DATABASE_NAME);
  const organizations = await db.organization.findMany({ select: { id: true, onboardingSource: true } });
  assert.equal(organizations.length, helper.FIXTURES.length);
  assert.ok(organizations.every(row => row.onboardingSource === helper.FIXTURE_SOURCE && helper.FIXTURES.some(fixture => fixture.organizationId === row.id)));
  const migrationRows = await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  assert.ok(helper.REQUIRED_MIGRATIONS.every(name => migrationRows.some(row => row.migration_name === name)));
  originalHash = sha(await originalState());
  const browser = await chromium.launch({ headless: true });
  try {
    for (const locale of ["en", "fr"]) {
      const userId = `${prefix}${attempt}_${locale}`;
      const email = `${attempt}.${locale}@otp-workflow.stockflow.test`;
      const mismatch = `mismatch.${attempt}.${locale}@otp-workflow.stockflow.test`;
      const code = String(randomInt(100000, 999999)); secrets.add(code);
      await db.user.create({ data: { id: userId, organizationId, email, name: "Synthetic email verification", isVerified: false, emailVerified: false, isActive: true, mfaBackupCodes: [], verificationToken: code, verificationTokenExpires: new Date(Date.now() + 30 * 60000) } });
      const before = await db.user.findUniqueOrThrow({ where: { id: userId } });
      const t = locale === "fr" ? { title: "Saisissez le code à 6 chiffres.", code: "Code de vérification", email: "Email d’inscription", resend: "Demander un code de vérification", received: "Demande reçue.", disclosure: "L’envoi n’est pas confirmé", submit: "Vérifier et continuer", invalid: "Code invalide ou expiré", verified: "Email vérifié" } : { title: "Enter the 6-digit code.", code: "Verification code", email: "Registration email", resend: "Request verification code", received: "Request received.", disclosure: "This does not confirm delivery", submit: "Verify and continue", invalid: "Invalid or expired code", verified: "Email verified" };
      const context = await browser.newContext({ viewport: locale === "fr" ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, reducedMotion: "reduce" });
      await context.route("**/*", async route => { const url = new URL(route.request().url()); if (["http:", "https:"].includes(url.protocol) && url.origin !== helper.BASE_URL) { receipt.blockedBrowserOrigins.push(url.origin); await route.abort(); } else await route.continue(); });
      const page = await context.newPage(); page.setDefaultNavigationTimeout(120000); page.setDefaultTimeout(30000);
      const item = { locale, userId, passed: false, errors: [], screenshots: [] }; receipt.checks.push(item);
      page.on("pageerror", error => item.errors.push(safe(error)));
      async function capture(name, locator) { if (locator) { await locator.evaluate(element => element.scrollIntoView({ behavior: "instant", block: "center" })); await page.waitForTimeout(150); } const file = `${locale}-email-recovery-${name}-${attempt}.png`; await page.screenshot({ path: path.join(__dirname, file), animations: "disabled" }); item.screenshots.push(file); }
      try {
        const started = Date.now();
        await page.goto(`${helper.BASE_URL}/${locale}/verify/${userId}?email=${encodeURIComponent(mismatch)}`, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: t.title, exact: true })).toBeVisible();
        await expect(page.getByLabel(t.email, { exact: true })).toHaveValue(mismatch);
        const otpInput = page.getByLabel(t.code, { exact: true });
        await expect(otpInput).toHaveAttribute("maxlength", "6");
        await expect(page.getByRole("button", { name: t.submit, exact: true })).toBeDisabled();
        // Real controlled-state transition proves hydration before a native form click.
        await otpInput.fill(code === "123456" ? "654321" : "123456");
        await expect(page.getByRole("button", { name: t.submit, exact: true })).toBeEnabled();
        await otpInput.fill("");
        await expect(page.getByRole("button", { name: t.submit, exact: true })).toBeDisabled();
        await page.getByRole("button", { name: t.resend, exact: true }).click();
        const status = page.getByRole("status").filter({ hasText: t.received });
        await expect(status).toBeVisible(); await expect(status).toContainText(t.disclosure);
        assert.ok(sha(await db.user.findUniqueOrThrow({ where: { id: userId } })) === sha(before), "Mismatched resend must not rotate token or update identity");
        assert.equal(await db.auditLog.count({ where: { organizationId, userId, action: "AUTH_EMAIL_VERIFICATION_SENT" } }), 0);
        item.usefulResendMs = Date.now() - started;
        await capture("resend-unconfirmed", status);
        const invalid = code === "123456" ? "654321" : "123456";
        await otpInput.fill(invalid); await otpInput.press("Tab");
        await expect(page.getByRole("button", { name: t.submit, exact: true })).toBeFocused();
        await page.keyboard.press("Enter");
        const alert = page.getByRole("alert").filter({ hasText: t.invalid }); await expect(alert).toBeVisible();
        await expect(otpInput).toHaveValue(invalid);
        assert.ok(sha(await db.user.findUniqueOrThrow({ where: { id: userId } })) === sha(before), "Wrong OTP must preserve identity and original code");
        await capture("invalid-code", alert);
        await page.setViewportSize(locale === "fr" ? { width: 1440, height: 1000 } : { width: 390, height: 844 });
        await capture("invalid-alternate-width", alert);
        item.overflow = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth })); assert.equal(item.overflow.viewport, item.overflow.content);
        await otpInput.fill(code); await otpInput.press("Tab"); await page.keyboard.press("Enter");
        await expect(page).toHaveURL(`${helper.BASE_URL}/${locale}/login-v2?verified=true`);
        const after = await db.user.findUniqueOrThrow({ where: { id: userId } });
        assert.equal(after.emailVerified, true); assert.equal(after.isVerified, true); assert.equal(after.verificationToken, null); assert.equal(after.verificationTokenExpires, null);
        assert.equal(await db.auditLog.count({ where: { organizationId, userId, action: "AUTH_EMAIL_VERIFIED" } }), 1);
        assert.equal(await db.session.count({ where: { userId } }), 0);
        await capture("recovered-sign-in");
        item.resendTokenPreserved = true; item.invalidTokenPreserved = true; item.recoveredWithRealCode = true; item.noSessionManufactured = true; item.successAuditCount = 1; item.passed = item.errors.length === 0;
      } catch (error) { item.error = safe(error); /* Never screenshot an unknown state that may contain a live code. */ }
      finally { await context.close(); }
    }
  } finally { await browser.close(); receipt.browserContextsClosed = true; }
}
main().catch(error => { receipt.fatal = safe(error); }).finally(async () => {
  if (originalHash) { receipt.originalStateHash = originalHash; receipt.originalUsersRolesOrganizationConfigurationUnchanged = sha(await originalState()) === originalHash; }
  await db.$disconnect(); receipt.sourcesAfter = sources(); receipt.sourceStable = JSON.stringify(receipt.sourcesBefore) === JSON.stringify(receipt.sourcesAfter); receipt.driverSha256 = sha(fs.readFileSync(__filename)); receipt.completedAt = new Date().toISOString();
  receipt.passed = receipt.checks.filter(item => item.passed).length; receipt.failed = receipt.checks.filter(item => !item.passed).length + Number(Boolean(receipt.fatal));
  const output = path.join(__dirname, `email-recovery-${attempt}.json`); fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" }); console.log(JSON.stringify({ passed: receipt.passed, failed: receipt.failed, evidence: path.relative(ROOT, output) })); if (receipt.failed) process.exitCode = 1;
});
