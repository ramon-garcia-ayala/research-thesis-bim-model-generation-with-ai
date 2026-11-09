/*
 * The bibliography numbers in a paper's text ("[12]", "[9, 30]", "[3–5]"): where they are, what they refer to and the
 * text without them for the voice. A bracket counts only when every number in it is a reference of the paper, so
 * "values in [0, 1]" stays plain text. Pure.
 */
import { blocksOf, textOf } from './paper.js'

const BRACKET = /\[\s*\d+(?:\s*[,;–-]\s*\d+)*\s*\]/g
const URL = /https?:\/\/[^\s<>)\]]+/
const DOI = /\b(?:doi:\s*|)(10\.\d{4,9}\/[^\s<>)\]]+)/i

/** The link a reference gives: its URL, or its DOI; null when it has neither. */
function linkOf(text) {
  // A PDF breaks long links at the end of a line: "https://doi.org/10. 3233/SW-200385".
  const joined = text.replace(/(10\.)\s+(\d{4})/g, '$1$2').replace(/(\/)\s+(?=[\w-]+\/?[\w.-]*[\d/])/g, '$1')
  const url = URL.exec(joined)?.[0]
  if (url) return url.replace(/[.,;]+$/, '')
  const doi = DOI.exec(joined)?.[1]
  return doi ? `https://doi.org/${doi.replace(/[.,;]+$/, '')}` : null
}

/**
 * Where each reference of a text numbered "1. …" starts, in sequence: "2. " only starts one after "1. " and before
 * "3. ", after a closing mark or followed by an author ("Bloch,"), so "Pytorch 2. In: …" is not reference 2.
 */
export function dottedCuts(text) {
  if (!/^\s*1\.\s/.test(text)) return []
  const cuts = [text.search(/\S/)]
  for (let n = 2; ; n++) {
    const m = new RegExp(`(?:[.)\\]]\\s${n}\\.\\s+\\p{L}|\\s${n}\\.\\s+\\p{Lu}[\\p{L}'’.-]*,)`, 'u').exec(text.slice(cuts.at(-1)))
    if (!m) return cuts
    cuts.push(cuts.at(-1) + m.index + m[0].indexOf(String(n)))
  }
}

/** The numbered references of `paper`: number → { id, text, url }. Empty when its references are not numbered. */
export function referencesOf(paper, lang = 'en') {
  const refs = new Map()
  const blocks = blocksOf(paper).filter((b) => b.section === 'refs')
  const add = (n, id, t, skip) => refs.set(n, { id, text: t.slice(skip).trim(), url: linkOf(t) })
  // References in brackets each have their block; those numbered "1." may share one, so they are cut across all.
  for (const b of blocks) {
    const t = textOf(b, lang)
    const m = /^\s*\[(\d+)\]\s*/.exec(t)
    if (m) add(Number(m[1]), b.id, t, m[0].length)
  }
  if (refs.size) return refs
  const all = blocks.map((b) => textOf(b, lang)).join(' ')
  const cuts = dottedCuts(all)
  cuts.forEach((from, i) => {
    const t = all.slice(from, cuts[i + 1] ?? all.length)
    add(i + 1, blocks[0].id, t, /^\d+\.\s*/.exec(t)[0].length)
  })
  return refs
}

/** The numbers a bracket names, a range spelled out: "[3–5, 9]" → [3, 4, 5, 9]. */
const numbersOf = (bracket) => {
  const out = []
  for (const part of bracket.slice(1, -1).split(/[,;]/)) {
    const [a, b] = part.split(/[–-]/).map((x) => Number(x.trim()))
    if (b === undefined) out.push(a)
    else for (let n = a; n <= b && n - a < 100; n++) out.push(n)
  }
  return out
}

/** The citations in `text`, by character range: [{ start, end, numbers }]. `refs` is what referencesOf returns. */
export function citationsIn(text, refs) {
  if (!refs?.size) return []
  const out = []
  for (const m of text.matchAll(BRACKET)) {
    const numbers = numbersOf(m[0])
    if (numbers.length && numbers.every((n) => refs.has(n))) out.push({ start: m.index, end: m.index + m[0].length, numbers })
  }
  return out
}

/** `text` as the voice says it: without its citations, or the space before them. */
export function withoutCitations(text, refs) {
  let out = ''
  let at = 0
  for (const c of citationsIn(text, refs)) {
    out += text.slice(at, c.start).replace(/\s+$/, '')
    at = c.end
  }
  return out + text.slice(at)
}

/** The numbers of the citations in `text` as character ranges: [{ start, end, numbers }], one per number or range. */
export function citedNumbers(text, refs) {
  const out = []
  let at = 0
  for (const r of citationRuns(text, refs)) {
    if (r.cite) out.push({ start: at, end: at + r.text.length, numbers: r.cite })
    at += r.text.length
  }
  return out
}

/** `text` split into plain runs and the citation numbers inside its brackets, keeping every character in order. */
export function citationRuns(text, refs) {
  const runs = []
  let at = 0
  const plain = (to) => {
    if (to > at) runs.push({ text: text.slice(at, to) })
    at = to
  }
  for (const c of citationsIn(text, refs)) {
    plain(c.start)
    for (const m of text.slice(c.start, c.end).matchAll(/\d+(?:\s*[–-]\s*\d+)?/g)) {
      plain(c.start + m.index)
      runs.push({ text: m[0], cite: numbersOf(`[${m[0]}]`) })
      at = c.start + m.index + m[0].length
    }
    plain(c.end)
  }
  plain(text.length)
  return runs
}
