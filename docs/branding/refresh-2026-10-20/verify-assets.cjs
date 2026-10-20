// Isolated source/vector/React-render checks. No application bootstrap or DB.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const crypto = require("node:crypto");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { Path2D } = require("@napi-rs/canvas");
const root = path.resolve(__dirname, "../../..");

function loadSource(relative) {
  const filename = path.join(root, relative);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const loaded = new Module(filename, module);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = loaded.require.bind(loaded);
  loaded.require = request => {
    if (request === "@/lib/utils") return loadSource("lib/utils.ts");
    if (request === "./stoquify-logo-artwork") return loadSource("components/global/stoquify-logo-artwork.ts");
    return nativeRequire(request);
  };
  loaded._compile(output.outputText, filename);
  return loaded.exports;
}

const art = loadSource("components/global/stoquify-logo-artwork.ts");
const Logo = loadSource("components/global/kit-logo.tsx").default;
const bounds = new Path2D(art.STOQUIFY_MARK_PATH).getBounds();
assert(bounds[0] >= 0 && bounds[1] >= 0 && bounds[2] <= 70 && bounds[3] <= 70, "Symbol must fit its viewBox");
const wordBounds = new Path2D(art.STOQUIFY_WORDMARK_PATH).getBounds();
assert(wordBounds[0] >= 0 && wordBounds[1] >= 0 && wordBounds[2] <= 260 && wordBounds[3] <= 65, "Wordmark must fit its viewBox");
for (const face of art.STOQUIFY_MARK_FACES) {
  const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
  assert(css.includes(`${face.token}: ${face.fallback}`), "Artwork color must match the implemented brand token");
}
const renders = [];
for (const theme of ["light", "dark"]) {
  for (const height of [16, 24, 32, 48]) {
    const markup = renderToStaticMarkup(React.createElement(Logo, { theme, height, compact: true }));
    assert(markup.includes('role="img" aria-label="Stoquify"'));
    assert(markup.includes(`width="${Math.min(height, 46)}"`));
    assert(!markup.includes("<text"));
    assert.equal((markup.match(/<path /g) || []).length, height < 32 ? 1 : 3);
    renders.push({ theme, height, compact: true, passed: true });
  }
  for (const tagline of ["OHADA operating OS", "Système opérationnel OHADA", ""]) {
    const markup = renderToStaticMarkup(React.createElement(Logo, { theme, width: 180, height: 48, tagline }));
    assert(markup.includes('role="img" aria-label="Stoquify"'));
    assert(markup.includes('viewBox="0 0 260 65"'));
    assert(!markup.includes("<text") && !markup.includes("<image"));
    if (tagline) assert(markup.includes(tagline));
    renders.push({ theme, tagline, passed: true });
  }
}
const configFile = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
const program = ts.createProgram(
  ["components/global/kit-logo.tsx", "components/global/stoquify-logo-artwork.ts"].map(file => path.join(root, file)),
  { ...config.options, incremental: false, noEmit: true, skipLibCheck: true }
);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: file => file, getCurrentDirectory: () => root, getNewLine: () => "\n",
  }));
}
assert.equal(diagnostics.length, 0, "Focused TypeScript check");
const assetDirectory = path.join(root, "public/brand");
const assets = fs.readdirSync(assetDirectory).filter(file => file.startsWith("stoquify-") || file === "apple-touch-icon.png").map(file => {
  const buffer = fs.readFileSync(path.join(assetDirectory, file));
  if (file.endsWith(".svg")) {
    const source = buffer.toString();
    assert(!source.includes("<text") && !source.includes("<image") && !source.includes("<script"));
  }
  return { file: `public/brand/${file}`, bytes: buffer.length, sha256: crypto.createHash("sha256").update(buffer).digest("hex") };
});
const result = { checkedAt: new Date().toISOString(), evidenceClass: "source, vector bounds, isolated React server rendering; no browser or database", typecheck: "passed", bounds, wordBounds, renders, assets };
fs.writeFileSync(path.join(__dirname, "verification.json"), JSON.stringify(result, null, 2) + "\n");
console.log(`PASS: focused TypeScript, ${renders.length} React render cases, vector bounds and ${assets.length} asset checks.`);
