/*
 * The study companion on the server: one chat turn (graph first; the paper's text only when the graph does not cover
 * the question, and what that finds grows the graph), and the note entries the author approves in the reader.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { mergeIdeas, validateGraph } from '../../assets/paper.js'
import { indexPapers } from '../check.mjs'
import { HttpError, loadReading, readingId, writeReading } from './api.mjs'
import { MODELS, RESEARCH_TOOLS, chatPrompt, citesOf, nearBlocks, notePrompt, parseStatus, rereadPrompt, splitGraphAdd } from './prompts.mjs'

const MODES = ['ask', 'explain', 'research', 'quiz']
const NOT_FOUND = {
  es: 'No encuentro esto en el paper. Prueba a preguntarlo de otra forma o con «Investiga esto».',
  en: 'I cannot find this in the paper. Try asking it another way, or with “Research this”.',
}
const NOT_IN_GRAPHS = {
  es: 'Las ideas de estos papers no cubren esta pregunta. Hazla en el chat de un solo paper para que lo vuelva a leer, o usa «Investiga esto».',
  en: 'The ideas of these papers do not cover this question. Ask it in a single paper’s chat so I can read it again, or use “Research this”.',
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
/** The local calendar day of `d`, YYYY-MM-DD. */
export const dayOf = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const latest = (versions) => versions?.at(-1)?.text ?? ''

/** The checked body of a chat turn; throws HttpError 400 or 404 before anything streams. */
export function checkChat(body, root) {
  const b = body ?? {}
  if (!Array.isArray(b.papers) || b.papers.length === 0) throw new HttpError(400, 'papers must list at least one paper')
  for (const id of b.papers) if (id === '_across') throw new HttpError(400, '_across is not a paper')
  for (const id of [...b.papers, b.conv]) readingId(root, String(id))
  if (!MODES.includes(b.mode)) throw new HttpError(400, `mode must be one of ${MODES.join(', ')}`)
  if (typeof b.message !== 'string' || !b.message.trim()) throw new HttpError(400, 'the message is empty')
  return {
    conv: b.conv,
    chatId: typeof b.chatId === 'string' ? b.chatId : null,
    papers: b.papers,
    mode: b.mode,
    scope: b.scope ?? null,
    attach: Array.isArray(b.attach) ? b.attach.filter((a) => typeof a?.block === 'string' && typeof a?.text === 'string') : [],
    message: b.message,
    lang: b.lang === 'en' ? 'en' : 'es',
    model: b.model === 'haiku' ? 'haiku' : 'sonnet',
  }
}

/**
 * Passes on the reply as it streams, without its status line (and without a ```graph-add block once it starts);
 * stays silent when the status says the graph did not cover the question.
 */
function visibleStream(send, withStatus) {
  let text = ''
  let sent = 0
  let silent = false
  const pass = (delta, final = false) => {
    text += delta
    if (silent) return
    let start = 0
    if (withStatus) {
      const nl = text.indexOf('\n')
      if (nl < 0) return
      const status = parseStatus(text.slice(0, nl))
      if (status && !status.covered) return void (silent = true)
      start = status ? nl + 1 : 0
    }
    const fence = text.indexOf('```graph-add')
    const end = fence >= 0 ? fence : final ? text.length : Math.max(start, text.length - 12) // a fence may be arriving
    const from = Math.max(start, sent)
    if (end > from) send('delta', { text: text.slice(from, end) })
    sent = Math.max(sent, end)
  }
  const onDelta = (delta) => pass(delta)
  onDelta.flush = () => pass('', true) // the end of the reply: what was held back goes out
  return onDelta
}

/** Streams one call through `visibleStream`, flushing what it held back once the reply is complete. */
async function streamVisible(claude, opts, send, withStatus) {
  const onDelta = visibleStream(send, withStatus)
  const full = await claude.stream({ ...opts, onDelta })
  onDelta.flush()
  return full
}

/** The reply without its status line, and that status (null when there is none). */
function readStatus(full) {
  const nl = full.indexOf('\n')
  const status = parseStatus(nl < 0 ? full : full.slice(0, nl))
  return { status, rest: status ? (nl < 0 ? '' : full.slice(nl + 1)) : full }
}

/** One chat turn: streams `delta`, maybe `status`, then `done` or `error` through `send(event, data)`. */
export async function chat(body, { root, claude, send, now = () => new Date() }) {
  const { conv, chatId, papers: ids, mode, scope, attach, message, lang, model } = checkChat(body, root)
  const date = dayOf(now())
  // Every write reloads the reading first: the page may have saved underlines or its place while Claude answered.
  const append = (threadId, message) => {
    const r = loadReading(root, conv)
    let t = threadId ? r.chats.find((c) => c.id === threadId) : null
    if (!t) {
      const n = Math.max(0, ...r.chats.map((c) => Number(c.id.slice(1)) || 0)) + 1
      t = { id: `c${n}`, papers: ids, messages: [] }
      r.chats.push(t)
    }
    t.messages.push(message)
    writeReading(root, conv, r)
    return t
  }

  try {
    const map = readJson(join(root, 'map.json'))
    const papers = ids.map((id) => {
      const paper = readJson(join(root, 'papers', id, 'paper.json'))
      const file = join(root, 'papers', id, 'graph.json')
      return { node: id, title: paper.title, paper, graph: existsSync(file) ? readJson(file) : null }
    })
    const reading = loadReading(root, conv)
    const history = [...(reading.chats.find((c) => c.id === chatId)?.messages ?? [])]
    // The question is kept even if the answer fails.
    const thread = append(chatId, { role: 'user', mode, text: message, ...(attach.length ? { attach } : {}), ...(scope ? { scope } : {}), date })
    const underlines = conv === '_across' ? [] : reading.underlines.map((u) => ({ block: u.block, text: u.text }))
    const { system, prompt } = chatPrompt({
      mode,
      papers,
      thesis: { question: latest(map.centre?.question), hypothesis: latest(map.centre?.hypothesis) },
      mapTitles: Object.fromEntries(map.nodes.map((n) => [n.id, n.title])),
      prepared: indexPapers(root).papers.map((p) => p.node),
      underlines,
      attach,
      history,
      message,
      scope,
      lang,
    })
    let text
    let graphAdded = 0
    if (mode === 'research') {
      text = (await streamVisible(claude, { ...MODELS[model], tools: RESEARCH_TOOLS, system, prompt, cwd: root }, send, false)).trim()
    } else {
      const full = await streamVisible(claude, { ...MODELS[model], tools: [], system, prompt, cwd: root }, send, true)
      const { status, rest } = readStatus(full)
      if (!status || status.covered) text = rest.trim()
      else if (papers.length > 1) {
        text = NOT_IN_GRAPHS[lang]
        send('delta', { text })
      } else {
        send('status', { phase: 'reread' })
        const p = papers[0]
        const reread = async (blockIds) => {
          const q = rereadPrompt({ paper: p.paper, blockIds, question: message, history, lang })
          return readStatus(await streamVisible(claude, { ...MODELS.reread, tools: [], ...q, cwd: root }, send, true))
        }
        const near = status.near.length ? nearBlocks(p.paper, status.near) : null
        let again = await reread(near && near.length ? near : null)
        if (again.status?.covered === false && near?.length) again = await reread(null)
        if (again.status?.covered === false) {
          text = NOT_FOUND[lang]
          send('delta', { text })
        } else {
          const { answer, ideas } = splitGraphAdd(again.rest)
          text = answer
          graphAdded = growGraph(root, p, ideas, map, date)
        }
      }
    }
    append(thread.id, { role: 'assistant', mode, text, date })
    send('done', { chatId: thread.id, text, cites: citesOf(text), graphAdded })
  } catch (e) {
    send('error', { message: e.message })
  }
}

/** Adds the ideas a re-read found to the paper's graph, each only if it is valid; returns how many. */
function growGraph(root, p, ideas, map, date) {
  if (!p.graph || !ideas.length) return 0
  const mapIds = new Set(map.nodes.map((n) => n.id))
  let graph = p.graph
  let added = 0
  for (const idea of ideas) {
    const next = mergeIdeas(graph, [idea], date)
    if (validateGraph(next, p.paper, mapIds).length === 0) {
      graph = next
      added++
    }
  }
  if (added) writeFileSync(join(root, 'papers', p.node, 'graph.json'), `${JSON.stringify(graph, null, 2)}\n`)
  return added
}

const paperNode = (root, id) => {
  const map = readJson(join(root, 'map.json'))
  const node = map.nodes.find((n) => n.id === id)
  if (node?.kind !== 'paper') throw new HttpError(400, `"${id}" is not a paper node`)
  return node
}

/** A proposed note entry, written by Claude from a chat message; the author approves or edits it in the reader. */
export async function draftNote(body, { root, claude }) {
  const node = paperNode(root, String(body?.node))
  if (typeof body?.text !== 'string' || !body.text.trim()) throw new HttpError(400, 'nothing to turn into a note')
  const { system, prompt } = notePrompt({ text: body.text, from: body.from === 'claude' ? 'claude' : 'author', node: node.id, paperTitle: node.title })
  return { draft: (await claude.run({ ...MODELS.sonnet, tools: [], system, prompt, cwd: root })).trim() }
}

/** Appends an approved entry to each paper's note. */
export function saveNote(body, { root, now = () => new Date() }) {
  const nodes = Array.isArray(body?.nodes) ? body.nodes : []
  const text = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!nodes.length) throw new HttpError(400, 'no note to add the entry to')
  if (!text) throw new HttpError(400, 'the entry is empty')
  if (/^## /m.test(text)) throw new HttpError(400, 'the entry cannot hold a "## " heading line')
  for (const id of nodes) paperNode(root, String(id))
  for (const id of nodes) {
    const file = join(root, 'notes', `${id}.md`)
    const before = existsSync(file) ? readFileSync(file, 'utf8') : ''
    appendFileSync(file, `${before && !before.endsWith('\n') ? '\n' : ''}\n## ${dayOf(now())} · Reading\n${text}\n`)
  }
  return { ok: true }
}

/** The SSE route: checks the body (JSON errors before the stream starts), then streams the turn. */
export async function chatRoute({ body, res }, ctx) {
  checkChat(body, ctx.root)
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  await chat(body, { ...ctx, send })
  res.end()
}

/** The companion's routes, added to the API's by the server. */
export const chatRoutes = [
  ['POST', /^\/api\/chat$/, chatRoute],
  ['POST', /^\/api\/note-draft$/, ({ body }, ctx) => draftNote(body, ctx)],
  ['POST', /^\/api\/note$/, ({ body }, ctx) => saveNote(body, ctx)],
]
