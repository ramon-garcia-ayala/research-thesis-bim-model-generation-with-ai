import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkFolder, indexPapers, indexWords } from '../scripts/check.mjs'

const map = {
  version: 1,
  lastPresentation: null,
  centre: { question: [], hypothesis: [] },
  groups: [{ id: 'datasets', title: 'Datasets', colour: 'g1', date: '2026-10-18' }],
  nodes: [
    {
      id: 'procthor', kind: 'paper', group: 'datasets', title: 'ProcTHOR', date: '2026-10-18',
      source: { file: 'files/procthor.pdf', original: 'I:\\Papers\\procthor.pdf' },
    },
  ],
  links: [],
}

/** A map folder with the given files; returns its path. */
const folder = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'research-map-'))
  mkdirSync(join(dir, 'notes'))
  mkdirSync(join(dir, 'files'))
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  return dir
}

describe('checkFolder', () => {
  it('a complete folder passes', () => {
    const dir = folder({ 'map.json': JSON.stringify(map), 'notes/procthor.md': '## 2026-10-18 · Summary\nx', 'files/procthor.pdf': '%PDF' })
    expect(checkFolder(dir)).toEqual([])
  })

  it('a missing source file, a missing note and an orphan note are each named', () => {
    const dir = folder({ 'map.json': JSON.stringify(map), 'notes/atlas.md': '' })
    const problems = checkFolder(dir).join('\n')
    expect(problems).toMatch(/procthor.*files\/procthor\.pdf/)
    expect(problems).toMatch(/procthor.*notes\/procthor\.md/)
    expect(problems).toMatch(/notes\/atlas\.md.*no node/)
  })

  it('a note entry with a bad date is named', () => {
    const dir = folder({ 'map.json': JSON.stringify(map), 'notes/procthor.md': '## 2026-02-30 · Summary\nx', 'files/procthor.pdf': '' })
    expect(checkFolder(dir).join('\n')).toMatch(/notes\/procthor\.md.*2026-02-30/)
  })

  it('invalid JSON is one problem, not a crash', () => {
    expect(checkFolder(folder({ 'map.json': '{ nope' }))[0]).toMatch(/map\.json/)
  })

  describe('papers', () => {
    const paper = {
      version: 1, node: 'procthor', title: 'ProcTHOR', source: 'files/procthor.pdf',
      sections: [{ id: 's1', title: { en: '1 Intro' }, blocks: [
        { id: 's1-p1', type: 'paragraph', page: 1, text: { en: 'Houses.' } },
        { id: 'fig-1', type: 'figure', page: 1, image: 'fig/fig-1.png', text: { en: 'Figure 1: A house.' } },
      ] }],
    }
    const graph = {
      version: 1, node: 'procthor', built: { date: '2026-10-22', model: 'claude-sonnet-5-5', effort: 'xhigh' },
      ideas: [{ id: 'i1', kind: 'claim', en: 'Houses.', es: 'Casas.', blocks: ['s1-p1'], origin: 'read' }], edges: [], thesis: [],
    }
    const index = { keywords: [], papers: [{ node: 'procthor', title: 'ProcTHOR', figures: 1, es: false, graph: true, keywords: [] }] }
    /** A complete folder with ProcTHOR prepared, changed by `files`. */
    const prepared = (files = {}) => {
      const dir = folder({
        'map.json': JSON.stringify(map), 'notes/procthor.md': '## 2026-10-18 · Summary\nx', 'files/procthor.pdf': '%PDF',
        'papers/procthor/paper.json': JSON.stringify(paper), 'papers/procthor/graph.json': JSON.stringify(graph),
        'papers/procthor/fig/fig-1.png': 'png', 'papers/index.json': JSON.stringify(index), ...files,
      })
      if (!files['papers/words.json']) writeFileSync(join(dir, 'papers/words.json'), JSON.stringify(indexWords(dir)))
      return dir
    }

    it('passes a prepared paper', () => expect(checkFolder(prepared())).toEqual([]))

    it('indexes what the folders hold', () => expect(indexPapers(prepared())).toEqual(index))

    it('names a papers folder with no paper node', () => {
      const ghost = { ...paper, node: 'ghost' }
      const dir = prepared({ 'papers/ghost/paper.json': JSON.stringify(ghost) })
      writeFileSync(join(dir, 'papers/index.json'), JSON.stringify(indexPapers(dir)))
      expect(checkFolder(dir)).toContain('papers/ghost: no paper node has this id')
    })

    it('names a missing figure image', () => {
      const dir = prepared()
      rmSync(join(dir, 'papers/procthor/fig/fig-1.png'))
      expect(checkFolder(dir)).toContain('papers/procthor/paper.json: fig/fig-1.png is missing')
    })

    it('names an invalid graph', () => {
      const bad = { ...graph, ideas: [{ ...graph.ideas[0], blocks: ['s9-p9'] }] }
      const problems = checkFolder(prepared({ 'papers/procthor/graph.json': JSON.stringify(bad) }))
      expect(problems.some((p) => p.startsWith('papers/procthor/graph.json: '))).toBe(true)
    })

    it('gives each paper the keywords of papers/keywords.json, and offers their names', () => {
      const keywords = [{ id: 'houses', label: 'Houses', terms: ['houses'], min: 1 }, { id: 'ifc', label: 'IFC', terms: ['ifc'] }]
      const dir = prepared({ 'papers/keywords.json': JSON.stringify(keywords) })
      expect(indexPapers(dir).keywords).toEqual([{ id: 'houses', label: 'Houses' }, { id: 'ifc', label: 'IFC' }])
      expect(indexPapers(dir).papers[0].keywords).toEqual(['houses'])
    })

    it('holds the words of each paper, with its citation', () => {
      expect(indexWords(prepared()).words.procthor).toContain('houses')
    })

    it('names stale searchable words', () => {
      expect(checkFolder(prepared({ 'papers/words.json': JSON.stringify({ words: {} }) }))).toContain(
        'papers/words.json does not match the papers folders',
      )
    })

    it('names a malformed vocabulary', () => {
      const dir = prepared({ 'papers/keywords.json': JSON.stringify([{ id: 'x' }]) })
      expect(checkFolder(dir).some((p) => p.startsWith('papers/keywords.json: '))).toBe(true)
    })

    it('names a stale papers/index.json', () => {
      const stale = { papers: [{ ...index.papers[0], graph: false }] }
      expect(checkFolder(prepared({ 'papers/index.json': JSON.stringify(stale) }))).toContain(
        'papers/index.json does not match the papers folders',
      )
    })
  })
})
