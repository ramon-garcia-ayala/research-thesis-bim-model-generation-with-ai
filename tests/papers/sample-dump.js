/* A synthetic PDF dump (the shape pdf_dump.py writes) shared by the structure and prepare tests. */

/** A dumped text block: one line per "\n", all at `size`. */
export const blk = (bbox, text, size = 10, bold = false) => ({ bbox, lines: text.split('\n').map((t) => ({ text: t, size, bold })) })
export const prose = (bbox, first) =>
  blk(bbox, `${first} runs across several lines of body text so that it reads\nlike a real paragraph of a paper with enough words in\nit to be prose and not a label inside a figure.`)
export const page = (n, blocks, { drawings = [], images = [] } = {}) => ({ n, w: 612, h: 792, blocks, images, drawings })
export const texts = (pages) => pages.flatMap((p) => p.blocks.flatMap((b) => b.lines.map((l) => l.text)))
export const first = (b) => b.lines[0].text

// Two pages in two columns: sections 1 and 2, a figure in the left column of page 2, the references on the right.
export const caption = blk([40, 310, 290, 330], 'Figure 1: The generation stages, from outline to objects.')
export const raw = {
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
