module.exports = function(source) {
  const done = this.async();
  require('@swc/core').transform(source, {filename: this.resourcePath, jsc: {parser: {syntax: 'typescript', tsx: this.resourcePath.endsWith('.tsx')}, target: 'es2020', transform: {react: {runtime: 'automatic'}}}, module: {type: 'es6'}}).then(r=>done(null,r.code),done);
};
