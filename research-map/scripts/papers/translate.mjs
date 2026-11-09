/*
 * Translate a prepared paper to Spanish with Claude, block by block, a section or so per call. A block whose numbers
 * come back changed is asked again on its own and, if still changed, left in English and listed. Progress is written
 * after every call. Run by Claude from Claude Code: `npm run paper:translate -- <node-id>`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { untranslated, validatePaper } from '../../assets/paper.js'
import { writeIndexes } from '../check.mjs'
import { runClaude } from '../lib/claude.mjs'
import { extractJson } from '../lib/json.mjs'
import { sameNumbers } from './numbers.mjs'

export { untranslated }

const MODEL = { model: 'claude-sonnet-5-5', effort: process.env.PAPER_EFFORT || 'medium', tools: [] }
const TYPES = ['paragraph', 'heading', 'figure', 'table']
const words = (t) => t.split(/\s+/).filter(Boolean).length

/**
 * What still needs Spanish, in calls of about `maxWords` English words: section titles ("<section>#title") and the
 * paragraph, heading and caption blocks of every section but the references; a section is split only when it alone
 * is longer than `maxWords`.
 */
export function batches(paper, maxWords = 2500) {
  const out = []
  let cur = { items: [], words: 0 }
  const flush = () => {
    if (cur.items.length) out.push({ items: cur.items })
    cur = { items: [], words: 0 }
  }
  for (const s of paper.sections) {
    if (s.id === 'refs') continue
    const items = []
    if (!s.title.es) items.push({ id: `${s.id}#title`, text: s.title.en })
    for (const b of s.blocks) if (TYPES.includes(b.type) && !b.text.es) items.push({ id: b.id, text: b.text.en })
    const size = items.reduce((n, i) => n + words(i.text), 0)
    if (items.length === 0) continue
    if (cur.words + size > maxWords) flush()
    if (size <= maxWords) {
      cur.items.push(...items)
      cur.words += size
      continue
    }
    for (const it of items) {
      if (cur.words + words(it.text) > maxWords) flush()
      cur.items.push(it)
      cur.words += words(it.text)
    }
  }
  flush()
  return out
}

/** The instructions and the text of one translation call. */
export function translatePrompt(items) {
  const system = [
    'You translate passages of a research paper from English into Spanish (Mexico) for a reader who studies it.',
    'Rules:',
    '- Numbers never change. Keep every number, unit, percentage and formula exactly as written: same digits, same decimal point, same thousands separator. Never write a number as a word or a word as a number.',
    '- Keep proper names, citations such as [63], dataset names, model names, product names and code identifiers unchanged.',
    '- The first time a technical term appears, write the Spanish term followed by the English one in parentheses; afterwards use the Spanish term alone.',
    '- Translate the meaning faithfully: do not add, drop, soften or summarise anything. Keep figure and table captions as captions ("Figura 3: …", "Tabla 2: …").',
    '- Section titles keep their numbering ("3 Generación procedural").',
    'Reply with one JSON object mapping each id to its Spanish text, with exactly the ids you were given, and nothing else.',
  ].join('\n')
  const prompt = `Translate each value of this JSON object into Spanish:\n${JSON.stringify(Object.fromEntries(items.map((i) => [i.id, i.text])), null, 1)}`
  return { system, prompt }
}

/** The paper with the Spanish of `byId` filled in (section titles by "<section>#title"); a new object. */
export function applyTranslation(paper, byId) {
  const p = structuredClone(paper)
  for (const s of p.sections) {
    if (typeof byId[`${s.id}#title`] === 'string') s.title.es = byId[`${s.id}#title`]
    for (const b of s.blocks) if (typeof byId[b.id] === 'string') b.text.es = byId[b.id]
  }
  return p
}

const writeJson = (file, data) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)

/** Translate what paper `nodeId` still lacks in Spanish; returns how many items were translated and which were not. */
export async function translate(nodeId, { root = process.cwd(), claude = runClaude, maxWords = 2500 } = {}) {
  const file = join(root, 'papers', nodeId, 'paper.json')
  let paper = JSON.parse(readFileSync(file, 'utf8'))
  const ask = async (items) => {
    const { system, prompt } = translatePrompt(items)
    return extractJson(await claude({ ...MODEL, system, prompt, cwd: root }))
  }
  const save = () => {
    const problems = validatePaper(paper, nodeId)
    if (problems.length) throw new Error(`the translated paper is not valid:\n${problems.join('\n')}`)
    writeJson(file, paper)
    writeIndexes(root)
  }

  let translated = 0
  const mismatched = []
  for (const { items } of batches(paper, maxWords)) {
    const reply = await ask(items)
    const good = {}
    const again = []
    for (const it of items) {
      if (typeof reply[it.id] === 'string' && reply[it.id].trim() && sameNumbers(it.text, reply[it.id])) good[it.id] = reply[it.id]
      else again.push(it)
    }
    for (const it of again) {
      const retry = await ask([it])
      if (typeof retry[it.id] === 'string' && retry[it.id].trim() && sameNumbers(it.text, retry[it.id])) good[it.id] = retry[it.id]
      else mismatched.push(it.id)
    }
    paper = applyTranslation(paper, good)
    translated += Object.keys(good).length
    save()
  }
  return { translated, mismatched }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const id = process.argv[2]
  if (!id) {
    console.error('usage: node scripts/papers/translate.mjs <node-id>')
    process.exit(2)
  }
  const r = await translate(id)
  console.log(`${id}: ${r.translated} translated; numbers changed (left in English): ${r.mismatched.join(', ') || 'none'}`)
}
