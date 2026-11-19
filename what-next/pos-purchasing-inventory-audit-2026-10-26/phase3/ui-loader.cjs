module.exports = function(source) {
  return require('@swc/core').transformSync(source, { filename: this.resourcePath, jsc: { parser: { syntax: 'typescript', tsx: this.resourcePath.endsWith('tsx') }, target: 'es2020', transform: { react: { runtime: 'automatic' } } }, module: { type: 'es6' } }).code;
};
