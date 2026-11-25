/*
 * Presenter view: the same deck page opened with `?presenter`, in its own window, like PowerPoint's. It shows the
 * slide being presented and the next one (both as embedded decks, `?embed`), the speaker's notes of the slide
 * (`<aside class="notes">` inside each section, hidden on the slides), a timer, the clock and where the deck is.
 *
 * The deck being presented and this view talk over a BroadcastChannel named after the deck's path (`channelName`):
 * the deck sends `state` ({ index, step, steps, total }) on every change; the view sends `forward`, `back`, `goto`
 * and `hello` (asks for the state). Both live on the same origin, so nothing leaves the computer.
 */

/** The channel a deck and its presenter view share: one per deck page. */
export const channelName = (location) => `deck:${location.pathname.replace(/index\.html$/, '')}`

/** "1:05:09", "12:34": a duration in ms as a clock face. */
export function clockOf(ms) {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const two = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`
}

/**
 * What the presenter view says about a pitch, from the pitch's report `{ state, index, elapsed, slideMs, total }`: the
 * label of its main button (Space does that), the pitch's clock over its whole length, and the time left on the slide.
 */
export function pitchFace(p) {
  const labels = {
    ready: ['▶ Start', '▶ Iniciar'],
    running: ['❚❚ Pause', '❚❚ Pausar'],
    paused: ['▶ Resume', '▶ Seguir'],
    done: ['↺ Again', '↺ Otra vez'],
  }
  const [en, es] = labels[p.state] ?? labels.ready
  return {
    en,
    es,
    now: clockOf(p.index * p.slideMs + p.elapsed),
    all: clockOf(p.total * p.slideMs),
    left: clockOf(p.slideMs - p.elapsed),
    live: p.state === 'running',
  }
}

/** The text of a slide's notes, as HTML (the deck's own markup: lang spans, key words); empty when it has none. */
export const notesOf = (slide) => slide?.querySelector(':scope > aside.notes')?.innerHTML.trim() ?? ''

const both = (doc, en, es, tag = 'span') => {
  const out = doc.createElement(tag)
  for (const [lang, text] of [['en', en], ['es', es]]) {
    const s = doc.createElement('span')
    s.lang = lang
    s.textContent = text
    out.append(s)
  }
  return out
}

/**
 * Turns the page into the presenter view. `slides` are the deck's sections (still in the page, read for notes and
 * chapters); the previews are two embedded copies of the deck.
 */
export function mountPresenter(win, slides) {
  const doc = win.document
  doc.documentElement.dataset.presenter = ''
  const deckTitle = doc.title
  doc.title = `${deckTitle} · Presenter`
  const base = `${win.location.pathname}`
  const channel = 'BroadcastChannel' in win ? new win.BroadcastChannel(channelName(win.location)) : null

  const el = (tag, cls, ...kids) => {
    const e = doc.createElement(tag)
    if (cls) e.className = cls
    e.append(...kids)
    return e
  }
  const frame = (cls) => {
    const f = doc.createElement('iframe')
    f.className = cls
    f.src = `${base}?embed&preview#1`
    f.setAttribute('tabindex', '-1')
    return f
  }

  // header: the deck, the timer, the clock, where it is
  const title = el('b', 'pv__title', deckTitle)
  const timer = el('button', 'pv__timer')
  timer.type = 'button'
  timer.title = 'Reset · Reiniciar'
  const clock = el('span', 'pv__clock')
  const where = el('span', 'pv__where')
  const head = el('header', 'pv__head', title, timer, clock, where)

  // the slide now, large; the next one and the notes beside it
  const now = frame('pv__now')
  const nowBox = el('div', 'pv__nowbox', now)
  const next = frame('pv__next')
  const nextLabel = both(doc, 'Next', 'Siguiente', 'p')
  nextLabel.className = 'pv__label'
  const endLabel = both(doc, 'End of the deck', 'Fin de la presentación', 'p')
  endLabel.className = 'pv__end'
  const nextBox = el('div', 'pv__nextbox', next, endLabel)
  const notesLabel = both(doc, 'Notes', 'Notas', 'p')
  notesLabel.className = 'pv__label'
  const smaller = el('button', 'pv__size', 'A−')
  const larger = el('button', 'pv__size', 'A+')
  smaller.type = larger.type = 'button'
  const notesHead = el('div', 'pv__noteshead', notesLabel, smaller, larger)
  const notes = el('div', 'pv__notes')
  const side = el('aside', 'pv__side', nextLabel, nextBox, notesHead, notes)

  // footer: back and forward drive the deck being presented
  const back = el('button', 'pv__btn', '‹')
  const fwd = el('button', 'pv__btn pv__btn--go', '›')
  back.type = fwd.type = 'button'
  back.append(both(doc, ' Back', ' Anterior'))
  fwd.prepend(both(doc, 'Next ', 'Siguiente '))
  // a pitch (a Pecha Kucha that moves by itself) also has a play button: the same as Space in either window
  const play = el('button', 'pv__btn pv__play')
  play.type = 'button'
  play.hidden = true
  const chapter = el('span', 'pv__chapter')
  const hint = both(doc, '← → or space · the deck window follows', '← → o espacio · la ventana de la presentación sigue', 'small')
  const pitchHint = both(doc, 'space: play / pause · ← → move · R restarts', 'espacio: play / pausa · ← → mueven · R reinicia', 'small')
  pitchHint.hidden = true
  const foot = el('footer', 'pv__foot', back, play, chapter, hint, pitchHint, fwd)

  const view = el('div', 'pv', head, el('div', 'pv__body', nowBox, side), foot)
  doc.body.append(view)

  // ---- state from the deck
  let state = { index: 0, step: 0, steps: 0, total: slides.length }
  let shown = -1
  const goto = (f, i) => f.contentWindow?.postMessage({ type: 'goto', index: i }, win.location.origin === 'null' ? '*' : win.location.origin)
  function paint() {
    const { index, step, steps, total } = state
    if (index !== shown) {
      shown = index
      goto(now, index)
      const last = index >= total - 1
      next.hidden = last
      endLabel.hidden = !last
      if (!last) goto(next, index + 1)
      notes.innerHTML = notesOf(slides[index]) || ''
      if (!notes.innerHTML) notes.append(both(doc, 'No notes for this slide.', 'Esta lámina no tiene notas.', 'p'))
      notes.scrollTop = 0
      const s = slides[index]
      chapter.textContent = (doc.documentElement.dataset.lang === 'es' ? s?.dataset.chapterEs : null) ?? s?.dataset.chapter ?? ''
    }
    where.replaceChildren(
      both(doc, `Slide ${index + 1} / ${total}`, `Lámina ${index + 1} / ${total}`),
      steps ? both(doc, ` · step ${Math.min(step, steps)} of ${steps}`, ` · paso ${Math.min(step, steps)} de ${steps}`) : '',
    )
    paintPitch() // a pitch's own line (time left) replaces the one above; paintPitch is set below, before the first paint
  }
  // the previews load after this page: show the slide once each is ready
  for (const f of [now, next]) f.addEventListener('load', () => { shown = -1; paint() })
  // a pitch reports its clock; until it does, the deck is a normal one and Space means "next"
  let pitch = null
  const paintPitch = () => {
    if (!pitch) return
    const face = pitchFace(pitch)
    play.replaceChildren(both(doc, face.en, face.es))
    play.classList.toggle('is-live', face.live)
    timer.textContent = `⏱ ${face.now} / ${face.all}`
    timer.title = 'Restart · Reiniciar'
    where.replaceChildren(
      both(doc, `Slide ${state.index + 1} / ${state.total}`, `Lámina ${state.index + 1} / ${state.total}`),
      both(doc, ` · ${face.left} left`, ` · quedan ${face.left}`),
    )
  }
  channel?.addEventListener('message', (e) => {
    if (e.data?.type === 'pitch') {
      const first = !pitch
      pitch = e.data
      if (first) {
        play.hidden = false
        hint.hidden = true
        pitchHint.hidden = false
      }
      paintPitch()
      return
    }
    if (e.data?.type !== 'state') return
    state = { ...state, ...e.data }
    paint()
  })
  const send = (msg) => channel?.postMessage(msg)
  back.addEventListener('click', () => send({ type: 'back' }))
  fwd.addEventListener('click', () => send({ type: 'forward' }))
  play.addEventListener('click', () => send({ type: 'toggle' }))
  doc.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    // on a pitch, Space is play / pause (not "next") and R starts over, as in the deck window
    const keys = { ArrowRight: 'forward', PageDown: 'forward', ' ': pitch ? 'toggle' : 'forward', ArrowLeft: 'back', PageUp: 'back' }
    if (pitch) Object.assign(keys, { r: 'restart', R: 'restart' })
    if (!keys[e.key]) return
    e.preventDefault()
    send({ type: keys[e.key] })
  })

  // notes size, remembered
  let size = 1.15
  try { size = Number(win.localStorage.getItem('research-map-notes-size')) || size } catch {}
  const setSize = (v) => {
    size = Math.min(2, Math.max(0.8, v))
    notes.style.fontSize = `${size}rem`
    try { win.localStorage.setItem('research-map-notes-size', String(size)) } catch {}
  }
  setSize(size)
  smaller.addEventListener('click', () => setSize(size - 0.1))
  larger.addEventListener('click', () => setSize(size + 0.1))

  // timer from the moment the view opens; a click starts it over
  let start = Date.now()
  // on a pitch the timer is the pitch's own clock (paintPitch) and a click restarts the pitch
  timer.addEventListener('click', () => {
    if (pitch) send({ type: 'restart' })
    else { start = Date.now(); tick() }
  })
  const tick = () => {
    if (!pitch) timer.textContent = `⏱ ${clockOf(Date.now() - start)}`
    clock.textContent = new Date().toLocaleTimeString(doc.documentElement.dataset.lang === 'es' ? 'es-MX' : 'en-US', { hour: '2-digit', minute: '2-digit' })
  }
  tick()
  win.setInterval(tick, 1000)

  paint()
  send({ type: 'hello' })
  return { channel, state: () => state }
}
