// @vitest-environment node
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
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

describe('what has been read', () => {
  it('starts empty, and keeps what is marked with its date', async () => {
    expect((await call('GET', '/api/library')).body).toEqual({ version: 1, read: {} })
    expect((await call('PUT', '/api/library/sample-a', { read: true })).status).toBe(200)
    const { read } = (await call('GET', '/api/library')).body
    expect(read['sample-a']).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(JSON.parse(readFileSync(join(root, 'reading/_library.json'), 'utf8')).read['sample-a']).toBe(read['sample-a'])
  })

  it('forgets it when unmarked', async () => {
    await call('PUT', '/api/library/sample-a', { read: true })
    await call('PUT', '/api/library/sample-a', { read: false })
    expect((await call('GET', '/api/library')).body.read).toEqual({})
  })

  it('refuses a paper that is not prepared, and anything but true or false', async () => {
    expect((await call('PUT', '/api/library/sample-b', { read: true })).status).toBe(404)
    expect((await call('PUT', '/api/library/sample-a', { read: 'yes' })).status).toBe(400)
  })

  it('does not treat the list as a paper', async () => {
    expect((await call('GET', '/api/state/_library')).status).toBe(404)
  })
})

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

  it('keeps the stored chats: the reader saves only its own fields', async () => {
    const chats = [{ id: 'c1', papers: ['sample-a'], messages: [{ role: 'user', mode: 'ask', text: 'Hola', date: '2026-10-22' }] }]
    writeFileSync(join(root, 'reading/sample-a.json'), JSON.stringify({ ...emptyReading(), chats })) // written by a chat turn
    const fromReader = { version: 1, position: { block: 's1-p1', sentence: 0 }, lang: 'es', voice: null, rate: 1.25, underlines: [] }
    expect((await call('PUT', '/api/state/sample-a', fromReader)).status).toBe(200)
    const stored = (await call('GET', '/api/state/sample-a')).body
    expect(stored.rate).toBe(1.25)
    expect(stored.chats).toEqual(chats)
    // a stale or broken copy of the chats from the page changes nothing
    expect((await call('PUT', '/api/state/sample-a', { ...fromReader, chats: [{ id: 'c9', papers: [], messages: [{ role: 'user', text: 'x' }] }] })).status).toBe(200)
    expect((await call('GET', '/api/state/sample-a')).body.chats).toEqual(chats)
  })

  it('refuses an unknown paper and an invalid reading', async () => {
    expect((await call('GET', '/api/state/sample-b')).status).toBe(404)
    expect((await call('PUT', '/api/state/..%2fmap', emptyReading())).status).toBe(404)
    const bad = await call('PUT', '/api/state/sample-a', { ...emptyReading(), lang: 'fr' })
    expect(bad.status).toBe(400)
    expect(bad.body.error).toContain('lang "fr"')
  })
})
