"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { randomUUID, createHash } = require("node:crypto");
const ROOT = path.resolve(__dirname, "../../../../.."); process.chdir(ROOT);
const helper = require(path.join(ROOT, "scripts/modern-modules-local-verification.js"));
const { PrismaClient } = require("@prisma/client");
const { chromium, expect: baseExpect } = require("@playwright/test");
const expect = baseExpect.configure({ timeout: 30000 });
const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), helper.DATABASE_NAME);
assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname));
const db = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [] });
const attempt = randomUUID().slice(0, 8);
const files = ["components/auth/v2/VerifyV2Form.tsx", "components/auth/v2/AuthV2Shell.tsx", "services/users/user-identity.service.ts", "actions/users/verifyOtp.ts", "actions/users/resendVerificationCode.ts", "services/security/public-identity-abuse.service.ts", "app/[locale]/(auth)/verify/[userId]/page.tsx"];
const sha = value => createHash("sha256").update(value).digest("hex");
const sources = () => Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const receipt = { attempt, database: helper.DATABASE_NAME, startedAt: new Date().toISOString(), sourcesBefore: sources(), validAttemptsOnly: true, checks: [], boundary: "Only the two previously created, still unconsumed OTP identities. No resend, invalid-code replay, counter reset, token rotation, email or manufactured session." };
const secrets = new Set([target.toString()]);
function safe(error) { let value = String(error?.message ?? error); for (const secret of secrets) value = value.split(secret).join("[redacted]"); return value.slice(0, 1500); }
async function outcome(userId) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { isVerified: true, emailVerified: true, verificationToken: true, verificationTokenExpires: true } });
  return { isVerified: user.isVerified, emailVerified: user.emailVerified, tokenPresent: Boolean(user.verificationToken), tokenExpired: Boolean(user.verificationTokenExpires && user.verificationTokenExpires <= new Date()), successAuditCount: await db.auditLog.count({ where: { userId, action: "AUTH_EMAIL_VERIFIED" } }), sessionCount: await db.session.count({ where: { userId } }) };
}
(async () => {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, helper.DATABASE_NAME);
  const org = await db.organization.findUniqueOrThrow({ where: { id: "org_modules_legacy_en_desktop" } }); assert.equal(org.onboardingSource, helper.FIXTURE_SOURCE);
  const records = [];
  for (const locale of ["en", "fr"]) {
    const userId = `workflow_otp_20260905_48b21da20a_${locale}`;
    const row = await db.user.findUniqueOrThrow({ where: { id: userId } });
    assert.equal(row.organizationId, org.id); assert.equal(row.isVerified, false); assert.equal(row.emailVerified, false);
    assert.match(row.verificationToken ?? "", /^\d{6}$/); assert.ok(row.verificationTokenExpires && row.verificationTokenExpires > new Date(Date.now() + 120000), "Do not use an expired or nearly expired code; no rotation permitted");
    secrets.add(row.verificationToken); records.push({ locale, userId, code: row.verificationToken });
  }
  const browser = await chromium.launch({ headless: true });
  try {
    for (const { locale, userId, code } of records) {
      const item = { locale, userId, passed: false, before: await outcome(userId), requests: [], responses: [], errors: [], screenshots: [], reflow: [] }; receipt.checks.push(item);
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
      await context.route("**/*", async route => { const url = new URL(route.request().url()); if (["http:", "https:"].includes(url.protocol) && url.origin !== helper.BASE_URL) await route.abort(); else await route.continue(); });
      const page = await context.newPage(); page.setDefaultNavigationTimeout(120000);
      const url = `${helper.BASE_URL}/${locale}/verify/${userId}?email=mismatch.48b21da20a.${locale}%40otp-workflow.stockflow.test`;
      const responseTasks = [];
      page.on("pageerror", error => item.errors.push(safe(error)));
      page.on("request", request => {
        if (request.method() === "POST" && request.url() === url) {
          const body = request.postData() ?? "";
          item.requests.push({ at: new Date().toISOString(), suppliedStoredCode: body.includes(JSON.stringify(code)), suppliedCorrectUser: body.includes(userId) });
        }
      });
      page.on("response", response => {
        if (response.request().method() === "POST" && response.url() === url) responseTasks.push((async () => {
          const body = await response.text();
          item.responses.push({ transportStatus: response.status(), actionStatuses: [...body.matchAll(/"status"\s*:\s*(\d{3})/g)].map(match => Number(match[1])) });
        })().catch(error => item.responses.push({ error: safe(error) })));
      });
      async function capture(name) { const file = `${locale}-email-valid-${name}-${attempt}.png`; await page.screenshot({ path: path.join(__dirname, file), animations: "disabled" }); item.screenshots.push(file); }
      try {
        const codeLabel = locale === "fr" ? "Code de vérification" : "Verification code";
        const submitLabel = locale === "fr" ? "Vérifier et continuer" : "Verify and continue";
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const input = page.getByLabel(codeLabel, { exact: true }); await expect(input).toBeVisible();
        for (const width of [390, 320, 1440]) {
          await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
          await input.evaluate(element => element.scrollIntoView({ behavior: "instant", block: "center" })); await page.waitForTimeout(200);
          const size = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth })); item.reflow.push(size); assert.equal(size.documentWidth, size.viewport);
          if (width !== 320) await capture(`empty-${width}`);
        }
        const started = Date.now();
        await input.fill(code); await expect(input).toHaveValue(code); item.renderedValueMatchedStoredCode = true;
        await expect(page.getByRole("button", { name: submitLabel, exact: true })).toBeEnabled();
        await input.press("Tab"); await expect(page.getByRole("button", { name: submitLabel, exact: true })).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(`${helper.BASE_URL}/${locale}/login-v2?verified=true`, { timeout: 120000 });
        item.validRecoveryMs = Date.now() - started; item.after = await outcome(userId);
        assert.equal(item.after.isVerified, true); assert.equal(item.after.emailVerified, true); assert.equal(item.after.tokenPresent, false); assert.equal(item.after.successAuditCount, 1); assert.equal(item.after.sessionCount, 0);
        await capture("recovered-desktop"); await page.setViewportSize({ width: 390, height: 844 }); await capture("recovered-mobile");
        item.passed = item.errors.length === 0;
      } catch (error) { item.error = safe(error); item.after = await outcome(userId); /* Unknown form state may contain a live code: no failure screenshot. */ }
      finally { await Promise.allSettled(responseTasks); await context.close(); }
      if (item.requests.length > 1 || item.requests.some(request => !request.suppliedStoredCode || !request.suppliedCorrectUser)) { item.passed = false; item.requestMismatch = true; }
    }
  } finally { await browser.close(); receipt.browserContextsClosed = true; }
})().catch(error => { receipt.fatal = safe(error); }).finally(async () => {
  await db.$disconnect(); receipt.sourcesAfter = sources(); receipt.sourceStable = JSON.stringify(receipt.sourcesBefore) === JSON.stringify(receipt.sourcesAfter); receipt.driverSha256 = sha(fs.readFileSync(__filename)); receipt.completedAt = new Date().toISOString(); receipt.passed = receipt.checks.filter(item => item.passed).length; receipt.failed = receipt.checks.filter(item => !item.passed).length + Number(Boolean(receipt.fatal));
  const file = path.join(__dirname, `email-valid-recovery-${attempt}.json`); fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" }); console.log(JSON.stringify({ passed: receipt.passed, failed: receipt.failed, evidence: path.relative(ROOT, file) })); if (receipt.failed) process.exitCode = 1;
});
