"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "../../../..");
const load = createRequire(path.join(root, "package.json"));
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

async function main() {
  const nativeReact = load("react"), nativeServer = load("react-dom/server");
  const nextReact = load("next/dist/compiled/react"), nextServer = load("next/dist/compiled/react-dom/server.edge");
  const authEntry = load.resolve("better-auth/react"), authLoad = createRequire(authEntry);
  const previousFetch = globalThis.fetch;
  let attemptedNetworkCalls = 0;
  globalThis.fetch = async () => { attemptedNetworkCalls++; throw new Error("Network disabled for renderer diagnosis"); };
  const cases = {};
  try {
    const { createAuthClient } = await import(pathToFileURL(authEntry).href);
    const client = createAuthClient({ baseURL: "http://127.0.0.1:3107", basePath: "/api/auth" });
    for (const [label, React, Server] of [["nativeRenderer", nativeReact, nativeServer], ["nextRendererWithExternalAuth", nextReact, nextServer]]) {
      function Probe() { const session = client.useSession(); return React.createElement("span", null, session.isPending ? "pending" : "settled"); }
      try { cases[label] = { html: Server.renderToString(React.createElement(Probe)), error: null }; }
      catch (error) { cases[label] = { error: error.message, stack: error.stack.split("\n").slice(0, 10) }; }
    }
  } finally { globalThis.fetch = previousFetch; }
  const bundlePath = ".next-modern-modules-integration/server/app/[locale]/(dashboard)/dashboard/inventory/transfers/page.js";
  const bundleExists = fs.existsSync(path.join(root, bundlePath));
  const bundle = bundleExists ? fs.readFileSync(path.join(root, bundlePath), "utf8") : "";
  const marker = '*** external "better-auth/react" ***', at = bundle.indexOf(marker);
  const config = fs.readFileSync(path.join(root, "next.config.mjs"), "utf8");
  const eol = config.includes("\r\n") ? "\r\n" : "\n";
  const reconstructedBefore = config.replace(`    'argon2',${eol}`, `    'argon2',${eol}    'better-auth',${eol}`);
  const report = {
    observedAt: new Date().toISOString(), classification: "READ_ONLY_EXTERNAL_REACT_REPRODUCTION",
    attemptedNetworkCalls, databaseMutations: false, sessionMutations: false,
    versions: { nativeReact: nativeReact.version, nextCompiledReact: nextReact.version, betterAuth: JSON.parse(fs.readFileSync(path.resolve(path.dirname(authEntry), "../../../package.json"))).version, next: load("next/package.json").version },
    resolution: { nativeReact: fs.realpathSync(load.resolve("react")), betterAuthReact: fs.realpathSync(authLoad.resolve("react")), sameNativeResolution: load.resolve("react") === authLoad.resolve("react"), nativeEqualsNextInstance: nativeReact === nextReact },
    cases,
    bundleAtProbe: { path: bundlePath, exists: bundleExists, sha256: bundleExists ? hash(path.join(root, bundlePath)) : null, externalClient: bundleExists ? at >= 0 : null, externalSnippet: at >= 0 ? bundle.slice(at, at + 260) : null, nextVendoredSsrReact: bundleExists ? bundle.includes("vendored/ssr/react.js") : null },
    priorBundleObservation: { externalClient: true, externalImplementation: 'module.exports = import("better-auth/react");', otherReactImports: "Next vendored/ssr/react.js", provenance: "Read directly from the generated transfer page before configuration edit; automatic Next restart subsequently removed the old bundle. Its file hash was not retained." },
    configuration: { path: "next.config.mjs", afterSha256: hash(path.join(root, "next.config.mjs")), beforeSha256: crypto.createHash("sha256").update(reconstructedBefore).digest("hex"), beforeHashMethod: "Reverse the exact authorized one-line deletion; source hash was not recorded before applying it.", correction: "Remove only better-auth from serverExternalPackages; retain native/server adapters." },
    expectedMismatchReproduced: cases.nativeRenderer.error === null && cases.nextRendererWithExternalAuth.error?.includes("useRef") && attemptedNetworkCalls === 0,
    scope: "This deliberately external Node import reproduces the former renderer mismatch; it is not a test of the corrected application bundle.",
  };
  fs.writeFileSync(path.join(__dirname, "auth-react-ssr-probe.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
  if (!report.expectedMismatchReproduced) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
