// Pitch mode: a deck whose <body> has `data-pitch` advances by itself, one slide every SLIDE_MS (a Pecha Kucha: 15
// slides of 20 s, five minutes), under a bar of chapters that fills as the time goes. Opt-in, so the weekly decks are
// untouched; never mounted embedded (`?embed`), where no one is presenting.
//
//   ready    slide 1 shown complete, waiting for Space, → or a click on the stage
//   running  the clock ticks; the slide's own motion plays (deck.css keys it on body[data-pitch-state])
//   paused   Space; the clock and the motion hold
//   done     the last slide has had its time

export const SLIDE_MS = 20000
export const TICK_MS = 100

/** Consecutive slides that share a `data-chapter`, in order: `{ name, first, count }`. */
export function chaptersOf(slides) {
  const out = []
  slides.forEach((slide, i) => {
    const name = slide.dataset.chapter ?? ''
    const last = out[out.length - 1]
    if (last && last.name === name) last.count++
    else out.push({ name, first: i, count: 1 })
  })
  return out
}

/** How full each chapter's segment is, 0–1: done before the current slide, part of the current one, none after. */
export function fillsOf(chapters, index, fraction) {
  return chapters.map((c) => {
    if (index >= c.first + c.count) return 1
    if (index < c.first) return 0
    return (index - c.first + fraction) / c.count
  })
}

/** Milliseconds as m:ss. */
export function clock(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const el = (doc, tag, className, text) => {
  const node = doc.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

/**
 * Mounts the pitch on a mounted deck (`api` is what `mountDeck` returns). Returns `key(e)`, which the deck's keydown
 * handler offers every key first (true = handled), plus `state()` and `slideElapsed()`.
 * @param {Window} win
 * @param {{ slides: HTMLElement[], index: () => number, show: (i: number, writeHash?: boolean, at?: number) => void }} api
 */
export function mountPitch(win, api) {
  const doc = win.document
  const { slides } = api
  const total = slides.length
  const chapters = chaptersOf(slides)
  const stage = slides[0]?.parentElement ?? doc.querySelector('.stage')

  const bar = el(doc, 'div', 'pitch__bar')
  const list = el(doc, 'ol', 'pitch__chapters')
  const segs = chapters.map((c) => {
    const li = el(doc, 'li', 'pitch__seg')
    li.style.setProperty('--n', String(c.count))
    li.style.setProperty('--fill', '0')
    li.append(el(doc, 'i'), el(doc, 'span', null, c.name))
    list.append(li)
    return li
  })
  const hint = el(doc, 'span', 'pitch__hint', 'Space to start')
  const clockEl = el(doc, 'span', 'pitch__clock')
  bar.append(list, hint, clockEl)
  stage?.append(bar)

  let state = 'ready'
  let elapsed = 0
  let last = Date.now()

  const render = () => {
    const index = api.index()
    const fills = fillsOf(chapters, index, Math.min(elapsed / SLIDE_MS, 1))
    segs.forEach((seg, k) => {
      seg.style.setProperty('--fill', String(Math.round(fills[k] * 10000) / 10000))
      const here = index >= chapters[k].first && index < chapters[k].first + chapters[k].count
      if (here) seg.setAttribute('aria-current', 'step')
      else seg.removeAttribute('aria-current')
    })
    clockEl.textContent = `${clock(index * SLIDE_MS + elapsed)} / ${clock(total * SLIDE_MS)}`
  }
  const setState = (next) => {
    state = next
    doc.body.dataset.pitchState = next
    hint.hidden = next !== 'ready'
    render()
  }
  const start = () => {
    slides.forEach((s) => delete s.dataset.pitchStill) // a still slide plays again, from its start
    last = Date.now()
    setState('running')
  }
  const go = (i) => api.show(Math.min(Math.max(i, 0), total - 1), true, 0)

  // any change of slide (the pitch's own, the keys, a dot, Home/End, the hash) gives the new slide its full 20 s
  doc.addEventListener('deck:slide', (e) => {
    if (!slides.includes(e.detail?.slide)) return // another deck's event
    elapsed = 0
    last = Date.now()
    if (state === 'done' && api.index() < total - 1) state = 'paused'
    doc.body.dataset.pitchState = state
    // a slide reached while the pitch is not running (a presenter answering a question) is shown complete: its
    // entrance would otherwise wait, paused, at opacity 0 (deck.css keys the rule on this mark)
    slides.forEach((s) => delete s.dataset.pitchStill)
    if (state === 'paused' || state === 'done') e.detail.slide.dataset.pitchStill = ''
    render()
  })
  doc.addEventListener('click', (e) => {
    if (state === 'ready' && e.target?.closest?.('.stage')) start()
  })

  const tick = () => {
    const now = Date.now()
    if (state !== 'running') {
      last = now
      return
    }
    elapsed += now - last
    last = now
    if (elapsed >= SLIDE_MS) {
      // one slide per tick, whatever the stall (a sleeping laptop, a throttled tab); the remainder is dropped
      if (api.index() >= total - 1) {
        elapsed = SLIDE_MS
        setState('done')
        return
      }
      go(api.index() + 1) // the deck:slide listener zeroes `elapsed`
    }
    render()
  }
  win.setInterval(tick, TICK_MS)

  const key = (e) => {
    switch (e.key) {
      case ' ':
        if (state === 'ready') start()
        else if (state === 'running') setState('paused')
        else if (state === 'paused') start()
        else {
          go(0)
          setState('ready')
        }
        return true
      case 'ArrowRight':
      case 'PageDown':
        if (state === 'ready') start()
        else if (state !== 'done' && api.index() < total - 1) go(api.index() + 1) // an end keeps its clock
        return true
      case 'ArrowLeft':
      case 'PageUp':
        if (state !== 'ready' && api.index() > 0) go(api.index() - 1)
        return true
      case 'r':
      case 'R':
        go(0)
        elapsed = 0
        setState('ready')
        return true
      default:
        return false
    }
  }

  setState('ready')
  return { key, state: () => state, slideElapsed: () => elapsed }
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a)

/**
 * Fills each `.dotfield[data-total][data-lit]` with `data-total` dots, `data-lit` of them lit (all, without data-lit),
 * scattered by a stride coprime with the total so they are not a block. Each dot holds its number in `--i`, which
 * deck.css staggers the dimming of the unlit ones by. Safe to call twice.
 */
export function mountDotFields(doc) {
  for (const field of doc.querySelectorAll('.dotfield[data-total]')) {
    const total = Number.parseInt(field.dataset.total, 10)
    if (!(total > 0)) continue
    const lit = field.dataset.lit == null ? total : Math.min(Number.parseInt(field.dataset.lit, 10) || 0, total)
    const stride = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41].find((s) => gcd(s, total) === 1) ?? 1
    const on = new Set(Array.from({ length: lit }, (_, j) => (j * stride) % total))
    field.replaceChildren(
      ...Array.from({ length: total }, (_, i) => {
        const dot = doc.createElement('i')
        dot.style.setProperty('--i', String(i))
        if (on.has(i)) dot.dataset.lit = ''
        return dot
      }),
    )
  }
}
