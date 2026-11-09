import { describe, expect, it } from 'vitest'
import { filterPapers, fold, keywordCounts, keywordsOf, wordsOf } from '../assets/library.js'

const paper = (title, en, es = '') => ({
  version: 1,
  node: 'x',
  title,
  source: 'files/x.pdf',
  sections: [
    { id: 's1', title: { en: 'One', es: 'Uno' }, blocks: [{ id: 's1-p1', type: 'paragraph', page: 1, text: { en, es } }] },
    { id: 'refs', title: { en: 'References' }, blocks: [{ id: 'refs-1', type: 'paragraph', page: 2, text: { en: '[1] Revit Revit Revit Revit Revit Revit' } }] },
  ],
})

const vocabulary = [
  { id: 'ifc', label: 'IFC', terms: ['ifc', 'industry foundation classes'] },
  { id: 'revit', label: 'Revit', terms: ['revit'] },
  { id: 'gnn', label: 'Graph neural networks', terms: ['gnn', 'gnns', 'graph neural network', 'graph neural networks'], min: 2 },
]

describe('fold', () => {
  it('ignores case, accents and ligatures', () => {
    expect(fold('Clasificación de ﬁguras')).toBe('clasificacion de figuras')
  })
})

describe('keywordsOf', () => {
  it('takes a keyword named in the title', () => {
    expect(keywordsOf(paper('Mining IFC files', 'nothing here'), vocabulary)).toEqual(['ifc'])
  })

  it('takes a keyword the text uses often enough, and not one it only mentions', () => {
    const often = 'IFC and more. '.repeat(5)
    expect(keywordsOf(paper('A title', often), vocabulary)).toEqual(['ifc'])
    expect(keywordsOf(paper('A title', 'IFC and more. '.repeat(4)), vocabulary)).toEqual([])
  })

  it('lets a keyword set its own threshold', () => {
    expect(keywordsOf(paper('A title', 'A GNN and other GNNs.'), vocabulary)).toEqual(['gnn'])
  })

  it('counts whole words and phrases, across a line break', () => {
    expect(keywordsOf(paper('A title', 'specific specifically ifcs'), vocabulary)).toEqual([])
    expect(keywordsOf(paper('Industry\nfoundation classes', 'x'), vocabulary)).toEqual(['ifc'])
  })

  it('does not count the references', () => {
    expect(keywordsOf(paper('A title', 'x'), vocabulary)).toEqual([])
  })
})

describe('wordsOf', () => {
  it('holds each word once, folded and sorted, from the title, the text in both languages and extras', () => {
    expect(wordsOf(paper('Grafos', 'Graph of graph', 'Grafo de la Clasificación'), ['Hornung (2025)'])).toBe(
      'clasificacion de grafo grafos graph hornung la of one uno',
    )
  })

  it('leaves the references out', () => {
    expect(wordsOf(paper('T', 'x'))).not.toContain('revit')
  })
})

describe('filterPapers', () => {
  const papers = [
    { node: 'a', title: 'IFC to graphs', keywords: ['ifc', 'graph'] },
    { node: 'b', title: 'Clasificación de planos', keywords: ['plans'] },
    { node: 'c', title: 'Revit families', keywords: ['revit', 'ifc'] },
  ]
  const nodes = (filter) => filterPapers(papers, filter).map((p) => p.node)

  it('gives all with no filter', () => expect(nodes({})).toEqual(['a', 'b', 'c']))

  it('finds a word of the title, ignoring accents and case', () => {
    expect(nodes({ query: 'CLASIFICACION' })).toEqual(['b'])
  })

  it('finds a word of the text once the words are loaded, by the beginning of the word', () => {
    const words = { a: 'alpha beta', b: 'beta gamma', c: 'delta' }
    expect(nodes({ query: 'bet', words })).toEqual(['a', 'b'])
    expect(nodes({ query: 'eta', words })).toEqual([])
  })

  it('needs every word of the query', () => {
    const words = { a: 'alpha beta', b: 'beta gamma', c: 'delta' }
    expect(nodes({ query: 'beta gamma', words })).toEqual(['b'])
  })

  it('finds the name of a keyword', () => {
    const labels = { plans: 'Floor plans' }
    expect(nodes({ query: 'floor', labels })).toEqual(['b'])
  })

  it('needs every keyword chosen', () => {
    expect(nodes({ keywords: ['ifc'] })).toEqual(['a', 'c'])
    expect(nodes({ keywords: ['ifc', 'revit'] })).toEqual(['c'])
  })

  it('separates read from unread', () => {
    const read = { a: '2026-11-08' }
    expect(nodes({ status: 'read', read })).toEqual(['a'])
    expect(nodes({ status: 'unread', read })).toEqual(['b', 'c'])
    expect(nodes({ status: 'all', read })).toEqual(['a', 'b', 'c'])
  })

  it('combines all of them', () => {
    const read = { c: '2026-11-08' }
    expect(nodes({ query: 'ifc', keywords: ['ifc'], status: 'unread', read })).toEqual(['a'])
  })
})

describe('keywordCounts', () => {
  it('counts the papers given under each keyword', () => {
    const papers = [{ keywords: ['ifc', 'graph'] }, { keywords: ['ifc'] }, {}]
    expect(keywordCounts(papers)).toEqual({ ifc: 2, graph: 1 })
  })
})
