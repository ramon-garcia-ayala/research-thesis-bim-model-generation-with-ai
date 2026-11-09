/*
 * The decks as the map sees them: for every presentation, its slides with their titles (both languages) and the map ids
 * each one uses (`data-map`). Read from the decks' own HTML, so there is nothing to keep in step. Pure: the caller
 * supplies how to read a file; the parsing uses the browser's (or jsdom's) DOMParser.
 */
import { PRESENTATIONS, TRACKS } from '../presentations/assets/site.js'

const LANGS = ['en', 'es']
/** Where a slide's title can be, best first; the title slide's <h1> is empty in the HTML (the app's name is set by script). */
const TITLE_PLACES = ['h2', 'blockquote', 'h1', '.lede', '.eyebrow']

const text = (el, lang) => {
  const part = el.querySelector(`[lang="${lang}"]`)
  if (!part) return ''
  const copy = part.cloneNode(true)
  copy.querySelectorAll('sup').forEach((s) => s.remove())
  return copy.textContent.replace(/\s+/g, ' ').trim()
}

function titleOf(slide, n) {
  const title = {}
  for (const lang of LANGS) {
    for (const place of TITLE_PLACES) {
      const el = slide.querySelector(place)
      const t = el ? text(el, lang) : ''
      if (t) {
        title[lang] = t
        break
      }
    }
  }
  return { en: title.en ?? `Slide ${n}`, es: title.es ?? `Diapositiva ${n}` }
}

/** The slides of a deck's HTML: `{ n, title: {en, es}, map: [ids] }`, `n` from 1. */
export function parseDeck(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const slides = [...doc.querySelectorAll('main.deck section.slide')].map((slide, i) => ({
    n: i + 1,
    title: titleOf(slide, i + 1),
    map: (slide.getAttribute('data-map') ?? '').split(/\s+/).filter(Boolean),
  }))
  return { slides }
}

/**
 * Reads every presentation of every track. `read(path)` resolves the file's text, or null when missing (then that
 * presentation is left out). Returns `{ tracks: [{ key, name, items: [{ id, date, title, slides }] }] }`.
 */
export async function loadIndex(read, presentations = PRESENTATIONS, tracks = TRACKS) {
  const out = []
  for (const [key, name] of Object.entries(tracks)) {
    const items = []
    for (const p of presentations[key] ?? []) {
      const html = await read(`presentations/${key}/${p.id}/index.html`)
      if (html === null) continue
      items.push({ id: p.id, date: p.date ?? null, title: p.title, slides: parseDeck(html).slides })
    }
    out.push({ key, name, items })
  }
  return { tracks: out }
}

/** Every slide that cites the map id (a node, a group, `question` or `hypothesis`), in menu order. */
export function slidesUsing(index, id) {
  const hits = []
  for (const t of index.tracks)
    for (const p of t.items)
      for (const s of p.slides) if (s.map.includes(id)) hits.push({ track: t.key, presentation: p.id, n: s.n, title: s.title })
  return hits
}
