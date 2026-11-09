/*
 * From a PDF dump (scripts/papers/pdf_dump.py) to a paper.json: clean text in reading order, sections, paragraphs,
 * and the figures and tables located by their captions, with the page regions to crop for them. Pure: no files.
 */

const ARXIV = /^arXiv:\d{4}\.\d{4,5}/
const PAGE_NUMBER = /^\d{1,4}$/
const EDGE = 0.13 // top and bottom share of the page where running heads and feet live
const NEAR = 12 // pt: a label this close to a figure's drawings belongs to the figure
const NUMBERED = /^(\d+(?:\.\d+)*|[IVX]+|[A-Z](?:\.\d+)*)\.?\s+\S/
const REFERENCES = /^(?:\d+\.?\s*)?(?:References|Bibliography)$/i
const SUBCAPTION = /^\([a-z]\)\s/ // "(a) Examples of assets…": part of the figure above it
const CONTENTS_LINE = /^(?:[A-Z]|\d+)(?:\.\d+)*\.?\s+\S.*?(?:\s*\.)*\s+\d{1,3}$/

const textOfBlock = (b) => joinLines(b.lines.map((l) => l.text))
const centreX = (b) => (b.bbox[0] + b.bbox[2]) / 2
const round = (x) => Math.round(x * 10) / 10

/** The most common line size (to 0.5 pt) of the running text among `blocks` (of all of them when none is running text). */
export function bodySize(blocks) {
  const counts = new Map()
  const prose = blocks.filter((b) => isProse(b))
  for (const b of prose.length ? prose : blocks)
    for (const l of b.lines) counts.set(Math.round(l.size * 2) / 2, (counts.get(Math.round(l.size * 2) / 2) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10
}

/** A block that spans the page: wider than 60% of it, or crossing its middle (so it belongs to no column). */
const isFull = (bbox, w) => bbox[2] - bbox[0] > 0.6 * w || (bbox[0] < w / 2 - 0.02 * w && bbox[2] > w / 2 + 0.02 * w)

/** Running heads and feet, bare page numbers and the arXiv side stamp, removed. */
export function dropRunning(pages) {
  const edge = (p, b) => b.bbox[3] <= p.h * EDGE || b.bbox[1] >= p.h * (1 - EDGE)
  const norm = (t) => t.trim().replace(/\d+/g, '#')
  const counts = new Map()
  for (const p of pages) {
    const seen = new Set()
    for (const b of p.blocks) if (edge(p, b)) for (const l of b.lines) seen.add(norm(l.text))
    for (const t of seen) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  // A third of the pages: heads often alternate between even pages (authors) and odd ones (title).
  // A lone number repeats as the page number; it is handled as one, never as a running head.
  const running = (t) => norm(t) !== '#' && (counts.get(norm(t)) ?? 0) >= Math.max(2, pages.length / 3)
  const keep = (p, b, l) => {
    const t = l.text.trim()
    if (t === '' || ARXIV.test(t)) return false
    // A bare number is a page number only when it is the whole block: "2" over "Related Work" is a heading's.
    return !(edge(p, b) && ((PAGE_NUMBER.test(t) && b.lines.length === 1) || running(t)))
  }
  // What is left of an edge block once its running head went: a lone number is that page's number.
  const pageNumberLeft = (p, b, lines) => edge(p, b) && lines.length === 1 && lines.length < b.lines.length && PAGE_NUMBER.test(lines[0].text.trim())
  return pages.map((p) => ({
    ...p,
    blocks: p.blocks
      .map((b) => {
        const lines = b.lines.filter((l) => keep(p, b, l))
        return { ...b, lines: pageNumberLeft(p, b, lines) ? [] : lines }
      })
      .filter((b) => b.lines.length > 0),
  }))
}

/** A table of contents (five or more "B.1 Examples . . . 18" blocks on a page) removed; it is not the paper's text. */
export function dropContents(pages) {
  return pages.map((p) => {
    const entries = p.blocks.filter((b) => CONTENTS_LINE.test(textOfBlock(b)))
    return entries.length >= 5 ? { ...p, blocks: p.blocks.filter((b) => !entries.includes(b)) } : p
  })
}

/**
 * A page's blocks in reading order: bands split by full-width blocks; in a band, the left column, then the right. In a
 * one-column paper (`single`), simply top to bottom.
 */
export function orderBlocks(page, { single = false } = {}) {
  const mid = page.w / 2
  const out = []
  let band = []
  if (single) return [...page.blocks].sort((a, c) => a.bbox[1] - c.bbox[1])
  const flush = () => {
    out.push(...band.filter((b) => centreX(b) < mid), ...band.filter((b) => centreX(b) >= mid))
    band = []
  }
  for (const b of [...page.blocks].sort((a, c) => a.bbox[1] - c.bbox[1])) {
    if (isFull(b.bbox, page.w)) {
      flush()
      out.push(b)
    } else band.push(b)
  }
  flush()
  return out
}

/** Lines joined with spaces; a word broken by a hyphen at the end of a line is joined back. */
export function joinLines(lines) {
  let out = ''
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (!out) out = line
    else if (out.endsWith('-')) {
      const fragment = /(\S*)-$/.exec(out)[1].replace(/^[^\p{L}\d]+/u, '')
      const broken = /^\p{Ll}+$/u.test(fragment) && /^\p{Ll}/u.test(line)
      out = broken ? out.slice(0, -1) + line : out + line
    } else out += ` ${line}`
  }
  return out
}

/** The figure or table a caption introduces, or null when the text is not a caption. */
export function captionOf(text) {
  // The number: 3, or A1 for an appendix's.
  const num = (s) => (/^\d+$/.test(s) ? Number(s) : s)
  const f = /^(?:Figure|Fig\.)\s*(\d+|[A-Z]\d+)[.:]/.exec(text)
  if (f) return { kind: 'figure', n: num(f[1]) }
  const t = /^Table\s*(\d+|[A-Z]\d+)[.:]/.exec(text)
  if (t) return { kind: 'table', n: num(t[1]) }
  // Some journals write "Figure 1 Workflow of …": no punctuation, a capital after the number, and short.
  const bare = /^(Figure|Fig\.|Table)\s*(\d+)\s+\p{Lu}/u.exec(text)
  if (bare && text.length <= 250) return { kind: bare[1] === 'Table' ? 'table' : 'figure', n: Number(bare[2]) }
  return null
}

/**
 * A heading: larger than the body, or bold and numbered. In a paper whose headings are not larger than its text
 * (`flat`), also the references and a short bold title ("Acknowledgments").
 */
const isHeading = (b, body, flat = false) => {
  const t = textOfBlock(b)
  if (t.length > 120 || b.lines.length > 3 || captionOf(t)) return false
  if (b.lines.every((l) => l.size >= 1.15 * body)) return true
  if (!b.lines.every((l) => l.bold)) return false
  return NUMBERED.test(t) || (flat && (REFERENCES.test(t) || (t.length <= 40 && /^\p{Lu}/u.test(t))))
}

/**
 * Running text, as opposed to the labels and numbers inside a figure or a table: long lines (labels and table cells
 * come as many short lines side by side), mostly letters.
 */
const isProse = (b) => {
  const t = textOfBlock(b)
  const visible = t.replace(/\s/g, '')
  if (!(t.length >= 50 && t.length / b.lines.length >= 35 && (visible.match(/\p{L}/gu) ?? []).length >= 0.6 * visible.length)) return false
  // With line positions: running text is lines stacked one under the other, most starting at the same left edge; a
  // table row comes as one long line, or lines side by side.
  const boxes = b.lines.map((l) => l.bbox).filter(Boolean)
  if (boxes.length < b.lines.length) return true
  const rows = new Set(boxes.map((r) => Math.round(r[1] / 2))).size
  const left = Math.min(...boxes.map((r) => r[0]))
  return rows >= 2 && boxes.filter((r) => r[0] - left <= 3).length >= 0.5 * boxes.length
}

/**
 * The region to crop for a caption's figure or table: the gap between the caption and the nearest running text of its
 * column, on the side whose content (images, drawings, labels) is closest to the caption (a tie goes above for a
 * figure, below for a table), narrowed to the images and drawings in it and the labels next to them. `body` is the
 * paper's body text size: on a page of tiny labels, the page's own most common size would make labels look like headings.
 */
export function figureRegion(page, caption, kind, body = bodySize(page.blocks), { single = false, side: told = null } = {}) {
  const mid = page.w / 2
  const [, cy0, , cy1] = caption.bbox
  const [x0, x1] = single || isFull(caption.bbox, page.w) ? [0, page.w] : centreX(caption) < mid ? [0, mid] : [mid, page.w]
  const inColumn = (r) => r[0] < x1 && r[2] > x0
  const bounds = page.blocks.filter(
    (b) =>
      b !== caption &&
      inColumn(b.bbox) &&
      !SUBCAPTION.test(textOfBlock(b)) &&
      // A heading bounds a figure only by its size: bold numbered cells of a table are not headings.
      (isProse(b) || (isHeading(b, body) && b.lines.every((l) => l.size >= 1.15 * body)) || captionOf(textOfBlock(b))),
  )
  const contents = (gap) => ({
    gap,
    // A rule under the running head or over the foot is the page's, not the figure's.
    rects: [...page.images, ...page.drawings].filter((r) => inside(r, gap, 0) && r[3] > page.h * 0.09 && r[1] < page.h * 0.91),
    labels: page.blocks.filter((b) => b !== caption && !bounds.includes(b) && inside(b.bbox, gap, 0)).map((b) => b.bbox),
  })
  const above = contents([x0, Math.max(0, ...bounds.filter((b) => b.bbox[3] <= cy0 + 1).map((b) => b.bbox[3])), x1, cy0])
  const below = contents([x0, cy1, x1, Math.min(page.h, ...bounds.filter((b) => b.bbox[1] >= cy1 - 1).map((b) => b.bbox[1]))])
  // The side is chosen by the images and drawings nearest to the caption (text around a caption is often a subheading
  // or another caption); only when neither side has any do the labels decide. Nearly as close: the usual side.
  const pick = (key) => {
    const fromAbove = above[key].length ? cy0 - Math.max(...above[key].map((r) => r[3])) : Infinity
    const fromBelow = below[key].length ? Math.min(...below[key].map((r) => r[1])) - cy1 : Infinity
    if (Math.abs(fromAbove - fromBelow) <= 6 || fromAbove === fromBelow) return kind === 'figure' ? above : below
    return fromAbove < fromBelow ? above : below
  }
  const side = told ? (told === 'above' ? above : below) : above.rects.length || below.rects.length ? pick('rects') : pick('labels')

  if (side.rects.length === 0) return (side.labels.length ? union(side.labels) : side.gap).map(round)
  const u = union(side.rects)
  const near = (r) => r[0] < u[2] + NEAR && r[2] > u[0] - NEAR && r[1] < u[3] + NEAR && r[3] > u[1] - NEAR
  const [r0, r1, r2, r3] = union([u, ...side.labels.filter(near)])
  const g = side.gap // an image clipped in the PDF reports its whole size: keep to the gap
  return [Math.max(r0, g[0]), Math.max(r1, g[1]), Math.min(r2, g[2]), Math.min(r3, g[3])].map(round)
}

const union = (rs) => [Math.min(...rs.map((r) => r[0])), Math.min(...rs.map((r) => r[1])), Math.max(...rs.map((r) => r[2])), Math.max(...rs.map((r) => r[3]))]

/** True when the centre of rectangle `r` lies in `region` (grown by `margin`). */
function inside(r, region, margin = 2) {
  const cx = (r[0] + r[2]) / 2
  const cy = (r[1] + r[3]) / 2
  return cx >= region[0] - margin && cx <= region[2] + margin && cy >= region[1] - margin && cy <= region[3] + margin
}

/** "3. Methodology" over "3.1. Procedure" in one block: a block per line, so each can be a heading of its own. */
const splitNumbered = (b) =>
  b.lines.length >= 2 && b.lines.length <= 3 && b.lines.every((l) => /^\d+(\.\d+)*\.?\s+\S/.test(l.text.trim()))
    ? b.lines.map((l) => ({ bbox: l.bbox ?? b.bbox, lines: [l] }))
    : [b]

const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'back'

const romanValue = (s) => {
  const v = { I: 1, V: 5, X: 10, L: 50 }
  return [...s].reduce((sum, c, i) => sum + (v[c] < (v[s[i + 1]] ?? 0) ? -v[c] : v[c]), 0)
}

/**
 * The paper.json of a dump, plus the crops for its figures and tables. `overrides` (papers/<id>/overrides.json) can
 * drop lines (or whole blocks) matching regexes, drop the blocks inside page regions (a journal's side column) and
 * replace a crop or the side of its caption it lies on: `{ drop: string[], dropBlocks: [{ page, bbox }], crops: { [id]:
 * { page, bbox } }, sides: { [id]: 'above' | 'below' }, notCaptions: string[], columns: 1 | 2, title }`.
 */
export function structure(raw, { node, title, source, overrides = {} }) {
  const drop = (overrides.drop ?? []).map((r) => new RegExp(r))
  const regions = overrides.dropBlocks ?? []
  const pages = dropContents(dropRunning(raw.pages)).map((p) => ({
    ...p,
    blocks: p.blocks
      .filter((b) => !drop.some((r) => r.test(textOfBlock(b))))
      .filter((b) => !regions.some((r) => r.page === p.n && inside(b.bbox, r.bbox, 0)))
      .map((b) => ({ ...b, lines: b.lines.filter((l) => !drop.some((r) => r.test(l.text.trim()))) }))
      .filter((b) => b.lines.length > 0 && /[\p{L}\p{N}]/u.test(textOfBlock(b)))
      .flatMap(splitNumbered),
  }))
  const body = bodySize(pages.flatMap((p) => p.blocks))
  // One column or two: most running text spanning the page means one (then a short caption at the left is not a column).
  const prose = pages.flatMap((p) => p.blocks.filter(isProse).map((b) => isFull(b.bbox, p.w)))
  const single = overrides.columns === 1 || (overrides.columns !== 2 && prose.filter(Boolean).length >= 0.7 * prose.length)
  // Does the paper set its section headings larger than its text? If not, bold alone marks them.
  const flat = !pages.some((p) => p.blocks.some((b) => b.lines.every((l) => l.size >= 1.15 * body) && /^\d+\.?\s+\p{L}/u.test(textOfBlock(b))))
  const heading = (b) => isHeading(b, body, flat)

  // Top-level headings: numbered ones open sections; a paper with none opens one at each heading.
  const topLevel = (t) => /^(\d+)\.?\s+\S/.exec(t) ?? /^([IVX]+)\.\s+\S/.exec(t)
  const numbered = pages.some((p) => p.blocks.some((b) => heading(b) && topLevel(textOfBlock(b))))

  const sections = []
  const crops = []
  const figureIds = new Set()
  let cur = null
  let afterRefs = false
  const open = (id, en) => {
    let unique = id
    for (let k = 2; sections.some((s) => s.id === unique); k++) unique = `${id}-${k}`
    cur = { id: unique, title: { en }, blocks: [], count: { p: 0, h: 0, e: 0 } }
    sections.push(cur)
  }
  const add = (type, en, page, extra = {}) => {
    if (!cur) open('s0', 'Front matter')
    if (type === 'paragraph' && /^\p{Ll}/u.test(en)) {
      const prev = cur.blocks.findLast((b) => b.type !== 'figure' && b.type !== 'table')
      if (prev?.type === 'paragraph') {
        prev.text.en = joinLines([prev.text.en, en])
        return
      }
    }
    const prefix = { paragraph: 'p', heading: 'h', equation: 'e' }[type]
    const id = extra.id ?? (cur.id === 'refs' && type === 'paragraph' ? `refs-${++cur.count.p}` : `${cur.id}-${prefix}${++cur.count[prefix]}`)
    cur.blocks.push({ id, type, page, ...extra, text: { en } })
  }

  for (const p of pages) {
    // Figures and tables first: their regions take the labels inside them out of the text.
    const figures = new Map()
    for (const b of p.blocks) {
      const cap = captionOf(textOfBlock(b))
      if (!cap) continue
      const base = `${cap.kind === 'figure' ? 'fig' : 'tab'}-${String(cap.n).toLowerCase()}`
      let id = base
      for (let k = 2; figureIds.has(id); k++) id = `${base}-${k}`
      figureIds.add(id)
      if (overrides.notCaptions?.includes(id)) continue // a paragraph that begins "Figure 8. …" like a caption
      const o = overrides.crops?.[id]
      figures.set(b, { id, kind: cap.kind, page: o?.page ?? p.n, bbox: o?.bbox ?? figureRegion(p, b, cap.kind, body, { single, side: overrides.sides?.[id] }), fixed: Boolean(o), subs: [] })
    }
    const onPage = [...figures.values()].filter((f) => f.page === p.n)
    const kept = []
    for (const b of orderBlocks(p, { single })) {
      const sub = SUBCAPTION.test(textOfBlock(b)) && onPage.find((f) => inside(b.bbox, f.bbox))
      if (sub) sub.subs.push(textOfBlock(b))
      // Inside a figure or a table everything but its caption is part of the image (labels, cells, even bold numbers).
      else if (figures.has(b) || !onPage.some((f) => inside(b.bbox, f.bbox))) kept.push(b)
    }
    let blocks = kept
    if (p.n === 1) {
      // The front page: the title is in the reader's bar; what comes before the abstract is authors and affiliations.
      const top = Math.max(...blocks.flatMap((b) => b.lines.map((l) => l.size)))
      if (top >= 1.3 * body) blocks = blocks.filter((b) => !b.lines.every((l) => l.size === top))
      const abstract = blocks.findIndex((b) => heading(b) && /^abstract$/i.test(textOfBlock(b)))
      if (abstract > 0) blocks = blocks.slice(abstract)
    }

    for (const b of blocks) {
      const t = textOfBlock(b)
      const f = figures.get(b)
      if (f) {
        add(f.kind, [t, ...f.subs].join(' '), p.n, { id: f.id, image: `fig/${f.id}.png` })
        crops.push({ id: f.id, page: f.page, bbox: f.bbox })
      } else if (heading(b)) {
        const top = topLevel(t)
        if (REFERENCES.test(t)) {
          open('refs', t)
          afterRefs = true
        } else if (top && !afterRefs) open(`s${/\d/.test(top[1]) ? top[1] : romanValue(top[1])}`, t)
        else if (afterRefs && /^[A-Z]\.?\s+\S/.test(t)) open(`app-${t[0].toLowerCase()}`, t)
        else if (/^abstract$/i.test(t) && !cur) open('s0', t)
        else if (cur?.id === 'refs') open(slug(t), t)
        else if (!numbered && !afterRefs) open(`s${sections.filter((s) => s.id !== 's0').length + 1}`, t)
        else add('heading', t, p.n)
      } else if (t.includes('=') && /\(\d+\)$/.test(t) && t.length < 200) add('equation', t, p.n)
      else add('paragraph', t, p.n)
    }
  }

  splitReferences(sections.find((s) => s.id === 'refs'))
  return {
    paper: { version: 1, node, title, source, sections: sections.map(({ count, ...s }) => s) },
    crops,
  }
}

/** Numbered references ("[12] …") split one per block, whatever the PDF's text blocks were. */
function splitReferences(refs) {
  if (!refs || !refs.blocks.some((b) => /\[\d+\]\s/.test(b.text.en))) return
  const items = []
  for (const b of refs.blocks)
    b.text.en.split(/(?=\[\d+\]\s)/).forEach((part, i) => {
      const t = part.trim()
      if (!t) return
      if (i === 0 && !/^\[\d+\]\s/.test(t) && items.length > 0) items.at(-1).text = joinLines([items.at(-1).text, t])
      else items.push({ text: t, page: b.page })
    })
  refs.blocks = items.map((it, i) => ({ id: `refs-${i + 1}`, type: 'paragraph', page: it.page, text: { en: it.text } }))
}
