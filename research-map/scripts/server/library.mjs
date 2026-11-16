/*
 * What the author has read: reading/_library.json, { version: 1, read: { <node id>: <date marked> } }. Unmarked papers
 * are not in it. It is the page's to change, one paper at a time. `queue` holds the markers of what to read next:
 * { <node id>: 'first' | 'later' }, the ones left unmarked are not in it. GET adds `progress`, { <node id>: 0..100 }, worked
 * out from each paper's reading (reading/<id>.json) and its text, so it is never stored twice.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { progressOf } from '../../assets/reading.js'
import { HttpError, readingId } from './api.mjs'
import { dayOf } from './chat.mjs'

const fileOf = (root) => join(root, 'reading', '_library.json')

/** What is marked as read; nothing when no paper has been marked yet. */
export function loadLibrary(root) {
  const file = fileOf(root)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { version: 1, read: {} }
}

/** How far the author got in each paper they have a reading of, 0 to 100; papers never opened are left out. */
export function loadProgress(root) {
  const dir = join(root, 'reading')
  if (!existsSync(dir)) return {}
  const progress = {}
  for (const f of readdirSync(dir)) {
    const id = f.slice(0, -'.json'.length)
    if (!f.endsWith('.json') || id.startsWith('_')) continue
    try {
      const paper = JSON.parse(readFileSync(join(root, 'papers', id, 'paper.json'), 'utf8'))
      const reading = JSON.parse(readFileSync(join(dir, f), 'utf8'))
      progress[id] = progressOf(paper, reading)
    } catch {
      // A reading with no prepared paper, or a file that cannot be read, has no progress to show.
    }
  }
  return progress
}

function writeLibrary(root, library) {
  const file = fileOf(root)
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, `${JSON.stringify(library, null, 2)}\n`)
  renameSync(tmp, file)
}

export const QUEUE_LEVELS = ['first', 'later']

export const libraryRoutes = [
  ['GET', /^\/api\/library$/, (_, { root }) => ({ ...loadLibrary(root), queue: loadLibrary(root).queue ?? {}, progress: loadProgress(root) })],
  [
    'PUT',
    /^\/api\/library\/([^/]+)$/,
    ({ params, body }, { root, now }) => {
      const id = decodeURIComponent(params[0])
      if (id === '_across') throw new HttpError(404, `"${id}" is not a prepared paper`)
      readingId(root, id)
      if (body && 'queue' in body) {
        if (body.queue !== null && !QUEUE_LEVELS.includes(body.queue)) throw new HttpError(400, 'queue is not first, later or null')
        const library = loadLibrary(root)
        const { [id]: _, ...rest } = library.queue ?? {}
        writeLibrary(root, { ...library, queue: body.queue ? { ...rest, [id]: body.queue } : rest })
        return { ok: true }
      }
      if (typeof body?.read !== 'boolean') throw new HttpError(400, 'read is not true or false')
      const library = loadLibrary(root)
      const { [id]: was, ...rest } = library.read
      const read = body.read ? { ...rest, [id]: was ?? dayOf(now()) } : rest
      writeLibrary(root, { ...library, read })
      return { ok: true }
    },
  ],
]
