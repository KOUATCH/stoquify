// Independent initial source review: file reads and own receipt only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../../../..'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const files=['lib/auth.ts','app/api/auth/[...all]/route.ts','lib/security/auth-session.ts','lib/security/rbac.ts','lib/security/__tests__/auth-deactivation.test.ts','lib/security/__tests__/auth-session.test.ts','lib/security/__tests__/rbac.test.ts','node_modules/better-auth/dist/api/routes/session.mjs','node_modules/better-auth/dist/api/to-auth-endpoints.mjs','node_modules/better-auth/dist/api/routes/account.mjs','node_modules/better-auth/dist/api/routes/update-user.mjs','node_modules/better-auth/dist/api/routes/password.mjs'];
const report={at:new Date().toISOString(),reviewer:'/root/v02_review',scope:'P04-R06 independent pre-repair inspection; no product edits or runtime execution',source:files.map(file=>({path:file,sha256:hash(fs.readFileSync(path.join(root,file)))})),observations:[
 'lib/auth.ts enables five-minute cookieCache; before-hook only checks email credential sign-in. Core catch-all delegates GET and all POST except reviewed update-user.',
 'Application requireSession and RBAC already request disableCookieCache:true. requireSession mirrors exact session id/token/user/expiry; RBAC then checks active user, active tenant, lock state, verified email and tenant-scoped roles. These contracts must remain intact.',
 'Core own-account operations must not silently inherit all RBAC tenant/role admission requirements. Current account eligibility can be checked without requiring an active tenant.',
 'Existing active/lock semantics deny inactive accounts and permanent or future locks; elapsed temporary locks are eligible. Protected read admission should not unlock accounts or reset counters as a side effect.',
 'Installed getSessionFromCtx is exported and invokes the raw getSession endpoint, not outer before/after hooks. It returns existing context.session early and merges caller ctx.query after config; an implementation using it must force server-owned context/query values rather than assume config wins.',
 'Installed getSession may delete an expired session and ordinarily refresh valid sessions; disableRefresh:true avoids admission-driven renewal, while expired cleanup needs exact bookkeeping classification.',
 'Disabling cookieCache prevents existing signed caches from being accepted, but runtime regression still needs actual pre-repair signed-cookie continuity; omitting the old cache precondition is not evidence.'
],recommendedBoundary:[
 'Use a supported application-owned configuration/hook or equivalent reviewed boundary; no untracked installed dependency patch.',
 'Explicitly map protected operations and preserve public authentication/recovery/callback/logout behavior. Inspect actual dispatch and internal API calls; do not infer HTTP absence from metadata.scope.',
 'Before protected handlers, require current session/account authority. Preserve identity binding, query-negative behavior, custom profile guard and legitimate own-account operations.',
 'If cookie cache is disabled, separately prove old signed-cache rejection and normal post-repair sign-in/session/account operation positives.'
],requiredRegressionEvidence:[
 'Actual old signed cache replay for revoked and database-expired sessions on the refreshed artifact: get-session/list-sessions/list-accounts and unlink-account; no private fields or account changes.',
 'Current inactive, permanent-lock, future-lock and elapsed-lock controls; legitimate independent actor works. Denied changes preserve accounts/business and classify only exact allowed session/security effects.',
 'Caller disableCookieCache/disableRefresh variants, malformed or forged IDs, same-actor independent sibling and cross-actor session ownership controls.',
 'Public sign-in/recovery method/origin continuity and reviewed update-user profile continuity, including independent authorized profile/account mutation.',
 'Browser actual consumer and full-app provider continuity scoped to changed current-authority contract; R07/R08 findings remain separate and must not be incidentally repaired.',
 'Fresh isolated build/source/artifact binding, native before/after records, exact owned cleanup, independent review and bounded work-register publication.'
],implementationAuthorization:'New user request authorizes bounded P04-R06 repair; reviewer owns only this independent-review directory.',readiness:'Parent P04 and production remain blocked; no commit/push/production flags/data migration/deployment.'};
fs.writeFileSync(path.join(__dirname,'INITIAL-SOURCE-REVIEW.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({files:files.length,scope:report.scope}));
