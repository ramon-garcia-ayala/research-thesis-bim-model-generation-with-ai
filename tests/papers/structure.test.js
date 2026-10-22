import { describe, expect, it } from 'vitest'
import { validatePaper } from '../../assets/paper.js'
import { captionOf, dropContents, dropRunning, figureRegion, joinLines, orderBlocks, structure } from '../../scripts/papers/structure.mjs'
import { blk, caption, first, page, prose, raw, texts } from './sample-dump.js'

describe('cleaning a page', () => {
  it('drops a header repeated on every page and the page numbers', () => {
    const pages = [1, 2, 3, 4].map((n) =>
      page(n, [blk([100, 20, 500, 30], 'Preprint. Under review.'), prose([40, 60, 570, 300], `Page ${n} body.`), blk([300, 760, 310, 770], String(n))]))
    const kept = texts(dropRunning(pages))
    expect(kept).not.toContain('Preprint. Under review.')
    expect(kept).not.toContain('2')
    expect(kept.some((t) => t.startsWith('Page 3 body.'))).toBe(true)
  })

  it('drops the arXiv side stamp', () =>
    expect(texts(dropRunning([page(1, [blk([10, 220, 37, 560], 'arXiv:2206.06994v1 [cs.AI] 14 Jun 2022', 20)])]))).toEqual([]))

  it('drops a table of contents', () => {
    const toc = ['A ProcTHOR Assets 18', 'B House Generation 18', 'B.1 Examples . . . . . . . 18', 'B.1.1 3-Room Houses . . . . 19', 'B.2 Room Specs . . . . . 24']
    const pages = [page(16, [blk([108, 400, 157, 412], 'Appendix', 12, true), ...toc.map((t, i) => blk([108, 436 + 20 * i, 504, 446 + 20 * i], t))])]
    expect(texts(dropContents(pages))).toEqual(['Appendix'])
  })

  it('keeps a numbered heading that is not part of a contents list', () =>
    expect(texts(dropContents([page(1, [blk([40, 60, 290, 75], '2 Method', 12, true)])]))).toEqual(['2 Method']))

  it('reads the left column before the right one', () => {
    const twoColumnPage = page(1, [
      blk([320, 210, 570, 300], 'R2'), blk([40, 80, 290, 200], 'L1'), blk([40, 40, 570, 60], 'Title'),
      blk([320, 80, 570, 200], 'R1'), blk([40, 210, 290, 300], 'L2'),
    ])
    expect(orderBlocks(twoColumnPage).map(first)).toEqual(['Title', 'L1', 'L2', 'R1', 'R2'])
  })

  it('keeps a narrow block centred across the middle in the flow', () => {
    const single = page(1, [blk([108, 300, 505, 400], 'P2'), blk([181, 241, 430, 251], 'Caption'), blk([108, 100, 505, 230], 'P1')])
    expect(orderBlocks(single).map(first)).toEqual(['P1', 'Caption', 'P2'])
  })

  it('joins hyphenated words but keeps real hyphens', () => {
    expect(joinLines(['procedu-', 'ral generation'])).toBe('procedural generation')
    expect(joinLines(['Multi-', 'Task model'])).toBe('Multi-Task model')
    expect(joinLines(['state-of-the-', 'art results'])).toBe('state-of-the-art results')
  })
})

describe('figures', () => {
  it('recognises figure and table captions', () => {
    expect(captionOf('Fig. 3: Stages of generation')).toEqual({ kind: 'figure', n: 3 })
    expect(captionOf('Table 2. Results')).toEqual({ kind: 'table', n: 2 })
    expect(captionOf('Figures show…')).toBeNull()
    expect(captionOf('Figure 3 shows the stages.')).toBeNull()
  })

  it('crops a figure to the drawings above its caption, inside its column', () =>
    expect(figureRegion(raw.pages[1], caption, 'figure')).toEqual([40, 120, 290, 300]))

  it('takes side-by-side labels above the caption into the figure', () => {
    const cap = blk([181, 241, 430, 251], 'Figure 2: Procedurally generating a house.')
    const labels = blk([114, 221, 404, 230], 'Sample Floor Plan\nSample Room Spec\nSample Structure Material', 7)
    const p = page(4, [labels, cap, prose([108, 257, 505, 333], 'Fig. 2 shows the procedure. It')], { images: [[108, 75, 504, 234]] })
    expect(figureRegion(p, cap, 'figure')).toEqual([108, 75, 504, 234])
  })

  it('keeps the sub-captions (a), (b) inside the figure', () => {
    const cap = blk([176, 627, 436, 637], 'Figure 12: Examples and statistics of assets in the asset database.')
    const sub = blk([115, 580, 341, 619], '(a) Examples of assets in the asset database. The forward-facing\ndirection of each asset is shown with an arrow above it.', 8.9)
    const p = page(18, [blk([108, 72, 222, 84], 'A ProcTHOR Assets', 12, true), sub, cap], { images: [[110, 95, 345, 575]] })
    expect(figureRegion(p, cap, 'figure')).toEqual([110, 95, 345, 619])
  })

  it('judges headings by the paper’s body size, not a page full of tiny labels', () => {
    const cap = blk([176, 627, 436, 637], 'Figure 12: Examples and statistics of assets in the asset database.')
    const tiny = [1, 2, 3, 4, 5, 6].map((i) => blk([385, 90 + 20 * i, 404, 100 + 20 * i], `Label${i}`, 3.9))
    const axis = blk([405, 567, 466, 582], '0 20 40 60\nUnique Instances', 5.2)
    const p = page(18, [...tiny, axis, cap], { images: [[119, 103, 345, 555]], drawings: [[357, 90, 505, 565]] })
    expect(figureRegion(p, cap, 'figure', 10)).toEqual([119, 90, 505, 582])
  })

  it('never crops past the caption or the text above, even when an image is clipped larger', () => {
    const cap = blk([108, 627, 504, 659], 'Figure 27: Instantiations of a semantic asset group.')
    const p = page(30, [prose([108, 373, 505, 503], 'Asset samplers define how assets are positioned. They'), cap], { images: [[84, 483, 518, 636]] })
    expect(figureRegion(p, cap, 'figure', 10)).toEqual([84, 503, 518, 627])
  })

  it('crops a table whose caption sits below it', () => {
    const tcap = blk([108, 460, 504, 480], 'Table 2: Results for the models trained on generated houses, against the baselines.\nSecond line of the caption.')
    const p = page(9, [prose([108, 74, 504, 144], 'Scale ablation. To evaluate the effect of scale'), blk([148, 169, 447, 177], 'Task\nBenchmark\nMethod', 8),
      blk([138, 194, 461, 452], 'ObjectNav\nRoboTHOR\n47.0%\n0.200', 8), tcap, prose([108, 500, 504, 600], 'Next paragraph after the table. It')],
    { drawings: [[126, 166, 481, 167], [126, 455, 481, 456]] })
    expect(figureRegion(p, tcap, 'table')).toEqual([126, 166, 481, 456])
  })

  it('crops a table to what lies below its caption', () => {
    const tcap = blk([40, 100, 290, 112], 'Table 1: Sizes.')
    const p = page(1, [tcap, blk([50, 120, 280, 130], '17000 3 4.2', 8), prose([40, 200, 290, 300], 'After the table. It')],
      { drawings: [[40, 116, 290, 117], [40, 135, 290, 136]] })
    expect(figureRegion(p, tcap, 'table')).toEqual([40, 116, 290, 136])
  })
})

describe('structure', () => {
  const opts = { node: 'sample-a', title: 'Sample', source: 'files/sample-a.pdf', overrides: {} }

  it('builds sections, paragraphs, figures and the references section', () => {
    const { paper, crops } = structure(raw, opts)
    expect(validatePaper(paper, 'sample-a')).toEqual([])
    expect(paper.sections.map((s) => s.id)).toEqual(['s1', 's2', 'refs'])
    expect(paper.sections[1].title.en).toBe('2 Method')
    expect(paper.sections[1].blocks.map((b) => b.id)).toEqual(['s2-p1', 's2-p2', 'fig-1', 's2-p3'])
    expect(paper.sections[1].blocks[2]).toMatchObject({ type: 'figure', page: 2, image: 'fig/fig-1.png' })
    expect(crops).toEqual([{ id: 'fig-1', page: 2, bbox: [40, 120, 290, 300] }])
  })

  it('leaves the labels inside a figure out of the text', () =>
    expect(JSON.stringify(structure(raw, opts).paper)).not.toContain('Add Lights'))

  it('joins a paragraph that continues on the next page', () => {
    const cont = { pages: [raw.pages[0], { ...raw.pages[1], blocks: [blk([40, 40, 290, 60], 'and so it ends here.'), ...raw.pages[1].blocks.slice(1)] }] }
    const s2 = structure(cont, opts).paper.sections[1]
    expect(s2.blocks.map((b) => b.id)).toEqual(['s2-p1', 'fig-1', 's2-p2'])
    expect(s2.blocks[0].text.en).toMatch(/figure\. and so it ends here\.$/)
  })

  it('adds a figure’s sub-captions to its caption', () => {
    const sub = blk([40, 280, 290, 300], '(a) The outline of the house, before any room is placed in it\nby the recursive cuts.', 9)
    const withSub = { pages: [raw.pages[0], { ...raw.pages[1], blocks: [...raw.pages[1].blocks, sub] }] }
    const blocks = structure(withSub, opts).paper.sections[1].blocks
    expect(blocks.find((b) => b.id === 'fig-1').text.en).toMatch(/to objects\. \(a\) The outline of the house/)
    expect(blocks.some((b) => b.type === 'paragraph' && b.text.en.startsWith('(a)'))).toBe(false)
  })

  it('leaves out a decorative line with no letters or digits', () => {
    const deco = { pages: [{ ...raw.pages[0], blocks: [...raw.pages[0].blocks, blk([40, 210, 290, 222], '· · ·', 12, true)] }, raw.pages[1]] }
    expect(JSON.stringify(structure(deco, opts).paper)).not.toContain('· · ·')
  })

  it('closes the references at the next unnumbered heading', () => {
    const back = page(3, [blk([40, 60, 290, 75], 'Contributions', 12, true), prose([40, 80, 290, 200], 'Matt Deitke designed the houses. This paragraph')])
    const { paper } = structure({ pages: [...raw.pages, back] }, opts)
    expect(paper.sections.map((s) => s.id)).toEqual(['s1', 's2', 'refs', 'contributions'])
    expect(paper.sections[2].blocks).toHaveLength(1)
  })

  it('takes everything inside an overridden crop out of the text, running text included', () => {
    const { paper } = structure(raw, { ...opts, overrides: { crops: { 'fig-1': { page: 2, bbox: [30, 30, 300, 305] } } } })
    expect(JSON.stringify(paper)).not.toContain('Second method paragraph')
    expect(paper.sections[1].blocks.find((b) => b.id === 'fig-1')).toBeDefined()
  })

  it('drops a whole block whose joined text matches an override', () => {
    const garbled = blk([279, 479, 288, 513], '_\ni\n\\\ns\ni\nm')
    const withEq = { pages: [raw.pages[0], { ...raw.pages[1], blocks: [...raw.pages[1].blocks, garbled] }] }
    const { paper } = structure(withEq, { ...opts, overrides: { drop: ['^_ i \\\\ s i m$'] } })
    expect(JSON.stringify(paper)).not.toContain('s i m')
  })

  it('applies overrides', () => {
    const { paper, crops } = structure(raw, { ...opts, overrides: { drop: ['^Second method'], crops: { 'fig-1': { page: 2, bbox: [0, 0, 10, 10] } } } })
    expect(JSON.stringify(paper)).not.toContain('Second method')
    expect(crops).toEqual([{ id: 'fig-1', page: 2, bbox: [0, 0, 10, 10] }])
  })
})
