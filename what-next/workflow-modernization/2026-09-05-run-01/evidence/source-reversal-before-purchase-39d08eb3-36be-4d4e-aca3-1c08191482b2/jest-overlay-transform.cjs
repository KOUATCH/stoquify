const fs = require('node:fs'), path = require('node:path');
exports.createTransformer = options => {
  const delegate = require(options.delegate).createTransformer(options.delegateOptions);
  const overlay = new Map(options.files.map(row => [path.resolve(row.path).replaceAll('\\', '/').toLowerCase(), row.candidate]));
  return { process(source, filename, jestOptions) {
    const candidate = overlay.get(path.resolve(filename).replaceAll('\\', '/').toLowerCase());
    return delegate.process(candidate ? fs.readFileSync(candidate, 'utf8') : source, filename, jestOptions);
  } };
};
