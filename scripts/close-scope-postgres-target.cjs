const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const NAME = /^stoquify_local_close_scope_[0-9]{8}_[a-f0-9]{8}$/

function closeScopeTestTarget(env = process.env) {
  if (env.NODE_ENV === 'production' || !env.CLOSE_TEST_DATABASE_URL) throw new Error('An explicit disposable CLOSE_TEST_DATABASE_URL is required')
  const url = new URL(env.CLOSE_TEST_DATABASE_URL)
  const name = decodeURIComponent(url.pathname.slice(1))
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !LOCAL.has(url.hostname.toLowerCase()) || !NAME.test(name) ||
      url.searchParams.get('schema') !== 'public') throw new Error('Close tests require a uniquely named local database and schema=public')
  return { url, name }
}
module.exports = { closeScopeTestTarget }
