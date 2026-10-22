/*
 * A prepared paper (papers/<node-id>/paper.json) and its idea graph (graph.json): what a valid one is, and the small
 * helpers the reader, the voice and the companion share. Pure: no DOM, no files.
 */
import { isDate } from './model.js'

export const LANGS = ['en', 'es']
export const BLOCK_TYPES = ['heading', 'paragraph', 'figure', 'table', 'equation']
export const IDEA_KINDS = ['concept', 'question', 'method', 'dataset', 'result', 'claim', 'limitation', 'future']
export const EDGE_TYPES = ['uses', 'measures', 'supports', 'contradicts', 'part-of', 'example-of']

const ID = /^[a-z0-9][a-z0-9-]*$/
const IMAGE = /^fig\/[a-z0-9][a-z0-9-]*\.png$/
const KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/
const blank = (s) => typeof s !== 'string' || s.trim() === ''
const list = (x) => (Array.isArray(x) ? x : [])

/** Every block in document order, each with the id of its section added. */
export const blocksOf = (paper) =>
  list(paper?.sections).flatMap((s) => list(s?.blocks).map((b) => ({ ...b, section: s.id })))

/** A block's text (or a section's title) in `lang`, falling back to English. */
export const textOf = (x, lang) => {
  const t = x?.text ?? x?.title ?? {}
  return t[lang] ?? t.en ?? ''
}

/** What still lacks Spanish: section titles as "<section>#title", then block ids; references and equations excepted. */
export function untranslated(paper) {
  const missing = []
  for (const s of list(paper?.sections)) {
    if (s.id === 'refs') continue
    if (blank(s.title?.es)) missing.push(`${s.id}#title`)
    for (const b of list(s.blocks)) if (b.type !== 'equation' && blank(b.text?.es)) missing.push(b.id)
  }
  return missing
}

/** The problems of a paper.json, one line each; empty when it is valid. */
export function validatePaper(paper, nodeId) {
  if (!paper || typeof paper !== 'object') return ['paper.json is not an object']
  const problems = []
  if (paper.version !== 1) problems.push('paper.json: version is not 1')
  if (paper.node !== nodeId) problems.push(`paper.json is for "${paper.node}", not "${nodeId}"`)
  if (blank(paper.title)) problems.push('paper.json: no title')
  if (blank(paper.source)) problems.push('paper.json: no source')
  if (!Array.isArray(paper.sections)) return [...problems, 'sections is not a list']

  const seen = new Set()
  const claim = (what, id) => {
    if (!ID.test(id ?? '')) problems.push(`${what} id "${id}" is not lowercase letters, digits and dashes`)
    if (seen.has(id)) problems.push(`${what} "${id}": duplicate id`)
    seen.add(id)
  }
  const langs = (what, t) => {
    for (const l of Object.keys(t ?? {})) if (!LANGS.includes(l)) problems.push(`${what}: language "${l}" is not one of ${LANGS.join(', ')}`)
  }

  for (const s of paper.sections) {
    claim('section', s?.id)
    if (blank(s?.title?.en)) problems.push(`section "${s?.id}": no English title`)
    langs(`section "${s?.id}"`, s?.title)
    if (!Array.isArray(s?.blocks)) {
      problems.push(`section "${s?.id}": blocks is not a list`)
      continue
    }
    for (const b of s.blocks) {
      const what = `block "${b?.id}"`
      claim('block', b?.id)
      if (!BLOCK_TYPES.includes(b?.type)) problems.push(`${what}: type "${b?.type}" is not one of ${BLOCK_TYPES.join(', ')}`)
      if (!Number.isInteger(b?.page) || b.page < 1) problems.push(`${what}: page is not a page number`)
      if (blank(b?.text?.en)) problems.push(`${what}: no English text`)
      langs(what, b?.text)
      if (b?.type === 'figure' || b?.type === 'table') {
        if (blank(b.image)) problems.push(`${what}: a ${b.type} needs an image`)
        else if (!IMAGE.test(b.image)) problems.push(`${what}: image "${b.image}" is not fig/<name>.png`)
      } else if (b?.image !== undefined) problems.push(`${what}: only a figure or a table has an image`)
    }
  }
  return problems
}

/** The problems of a graph.json against its paper and the map's node ids; empty when it is valid. */
export function validateGraph(graph, paper, mapIds) {
  if (!graph || typeof graph !== 'object') return ['graph.json is not an object']
  const problems = []
  if (graph.version !== 1) problems.push('graph.json: version is not 1')
  if (graph.node !== paper?.node) problems.push(`graph.json is for "${graph.node}", not "${paper?.node}"`)
  if (!isDate(graph.built?.date) || blank(graph.built?.model)) problems.push('graph.json: built needs a date and a model')

  const blockIds = new Set(blocksOf(paper).map((b) => b.id))
  const ideaIds = new Set()
  for (const i of list(graph.ideas)) {
    const what = `idea "${i?.id}"`
    if (!/^i\d+$/.test(i?.id ?? '')) problems.push(`${what}: id is not i<number>`)
    if (ideaIds.has(i?.id)) problems.push(`${what}: duplicate id`)
    ideaIds.add(i?.id)
    if (!IDEA_KINDS.includes(i?.kind)) problems.push(`${what}: kind "${i?.kind}" is not one of ${IDEA_KINDS.join(', ')}`)
    if (i?.key !== undefined && !KEY.test(i.key)) problems.push(`${what}: key "${i.key}" is not kebab-case`)
    if (blank(i?.en) || blank(i?.es)) problems.push(`${what}: needs English and Spanish`)
    if (list(i?.blocks).length === 0) problems.push(`${what}: rests on no block`)
    for (const b of list(i?.blocks)) if (!blockIds.has(b)) problems.push(`${what}: block "${b}" is not in paper.json`)
    if (i?.origin !== 'read' && i?.origin !== 'question') problems.push(`${what}: origin "${i?.origin}" is not read or question`)
    if (i?.origin === 'question' && !isDate(i.date)) problems.push(`${what}: an idea from a question needs a date`)
  }
  if (!Array.isArray(graph.ideas)) problems.push('ideas is not a list')

  for (const e of list(graph.edges)) {
    const what = `edge "${e?.from}" → "${e?.to}"`
    for (const end of [e?.from, e?.to]) if (!ideaIds.has(end)) problems.push(`${what}: idea "${end}" does not exist`)
    if (!EDGE_TYPES.includes(e?.type)) problems.push(`${what}: type "${e?.type}" is not one of ${EDGE_TYPES.join(', ')}`)
    if (blank(e?.why)) problems.push(`${what}: no why`)
  }
  for (const t of list(graph.thesis)) {
    const what = `thesis "${t?.idea}" → "${t?.to}"`
    if (!ideaIds.has(t?.idea)) problems.push(`${what}: idea "${t?.idea}" does not exist`)
    if (t?.to !== 'question' && t?.to !== 'hypothesis' && !mapIds.has(t?.to))
      problems.push(`${what}: not question, hypothesis or a map node`)
    if (blank(t?.why)) problems.push(`${what}: no why`)
  }
  return problems
}

/**
 * How a block is cited: "3.2" for the second paragraph of the third section, "Fig. 3" and "Table 2" for figures and
 * tables, the section's number for a heading or an equation.
 */
export function paraLabel(paper, blockId) {
  const sections = list(paper?.sections)
  for (let si = 0; si < sections.length; si++) {
    const blocks = list(sections[si].blocks)
    const b = blocks.find((x) => x.id === blockId)
    if (!b) continue
    const n = /-(\d+)$/.exec(b.id)?.[1]
    if (b.type === 'figure') return `Fig. ${n ?? ''}`.trim()
    if (b.type === 'table') return `Table ${n ?? ''}`.trim()
    if (b.type !== 'paragraph') return `${si + 1}`
    return `${si + 1}.${blocks.filter((x) => x.type === 'paragraph').indexOf(b) + 1}`
  }
  return blockId
}

const ABBREVIATIONS = new Set(['e.g', 'i.e', 'et', 'al', 'fig', 'figs', 'eq', 'eqs', 'tab', 'vs', 'cf', 'approx', 'no', 'sec'])
const ENDS = '.!?…'
const CLOSERS = '"”’\')]»'

/**
 * The sentences of a text as character ranges, for reading aloud one at a time. A sentence ends at . ! ? or … followed
 * by a space, unless the dot closes an abbreviation (e.g., et al., Fig.) or a single letter (an initial); a ¿ or ¡
 * after a space always opens a new one.
 */
export function sentences(text) {
  const out = []
  let start = 0
  const push = (end) => {
    while (start < end && /\s/.test(text[start])) start++
    if (start < end) out.push({ start, end })
    start = end
  }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if ((c === '¿' || c === '¡') && i > 0 && /\s/.test(text[i - 1])) {
      push(i)
      continue
    }
    if (!ENDS.includes(c)) continue
    let end = i + 1
    while (end < text.length && (ENDS.includes(text[end]) || CLOSERS.includes(text[end]))) end++
    if (end < text.length && !/\s/.test(text[end])) continue
    if (c === '.') {
      const token = /(\S+)$/.exec(text.slice(start, i))?.[1].replace(/^[("'“‘[]+/, '').toLowerCase() ?? ''
      const next = /\S/.exec(text.slice(end))?.[0]
      const opens = next === '¿' || next === '¡'
      if (!opens && (ABBREVIATIONS.has(token) || /^\p{L}$/u.test(token))) continue
    }
    push(end)
    i = end - 1
  }
  push(text.length)
  return out
}

/** The graph with `ideas` (found answering a question) added after the existing ones; a new object. */
export function mergeIdeas(graph, ideas, date) {
  let n = Math.max(0, ...list(graph.ideas).map((i) => Number(/^i(\d+)$/.exec(i.id)?.[1] ?? 0)))
  const added = ideas.map(({ id, origin, date: _, ...idea }) => ({ id: `i${++n}`, ...idea, origin: 'question', date }))
  return { ...graph, ideas: [...list(graph.ideas), ...added] }
}
