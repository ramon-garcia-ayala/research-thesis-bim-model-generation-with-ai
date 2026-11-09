// @vitest-environment node
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { validate } from '../../assets/model.js'
import { runClaude, streamClaude } from '../../scripts/lib/claude.mjs'
import { createServer } from '../../scripts/serve.mjs'
import { applyProposal, cleanProposal, parseProposal } from '../../scripts/server/mapedit.mjs'

const bin = [process.execPath, join(import.meta.dirname, '..', 'fixture', 'fake-claude.mjs')]
let root
let server
let port
let env

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'mapedit-'))
  cpSync(join(import.meta.dirname, '..', 'fixture'), root, { recursive: true })
  env = { FAKE_CLAUDE_LOG: join(root, 'claude.log.jsonl') }
  const claude = { run: (o) => runClaude({ ...o, bin, env }), stream: (o) => streamClaude({ ...o, bin, env }) }
  server = createServer({ root, claude, now: () => new Date('2026-11-08T12:00:00') })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = server.address().port
})
afterEach(() => new Promise((resolve) => server.close(resolve)))

function post(path, json) {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: '127.0.0.1', port, method: 'POST', path, headers: { Host: `localhost:${port}`, 'Content-Type': 'application/json' } },
      (res) => {
        let text = ''
        res.setEncoding('utf8')
        res.on('data', (c) => (text += c))
        res.on('end', () => resolve({ status: res.statusCode, text }))
      },
    )
    req.on('error', reject)
    req.end(JSON.stringify(json))
  })
}

const mapRaw = () => readFileSync(join(root, 'map.json'), 'utf8')
const map = () => JSON.parse(mapRaw())
const idea = { id: 'rules-need-a-reader', title: 'Rules need a reader', group: 'rules', note: 'Author: "las reglas necesitan un lector"' }
const link = { from: 'rules-need-a-reader', to: 'sample-a', explanation: 'Read in this paper.' }
const proposal = { idea, links: [link, { from: 'rules-need-a-reader', to: 'hypothesis', explanation: 'Bears on the hypothesis.' }] }

describe('reading a proposal', () => {
  it('takes the JSON from a fence or from bare text', () => {
    expect(parseProposal('```json\n{"idea": null, "links": []}\n```')).toEqual({ idea: null, links: [] })
    expect(parseProposal('Here: {"idea": null, "links": []} done')).toEqual({ idea: null, links: [] })
    expect(parseProposal('no json here')).toBeNull()
    expect(parseProposal('{"idea": ')).toBeNull()
    expect(parseProposal('[1, 2]')).toBeNull()
  })

  it('keeps only what the map keeps, trimmed', () => {
    const p = cleanProposal({ idea: { id: ' a ', title: 'T', group: 'rules', note: 'n', kind: 'paper', extra: 1 }, links: [{ from: 'a', to: 'b', explanation: ' e ', date: 'x' }, null] })
    expect(p.idea).toEqual({ id: 'a', title: 'T', group: 'rules', note: 'n' })
    expect(p.links).toEqual([{ from: 'a', to: 'b', explanation: 'e' }, { from: '', to: '', explanation: '' }])
    expect(cleanProposal({}).idea).toBeNull()
  })
})

describe('applying a proposal', () => {
  it('adds an idea of kind idea, dated, and its links', () => {
    const { next, problems } = applyProposal(map(), proposal, '2026-11-08')
    expect(problems).toEqual([])
    expect(next.nodes.at(-1)).toEqual({ id: 'rules-need-a-reader', kind: 'idea', group: 'rules', title: 'Rules need a reader', date: '2026-11-08' })
    expect(next.links.at(-1)).toMatchObject({ from: 'rules-need-a-reader', to: 'hypothesis', date: '2026-11-08' })
    expect(validate(next)).toEqual([])
  })

  it('accepts links alone between what the map has', () => {
    const { problems } = applyProposal(map(), { idea: null, links: [{ from: 'sample-b', to: 'idea-2', explanation: 'x' }] }, '2026-11-08')
    expect(problems).toEqual([])
  })

  it('names each problem', () => {
    const p = (prop) => applyProposal(map(), prop, '2026-11-08').problems.join(' | ')
    expect(p({ idea: null, links: [] })).toMatch(/adds nothing/)
    expect(p({ idea, links: [] })).toMatch(/at least one link/)
    expect(p({ idea: { ...idea, note: '' }, links: [link] })).toMatch(/no note/)
    expect(p({ idea: { ...idea, group: 'nope' }, links: [link] })).toMatch(/group "nope" does not exist/)
    expect(p({ idea: { ...idea, id: 'idea-1' }, links: [{ ...link, from: 'idea-1' }] })).toMatch(/duplicate id "idea-1"/)
    expect(p({ idea: { ...idea, id: 'Bad Id' }, links: [{ ...link, from: 'Bad Id' }] })).toMatch(/is not lowercase/)
    expect(p({ idea, links: [{ ...link, to: 'ghost' }] })).toMatch(/"ghost" is not a node/)
    expect(p({ idea, links: [{ ...link, explanation: '' }] })).toMatch(/no explanation/)
    expect(p({ idea: null, links: [{ from: 'sample-b', to: 'idea-2', explanation: 'x' }, { from: 'sample-b', to: 'idea-2', explanation: 'y' }] })).toMatch(/duplicate link/)
  })
})

describe('drafting a map entry', () => {
  it('asks Claude with the map and returns the proposal with its problems', async () => {
    env.FAKE_CLAUDE_REPLY = `\`\`\`json\n${JSON.stringify(proposal)}\n\`\`\``
    const r = await post('/api/map-draft', { node: 'sample-a', text: 'las reglas necesitan un lector', from: 'author' })
    expect(r.status).toBe(200)
    expect(JSON.parse(r.text)).toMatchObject({ proposal, problems: [] })
    expect(JSON.parse(r.text).groups).toContainEqual({ id: 'rules', title: 'Rule-based' })
    const stdin = readFileSync(env.FAKE_CLAUDE_LOG, 'utf8')
    expect(stdin).toContain('las reglas necesitan un lector')
    expect(stdin).toContain('idea-1') // the node list reaches Claude
    expect(stdin).toContain('datasets') // and the groups
  })

  it('returns the problems of a bad draft so the author can fix them', async () => {
    env.FAKE_CLAUDE_REPLY = JSON.stringify({ idea: { ...idea, group: 'nope' }, links: [link] })
    const r = JSON.parse((await post('/api/map-draft', { node: 'sample-a', text: 'x', from: 'claude' })).text)
    expect(r.problems.join(' ')).toMatch(/group "nope"/)
  })

  it('answers 502 when Claude gives no proposal, 400 for a non-paper or an empty message', async () => {
    env.FAKE_CLAUDE_REPLY = 'I cannot.'
    expect((await post('/api/map-draft', { node: 'sample-a', text: 'x', from: 'author' })).status).toBe(502)
    expect((await post('/api/map-draft', { node: 'idea-1', text: 'x', from: 'author' })).status).toBe(400)
    expect((await post('/api/map-draft', { node: 'sample-a', text: '  ', from: 'author' })).status).toBe(400)
  })
})

describe('writing a map entry', () => {
  it('appends the idea, its links and its note, and only that', async () => {
    const before = map()
    const r = await post('/api/map-entry', { proposal })
    expect(r.status).toBe(200)
    expect(JSON.parse(r.text)).toEqual({ ok: true, idea: 'rules-need-a-reader', links: 2 })
    const after = map()
    expect(after.nodes.slice(0, -1)).toEqual(before.nodes)
    expect(after.links.slice(0, -2)).toEqual(before.links)
    expect(after.nodes.at(-1).date).toBe('2026-11-08')
    expect(validate(after)).toEqual([])
    expect(readFileSync(join(root, 'notes/rules-need-a-reader.md'), 'utf8')).toBe('## 2026-11-08 · Summary\nAuthor: "las reglas necesitan un lector"\n')
  })

  it('writes links alone without a note', async () => {
    const r = await post('/api/map-entry', { proposal: { idea: null, links: [{ from: 'sample-b', to: 'idea-2', explanation: 'x' }] } })
    expect(JSON.parse(r.text)).toEqual({ ok: true, idea: null, links: 1 })
    expect(map().links.at(-1)).toMatchObject({ from: 'sample-b', to: 'idea-2', date: '2026-11-08' })
  })

  it('keeps the line endings the file has', async () => {
    writeFileSync(join(root, 'map.json'), mapRaw().replace(/\r?\n/g, '\r\n'))
    await post('/api/map-entry', { proposal })
    const raw = mapRaw()
    expect(raw.replace(/\r\n/g, '')).not.toContain('\n') // no bare line feed anywhere
    expect(raw.endsWith('}\r\n')).toBe(true)
    expect(readFileSync(join(root, 'notes/rules-need-a-reader.md'), 'utf8')).toBe('## 2026-11-08 · Summary\r\nAuthor: "las reglas necesitan un lector"\r\n')
  })

  it('writes nothing when the map would not be valid', async () => {
    const raw = mapRaw()
    const bad = await post('/api/map-entry', { proposal: { idea, links: [{ ...link, to: 'ghost' }] } })
    expect(bad.status).toBe(400)
    expect(JSON.parse(bad.text).error).toMatch(/"ghost" is not a node/)
    expect(mapRaw()).toBe(raw)
    expect(existsSync(join(root, 'notes/rules-need-a-reader.md'))).toBe(false)
    expect((await post('/api/map-entry', {})).status).toBe(400)
  })

  it('refuses the same idea twice', async () => {
    await post('/api/map-entry', { proposal })
    const again = await post('/api/map-entry', { proposal })
    expect(again.status).toBe(400)
    expect(JSON.parse(again.text).error).toMatch(/duplicate id/)
  })
})
