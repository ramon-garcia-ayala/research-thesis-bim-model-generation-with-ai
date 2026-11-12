// A presentation's deck: one 16:9 slide at a time, the rail of the track's presentations beside it, ES / EN, full screen.
// Its page is <body data-track data-presentation> with <nav class="rail"> and <main class="deck"> of <section class="slide">.

import { APP_NAME, PRESENTATIONS, TRACKS } from './site.js'
import { initialLang, safeStorage, setLang } from './i18n.js'
import { effectiveTheme, initTheme, toggleTheme } from './theme.js'
import { mountPitch } from './pitch.js'

/** How long the pointer rests before the controls hide (only in full screen: deck.css). */
export const IDLE_MS = 2500

/**
 * `data-idle` on <body> once the pointer has rested IDLE_MS, from the start too: a show begun without touching the
 * mouse hides its controls. Moving the pointer brings them back; the keys change slides without showing them.
 */
export function watchIdle(win, doc) {
  let timer = null
  const rest = () => {
    win.clearTimeout(timer)
    timer = win.setTimeout(() => { doc.body.dataset.idle = '' }, IDLE_MS)
  }
  doc.addEventListener('mousemove', () => {
    delete doc.body.dataset.idle
    rest()
  })
  rest()
}

/** `#n` (1-based) → a 0-based index within [0, count-1]; anything unparsable → 0. */
export function slideFromHash(hash, count) {
  const n = Number.parseInt(String(hash).replace(/^#/, ''), 10)
  if (!Number.isFinite(n)) return 0
  return Math.min(Math.max(n - 1, 0), Math.max(count - 1, 0))
}

export function neighborPresentation(list, id, dir) {
  const i = list.findIndex((p) => p.id === id)
  if (i < 0) return null
  return list[i + dir] ?? null
}

export function latestPresentation(list) {
  return list.length ? list[list.length - 1] : null
}

/** Both languages of a text, as the HTML holds them everywhere. */
const both = (doc, text, tag = 'span') => {
  const frag = doc.createDocumentFragment()
  for (const lang of ['en', 'es']) {
    const el = doc.createElement(tag)
    el.lang = lang
    el.textContent = text[lang]
    frag.append(el)
  }
  return frag
}

const shortDate = (iso, lang) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric' })

function renderRail(doc, rail, track, currentId, list) {
  rail.replaceChildren()
  const home = doc.createElement('a')
  home.className = 'rail__home'
  home.href = '../../'
  home.append(both(doc, TRACKS[track] ?? { en: 'Weekly progress', es: 'Avance semanal' }))
  const label = doc.createElement('p')
  label.className = 'rail__label'
  label.append(both(doc, { en: 'Presentations', es: 'Presentaciones' }))
  const items = doc.createElement('ol')
  items.className = 'rail__list'
  const select = doc.createElement('select')
  select.className = 'rail__select'
  select.setAttribute('aria-label', 'Presentation')
  // oldest first: the rail reads as progress, top to bottom
  for (const p of list) {
    const li = doc.createElement('li')
    const a = doc.createElement('a')
    a.className = 'rail__item'
    a.href = `../${p.id}/`
    if (p.id === currentId) a.setAttribute('aria-current', 'page')
    const head = doc.createElement('span')
    head.className = 'rail__id'
    head.textContent = p.id.replace(/^presentacion-/, '')
    const title = doc.createElement('span')
    title.className = 'rail__title'
    title.append(both(doc, p.title))
    a.append(head)
    if (p.date) {
      const date = doc.createElement('span')
      date.className = 'rail__date'
      date.append(both(doc, { en: shortDate(p.date, 'en'), es: shortDate(p.date, 'es') }))
      a.append(date)
    }
    a.append(title)
    li.append(a)
    items.append(li)
    const opt = doc.createElement('option')
    opt.value = p.id
    opt.textContent = `${head.textContent} · ${p.title.en}`
    opt.selected = p.id === currentId
    select.append(opt)
  }
  rail.append(home, label, items, select)
  return select
}

/**
 * Mounts the deck of the page. `opts.presentations` replaces the track's published presentations (tests).
 * @param {Window} win
 * @param {{ presentations?: import('./site.js').Presentation[] }} [opts]
 * @returns {{ slides: HTMLElement[], index: () => number, show: (i: number, writeHash?: boolean, at?: number) => void }}
 */
export function mountDeck(win, opts = {}) {
  const doc = win.document
  const { track, presentation } = doc.body.dataset
  // `?embed`: the deck inside the map's viewer, which has its own menu; it reports its slide to the parent.
  const embed = new URLSearchParams(win.location.search).has('embed')
  if (embed) doc.documentElement.dataset.embed = ''
  const list = opts.presentations ?? PRESENTATIONS[track] ?? []
  const storage = safeStorage(win)
  // an English-only deck (a pitch held in English) shows English whatever was chosen elsewhere, and does not remember it
  const englishOnly = doc.body.dataset.langOnly === 'en'
  if (englishOnly) setLang(doc, null, 'en')
  else setLang(doc, storage, initialLang(storage, win.navigator.language))
  initTheme(doc, win)

  for (const el of doc.querySelectorAll('[data-app-name]')) el.textContent = APP_NAME

  const rail = doc.querySelector('nav.rail')
  if (rail) {
    const select = renderRail(doc, rail, track, presentation, list)
    select.addEventListener('change', () => win.location.assign(`../${select.value}/`))
  }

  const slides = [...doc.querySelectorAll('main.deck section.slide')]
  // the stage is exactly as wide as a slide: the container a slide's cqw sizes (type, padding) are measured against
  const stage = doc.createElement('div')
  stage.className = 'stage'
  stage.append(...slides)
  // the folio is numbered here, not by a CSS counter: hidden slides do not count in CSS
  slides.forEach((s, k) => { s.dataset.folio = String(k + 1).padStart(2, '0') })
  doc.querySelector('main.deck')?.append(stage)
  const bar = doc.createElement('div')
  bar.className = 'deck__bar'
  const prev = button(doc, '‹', { en: 'Previous slide', es: 'Slide anterior' })
  const next = button(doc, '›', { en: 'Next slide', es: 'Slide siguiente' })
  const dots = doc.createElement('div')
  dots.className = 'deck__dots'
  const count = doc.createElement('span')
  count.className = 'deck__count'
  const lang = doc.createElement('button')
  lang.type = 'button'
  lang.className = 'deck__btn deck__lang'
  lang.dataset.langToggle = ''
  lang.append(both(doc, { en: 'ES', es: 'EN' }))
  lang.setAttribute('aria-label', 'Español / English')
  lang.hidden = englishOnly
  // the button names the theme it switches to
  const theme = button(doc, '', { en: 'Light / dark', es: 'Claro / oscuro' })
  theme.dataset.themeToggle = ''
  const themeGlyph = () => { theme.textContent = effectiveTheme(doc, win) === 'dark' ? '☀' : '☾' }
  themeGlyph()
  theme.addEventListener('click', () => { toggleTheme(doc, win); themeGlyph() })
  const full = button(doc, '⤢', { en: 'Full screen (F)', es: 'Pantalla completa (F)' })
  full.hidden = !doc.fullscreenEnabled || embed
  bar.append(prev, dots, next, count, lang, theme, full)
  doc.querySelector('main.deck')?.after(bar)
  watchIdle(win, doc)

  /** Looping clips play on the slide shown only (a hidden slide's video would run on), and never for reduced motion. */
  const reduce = () => win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  const syncClips = () => {
    slides.forEach((slide, k) => {
      for (const video of slide.querySelectorAll('video')) {
        if (k === current && !reduce()) video.play?.()?.catch?.(() => {}) // a play() cut short is not a failure
        else video.pause?.()
      }
    })
  }

  /** Embedded: tells the parent which slide this is and which map ids it uses (`data-map`). */
  const announce = () => {
    if (!embed) return
    const map = (slides[current]?.dataset.map ?? '').split(/\s+/).filter(Boolean)
    const origin = win.location.origin === 'null' ? '*' : win.location.origin
    win.parent.postMessage({ type: 'slide', track, presentation, index: current, total: slides.length, map }, origin)
  }

  // builds: a slide's pieces come one click at a time, except embedded, where no one is presenting
  const steps = slides.map((s) => (embed ? 0 : buildCount(s)))
  slides.forEach((s, k) => setStep(s, steps[k], steps[k]))

  let current = -1
  const step = []
  let transition = null
  /** Shows slide i at step `at`: 0 when it is reached going forward, complete (its last step) otherwise. */
  const show = (i, writeHash = true, at = Infinity) => {
    const target = Math.min(Math.max(i, 0), slides.length - 1)
    const from = current
    current = target
    step[current] = Math.min(at, steps[current])
    const swap = () => {
      slides.forEach((s, k) => { s.hidden = k !== target })
      setStep(slides[target], step[target], steps[target])
    }
    // a slide change cross-fades where the browser can and motion is welcome; a step changes in CSS alone
    if (from >= 0 && target !== from && doc.startViewTransition && !reduce()) {
      transition?.skipTransition?.()
      transition = doc.startViewTransition(swap)
    } else swap()
    ;[...dots.children].forEach((d, k) => d.setAttribute('aria-current', k === current ? 'step' : 'false'))
    count.textContent = `${current + 1} / ${slides.length}`
    if (writeHash) win.history.replaceState(null, '', `#${current + 1}`)
    syncClips()
    announce()
    // what a slide needs to follow the deck without owning it (a persistent canvas, a timer)
    doc.dispatchEvent(new win.CustomEvent('deck:slide', { detail: { index: current, slide: slides[current], total: slides.length } }))
  }
  /** → builds the next step of the slide, or moves on to the next slide at its first step. */
  const forward = () => {
    if (step[current] < steps[current]) setStep(slides[current], ++step[current], steps[current])
    else if (current < slides.length - 1) show(current + 1, true, 0)
  }
  /** ← takes back the last step, or goes back to the previous slide, complete. */
  const back = () => {
    if (step[current] > 0) setStep(slides[current], --step[current], steps[current])
    else if (current > 0) show(current - 1)
  }
  slides.forEach((_, k) => {
    const d = doc.createElement('button')
    d.type = 'button'
    d.className = 'deck__dot'
    d.setAttribute('aria-label', String(k + 1))
    d.addEventListener('click', () => show(k))
    dots.append(d)
  })

  const goPresentation = (dir) => {
    if (embed) return
    const p = neighborPresentation(list, presentation, dir)
    if (p) win.location.assign(`../${p.id}/`)
  }
  const fullscreen = () => {
    if (!doc.fullscreenEnabled) return
    if (doc.fullscreenElement) doc.exitFullscreen()
    else doc.documentElement.requestFullscreen()
  }

  prev.addEventListener('click', back)
  next.addEventListener('click', forward)
  full.addEventListener('click', fullscreen)
  lang.addEventListener('click', () =>
    setLang(doc, storage, doc.documentElement.dataset.lang === 'es' ? 'en' : 'es'))

  /** A pitch (`<body data-pitch>`, never embedded) times the slides and is offered every key first. */
  let pitch = null
  doc.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target?.closest?.('select, input, textarea')) return
    if (pitch?.key(e)) {
      e.preventDefault?.()
      return
    }
    const keys = {
      ArrowRight: forward, PageDown: forward, ' ': forward,
      ArrowLeft: back, PageUp: back,
      Home: () => show(0), End: () => show(slides.length - 1),
      ArrowUp: () => goPresentation(-1), ArrowDown: () => goPresentation(1),
      f: fullscreen, F: fullscreen,
    }
    const act = keys[e.key]
    if (!act) return
    e.preventDefault?.()
    act()
  })
  if (embed) {
    win.addEventListener('message', (e) => {
      if (e.source !== win.parent || (win.location.origin !== 'null' && e.origin !== win.location.origin)) return
      if (e.data?.type === 'goto' && Number.isInteger(e.data.index)) show(e.data.index)
      if (e.data?.type === 'lang' && (e.data.lang === 'en' || e.data.lang === 'es')) setLang(doc, storage, e.data.lang)
    })
  }
  win.addEventListener('hashchange', () => show(slideFromHash(win.location.hash, slides.length), false))

  if (slides.length) show(slideFromHash(win.location.hash, slides.length), true, 0)
  const api = { slides, index: () => current, show }
  if (slides.length && !embed && doc.body.hasAttribute('data-pitch')) pitch = mountPitch(win, api)
  return api
}

/** How many steps a slide builds in: the highest `data-build` or `data-build-state` on it, 0 for none. */
export function buildCount(slide) {
  let n = 0
  for (const el of slide.querySelectorAll('[data-build], [data-build-state]')) {
    n = Math.max(n, Number.parseInt(el.dataset.build ?? el.dataset.buildState, 10) || 0)
  }
  return n
}

/**
 * Puts a slide at step `at` of `total`: every piece of a step up to it gets `data-built`, those of this very step
 * `data-now` and their order `--d` (a stagger). `data-build` pieces appear (deck.css); `data-build-state` ones
 * are always there and change. The slide carries `data-step`, and `data-complete` on its last step.
 */
export function setStep(slide, at, total) {
  slide.dataset.step = String(at)
  if (at >= total) slide.dataset.complete = ''
  else delete slide.dataset.complete
  let order = 0
  for (const el of slide.querySelectorAll('[data-build], [data-build-state]')) {
    const n = Number.parseInt(el.dataset.build ?? el.dataset.buildState, 10) || 0
    if (n <= at) el.dataset.built = ''
    else delete el.dataset.built
    if (n === at) {
      el.dataset.now = ''
      el.style.setProperty('--d', String(order++))
    } else delete el.dataset.now
  }
}

function button(doc, glyph, label) {
  const b = doc.createElement('button')
  b.type = 'button'
  b.className = 'deck__btn'
  b.textContent = glyph
  b.setAttribute('aria-label', label.en)
  b.title = `${label.en} · ${label.es}`
  return b
}

/** A track's landing: open its latest presentation, or say it is coming. */
export function openLatest(win, track, list = PRESENTATIONS[track] ?? []) {
  const p = latestPresentation(list)
  if (p) {
    win.location.replace(`./${p.id}/`)
    return
  }
  const doc = win.document
  const storage = safeStorage(win)
  setLang(doc, storage, initialLang(storage, win.navigator.language))
  const soon = doc.querySelector('[data-soon]')
  if (soon) soon.hidden = false
}
