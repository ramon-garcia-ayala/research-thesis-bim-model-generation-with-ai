/*
 * The checker Claude runs before every commit: the data is valid, every source file and note exists, no note is
 * orphaned, every note entry has a real date, every prepared paper (papers/<node-id>/) is valid with its figures and
 * its graph, and papers/index.json and papers/words.json are up to date.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { isDate, validate } from '../assets/model.js'
import { keywordsOf, validateVocabulary, wordsOf } from '../assets/library.js'
import { blocksOf, untranslated, validateGraph, validatePaper } from '../assets/paper.js'

const ENTRY_HEADING = /^## (\S+) · /

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
const paperDirs = (dir) =>
  existsSync(join(dir, 'papers'))
    ? readdirSync(join(dir, 'papers'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
    : []

/** The keywords a paper can have (papers/keywords.json); none while there is no usable vocabulary. */
function vocabularyOf(dir) {
  try {
    const vocabulary = readJson(join(dir, 'papers', 'keywords.json'))
    return validateVocabulary(vocabulary).length ? [] : vocabulary
  } catch {
    return []
  }
}

/** What papers/index.json must hold: the keywords on offer and one entry per prepared paper folder, with the date its node was added to the map. */
export function indexPapers(dir) {
  const vocabulary = vocabularyOf(dir)
  let nodes = []
  try {
    nodes = readJson(join(dir, 'map.json')).nodes ?? []
  } catch {}
  const papers = []
  for (const id of paperDirs(dir)) {
    let paper
    try {
      paper = readJson(join(dir, 'papers', id, 'paper.json'))
    } catch {
      continue
    }
    const added = nodes.find((n) => n.id === id)?.date
    papers.push({
      node: id,
      title: paper.title,
      ...(added ? { added } : {}),
      figures: blocksOf(paper).filter((b) => b.image).length,
      es: untranslated(paper).length === 0,
      graph: existsSync(join(dir, 'papers', id, 'graph.json')),
      keywords: keywordsOf(paper, vocabulary),
    })
  }
  return { keywords: vocabulary.map(({ id, label }) => ({ id, label })), papers }
}

/** What papers/words.json must hold: the words each prepared paper can be found by, its map title and citation included. */
export function indexWords(dir) {
  let nodes = []
  try {
    nodes = readJson(join(dir, 'map.json')).nodes ?? []
  } catch {}
  const words = {}
  for (const id of paperDirs(dir)) {
    let paper
    try {
      paper = readJson(join(dir, 'papers', id, 'paper.json'))
    } catch {
      continue
    }
    const node = nodes.find((n) => n.id === id)
    words[id] = wordsOf(paper, [node?.title, node?.cite])
  }
  return { words }
}

/** Rewrites papers/index.json and papers/words.json; returns the index. */
export function writeIndexes(dir) {
  const index = indexPapers(dir)
  writeFileSync(join(dir, 'papers', 'index.json'), `${JSON.stringify(index, null, 2)}\n`)
  writeFileSync(join(dir, 'papers', 'words.json'), `${JSON.stringify(indexWords(dir), null, 2)}\n`)
  return index
}

/** The problems of the prepared papers in `dir`/papers, against the map's nodes. */
function checkPapers(dir, nodes) {
  const problems = []
  const ids = new Set(nodes.map((n) => n.id))
  const paperIds = new Set(nodes.filter((n) => n.kind === 'paper').map((n) => n.id))
  const folders = paperDirs(dir)
  for (const id of folders) {
    const where = `papers/${id}`
    if (!paperIds.has(id)) problems.push(`${where}: no paper node has this id`)
    let paper
    try {
      paper = readJson(join(dir, where, 'paper.json'))
    } catch (e) {
      problems.push(`${where}/paper.json cannot be read: ${e.message}`)
      continue
    }
    for (const p of validatePaper(paper, id)) problems.push(`${where}/paper.json: ${p}`)
    for (const b of blocksOf(paper))
      if (typeof b.image === 'string' && !existsSync(join(dir, where, b.image))) problems.push(`${where}/paper.json: ${b.image} is missing`)
    if (!existsSync(join(dir, where, 'graph.json'))) continue
    try {
      for (const p of validateGraph(readJson(join(dir, where, 'graph.json')), paper, ids)) problems.push(`${where}/graph.json: ${p}`)
    } catch (e) {
      problems.push(`${where}/graph.json: cannot be read: ${e.message}`)
    }
  }
  if (folders.length > 0) {
    let index = null
    try {
      index = readJson(join(dir, 'papers', 'index.json'))
    } catch {}
    if (!isDeepStrictEqual(index, indexPapers(dir))) problems.push('papers/index.json does not match the papers folders')
    let words = null
    try {
      words = readJson(join(dir, 'papers', 'words.json'))
    } catch {}
    if (!isDeepStrictEqual(words, indexWords(dir))) problems.push('papers/words.json does not match the papers folders')
  }
  if (existsSync(join(dir, 'papers', 'keywords.json'))) {
    try {
      for (const p of validateVocabulary(readJson(join(dir, 'papers', 'keywords.json')))) problems.push(`papers/keywords.json: ${p}`)
    } catch (e) {
      problems.push(`papers/keywords.json: cannot be read: ${e.message}`)
    }
  }
  return problems
}

/** The problems of the map folder at `dir`; empty when it is ready to commit. */
export function checkFolder(dir) {
  let map
  try {
    map = JSON.parse(readFileSync(join(dir, 'map.json'), 'utf8'))
  } catch (e) {
    return [`map.json cannot be read: ${e.message}`]
  }
  const problems = validate(map)
  const nodes = Array.isArray(map.nodes) ? map.nodes : []

  for (const n of nodes) {
    if (n.source?.file && !existsSync(join(dir, n.source.file)))
      problems.push(`node "${n.id}": source ${n.source.file} is not in the folder`)
    const note = `notes/${n.id}.md`
    if (!existsSync(join(dir, note))) {
      problems.push(`node "${n.id}": ${note} is missing`)
      continue
    }
    for (const line of readFileSync(join(dir, note), 'utf8').split(/\r?\n/)) {
      const m = ENTRY_HEADING.exec(line)
      if (m && !isDate(m[1])) problems.push(`${note}: entry date "${m[1]}" is not a real YYYY-MM-DD`)
    }
  }

  const ids = new Set(nodes.map((n) => n.id))
  const notesDir = join(dir, 'notes')
  if (existsSync(notesDir))
    for (const f of readdirSync(notesDir))
      if (f.endsWith('.md') && !ids.has(f.slice(0, -3))) problems.push(`notes/${f}: no node has this id`)

  problems.push(...checkPapers(dir, nodes))
  return problems
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkFolder(process.cwd())
  for (const p of problems) console.error(p)
  console.log(problems.length === 0 ? 'map OK' : `${problems.length} problem(s)`)
  process.exit(problems.length === 0 ? 0 : 1)
}
