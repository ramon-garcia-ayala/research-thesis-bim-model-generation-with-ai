// @vitest-environment node
import { request } from 'node:http'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer } from '../../scripts/serve.mjs'
import { allowed } from '../../scripts/server/guard.mjs'

const ROOT = join(import.meta.dirname, '..', '..')
let server
let port

beforeAll(async () => {
  server = createServer({ root: ROOT })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = server.address().port
})
afterAll(() => new Promise((resolve) => server.close(resolve)))

/** One request to the test server; `headers` may set Host, Origin or Content-Type. */
function call(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: `localhost:${port}`, ...headers } }, (res) => {
      let text = ''
      res.setEncoding('utf8')
      res.on('data', (c) => (text += c))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }))
    })
    req.on('error', reject)
    if (body !== undefined) req.write(body)
    req.end()
  })
}
const get = (path, headers) => call('GET', path, { headers })
const post = (path, json, headers = {}) =>
  call('POST', path, { headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(json) })

describe('static files', () => {
  it('serves the map like before, without caching', async () => {
    const r = await get('/index.html')
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toMatch(/^text\/html/)
    expect(r.headers['cache-control']).toBe('no-cache')
  })

  it('serves a folder’s index.html', async () => {
    const r = await get('/')
    expect(r.status).toBe(200)
    expect(r.text).toContain('<main id="app">')
  })

  it('serves a PDF whose name has spaces', async () => {
    const r = await get('/files/ProcTHOR%20-%20Large-Scale%20Embodied%20AI%20Using%20Procedural%20Generation.pdf')
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toBe('application/pdf')
  })

  it('serves module scripts as JavaScript', async () => expect((await get('/assets/view.js')).headers['content-type']).toMatch(/^text\/javascript/))

  it('never serves outside the folder or dot folders', async () => {
    expect((await get('/..%2fpackage.json')).status).toBe(404)
    expect((await get('/assets/..%2f..%2f..%2fWindows')).status).toBe(404)
    expect((await get('/.git/config')).status).toBe(404)
    expect((await get('/.superpowers/sdd')).status).toBe(404)
    expect((await get('/node_modules/vitest/package.json')).status).toBe(404)
  })

  it('answers 404 for a missing file', async () => expect((await get('/nope.html')).status).toBe(404))
})

describe('the API and its guard', () => {
  it('answers health', async () => {
    const r = await get('/api/health')
    expect(r.status).toBe(200)
    expect(JSON.parse(r.text)).toEqual({ ok: true })
  })

  it('answers 404 JSON for an unknown API path', async () => {
    const r = await get('/api/nothing')
    expect(r.status).toBe(404)
    expect(JSON.parse(r.text).error).toBeDefined()
  })

  it('refuses another site posting to the API', async () => {
    expect((await post('/api/health', {}, { Origin: 'https://evil.example' })).status).toBe(403)
    expect((await post('/api/health', {}, { 'Content-Type': 'text/plain' })).status).toBe(403)
    expect((await get('/api/health', { Host: 'rebound.example:4322' })).status).toBe(403)
  })

  it('refuses a rebound host for the static files too', async () => expect((await get('/index.html', { Host: 'rebound.example' })).status).toBe(403))

  it('accepts its own origin and the tailnet host', async () => {
    expect((await post('/api/nothing', {}, { Origin: `http://localhost:${port}` })).status).toBe(404)
    expect((await get('/api/health', { Host: 'laptop.tail1234.ts.net' })).status).toBe(200)
  })

  it('refuses a body over 1 MB and invalid JSON', async () => {
    expect((await call('POST', '/api/echo-size', { headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(1024 * 1024 + 10) })).status).toBe(413)
    expect((await call('POST', '/api/echo-size', { headers: { 'Content-Type': 'application/json' }, body: '{nope' })).status).toBe(400)
  })
})

describe('allowed', () => {
  const req = (method, headers) => ({ method, headers })
  it('checks the host, the content type and the origin', () => {
    expect(allowed(req('GET', { host: 'localhost:4322' }), { port: 4322 })).toBe(true)
    expect(allowed(req('GET', { host: '127.0.0.1:4322' }), { port: 4322 })).toBe(true)
    expect(allowed(req('GET', { host: 'localhost:9999' }), { port: 4322 })).toBe(false)
    expect(allowed(req('PUT', { host: 'localhost:4322', 'content-type': 'application/json', origin: 'http://localhost:4322' }), { port: 4322 })).toBe(true)
    expect(allowed(req('PUT', { host: 'x.tail1.ts.net', 'content-type': 'application/json', origin: 'https://x.tail1.ts.net' }), { port: 4322 })).toBe(true)
    expect(allowed(req('PUT', { host: 'localhost:4322', 'content-type': 'application/json', origin: 'null' }), { port: 4322 })).toBe(false)
  })
})
