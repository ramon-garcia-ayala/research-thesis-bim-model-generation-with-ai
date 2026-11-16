/*
 * The library of prepared papers: which keywords of the vocabulary (papers/keywords.json) a paper has, the words it can
 * be found by, and which papers a search, a choice of keywords and the read or unread status leave. Pure.
 */
import { blocksOf } from './paper.js'

/** A keyword applies from this many uses in the text, unless it sets its own `min`, or from one in the title. */
export const DEFAULT_MIN = 5

/** `s` without case, accents or ligatures. */
export const fold = (s) => String(s ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()

const tokens = (s) => fold(s).match(/[\p{L}\p{N}]+/gu) ?? []
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const body = (paper) => blocksOf(paper).filter((b) => b.section !== 'refs')

/** How many times `term` is in the folded `text`, as whole words. */
function uses(text, term) {
  const words = fold(term).trim().split(/\s+/).map(escapeRegex).join('\\s+')
  return text.match(new RegExp(`(?<![\\p{L}\\p{N}])${words}(?![\\p{L}\\p{N}])`, 'gu'))?.length ?? 0
}

/** The ids of the keywords of `vocabulary` that `paper` has, in the vocabulary's order. */
export function keywordsOf(paper, vocabulary) {
  const title = fold(paper.title)
  const text = fold(body(paper).map((b) => b.text?.en ?? '').join('\n'))
  return vocabulary
    .filter((k) => {
      const terms = k.terms ?? []
      if (terms.some((t) => uses(title, t) > 0)) return true
      return terms.reduce((n, t) => n + uses(text, t), 0) >= (k.min ?? DEFAULT_MIN)
    })
    .map((k) => k.id)
}

/** The problems of a vocabulary, one line each. */
export function validateVocabulary(vocabulary) {
  if (!Array.isArray(vocabulary)) return ['it is not a list']
  const problems = []
  const seen = new Set()
  for (const k of vocabulary) {
    const what = `keyword "${k?.id}"`
    if (typeof k?.id !== 'string' || !k.id) problems.push(`${what}: needs an id`)
    if (seen.has(k?.id)) problems.push(`${what}: repeated`)
    seen.add(k?.id)
    if (typeof k?.label !== 'string' || !k.label) problems.push(`${what}: needs a label`)
    if (!Array.isArray(k?.terms) || !k.terms.length || !k.terms.every((t) => typeof t === 'string' && t.trim())) problems.push(`${what}: needs its terms`)
    if (k?.min !== undefined && (!Number.isInteger(k.min) || k.min < 1)) problems.push(`${what}: min is not a whole number`)
  }
  return problems
}

/**
 * The words `paper` can be found by, each once, folded, sorted and joined by spaces: its title and its text in both
 * languages, with `extras` (such as its citation), without the references. Bare numbers and single letters are left out.
 */
export function wordsOf(paper, extras = []) {
  const parts = [paper.title, ...extras]
  for (const s of paper.sections ?? []) if (s.id !== 'refs') parts.push(s.title?.en, s.title?.es)
  for (const b of body(paper)) parts.push(b.text?.en, b.text?.es)
  const words = new Set()
  for (const part of parts) for (const w of tokens(part)) if (w.length > 1 && /\p{L}/u.test(w)) words.add(w)
  return [...words].sort().join(' ')
}

/**
 * What of `papers` is left by a word `query` (each word must begin a word of the title, a keyword's name or, once
 * loaded, the paper's `words`), by `keywords` (all of them), by `status` ('all', 'read', 'unread') and by `added` (the
 * dates it was added on, any of them; none means every date) and by `levels` (the markers of `queue`, { node: 'first' |
 * 'later' }, that it may carry, any of them; none means every paper).
 */
export function filterPapers(papers, { query = '', keywords = [], status = 'all', read = {}, words = null, labels = {}, added = [], levels = [], queue = {} } = {}) {
  const asked = tokens(query)
  return papers.filter((p) => {
    if (levels.length && !levels.includes(queue[p.node])) return false
    if (status === 'read' && !read[p.node]) return false
    if (status === 'unread' && read[p.node]) return false
    if (added.length && !added.includes(p.added)) return false
    const own = p.keywords ?? []
    if (!keywords.every((k) => own.includes(k))) return false
    if (!asked.length) return true
    const hay = ` ${tokens([p.title, ...own.map((k) => labels[k])].join(' ')).join(' ')} ${words?.[p.node] ?? ''}`
    return asked.every((w) => hay.includes(` ${w}`))
  })
}

/** How many of `papers` have each keyword: { id: count }. */
export function keywordCounts(papers) {
  const counts = {}
  for (const p of papers) for (const k of p.keywords ?? []) counts[k] = (counts[k] ?? 0) + 1
  return counts
}

/** How many of `papers` were added on each date: { 'YYYY-MM-DD': count }. Papers with no date are not counted. */
export function addedCounts(papers) {
  const counts = {}
  for (const p of papers) if (p.added) counts[p.added] = (counts[p.added] ?? 0) + 1
  return counts
}

/**
 * `papers` in the order asked for. 'new' puts the newest added first, 'old' the oldest added first, 'progress' the most
 * read first (100% down to 0%, from `progress`, { node: 0..100 }); papers tied keep their order, and papers with no date
 * go last in the date orders. Any other `order` is the usual one: the papers being read first, the most read of them
 * first; then the ones marked 'first' and the ones marked 'later' in `queue`; then the ones not started; then the
 * finished ones.
 */
export function sortPapers(papers, order = '', progress = {}, queue = {}) {
  const pct = (p) => progress[p.node] ?? 0
  const date = (p) => (p.added ? Date.parse(p.added) : null)
  const byDate = (sign) => (a, b) => {
    const x = date(a)
    const y = date(b)
    if (x === y) return 0
    if (x === null) return 1
    if (y === null) return -1
    return sign * (x - y)
  }
  const group = (p) => (pct(p) >= 100 ? 4 : pct(p) > 0 ? 0 : queue[p.node] === 'first' ? 1 : queue[p.node] === 'later' ? 2 : 3)
  const compare =
    order === 'new'
      ? byDate(-1)
      : order === 'old'
        ? byDate(1)
        : order === 'progress'
          ? (a, b) => pct(b) - pct(a)
          : (a, b) => group(a) - group(b) || (group(a) === 0 ? pct(b) - pct(a) : 0)
  return papers
    .map((p, i) => [p, i])
    .sort(([a, i], [b, j]) => compare(a, b) || i - j)
    .map(([p]) => p)
}
