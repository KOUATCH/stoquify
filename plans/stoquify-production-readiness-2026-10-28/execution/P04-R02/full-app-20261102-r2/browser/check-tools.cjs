// Read-only executable discovery in the same native environment as the runtime runner.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const executable=chromium.executablePath();
const report={at:new Date().toISOString(),node:process.execPath,playwrightVersion:require('playwright/package.json').version,chromiumExecutable:executable,chromiumExists:fs.existsSync(executable),opensslExists:fs.existsSync('C:/Program Files/Git/usr/bin/openssl.exe'),browserLaunched:false};
fs.writeFileSync(path.join(__dirname,'tool-readiness-native.json'),JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify(report));
