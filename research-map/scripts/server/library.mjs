/*
 * What the author has read: reading/_library.json, { version: 1, read: { <node id>: <date marked> } }. Unmarked papers
 * are not in it. It is the page's to change, one paper at a time.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { HttpError, readingId } from './api.mjs'
import { dayOf } from './chat.mjs'

const fileOf = (root) => join(root, 'reading', '_library.json')

/** What is marked as read; nothing when no paper has been marked yet. */
export function loadLibrary(root) {
  const file = fileOf(root)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { version: 1, read: {} }
}

function writeLibrary(root, library) {
  const file = fileOf(root)
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, `${JSON.stringify(library, null, 2)}\n`)
  renameSync(tmp, file)
}

export const libraryRoutes = [
  ['GET', /^\/api\/library$/, (_, { root }) => loadLibrary(root)],
  [
    'PUT',
    /^\/api\/library\/([^/]+)$/,
    ({ params, body }, { root, now }) => {
      const id = decodeURIComponent(params[0])
      if (id === '_across') throw new HttpError(404, `"${id}" is not a prepared paper`)
      readingId(root, id)
      if (typeof body?.read !== 'boolean') throw new HttpError(400, 'read is not true or false')
      const library = loadLibrary(root)
      const { [id]: was, ...rest } = library.read
      const read = body.read ? { ...rest, [id]: was ?? dayOf(now()) } : rest
      writeLibrary(root, { ...library, read })
      return { ok: true }
    },
  ],
]
