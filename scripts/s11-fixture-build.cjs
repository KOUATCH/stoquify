// Give the isolated fixture local copies of already-installed locked packages.
// This avoids tracing the shared repository/evidence tree or escaping the fixture.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
function configure(root, app) {
  const copied = new Set();
  function copyPackage(name, from, optional = false) {
    if (copied.has(name)) return;
    let packageFile;
    try { packageFile = require.resolve(name + '/package.json', { paths: [from] }); }
    catch {
      try {
        let directory = path.dirname(require.resolve(name, { paths: [from] }));
        while (directory !== path.dirname(directory)) {
          const candidate = path.join(directory, 'package.json');
          if (fs.existsSync(candidate) && JSON.parse(fs.readFileSync(candidate)).name === name) { packageFile = candidate; break; }
          directory = path.dirname(directory);
        }
      } catch { /* Optional packages for other platforms are not installed. */ }
    }
    if (!packageFile) { if (optional) return; throw new Error('Installed fixture dependency missing: ' + name); }
    const manifest = JSON.parse(fs.readFileSync(packageFile));
    copied.add(name);
    const directory = path.dirname(packageFile);
    fs.cpSync(directory, path.join(app, 'node_modules', name), { recursive: true, dereference: true });
    for (const dependency of Object.keys(manifest.dependencies || {})) copyPackage(dependency, directory);
    for (const dependency of Object.keys(manifest.optionalDependencies || {})) copyPackage(dependency, directory, true);
  }
  for (const name of ['next', 'react', 'react-dom']) copyPackage(name, root);
  fs.writeFileSync(path.join(app, 'next.config.js'), "module.exports={output:'standalone',outputFileTracingRoot:__dirname,experimental:{cpus:1},eslint:{ignoreDuringBuilds:true}};");
}
function compile(root, app, env) {
  const relative = path.relative(root, app);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Fixture must be under repository');
  return spawnSync(process.execPath, [path.join(app, 'node_modules/next/dist/bin/next'), 'build'], { cwd: app, env, encoding: 'utf8', timeout: 600000, maxBuffer: 10e6, windowsHide: true });
}
module.exports = { configure, compile };
