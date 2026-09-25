"use strict";
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), crypto = require("node:crypto");
const root = path.resolve(__dirname, "../../../../.."); process.chdir(root);
const helper = require(path.join(root, "scripts/modern-modules-local-verification.js"));
const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), helper.DATABASE_NAME); assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(target.hostname));
const fixture = JSON.parse(fs.readFileSync(path.join(root, "playwright/.auth/workflow-invitation-options.json"), "utf8")); assert.equal(fixture.database, helper.DATABASE_NAME);
const actor = fixture.actors.find(row => row.kind === "ready"); assert.ok(actor);
const { PrismaClient } = require("@prisma/client"), db = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [] });
const { chromium, expect } = require("@playwright/test");
const run = crypto.randomUUID().slice(0, 12), organizationId = "org_modules_legacy_en_desktop";
const sha = value => crypto.createHash("sha256").update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
const files = ["services/users/user-invitation-issuance.service.ts", "services/users/user-invitation-authority.service.ts", "services/users/user-invitation-delivery-contract.ts", "services/users/user-identity.service.ts", "services/users/invitation-input.ts", "actions/users/sendInvite.ts", "components/Forms/users/userInvitationForm.tsx", "messages/en.json", "messages/fr.json"];
files.push("services/users/invitation-revision.ts", "services/users/user-invitation-management.service.ts", "actions/users/cancelInvite.ts", "components/dashboard/Tables/Invites.tsx", "components/ui/dialog.tsx", "app/[locale]/(dashboard)/dashboard/settings/users/UsersPageClient.tsx", "app/[locale]/(dashboard)/dashboard/settings/users/page.tsx");
const sources = () => Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
const receipt = { run, database: helper.DATABASE_NAME, startedAt: new Date().toISOString(), sourcesBefore: sources(), checks: [], blockedOrigins: [], limitations: ["Actual authenticated application and queued PostgreSQL writes; no production transport is present and no email is sent.", "Response loss is simulated after the local server commits; the retry uses the real server action and its same request reference.", "Viewport and keyboard checks are not screen-reader, native zoom, contrast or accessibility certification."] };
const safe = error => String(error.message || error).replaceAll(fixture.password, "[password redacted]").replace(/token=[^\s&]+/gi, "token=[redacted]").slice(0, 900);
const authority = async () => sha({ orgs: await db.organization.findMany({ orderBy: { id: "asc" } }), users: (await db.user.findMany({ orderBy: { id: "asc" }, include: { roles: { orderBy: { id: "asc" } } } })).map(({ lastLogin, updatedAt, ...row }) => row), grants: await db.tenantModuleGrant.findMany({ orderBy: { id: "asc" } }) });
async function main() {
  const orgs = await db.organization.findMany({ select: { id: true, onboardingSource: true } }); assert.equal(orgs.length, 5); assert.ok(orgs.every(row => row.onboardingSource === helper.FIXTURE_SOURCE));
  assert.ok(await db.user.findFirst({ where: { id: actor.userId, organizationId } })); receipt.authorityBefore = await authority();
  const browser = await chromium.launch({ headless: true });
  try { for (const locale of ["en", "fr"]) {
    const copy = JSON.parse(fs.readFileSync(path.join(root, "messages", locale + ".json"), "utf8")).userInvitations;
    const result = { locale, passed: false, pageErrors: [], screenshots: [] }; receipt.checks.push(result);
    const context = await browser.newContext({ viewport: locale === "en" ? { width: 1440, height: 1000 } : { width: 390, height: 844 }, locale, reducedMotion: "reduce" });
    await context.route("**/*", async route => { const url = new URL(route.request().url()); if (["http:", "https:"].includes(url.protocol) && url.origin !== helper.BASE_URL) { receipt.blockedOrigins.push(url.origin); await route.abort(); } else await route.continue(); });
    const page = await context.newPage(); page.setDefaultTimeout(45000); page.on("pageerror", error => result.pageErrors.push(safe(error)));
    const shot = async stage => { const file = locale + "-invitation-management-" + stage + "-" + run + ".png"; await page.screenshot({ path: path.join(__dirname, file), animations: "disabled", mask: [page.locator('input[type="password"]')] }); result.screenshots.push(file); const active = page.getByRole("dialog"); if (stage !== "failure" && await active.count()) assert.ok(await active.evaluate(element => element.scrollWidth <= element.clientWidth + 1), "Dialog content must not overflow horizontally"); };
    try {
      const login = await context.request.post(helper.BASE_URL + "/api/auth/sign-in/email", { data: { email: actor.email, password: fixture.password }, headers: { Origin: helper.BASE_URL }, timeout: 120000 }); assert.equal(login.status(), 200);
      const session = await (await context.request.get(helper.BASE_URL + "/api/auth/get-session")).json();
      const initial = await db.session.findFirst({ where: { id: session.session.id, userId: actor.userId } }); assert.ok(initial); assert.equal(initial.assuranceLevel, 0);
      const start = Date.now(); await page.goto(helper.BASE_URL + "/" + locale + "/dashboard/settings/users", { waitUntil: "networkidle", timeout: 180000 }); result.routeMs = Date.now() - start;
      const trigger = page.getByRole("button", { name: copy.invite, exact: true }); await trigger.focus(); await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: copy.title, exact: true }); await expect(dialog.getByLabel(copy.email)).toBeFocused(); await expect(dialog.getByText(copy.deliveryPaused, { exact: true })).toBeVisible();
      const email = "queue.browser." + run + "." + locale + "@example.invalid";
      await dialog.getByLabel(copy.email).fill(email); await dialog.getByLabel(copy.role, { exact: true }).selectOption(actor.roleId);
      await dialog.getByRole("button", { name: copy.submit, exact: true }).click(); await expect(dialog.getByRole("alert")).toHaveText(copy.errors.fresh);
      await dialog.getByLabel(copy.password, { exact: true }).fill(fixture.password); await dialog.getByRole("button", { name: copy.confirmIdentity, exact: true }).click(); await expect(dialog.getByRole("status")).toHaveText(copy.verified);
      const fresh = await db.session.findUnique({ where: { id: initial.id } }); assert.equal(fresh.assuranceLevel, 1); assert.equal(fresh.assuranceOrganizationId, organizationId); assert.equal(fresh.assuranceMethod, "password");
      let responseDropped = false;
      if (locale === "fr") await page.route("**/dashboard/settings/users", async route => {
        if (!responseDropped && route.request().method() === "POST" && route.request().headers()["next-action"]) {
          const response = await route.fetch(); assert.equal(response.status(), 200);
          assert.ok(await db.invite.findUnique({ where: { email_organizationId: { email, organizationId } } }));
          responseDropped = true; await route.abort("connectionreset");
        } else await route.continue();
      });
      const submitAt = Date.now(); await dialog.getByRole("button", { name: copy.submit, exact: true }).click();
      if (locale === "fr") {
        await expect(dialog.getByRole("alert")).toHaveText(copy.errors.unknown); assert.equal(responseDropped, true); await expect(dialog.getByLabel(copy.email)).toHaveValue(email); await shot("response-lost");
        await dialog.getByRole("button", { name: copy.submit, exact: true }).click();
      }
      await expect(dialog.getByRole("status")).toContainText(copy.created); await expect(dialog.getByRole("status")).toBeFocused(); result.recordMs = Date.now() - submitAt;
      const invite = await db.invite.findUnique({ where: { email_organizationId: { email, organizationId } } }); assert.ok(invite);
      const events = await db.businessEvent.findMany({ where: { organizationId, eventType: "identity.user_invitation.issued.v1", sourceId: invite.id }, include: { outboxMessages: true } }); assert.equal(events.length, 1); assert.equal(events[0].outboxMessages.length, 1); assert.equal(events[0].outboxMessages[0].status, "PENDING"); assert.equal(events[0].outboxMessages[0].attempts, 0);
      assert.equal(await db.auditLog.count({ where: { organizationId, action: "INVITE_CREATED", entityId: invite.id } }), 1);
      assert.equal(await db.user.count({ where: { email } }), 0); assert.ok(!JSON.stringify(events).includes(invite.token));
      await shot("recorded");
      for (const width of [390, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); const box = await dialog.boundingBox(); assert.ok(box && box.x >= 0 && box.x + box.width <= width); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width); }
      await page.keyboard.press("Escape"); await expect(trigger).toBeFocused(); await page.getByRole("tab", { name: copy.listTab, exact: true }).click(); await page.getByLabel(copy.search, { exact: true }).fill(email); await expect(page.getByText(email, { exact: true })).toBeVisible(); await shot("register");
      await page.setViewportSize(locale === "fr" ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
      const row = page.locator('[id="invitation-' + invite.id + '"]');
      const replaceTrigger = row.getByRole("button", { name: copy.management.reissue.submit, exact: true });
      await replaceTrigger.click(); const replaceDialog = page.getByRole("dialog", { name: copy.management.reissue.title, exact: true });
      await expect(replaceDialog.getByLabel(copy.role, { exact: true })).toBeFocused();
      await replaceDialog.getByLabel(copy.management.reason).fill("Synthetic first review before concurrent change");
      const second = await context.newPage(); second.setDefaultTimeout(45000);
      await second.goto(helper.BASE_URL + "/" + locale + "/dashboard/settings/users", { waitUntil: "networkidle", timeout: 180000 });
      await second.getByRole("tab", { name: copy.listTab, exact: true }).click(); await second.getByLabel(copy.search, { exact: true }).fill(email);
      await second.locator('[id="invitation-' + invite.id + '"]').getByRole("button", { name: copy.management.reissue.submit, exact: true }).click();
      const secondDialog = second.getByRole("dialog", { name: copy.management.reissue.title, exact: true });
      await secondDialog.getByLabel(copy.management.reason).fill("Synthetic replacement in a second review tab");
      await secondDialog.getByRole("button", { name: copy.management.reissue.submit, exact: true }).click();
      await expect(secondDialog.getByRole("status")).toContainText(copy.management.reissue.created);
      await second.close();
      await replaceDialog.getByRole("button", { name: copy.management.reissue.submit, exact: true }).click();
      await expect(replaceDialog.getByRole("alert")).toHaveText(copy.errors.changed); await shot("stale-review");
      await replaceDialog.getByRole("button", { name: copy.management.reload, exact: true }).click();
      await page.waitForLoadState("networkidle"); await replaceTrigger.click();
      await replaceDialog.getByLabel(copy.management.reason).fill("Synthetic reviewed replacement after refresh");
      await replaceDialog.getByRole("button", { name: copy.management.reissue.submit, exact: true }).click();
      await expect(replaceDialog.getByRole("status")).toContainText(copy.management.reissue.created); await expect(replaceDialog.getByRole("status")).toBeFocused(); await shot("replacement-recorded");
      assert.equal(await db.invite.findUnique({ where: { token: invite.token } }), null);
      await replaceDialog.getByRole("button", { name: copy.close, exact: true }).last().click(); await expect(replaceTrigger).toBeFocused();
      await row.getByRole("button", { name: copy.management.cancel.submit, exact: true }).click();
      const cancelDialog = page.getByRole("dialog", { name: copy.management.cancel.title, exact: true });
      await expect(cancelDialog.getByLabel(copy.management.reason)).toBeFocused(); await cancelDialog.getByLabel(copy.management.reason).fill("Synthetic invitation no longer needed");
      await cancelDialog.getByRole("button", { name: copy.management.cancel.submit, exact: true }).click();
      await expect(cancelDialog.getByRole("status")).toContainText(copy.management.cancel.created); await expect(cancelDialog.getByRole("status")).toBeFocused(); await shot("cancelled");
      for (const width of [390, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); const box = await cancelDialog.boundingBox(); assert.ok(box && box.x >= 0 && box.x + box.width <= width); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width); }
      await cancelDialog.getByRole("button", { name: copy.close, exact: true }).last().click(); await expect(row).toBeFocused();
      await expect(row.getByRole("button", { name: copy.management.cancel.submit, exact: true })).toBeDisabled(); await expect(row.getByText(copy.status.CANCELLED, { exact: true })).toBeVisible();
      const final = await db.invite.findUnique({ where: { id: invite.id } }); assert.equal(final.status, "CANCELLED");
      const issued = await db.businessEvent.findMany({ where: { organizationId, eventType: "identity.user_invitation.issued.v1", sourceId: invite.id }, include: { outboxMessages: true } }); assert.equal(issued.length, 3);
      assert.ok(issued.every(event => event.outboxMessages.length === 1 && event.outboxMessages[0].status === "CANCELLED" && event.outboxMessages[0].attempts === 0));
      assert.equal(await db.auditLog.count({ where: { organizationId, action: "INVITE_CANCELLED", entityId: invite.id } }), 1);
      result.widths = [390, 768, 1440]; result.issuedRevisions = 3; result.cancelled = true; result.staleReviewRejected = true; result.noEmailAttempted = true; result.responseDroppedAfterCommit = responseDropped; result.passed = result.pageErrors.length === 0;
    } catch (error) { result.error = safe(error); await shot("failure").catch(() => {}); }
    finally { await context.close(); }
  } } finally { await browser.close(); }
  receipt.authorityAfter = await authority(); assert.equal(receipt.authorityBefore, receipt.authorityAfter); receipt.authorityUnchanged = true;
}
main().catch(error => { receipt.error = safe(error); }).finally(async () => {
  receipt.completedAt = new Date().toISOString(); receipt.sourcesAfter = sources(); receipt.sourceStable = sha(receipt.sourcesBefore) === sha(receipt.sourcesAfter); receipt.driverSha256 = sha(fs.readFileSync(__filename));
  receipt.passed = receipt.checks.filter(row => row.passed).length; receipt.failed = receipt.checks.filter(row => !row.passed).length + Number(Boolean(receipt.error));
  await db.$disconnect(); const output = "invitation-management-browser-" + run + ".json"; fs.writeFileSync(path.join(__dirname, output), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ output, passed: receipt.passed, failed: receipt.failed, sourceStable: receipt.sourceStable, authorityUnchanged: receipt.authorityUnchanged })); process.exitCode = receipt.failed ? 1 : 0;
});
