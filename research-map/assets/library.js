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
 * loaded, the paper's `words`), by `keywords` (all of them) and by `status` ('all', 'read', 'unread').
 */
export function filterPapers(papers, { query = '', keywords = [], status = 'all', read = {}, words = null, labels = {} } = {}) {
  const asked = tokens(query)
  return papers.filter((p) => {
    if (status === 'read' && !read[p.node]) return false
    if (status === 'unread' && read[p.node]) return false
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
