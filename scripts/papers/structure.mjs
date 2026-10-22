/*
 * From a PDF dump (scripts/papers/pdf_dump.py) to a paper.json: clean text in reading order, sections, paragraphs,
 * and the figures and tables located by their captions, with the page regions to crop for them. Pure: no files.
 */

const ARXIV = /^arXiv:\d{4}\.\d{4,5}/
const PAGE_NUMBER = /^\d{1,4}$/
const EDGE = 0.08 // top and bottom share of the page where running heads and feet live
const NEAR = 12 // pt: a label this close to a figure's drawings belongs to the figure
const NUMBERED = /^(\d+(?:\.\d+)*|[IVX]+|[A-Z](?:\.\d+)*)\.?\s+\S/
const REFERENCES = /^(?:\d+\.?\s*)?(?:References|Bibliography)$/i

const textOfBlock = (b) => joinLines(b.lines.map((l) => l.text))
const centreX = (b) => (b.bbox[0] + b.bbox[2]) / 2
const round = (x) => Math.round(x * 10) / 10

/** The most common line size (to 0.5 pt) of the given blocks. */
function bodySize(blocks) {
  const counts = new Map()
  for (const b of blocks) for (const l of b.lines) counts.set(Math.round(l.size * 2) / 2, (counts.get(Math.round(l.size * 2) / 2) ?? 0) + 1)
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
  const running = (t) => (counts.get(norm(t)) ?? 0) >= Math.max(2, pages.length / 2)
  const keep = (p, b, l) => {
    const t = l.text.trim()
    if (t === '' || ARXIV.test(t)) return false
    return !(edge(p, b) && (PAGE_NUMBER.test(t) || running(t)))
  }
  return pages.map((p) => ({
    ...p,
    blocks: p.blocks.map((b) => ({ ...b, lines: b.lines.filter((l) => keep(p, b, l)) })).filter((b) => b.lines.length > 0),
  }))
}

/** A page's blocks in reading order: bands split by full-width blocks; in a band, the left column, then the right. */
export function orderBlocks(page) {
  const mid = page.w / 2
  const out = []
  let band = []
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
  const f = /^(?:Figure|Fig\.)\s*(\d+)[.:]/.exec(text)
  if (f) return { kind: 'figure', n: Number(f[1]) }
  const t = /^Table\s*(\d+)[.:]/.exec(text)
  return t ? { kind: 'table', n: Number(t[1]) } : null
}

const isHeading = (b, body) => {
  const t = textOfBlock(b)
  if (t.length > 120 || b.lines.length > 3 || captionOf(t)) return false
  return b.lines.every((l) => l.size >= 1.15 * body) || (b.lines.every((l) => l.bold) && NUMBERED.test(t))
}

/** Running text, as opposed to the labels and numbers inside a figure or a table. */
const isProse = (b) => {
  const t = textOfBlock(b)
  const visible = t.replace(/\s/g, '')
  return b.lines.length >= 2 && t.length >= 60 && (visible.match(/\p{L}/gu) ?? []).length >= 0.6 * visible.length
}

/**
 * The region to crop for the figure (above its caption) or the table (below it): the gap between the caption and the
 * nearest running text of its column, narrowed to the images and drawings in it and the labels next to them.
 */
export function figureRegion(page, caption, kind) {
  const mid = page.w / 2
  const body = bodySize(page.blocks)
  const [, cy0, , cy1] = caption.bbox
  const [x0, x1] = isFull(caption.bbox, page.w) ? [0, page.w] : centreX(caption) < mid ? [0, mid] : [mid, page.w]
  const inColumn = (r) => r[0] < x1 && r[2] > x0
  const bounds = page.blocks.filter(
    (b) => b !== caption && inColumn(b.bbox) && (isProse(b) || isHeading(b, body) || captionOf(textOfBlock(b))),
  )
  const gap =
    kind === 'figure'
      ? [x0, Math.max(0, ...bounds.filter((b) => b.bbox[3] <= cy0 + 1).map((b) => b.bbox[3])), x1, cy0]
      : [x0, cy1, x1, Math.min(page.h, ...bounds.filter((b) => b.bbox[1] >= cy1 - 1).map((b) => b.bbox[1]))]
  const inGap = (r) => {
    const cx = (r[0] + r[2]) / 2
    const cy = (r[1] + r[3]) / 2
    return cx >= gap[0] && cx <= gap[2] && cy >= gap[1] && cy <= gap[3]
  }
  const rects = [...page.images, ...page.drawings].filter(inGap)
  if (rects.length === 0) return gap.map(round)
  const union = (rs) => [Math.min(...rs.map((r) => r[0])), Math.min(...rs.map((r) => r[1])), Math.max(...rs.map((r) => r[2])), Math.max(...rs.map((r) => r[3]))]
  const u = union(rects)
  const near = (r) => r[0] < u[2] + NEAR && r[2] > u[0] - NEAR && r[1] < u[3] + NEAR && r[3] > u[1] - NEAR
  const labels = page.blocks.filter((b) => b !== caption && !bounds.includes(b) && inGap(b.bbox) && near(b.bbox)).map((b) => b.bbox)
  return union([u, ...labels]).map(round)
}

const inside = (r, region) => {
  const cx = (r[0] + r[2]) / 2
  const cy = (r[1] + r[3]) / 2
  return cx >= region[0] - 2 && cx <= region[2] + 2 && cy >= region[1] - 2 && cy <= region[3] + 2
}

const romanValue = (s) => {
  const v = { I: 1, V: 5, X: 10, L: 50 }
  return [...s].reduce((sum, c, i) => sum + (v[c] < (v[s[i + 1]] ?? 0) ? -v[c] : v[c]), 0)
}

/**
 * The paper.json of a dump, plus the crops for its figures and tables. `overrides` (papers/<id>/overrides.json) can
 * drop lines matching regexes and replace a crop: `{ drop: string[], crops: { [id]: { page, bbox } } }`.
 */
export function structure(raw, { node, title, source, overrides = {} }) {
  const drop = (overrides.drop ?? []).map((r) => new RegExp(r))
  const pages = dropRunning(raw.pages).map((p) => ({
    ...p,
    blocks: p.blocks
      .map((b) => ({ ...b, lines: b.lines.filter((l) => !drop.some((r) => r.test(l.text.trim()))) }))
      .filter((b) => b.lines.length > 0),
  }))
  const body = bodySize(pages.flatMap((p) => p.blocks))
  const heading = (b) => isHeading(b, body)

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
      const base = `${cap.kind === 'figure' ? 'fig' : 'tab'}-${cap.n}`
      let id = base
      for (let k = 2; figureIds.has(id); k++) id = `${base}-${k}`
      figureIds.add(id)
      const o = overrides.crops?.[id]
      figures.set(b, { id, kind: cap.kind, page: o?.page ?? p.n, bbox: o?.bbox ?? figureRegion(p, b, cap.kind) })
    }
    const regions = [...figures.values()].filter((f) => f.page === p.n).map((f) => f.bbox)
    let blocks = orderBlocks({
      ...p,
      blocks: p.blocks.filter((b) => figures.has(b) || heading(b) || isProse(b) || !regions.some((r) => inside(b.bbox, r))),
    })
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
        add(f.kind, t, p.n, { id: f.id, image: `fig/${f.id}.png` })
        crops.push({ id: f.id, page: f.page, bbox: f.bbox })
      } else if (heading(b)) {
        const top = topLevel(t)
        if (REFERENCES.test(t)) {
          open('refs', t)
          afterRefs = true
        } else if (top && !afterRefs) open(`s${/\d/.test(top[1]) ? top[1] : romanValue(top[1])}`, t)
        else if (afterRefs && /^[A-Z]\.?\s+\S/.test(t)) open(`app-${t[0].toLowerCase()}`, t)
        else if (/^abstract$/i.test(t) && !cur) open('s0', t)
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
