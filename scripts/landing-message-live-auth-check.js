#!/usr/bin/env node
// Uses only the repository's existing synthetic auth fixture. Never seeds users or prints credentials/tokens.
const fs = require('fs');
const path = require('path');
const { request } = require('@playwright/test');
const baseURL = process.env.LANDING_MESSAGE_BASE_URL || 'http://127.0.0.1:3010';
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) throw new Error('Local app server required.');
const report = { started: new Date().toISOString(), baseURL, method: 'APIRequestContext, matching tests/e2e/auth.setup.ts; existing synthetic fixture only', checks: [], limitations: ['Not a new-account or real email-delivery test.', 'No business records are created or modified. Authentication may create and revoke a session.'] };
const target = path.resolve('docs/landing-message/verification-2026-09-19/live-auth-results.json');
async function main() {
  const client = await request.newContext({ baseURL, timeout: 240000, extraHTTPHeaders: { Origin: baseURL } });
  let signedIn = false;
  try {
    const anonymous = await client.get('/api/auth/get-session');
    const anonymousBody = await anonymous.json();
    report.checks.push({ name: 'Anonymous session is absent', status: anonymous.ok() && !anonymousBody?.user ? 'PASS' : 'FAIL', httpStatus: anonymous.status() });
    const denied = await client.get('/api/me/permissions');
    report.checks.push({ name: 'Anonymous permission request is denied', status: [401, 403].includes(denied.status()) ? 'PASS' : 'FAIL', httpStatus: denied.status() });
    const login = await client.post('/api/auth/sign-in/email', { data: { email: process.env.AQSTOQFLOW_E2E_EMAIL || 'hr.manager@stockflow.test', password: process.env.AQSTOQFLOW_E2E_PASSWORD || 'HrManager@2026', rememberMe: true } });
    const failure = login.ok() ? null : await login.json().catch(() => null);
    const errorCode = typeof failure?.code === 'string' && /^[A-Z_]{1,80}$/.test(failure.code) ? failure.code : undefined;
    report.checks.push({ name: 'Existing synthetic fixture sign-in', status: login.ok() ? 'PASS' : 'BLOCKED', httpStatus: login.status(), errorCode, reason: login.ok() ? undefined : 'Fixture credentials, trusted-origin configuration or backend readiness did not allow sign-in; no seed or auth-policy changes were made.' });
    if (login.ok()) {
      signedIn = true;
      const session = await client.get('/api/auth/get-session');
      const body = await session.json();
      report.checks.push({ name: 'Authenticated session resolves', status: session.ok() && Boolean(body?.user) ? 'PASS' : 'FAIL', httpStatus: session.status() });
      const permissions = await client.get('/api/me/permissions');
      const authority = await permissions.json();
      report.checks.push({ name: 'Tenant-scoped permission context resolves', status: permissions.ok() && Boolean(authority.organizationId) && Array.isArray(authority.permissions) ? 'PASS' : 'FAIL', httpStatus: permissions.status() });
    }
  } catch (error) {
    report.checks.push({ name: 'Live auth availability', status: 'BLOCKED', reason: error.name === 'TimeoutError' || /timeout/i.test(error.message) ? 'Local endpoint timed out' : 'Local endpoint could not complete the check; response contents withheld to avoid identity/session disclosure.' });
  } finally {
    if (signedIn) {
      try {
        const logout = await client.post('/api/auth/sign-out');
        const session = await client.get('/api/auth/get-session');
        const body = await session.json();
        report.checks.push({ name: 'Sign-out removes current session', status: logout.ok() && !body?.user ? 'PASS' : 'FAIL', httpStatus: logout.status() });
      } catch { report.checks.push({ name: 'Sign-out cleanup', status: 'FAIL', reason: 'The synthetic session could not be confirmed revoked.' }); }
    }
    await client.dispose();
    report.finished = new Date().toISOString();
    fs.writeFileSync(target, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (report.checks.some(check => check.status !== 'PASS')) process.exitCode = 1;
  }
}
main().catch(() => { console.error('Live auth probe could not start.'); process.exitCode = 1; });
