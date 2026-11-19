# Pre-capture resolver failure finding

**A bounded source correction is required before candidate capture.** This is a source-derived control-flow finding; no new HTTP/database reproduction is claimed.

The previously admitted implementation uses the installed `getSessionFromCtx` helper. In Better Auth `dist/api/routes/session.mjs`, the helper invokes the raw session endpoint and catches every rejection into `null` (lines268–283). The raw endpoint itself propagates API errors and converts an unexpected adapter exception into an internal-server-error response (lines260–266).

The new Stoquify guard treats a null lookup for `/get-session` as a successful anonymous result and lets the ordinary endpoint continue. Therefore a transient first adapter error can skip the current active/lock check; a second successful lookup by the outer session handler can return an existing inactive or locked subject. No concurrent account-state change is necessary for this sequence. This is distinct from the separately documented transaction-ordering limits around concurrent revocation.

The exported raw `getSession()` endpoint is available from `better-auth/api`. Invoke it with the same isolated cloned context, forced GET, `asResponse:false`, `returnHeaders:true`, `returnStatus:false`, and forced cache/refresh bypass. Only a successfully returned null response may take the nullable anonymous path. Propagate resolver failures; do not catch them into null. Preserve appropriate native response headers and the current subject eligibility check. Avoid recursive `auth.api.getSession` invocation.

Required regression evidence: a rejected raw session lookup stops both optional get-session and protected operations before user lookup/continuation; successful native null remains anonymous-compatible; current eligible/ineligible account cases continue to work. Existing83-test result and prior admissions remain historical. Successor source/test hashes and unit evidence must replace them as candidate prerequisites. The full real-session/browser recipe remains pending and must bind the corrected source.
