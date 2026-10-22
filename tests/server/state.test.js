// @vitest-environment node
import { cpSync, existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { emptyReading } from '../../assets/reading.js'
import { createServer } from '../../scripts/serve.mjs'

let root
let server
let port

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'state-'))
  cpSync(join(import.meta.dirname, '..', 'fixture'), root, { recursive: true })
  server = createServer({ root })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = server.address().port
})
afterAll(() => new Promise((resolve) => server.close(resolve)))

function call(method, path, json) {
  return new Promise((resolve, reject) => {
    const headers = { Host: `localhost:${port}`, ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}) }
    const req = request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      let text = ''
      res.setEncoding('utf8')
      res.on('data', (c) => (text += c))
      res.on('end', () => resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null }))
    })
    req.on('error', reject)
    if (json !== undefined) req.write(JSON.stringify(json))
    req.end()
  })
}

describe('the reading state', () => {
  it('returns an empty reading, then what was saved', async () => {
    expect((await call('GET', '/api/state/sample-a')).body).toEqual(emptyReading())
    const reading = { ...emptyReading(), lang: 'en', position: { block: 's2-p1', sentence: 0 } }
    expect((await call('PUT', '/api/state/sample-a', reading)).status).toBe(200)
    expect((await call('GET', '/api/state/sample-a')).body).toEqual(reading)
    expect(JSON.parse(readFileSync(join(root, 'reading/sample-a.json'), 'utf8'))).toEqual(reading)
  })

  it('keeps the across-papers chat under _across', async () => {
    expect((await call('PUT', '/api/state/_across', emptyReading())).status).toBe(200)
    expect(existsSync(join(root, 'reading/_across.json'))).toBe(true)
  })

  it('refuses an unknown paper and an invalid reading', async () => {
    expect((await call('GET', '/api/state/sample-b')).status).toBe(404)
    expect((await call('PUT', '/api/state/..%2fmap', emptyReading())).status).toBe(404)
    const bad = await call('PUT', '/api/state/sample-a', { ...emptyReading(), lang: 'fr' })
    expect(bad.status).toBe(400)
    expect(bad.body.error).toContain('lang "fr"')
  })
})
