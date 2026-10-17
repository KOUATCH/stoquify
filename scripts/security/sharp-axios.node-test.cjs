const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const { createRequire } = require('node:module')
const path = require('node:path')

// Run from the isolated checkout. No application imports, dotenv or providers.
const load = createRequire(path.join(process.cwd(), 'package.json'))
const sharp = load('sharp')
const axios = load('axios')
const { optimizeImage, imageOptimizer } = load('next/dist/server/image-optimizer')
let server, baseURL
before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/slow') return // client timeout/cancellation closes this socket
    if (req.url === '/large') return res.end('x'.repeat(1024))
    if (req.url === '/redirect') {
      res.writeHead(302, { Location: '/echo' }); return res.end()
    }
    if (req.url === '/loop') {
      res.writeHead(302, { Location: '/loop' }); return res.end()
    }
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ method: req.method, url: req.url, body, fixture: req.headers['x-fixture'] }))
    })
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  baseURL = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
})

test('patched packages and the native Sharp binding load', () => {
  assert.equal(sharp.versions.sharp, '0.35.5')
  assert.equal(axios.VERSION, '1.20.0')
  assert.ok(sharp.versions.vips)
  console.log('Native Sharp versions:', JSON.stringify(sharp.versions))
})

for (const format of ['png', 'jpeg', 'webp', 'avif']) {
  test(`Sharp decodes and resizes a bounded synthetic ${format}`, async () => {
    const input = await sharp({ create: { width: 8, height: 6, channels: 3, background: '#236789' } })
      .toFormat(format).toBuffer()
    const output = await sharp(input, { limitInputPixels: 100 }).resize(4, 3).toFormat(format).toBuffer()
    const metadata = await sharp(output).metadata()
    assert.equal(metadata.width, 4)
    assert.equal(metadata.height, 3)
  })
}
test('Sharp rejects malformed images and enforces pixel limits', async () => {
  await assert.rejects(sharp(Buffer.from('not an image')).resize(2).toBuffer())
  const input = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } }).png().toBuffer()
  await assert.rejects(sharp(input, { limitInputPixels: 50 }).resize(2).toBuffer(), /pixel limit/i)
})
test('Next image optimizer loads the upgraded native dependency without app startup', async () => {
  const input = await sharp({ create: { width: 8, height: 6, channels: 3, background: '#236789' } }).png().toBuffer()
  const output = await optimizeImage({ buffer: input, contentType: 'image/webp', quality: 75, width: 4, limitInputPixels: 100, timeoutInSeconds: 5 })
  const metadata = await sharp(output).metadata()
  assert.equal(metadata.format, 'webp')
  assert.equal(metadata.width, 4)
})
test('Next optimizer rejects SVG when its explicit SVG option is disabled', async () => {
  const buffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2"/></svg>')
  await assert.rejects(imageOptimizer(
    { buffer, etag: 'synthetic-svg', cacheControl: null },
    { href: '/synthetic.svg', quality: 75, width: 2, mimeType: 'image/webp' },
    { images: { minimumCacheTTL: 60, dangerouslyAllowSVG: false } },
    { silent: true },
  ), error => error.statusCode === 400 && /image type is not allowed/.test(error.message))
})
test('Axios sends ordinary JSON and preserves explicit request headers', async () => {
  const result = await axios.post(baseURL + '/echo', { fixture: true }, { proxy: false, headers: { 'X-Fixture': 'expected' }, timeout: 2000 })
  assert.equal(result.data.method, 'POST')
  assert.equal(result.data.fixture, 'expected')
  assert.deepEqual(JSON.parse(result.data.body), { fixture: true })
})
test('Axios times out a nonresponding loopback endpoint', async () => {
  await assert.rejects(axios.get(baseURL + '/slow', { proxy: false, timeout: 100 }), error => error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
})
test('Axios aborts an in-flight loopback request', async () => {
  const controller = new AbortController()
  const request = axios.get(baseURL + '/slow', { proxy: false, signal: controller.signal, timeout: 2000 })
  setTimeout(() => controller.abort(), 25)
  await assert.rejects(request, error => error.code === 'ERR_CANCELED')
})
test('Axios permits a bounded redirect and rejects redirect loops', async () => {
  const result = await axios.get(baseURL + '/redirect', { proxy: false, maxRedirects: 1, timeout: 2000 })
  assert.equal(result.data.url, '/echo')
  await assert.rejects(axios.get(baseURL + '/loop', { proxy: false, maxRedirects: 1, timeout: 2000 }), error => error.code === 'ERR_FR_TOO_MANY_REDIRECTS')
})
test('Axios enforces response and request body limits', async () => {
  await assert.rejects(axios.get(baseURL + '/large', { proxy: false, maxContentLength: 32, timeout: 2000 }), /maxContentLength/)
  await assert.rejects(axios.post(baseURL + '/echo', 'x'.repeat(128), { proxy: false, maxBodyLength: 32, timeout: 2000 }), /maxBodyLength/)
})
test('Axios keeps absolute URL input under the explicitly restricted base URL', async () => {
  const result = await axios.get('http://127.0.0.1:9/disallowed', { baseURL, allowAbsoluteUrls: false, proxy: false, timeout: 2000 })
  assert.equal(result.data.url, '/http://127.0.0.1:9/disallowed')
})
test('Axios fetch options cannot replace internally owned method, body or headers', async () => {
  const result = await axios.post(baseURL + '/echo', 'intended-body', {
    adapter: 'fetch', proxy: false, timeout: 2000,
    headers: { 'Content-Type': 'text/plain', 'X-Fixture': 'intended-header' },
    fetchOptions: { method: 'DELETE', body: 'replaced-body', headers: { 'X-Fixture': 'replaced-header' } },
  })
  assert.equal(result.data.method, 'POST')
  assert.equal(result.data.body, 'intended-body')
  assert.equal(result.data.fixture, 'intended-header')
})
test('Axios configuration merging does not pollute object prototypes', () => {
  const source = JSON.parse('{"__proto__":{"stoquifyFixture":true},"constructor":{"prototype":{"stoquifyFixture":true}},"timeout":123}')
  const merged = axios.mergeConfig({}, source)
  assert.equal(merged.timeout, 123)
  assert.equal({}.stoquifyFixture, undefined)
  assert.equal(Object.prototype.stoquifyFixture, undefined)
})
