/*
 * The author's reading of a paper (reading/<node-id>.json): where they left off, the language and voice they chose,
 * their underlines and their chats. Pure: no DOM, no files. The local server checks it before writing it.
 */
import { isDate } from './model.js'

/** A reading not started: no position, Spanish, the default voice and speed, nothing underlined or asked. */
export const emptyReading = () => ({ version: 1, position: null, lang: 'es', voice: null, rate: 1, underlines: [], chats: [] })

const isText = (s) => typeof s === 'string'
const list = (x) => (Array.isArray(x) ? x : [])

/** The problems of a reading, one line each; empty when it is valid. */
export function validateReading(r) {
  if (!r || typeof r !== 'object') return ['the reading is not an object']
  const problems = []
  if (r.version !== 1) problems.push('version is not 1')
  if (r.position !== null && (!isText(r.position?.block) || !Number.isInteger(r.position?.sentence ?? 0)))
    problems.push('position is not null or { block, sentence }')
  if (r.lang !== 'en' && r.lang !== 'es') problems.push(`lang "${r.lang}" is not en or es`)
  if (r.voice !== null && !isText(r.voice)) problems.push('voice is not null or a name')
  if (typeof r.rate !== 'number' || r.rate < 0.5 || r.rate > 3) problems.push('rate is not between 0.5 and 3')
  if (!Array.isArray(r.underlines)) problems.push('underlines is not a list')
  for (const u of list(r.underlines)) {
    const what = `underline "${u?.id}"`
    if (!/^u\d+$/.test(u?.id ?? '')) problems.push(`${what}: id is not u<number>`)
    if (!isText(u?.block) || (u?.lang !== 'en' && u?.lang !== 'es')) problems.push(`${what}: needs a block and a language`)
    if (!Number.isInteger(u?.start) || !Number.isInteger(u?.end) || u.start < 0) problems.push(`${what}: start and end are not offsets`)
    else if (u.start >= u.end) problems.push(`${what}: start is after end`)
    if (!isText(u?.text) || !isDate(u?.date)) problems.push(`${what}: needs its text and a date`)
  }
  if (!Array.isArray(r.chats)) problems.push('chats is not a list')
  for (const c of list(r.chats)) {
    const what = `chat "${c?.id}"`
    if (!/^c\d+$/.test(c?.id ?? '')) problems.push(`${what}: id is not c<number>`)
    if (!Array.isArray(c?.papers) || !c.papers.every(isText)) problems.push(`${what}: papers is not a list of ids`)
    list(c?.messages).forEach((m, i) => {
      if (m?.role !== 'user' && m?.role !== 'assistant') problems.push(`${what}: message ${i + 1} has role "${m?.role}"`)
      if (!isText(m?.text) || !isDate(m?.date)) problems.push(`${what}: message ${i + 1} needs its text and a date`)
    })
  }
  return problems
}

const nextId = (items, prefix) => `${prefix}${Math.max(0, ...items.map((x) => Number(x.id.slice(prefix.length)) || 0)) + 1}`

/** The reading with one more underline (id u<n>); a new object. */
export function addUnderline(r, { block, lang, start, end, text, image }, date) {
  const u = { id: nextId(r.underlines, 'u'), block, lang, start, end, text, date, ...(image ? { image: true } : {}) }
  return { ...r, underlines: [...r.underlines, u] }
}

/** The reading without underline `id`; a new object. */
export const removeUnderline = (r, id) => ({ ...r, underlines: r.underlines.filter((u) => u.id !== id) })

/** `text` cut into runs, each with the ids of the underlines that cover it (overlaps give runs with several ids). */
export function segments(text, ranges) {
  const cuts = new Set([0, text.length])
  for (const { start, end } of ranges) {
    cuts.add(Math.max(0, Math.min(text.length, start)))
    cuts.add(Math.max(0, Math.min(text.length, end)))
  }
  const points = [...cuts].sort((a, b) => a - b)
  const runs = []
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b] = [points[i], points[i + 1]]
    if (a === b) continue
    runs.push({ text: text.slice(a, b), ids: ranges.filter((r) => r.start <= a && r.end >= b).map((r) => r.id) })
  }
  return runs.length ? runs : [{ text, ids: [] }]
}
