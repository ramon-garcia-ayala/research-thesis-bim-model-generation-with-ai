// @vitest-environment node
import { cpSync, existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseSSE } from '../../assets/reading-client.js'
import { runClaude, streamClaude } from '../../scripts/lib/claude.mjs'
import { createServer } from '../../scripts/serve.mjs'

const bin = [process.execPath, join(import.meta.dirname, '..', 'fixture', 'fake-claude.mjs')]
let root
let server
let port
let env // what the fake claude replies, per test

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'chat-'))
  cpSync(join(import.meta.dirname, '..', 'fixture'), root, { recursive: true })
  env = { FAKE_CLAUDE_LOG: join(root, 'claude.log.jsonl') }
  const claude = { run: (o) => runClaude({ ...o, bin, env }), stream: (o) => streamClaude({ ...o, bin, env }) }
  server = createServer({ root, claude, now: () => new Date('2026-10-23T12:00:00') })
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
        res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], text }))
      },
    )
    req.on('error', reject)
    req.end(JSON.stringify(json))
  })
}

const reply = (text) => () => (env.FAKE_CLAUDE_REPLY = text)
const replies = (...texts) => () => (env.FAKE_CLAUDE_REPLIES = JSON.stringify(texts))
const failing = () => () => (env.FAKE_CLAUDE_FAIL = '1')

/** One chat turn's events, with the fake claude set up by `setup`. */
async function chatEvents(body, setup) {
  setup()
  const r = await post('/api/chat', { conv: 'sample-a', papers: ['sample-a'], attach: [], lang: 'es', model: 'sonnet', ...body })
  expect(r.type).toMatch(/^text\/event-stream/)
  return parseSSE(r.text).events
}
const calls = () => readFileSync(env.FAKE_CLAUDE_LOG, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const argsOf = (i) => calls()[i].args
const lastArgs = () => calls().at(-1).args
const flag = (args, name) => args[args.indexOf(name) + 1]
const saved = () => JSON.parse(readFileSync(join(root, 'reading/sample-a.json'), 'utf8'))
const graph = () => JSON.parse(readFileSync(join(root, 'papers/sample-a/graph.json'), 'utf8'))
const note = (id) => readFileSync(join(root, `notes/${id}.md`), 'utf8')

describe('the chat', () => {
  it('answers from the graph and saves both messages', async () => {
    const ev = await chatEvents({ mode: 'ask', message: '¿Qué valida?' }, reply('COVERED\nRevisa cada casa [¶ s2-p1].'))
    expect(ev.at(-1)).toMatchObject({ event: 'done', data: { text: 'Revisa cada casa [¶ s2-p1].', cites: ['s2-p1'], graphAdded: 0 } })
    expect(ev.filter((e) => e.event === 'delta').map((e) => e.data.text).join('')).toBe('Revisa cada casa [¶ s2-p1].')
    expect(saved().chats[0].messages.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(saved().chats[0].messages[0]).toMatchObject({ mode: 'ask', text: '¿Qué valida?', date: '2026-10-23' })
    expect(lastArgs()).toEqual(expect.arrayContaining(['--model', 'claude-sonnet-5-5', '--effort', 'low']))
    expect(flag(lastArgs(), '--tools')).toBe('')
    expect(calls()[0].stdin).toContain('reachability-validator') // the graph, not the paper
  })

  it('continues the same chat when given its id', async () => {
    const first = await chatEvents({ mode: 'ask', message: 'Uno' }, reply('COVERED\nA.'))
    await chatEvents({ mode: 'ask', message: 'Dos', chatId: first.at(-1).data.chatId }, reply('COVERED\nB.'))
    expect(saved().chats).toHaveLength(1)
    expect(saved().chats[0].messages.map((m) => m.text)).toEqual(['Uno', 'A.', 'Dos', 'B.'])
    expect(calls()[1].stdin).toContain('Uno')
  })

  it('goes back to the text when the graph does not cover it, and grows the graph', async () => {
    const ev = await chatEvents(
      { mode: 'ask', message: 'x' },
      replies('NOT COVERED: s2-p1', 'COVERED\nSí [¶ s2-p2].\n```graph-add\n[{"kind":"claim","en":"e","es":"e","blocks":["s2-p2"]}]\n```'),
    )
    expect(ev.map((e) => e.event)).toContain('status')
    expect(ev.at(-1).data).toMatchObject({ text: 'Sí [¶ s2-p2].', graphAdded: 1 })
    expect(graph().ideas.at(-1)).toMatchObject({ origin: 'question', blocks: ['s2-p2'], date: '2026-10-23' })
    expect(argsOf(1)).toEqual(expect.arrayContaining(['--model', 'claude-sonnet-5-5', '--effort', 'medium']))
    expect(calls()[1].stdin).toContain('[s2-p1] ')
  })

  it('reads the whole paper when the blocks around the question are not enough', async () => {
    const ev = await chatEvents({ mode: 'ask', message: 'x' }, replies('NOT COVERED: s2-p1', 'NOT COVERED', 'COVERED\nAl fin [¶ s1-p1].'))
    expect(ev.at(-1).data.text).toBe('Al fin [¶ s1-p1].')
    expect(calls()).toHaveLength(3)
    expect(calls()[2].stdin).toContain('[s1-p1] ')
  })

  it('keeps no idea that cites a block the paper lacks', async () => {
    await chatEvents({ mode: 'ask', message: 'x' }, replies('NOT COVERED: s2-p1', 'COVERED\nSí.\n```graph-add\n[{"kind":"claim","en":"e","es":"e","blocks":["s9-p9"]}]\n```'))
    expect(graph().ideas).toHaveLength(3)
  })

  it('uses Haiku without an effort flag when asked', async () => {
    await chatEvents({ mode: 'ask', message: 'x', model: 'haiku' }, reply('COVERED\nOk.'))
    expect(flag(lastArgs(), '--model')).toBe('claude-haiku-5-5')
    expect(lastArgs()).not.toContain('--effort')
  })

  it('research mode gets the read and web tools, never shell or edits', async () => {
    const ev = await chatEvents({ mode: 'research', message: 'Investiga' }, reply('Encontré algo.\nFuentes: x'))
    expect(flag(lastArgs(), '--tools')).toBe('Read,Grep,Glob,WebSearch,WebFetch')
    expect(ev.at(-1).data.text).toBe('Encontré algo.\nFuentes: x')
  })

  it('reports a claude failure and stores no assistant message', async () => {
    const ev = await chatEvents({ mode: 'ask', message: '¿Y esto?' }, failing())
    expect(ev.at(-1).event).toBe('error')
    expect(ev.at(-1).data.message).toMatch(/Not logged in/)
    expect(saved().chats[0].messages.map((m) => m.role)).toEqual(['user'])
  })

  it('keeps what the reader saved while the answer was being written', async () => {
    env.FAKE_CLAUDE_REPLY = 'COVERED\nSí.'
    const turn = post('/api/chat', { conv: 'sample-a', papers: ['sample-a'], mode: 'ask', message: 'x', attach: [], lang: 'es', model: 'sonnet' })
    await new Promise((r) => setTimeout(r, 30)) // the question is stored; claude is still answering
    const underline = { id: 'u1', block: 's2-p1', lang: 'es', start: 0, end: 3, text: 'Un ', date: '2026-10-23' }
    await new Promise((resolve, reject) => {
      const req = request(
        { host: '127.0.0.1', port, method: 'PUT', path: '/api/state/sample-a', headers: { Host: `localhost:${port}`, 'Content-Type': 'application/json' } },
        (res) => res.resume().on('end', resolve),
      )
      req.on('error', reject)
      req.end(JSON.stringify({ version: 1, position: null, lang: 'es', voice: null, rate: 1, underlines: [underline] }))
    })
    await turn
    expect(saved().underlines).toEqual([underline])
    expect(saved().chats[0].messages.map((m) => m.role)).toEqual(['user', 'assistant'])
  })

  it('reports a broken paper as an error event, not a silent end', async () => {
    const { writeFileSync } = await import('node:fs')
    writeFileSync(join(root, 'papers/sample-a/graph.json'), '{ broken')
    const ev = await chatEvents({ mode: 'ask', message: 'x' }, reply('COVERED\nA.'))
    expect(ev.at(-1).event).toBe('error')
  })

  it('refuses a chat about a paper that is not prepared', async () => {
    const r = await post('/api/chat', { conv: 'sample-b', papers: ['sample-b'], mode: 'ask', message: 'x', attach: [], lang: 'es', model: 'sonnet' })
    expect(r.status).toBe(404)
  })
})

describe('notes', () => {
  it('drafts a note entry with Claude', async () => {
    env.FAKE_CLAUDE_REPLY = 'Author: "lo entendí así"\nClaude: the validator is a rule.'
    const r = await post('/api/note-draft', { node: 'sample-a', text: 'lo entendí así', from: 'author' })
    expect(JSON.parse(r.text)).toEqual({ draft: 'Author: "lo entendí así"\nClaude: the validator is a rule.' })
    expect(calls()[0].stdin).toContain('lo entendí así')
  })

  it('appends an approved note entry', async () => {
    const r = await post('/api/note', { nodes: ['sample-a'], body: 'Author: "lo entendí así"\nClaude: …' })
    expect(r.status).toBe(200)
    expect(note('sample-a')).toMatch(/\n## 2026-10-23 · Reading\nAuthor: "lo entendí así"\nClaude: …\n$/)
  })

  it('appends to several notes from the across-papers chat', async () => {
    await post('/api/note', { nodes: ['sample-a', 'sample-b'], body: 'Claude: both.' })
    expect(note('sample-b')).toContain('· Reading\nClaude: both.')
  })

  it('refuses a note for a non-paper node or with a heading line', async () => {
    expect((await post('/api/note', { nodes: ['idea-1'], body: 'x' })).status).toBe(400)
    expect((await post('/api/note', { nodes: ['sample-a'], body: 'x\n## 2026-01-01 · Fake' })).status).toBe(400)
    expect((await post('/api/note', { nodes: ['sample-a'], body: '  ' })).status).toBe(400)
    expect(existsSync(join(root, 'notes/idea-1.md')) && note('idea-1').includes('Reading')).toBe(false)
  })
})
