import { describe, expect, it } from 'vitest'
import { validatePaper } from '../../assets/paper.js'
import { captionOf, dropRunning, figureRegion, joinLines, orderBlocks, structure } from '../../scripts/papers/structure.mjs'

/** A dumped text block: one line per "\n", all at `size`. */
const blk = (bbox, text, size = 10, bold = false) => ({ bbox, lines: text.split('\n').map((t) => ({ text: t, size, bold })) })
const prose = (bbox, first) =>
  blk(bbox, `${first} runs across several lines of body text so that it reads\nlike a real paragraph of a paper with enough words in\nit to be prose and not a label inside a figure.`)
const page = (n, blocks, { drawings = [], images = [] } = {}) => ({ n, w: 612, h: 792, blocks, images, drawings })
const texts = (pages) => pages.flatMap((p) => p.blocks.flatMap((b) => b.lines.map((l) => l.text)))
const first = (b) => b.lines[0].text

// Two pages in two columns: sections 1 and 2, a figure in the left column of page 2, the references on the right.
const caption = blk([40, 310, 290, 330], 'Figure 1: The generation stages, from outline to objects.')
const raw = {
  pages: [
    page(1, [
      blk([40, 60, 290, 75], '1 Introduction', 12, true),
      prose([40, 80, 290, 200], 'Embodied agents need houses. This paragraph'),
      blk([320, 60, 570, 75], '2 Method', 12, true),
      prose([320, 80, 570, 200], 'A validator checks every house. This paragraph'),
      blk([300, 760, 310, 770], '1'),
    ]),
    page(2, [
      prose([40, 40, 290, 110], 'Second method paragraph. It'),
      blk([60, 150, 120, 160], 'Add Lights', 7),
      caption,
      prose([320, 40, 570, 380], 'Third method paragraph. It'),
      blk([320, 400, 570, 415], 'References', 12, true),
      blk([320, 420, 570, 440], '[1] A. Author. A paper about houses. 2020.', 9),
      blk([300, 760, 310, 770], '2'),
    ], { drawings: [[40, 120, 290, 300]] }),
  ],
}

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

  it('applies overrides', () => {
    const { paper, crops } = structure(raw, { ...opts, overrides: { drop: ['^Second method'], crops: { 'fig-1': { page: 2, bbox: [0, 0, 10, 10] } } } })
    expect(JSON.stringify(paper)).not.toContain('Second method')
    expect(crops).toEqual([{ id: 'fig-1', page: 2, bbox: [0, 0, 10, 10] }])
  })
})
