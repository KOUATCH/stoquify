const fs = require("node:fs");
const path = require("node:path");
const before = fs.readFileSync(path.join(__dirname, "verify-isolated-build-final.cjs"), "utf8");
const after = before.replaceAll("modern-modules-build-run02-final.log", "modern-modules-build-run02-validated.log")
  .replaceAll("isolated-build-final", "isolated-build-validated")
  .replace("NEXTAUTH_URL: BASE_URL, NEXT_PUBLIC_BASE_URL: BASE_URL,", "NEXTAUTH_URL: BASE_URL, NEXT_PUBLIC_BASE_URL: BASE_URL, NEXT_PUBLIC_APP_URL: BASE_URL,");
if (!after.includes("NEXT_PUBLIC_APP_URL: BASE_URL")) throw new Error("Public local URL binding was not prepared");
fs.writeFileSync(path.join(__dirname, "verify-isolated-build-validated.cjs"), after, { flag: "wx" });
console.log("Prepared separately recorded build with the local public application URL.");
