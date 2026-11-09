/*
 * The reader's API under /api/: JSON in, JSON (or a stream of events) out. Each route is a function of the request
 * body and the context { root, claude, now }.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { emptyReading, validateReading } from '../../assets/reading.js'

const MAX_BODY = 1024 * 1024

export const sendJson = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' })
  res.end(JSON.stringify(data))
}

/** An error the API answers with `status` and its message. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/** The JSON body of a POST or PUT; throws HttpError 413 past 1 MB, 400 when it is not JSON. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size <= MAX_BODY) chunks.push(c) // past the limit the rest is drained, so the 413 still reaches the page
    })
    req.on('end', () => {
      if (size > MAX_BODY) return reject(new HttpError(413, 'the request is larger than 1 MB'))
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null'))
      } catch {
        reject(new HttpError(400, 'the request is not JSON'))
      }
    })
    req.on('error', reject)
  })
}

// ---- The reading state: reading/<node-id>.json, or reading/_across.json for the across-papers chat ----

const READER_FIELDS = ['position', 'lang', 'voice', 'rate', 'underlines']

/** The id of a prepared paper or `_across`; anything else is not found. */
export function readingId(root, id) {
  if (id === '_across') return id
  if (/^[a-z0-9][a-z0-9-]*$/.test(id) && existsSync(join(root, 'papers', id, 'paper.json'))) return id
  throw new HttpError(404, `"${id}" is not a prepared paper`)
}

/** The stored reading of `id`, or an empty one. */
export function loadReading(root, id) {
  const file = join(root, 'reading', `${readingId(root, id)}.json`)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : emptyReading()
}

/** Writes a valid reading (to a temporary file, then renamed over the old one). */
export function writeReading(root, id, reading) {
  const file = join(root, 'reading', `${readingId(root, id)}.json`)
  const problems = validateReading(reading)
  if (problems.length) throw new HttpError(400, problems.join('; '))
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, `${JSON.stringify(reading, null, 2)}\n`)
  renameSync(tmp, file)
}

/** The routes: [method, path regex, handler({ body, params, req, res }, ctx) -> data | undefined when it answered]. */
export const routes = [
  ['GET', /^\/api\/health$/, () => ({ ok: true })],
  ['GET', /^\/api\/state\/([^/]+)$/, ({ params }, { root }) => loadReading(root, decodeURIComponent(params[0]))],
  [
    'PUT',
    /^\/api\/state\/([^/]+)$/,
    ({ params, body }, { root }) => {
      // The page owns the place, the language, the voice and the underlines; the chats are written by the server only,
      // so a page's (stale) copy of them never overwrites a turn just answered.
      const id = decodeURIComponent(params[0])
      if (!body || typeof body !== 'object') throw new HttpError(400, 'the reading is not an object')
      const stored = loadReading(root, id)
      const own = Object.fromEntries(READER_FIELDS.filter((k) => k in body).map((k) => [k, body[k]]))
      writeReading(root, id, { ...stored, ...own, version: 1, chats: stored.chats })
      return { ok: true }
    },
  ],
]

/** Answers an /api/ request; false when the path is not the API's. */
export async function handleApi(req, res, ctx) {
  const url = new URL(req.url, 'http://localhost')
  if (!url.pathname.startsWith('/api/')) return false
  try {
    const body = req.method === 'POST' || req.method === 'PUT' ? await readBody(req) : undefined
    for (const [method, path, handler] of ctx.routes ?? routes) {
      const m = path.exec(url.pathname)
      if (!m || method !== req.method) continue
      const data = await handler({ body, params: m.slice(1), req, res, query: url.searchParams }, ctx)
      if (data !== undefined) sendJson(res, 200, data)
      return true
    }
    throw new HttpError(404, `no ${req.method} ${url.pathname}`)
  } catch (e) {
    if (res.headersSent) res.end()
    else sendJson(res, e.status ?? 500, { error: e.message })
  }
  return true
}
