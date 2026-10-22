/*
 * The paper reader inside the map: a prepared paper (papers/<node-id>/paper.json) as clean text with its figures in
 * place, in English or Spanish, docked over the right half of the map or covering it (study mode). It lights the
 * paper and what it links to on the map, like a slide does. Underlining, the chat and quizzes need the local server
 * (`client`); without it the reader still shows the text and the figures.
 */
import { blocksOf, paraLabel, textOf } from './paper.js'
import { addUnderline, emptyReading, removeUnderline, segments } from './reading.js'
import { buildQueue, createSpeaker } from './speech.js'

export const MODE_KEY = 'research-map-reader-mode'
export const LANG_KEY = 'research-map-reader-lang'
export const HINT_KEY = 'research-map-reader-voice-hint'
const RATES = [0.75, 1, 1.25, 1.5, 2]

/** The element of block `blockEl` that holds its text: the paragraph or heading itself, a figure's caption. */
const holderOf = (blockEl) => (blockEl?.tagName === 'FIGURE' ? blockEl.querySelector('figcaption') : blockEl)

/** Where `range` starts and ends in the text of block `blockEl` (character offsets), or null when it is not inside. */
export function offsetsIn(blockEl, range) {
  const holder = holderOf(blockEl)
  if (!holder || !holder.contains(range.startContainer) || !holder.contains(range.endContainer)) return null
  const before = blockEl.ownerDocument.createRange()
  before.selectNodeContents(holder)
  before.setEnd(range.startContainer, range.startOffset)
  const start = before.toString().length
  const end = start + range.toString().length
  return end > start ? { start, end } : null
}

/** Every string the reader shows, in its two languages. */
export const LABELS = {
  en: {
    papers: 'Papers',
    read: 'Read',
    close: 'Close the reader',
    full: 'Full screen',
    half: 'Half screen',
    contents: 'Contents',
    figures: 'Figures and tables',
    underline: 'Underline',
    ask: 'Ask',
    readFrom: '▶ Read from here',
    zoomClose: 'Close',
    missing: 'The figure’s image is missing.',
    notPrepared: 'This paper is not prepared yet.',
    chat: 'Chat',
    play: 'Read aloud',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    prev: 'Previous paragraph',
    next: 'Next paragraph',
    rate: 'Speed',
    voice: 'Voice',
    readSelection: '▶ Read selection',
    removeUnderline: 'Remove underline',
    voiceHint: 'This browser offers no natural voice: open the map in Microsoft Edge to listen with its natural voices.',
  },
  es: {
    papers: 'Papers',
    read: 'Leer',
    close: 'Cerrar el lector',
    full: 'Pantalla completa',
    half: 'Media pantalla',
    contents: 'Índice',
    figures: 'Figuras y tablas',
    underline: 'Subrayar',
    ask: 'Preguntar',
    readFrom: '▶ Leer desde aquí',
    zoomClose: 'Cerrar',
    missing: 'Falta la imagen de la figura.',
    notPrepared: 'Este paper todavía no está preparado.',
    chat: 'Chat',
    play: 'Leer en voz alta',
    pause: 'Pausa',
    resume: 'Seguir',
    stop: 'Detener',
    prev: 'Párrafo anterior',
    next: 'Párrafo siguiente',
    rate: 'Velocidad',
    voice: 'Voz',
    readSelection: '▶ Leer selección',
    removeUnderline: 'Quitar subrayado',
    voiceHint: 'Este navegador no ofrece voces naturales: abre el mapa en Microsoft Edge para escucharlo con sus voces naturales.',
  },
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const stored = (win, key, allowed, fallback) => {
  try {
    const v = win.localStorage.getItem(key)
    if (allowed.includes(v)) return v
  } catch {
    // blocked storage: the default
  }
  return fallback
}
const remember = (win, key, value) => {
  try {
    win.localStorage.setItem(key, value)
  } catch {
    // not remembered, still switched
  }
}

/**
 * Mounts the reader into `root`. `papers` are the entries of papers/index.json; `load(path)` reads a file of the map
 * folder (null when missing); `base` prefixes image URLs (the folder the map was loaded from). `onShow()` is called
 * when it opens (the map closes its panel and the presentations viewer); `onLit(ids | null)` lights the paper and the
 * nodes it links to, or nothing once it closes. `speech` is the browser's voice (`{ synth, Utterance }`); without it
 * the voice controls are not shown.
 */
export function mountReader(
  root,
  { papers = [], map, load, base = '', client = null, onLit = () => {}, onShow = () => {}, win = window, speech = { synth: win.speechSynthesis, Utterance: win.SpeechSynthesisUtterance } } = {},
) {
  const doc = root.ownerDocument
  let lang = stored(win, LANG_KEY, ['en', 'es'], 'es')
  let mode = stored(win, MODE_KEY, ['half', 'full'], 'half')
  let now = null // { nodeId, paper }
  let pending = Promise.resolve()
  let speaking = null // the sentence being read: { block, start, end }
  let picked = null // the selection the menu acts on: { block, start, end, text }
  // The local server, once it answers (null without it); the reading of the open paper (underlines, place, voice).
  let live = null
  let reading = null
  const availability = client
    ? Promise.resolve()
        .then(() => client.available())
        .then((ok) => (live = ok ? client : null))
        .catch(() => (live = null))
    : Promise.resolve(null)
  const today = () => {
    const d = new Date()
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }
  /** Keeps the reading on the server (the client waits for a pause before writing). */
  const persist = (change = {}) => {
    if (!live || !now || !reading) return
    reading = { ...reading, ...change }
    live.save(now.nodeId, reading)
  }
  const L = () => LABELS[lang]
  const narrow = () => (win.innerWidth || 1024) < 700
  const effectiveMode = () => (narrow() ? 'full' : mode)

  const el = doc.createElement('section')
  el.className = 'reader'
  el.hidden = true
  el.innerHTML = `
    <header class="reader__bar">
      <button type="button" class="reader__contents">☰</button>
      <span class="reader__title"></span>
      <span class="reader__langs" role="group">
        <button type="button" class="reader__lang" data-lang="en">EN</button>
        <button type="button" class="reader__lang" data-lang="es">ES</button>
      </span>
      <span class="reader__voice"></span>
      <button type="button" class="reader__mode"></button>
      <button type="button" class="reader__chat-open" hidden></button>
      <button type="button" class="reader__close">×</button>
    </header>
    <p class="reader__hint" hidden></p>
    <div class="reader__body">
      <nav class="reader__side"></nav>
      <article class="reader__text" tabindex="-1"></article>
      <div class="reader__chat-wrap">
        <button type="button" class="reader__chat-toggle" aria-expanded="true" hidden></button>
        <div class="reader__chat" hidden></div>
      </div>
    </div>
    <div class="reader__pop" hidden></div>
    <dialog class="reader__zoom"><img alt="" /><button type="button" class="reader__zoom-close">×</button></dialog>`
  root.append(el)
  const $ = (sel) => el.querySelector(sel)
  const text = $('.reader__text')
  const side = $('.reader__side')
  const pop = $('.reader__pop')
  const zoom = $('.reader__zoom')

  const imageUrl = (b) => `${base}papers/${now.nodeId}/${b.image}`
  const blockEl = (id) => text.querySelector(`[data-block="${CSS.escape(id)}"]`)
  const blockById = (id) => blocksOf(now?.paper).find((b) => b.id === id)

  /** The highlighted runs of a block's text: the author's underlines in this language, the sentence being read. */
  const rangesOf = (id) => [
    ...(reading?.underlines ?? []).filter((u) => u.block === id && u.lang === lang).map((u) => ({ start: u.start, end: u.end, id: u.id })),
    ...(speaking?.block === id ? [{ start: speaking.start, end: speaking.end, id: 'speaking' }] : []),
  ]

  /** Re-draws the text of block `id` with its highlights. */
  function decorate(id) {
    const b = now && blockById(id)
    const holder = holderOf(blockEl(id))
    if (!b || !holder) return
    const t = textOf(b, lang)
    const ranges = rangesOf(id)
    // An underline made in the other language cannot be placed in this text: the paragraph gets a margin mark.
    blockEl(id).classList.toggle('has-underline', (reading?.underlines ?? []).some((u) => u.block === id && u.lang !== lang))
    if (!ranges.length) return void (holder.textContent = t)
    holder.innerHTML = segments(t, ranges)
      .map((r) => {
        let html = esc(r.text)
        if (r.ids.includes('speaking')) html = `<span class="speaking">${html}</span>`
        const u = r.ids.find((x) => x !== 'speaking')
        return u ? `<mark data-u="${esc(u)}">${html}</mark>` : html
      })
      .join('')
  }

  // ---- Voice ----

  const canSpeak = Boolean(speech?.synth && speech?.Utterance)
  let rate = 1
  const speaker = canSpeak
    ? createSpeaker({
        synth: speech.synth,
        Utterance: speech.Utterance,
        onSentence(item) {
          const before = speaking
          speaking = item ? { block: item.block, start: item.start, end: item.end } : null
          if (before) decorate(before.block)
          if (item) {
            decorate(item.block)
            blockEl(item.block)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
            persist({ position: { block: item.block, sentence: 0 } })
          }
          renderVoice()
        },
        onIdle: () => renderVoice(),
      })
    : null
  speech?.synth?.addEventListener?.('voiceschanged', () => renderVoice())

  function renderVoice() {
    const bar = $('.reader__voice')
    if (!speaker) return void bar.replaceChildren()
    const state = speaker.state()
    const voices = speaker.voicesFor(lang)
    const chosen = bar.querySelector('.reader__voices')?.value
    const button = (act, label, glyph) => `<button type="button" data-voice="${act}" aria-label="${esc(label)}" title="${esc(label)}">${glyph}</button>`
    bar.innerHTML = `
      ${button('play', L().play, '▶')}
      ${button('pause', state === 'paused' ? L().resume : L().pause, state === 'paused' ? '▶︎' : '⏸')}
      ${button('stop', L().stop, '■')}
      ${button('prev', L().prev, '⏮')}
      ${button('next', L().next, '⏭')}
      <select class="reader__rate" aria-label="${esc(L().rate)}">${RATES.map((r) => `<option value="${r}"${r === rate ? ' selected' : ''}>${r}×</option>`).join('')}</select>
      ${
        voices.length
          ? `<select class="reader__voices" aria-label="${esc(L().voice)}">${voices
              .map((v) => `<option value="${esc(v.name)}"${v.name === chosen ? ' selected' : ''}>${esc(v.name.replace(/^Microsoft\s+/, '').replace(/\s+-\s+.*$/, ''))}</option>`)
              .join('')}</select>`
          : ''
      }`
    for (const b of bar.querySelectorAll('[data-voice="pause"], [data-voice="stop"], [data-voice="prev"], [data-voice="next"]')) b.disabled = state === 'idle'
  }

  /** Says once, when the browser has no natural voice for the language, that Edge has them. */
  function voiceHint() {
    const hint = $('.reader__hint')
    hint.hidden = true
    if (!speaker || speaker.voicesFor(lang).some((v) => /natural/i.test(v.name))) return
    if (stored(win, HINT_KEY, ['shown'], null)) return
    hint.textContent = L().voiceHint
    hint.hidden = false
    remember(win, HINT_KEY, 'shown')
  }

  function speakFrom(from, only = null) {
    if (!speaker || !now) return
    speaker.play(buildQueue(now.paper, lang, from, only))
  }

  function renderText() {
    const { paper } = now
    text.innerHTML = paper.sections
      .map(
        (s) => `<section class="reader__section${s.id === 'refs' ? ' refs' : ''}" data-section="${esc(s.id)}">
          <h2>${esc(textOf(s, lang))}</h2>
          ${s.blocks.map((b) => blockHtml(paper, b)).join('')}
        </section>`,
      )
      .join('')
    for (const img of text.querySelectorAll('figure.blk img')) img.addEventListener('error', () => missing(img))
    for (const id of new Set([...(reading?.underlines ?? []).map((u) => u.block), ...(speaking ? [speaking.block] : [])])) decorate(id)
  }

  function blockHtml(paper, b) {
    const attrs = `data-block="${esc(b.id)}" data-label="${esc(paraLabel(paper, b.id))}"`
    const t = esc(textOf(b, lang))
    if (b.type === 'heading') return `<h3 class="blk" ${attrs}>${t}</h3>`
    if (b.type === 'equation') return `<pre class="blk" ${attrs}>${t}</pre>`
    if (b.type === 'figure' || b.type === 'table')
      return `<figure class="blk ${b.type}" ${attrs}><img src="${esc(imageUrl(b))}" alt="${t}" loading="lazy" /><figcaption>${t}</figcaption></figure>`
    return `<p class="blk" ${attrs}>${t}</p>`
  }

  function missing(img) {
    const fig = img.closest('figure')
    fig.classList.add('missing')
    fig.setAttribute('title', L().missing)
    img.remove()
  }

  function renderSide() {
    const { paper } = now
    const figures = blocksOf(paper).filter((b) => b.image)
    side.innerHTML = `
      <h3>${esc(L().contents)}</h3>
      <ol class="reader__toc">${paper.sections.map((s) => `<li><button type="button" data-goto="${esc(s.id)}">${esc(textOf(s, lang))}</button></li>`).join('')}</ol>
      ${
        figures.length
          ? `<h3>${esc(L().figures)}</h3><div class="reader__thumbs">${figures
              .map((b) => `<button type="button" data-goto="${esc(b.id)}" title="${esc(textOf(b, lang))}"><img src="${esc(imageUrl(b))}" alt="" loading="lazy" /><span>${esc(paraLabel(paper, b.id))}</span></button>`)
              .join('')}</div>`
          : ''
      }`
    for (const img of side.querySelectorAll('img')) img.addEventListener('error', () => img.remove())
  }

  function renderChrome() {
    const m = effectiveMode()
    el.dataset.mode = m
    el.setAttribute('aria-label', now ? now.paper.title : L().papers)
    for (const b of el.querySelectorAll('.reader__lang')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang))
    const toggle = $('.reader__mode')
    toggle.textContent = m === 'half' ? '⤢' : '⤡'
    toggle.setAttribute('aria-label', m === 'half' ? L().full : L().half)
    toggle.title = toggle.getAttribute('aria-label')
    toggle.hidden = narrow()
    // On a phone the contents and the chat open over the text, from a button each.
    $('.reader__contents').hidden = !narrow()
    $('.reader__contents').setAttribute('aria-label', L().contents)
    $('.reader__chat-open').hidden = !narrow() || !live
    $('.reader__chat-open').textContent = L().chat
    if (!narrow()) el.classList.remove('side-open', 'chat-open')
    $('.reader__close').setAttribute('aria-label', L().close)
    $('.reader__close').title = L().close
    $('.reader__zoom-close').setAttribute('aria-label', L().zoomClose)
    side.hidden = m !== 'full'
    $('.reader__chat').hidden = !live
    $('.reader__chat-toggle').hidden = !live || m !== 'half'
    renderVoice()
  }

  /** The block shown at the top of the text, to keep the place across a re-render. */
  function firstVisible() {
    const top = text.getBoundingClientRect().top
    return [...text.querySelectorAll('[data-block]')].find((b) => b.getBoundingClientRect().bottom > top + 1)?.dataset.block ?? null
  }

  function goTo(id) {
    const target = text.querySelector(`[data-block="${CSS.escape(id)}"], [data-section="${CSS.escape(id)}"]`)
    target?.scrollIntoView?.({ block: 'start' })
  }

  function render() {
    if (!now) return
    $('.reader__title').textContent = now.paper.title
    renderText()
    renderSide()
    renderChrome()
  }

  async function open(nodeId, at = null) {
    const job = (async () => {
      const raw = await load(`papers/${nodeId}/paper.json`)
      let paper = null
      try {
        paper = raw ? JSON.parse(raw) : null
      } catch {
        paper = null
      }
      el.hidden = false
      onShow()
      if (!paper) {
        now = null
        $('.reader__title').textContent = map?.nodes?.find((n) => n.id === nodeId)?.title ?? nodeId
        text.innerHTML = `<p class="reader__empty">${esc(L().notPrepared)}</p>`
        side.innerHTML = ''
        renderChrome()
        onLit([nodeId])
        return
      }
      speaker?.stop()
      await availability
      reading = live ? await live.load(nodeId).catch(() => emptyReading()) : null
      // What the author chose for this paper wins over the browser's defaults.
      if (reading?.lang === 'en' || reading?.lang === 'es') lang = reading.lang
      if (speaker && reading?.rate) speaker.setRate((rate = reading.rate))
      if (speaker && reading?.voice) speaker.setVoice(reading.voice)
      now = { nodeId, paper }
      render()
      voiceHint()
      text.scrollTop = 0
      const place = at?.block ?? reading?.position?.block
      if (place) goTo(place)
      const linked = (map?.links ?? []).flatMap((l) => (l.from === nodeId ? [l.to] : l.to === nodeId ? [l.from] : []))
      onLit([nodeId, ...linked])
    })()
    pending = job
    return job
  }

  function close() {
    if (el.hidden) return
    speaker?.stop()
    el.hidden = true
    now = null
    pop.hidden = true
    closeZoom()
    onLit(null)
  }

  function setLang(l) {
    if (l !== 'en' && l !== 'es') return
    const keep = now ? firstVisible() : null
    const reading = speaker?.at() // the voice goes on at the same paragraph, in the other language
    if (reading) speaker.stop()
    lang = l
    remember(win, LANG_KEY, l)
    persist({ lang: l })
    render()
    renderChrome()
    if (keep) goTo(keep)
    if (reading) speakFrom({ block: reading.block })
  }

  function setMode(m) {
    if (m !== 'half' && m !== 'full') return
    mode = m
    remember(win, MODE_KEY, m)
    renderChrome()
  }

  function closeZoom() {
    if (!zoom.open) return
    if (zoom.close) zoom.close()
    else zoom.removeAttribute('open')
  }

  // ---- Selection: a small menu over the selected text ----

  function showPop() {
    const sel = win.getSelection?.()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return void (pop.hidden = true)
    const range = sel.getRangeAt(0)
    const target = range.startContainer.parentElement?.closest('[data-block]')
    const at = target && text.contains(target) ? offsetsIn(target, range) : null
    if (!at) return void (pop.hidden = true)
    picked = { block: target.dataset.block, ...at, text: range.toString() }
    const acts = [
      ...(live ? [['underline', L().underline], ['ask', L().ask]] : []),
      ...(speaker ? [['read-from', L().readFrom], ['read-selection', L().readSelection]] : []),
    ]
    if (!acts.length) return void (pop.hidden = true)
    pop.innerHTML = acts.map(([act, label]) => `<button type="button" data-act="${act}">${esc(label)}</button>`).join('')
    pop.dataset.block = picked.block
    const r = range.getBoundingClientRect?.()
    const box = el.getBoundingClientRect()
    if (r) {
      pop.style.left = `${Math.max(8, r.left - box.left)}px`
      pop.style.top = `${Math.max(8, r.top - box.top - 40)}px`
    }
    pop.hidden = false
  }

  text.addEventListener('mouseup', () => showPop())
  text.addEventListener('keyup', (e) => e.shiftKey && showPop())
  doc.addEventListener('mousedown', (e) => {
    if (!pop.contains(e.target)) pop.hidden = true
  })

  // ---- Wiring ----

  el.addEventListener('click', (e) => {
    const t = e.target
    if (t.closest('.reader__close')) return close()
    const l = t.closest('.reader__lang')
    if (l) return setLang(l.dataset.lang)
    if (t.closest('.reader__mode')) return setMode(effectiveMode() === 'half' ? 'full' : 'half')
    const voice = t.closest('[data-voice]')
    if (voice && speaker) {
      const act = voice.dataset.voice
      if (act === 'play') speakFrom(firstVisible() ? { block: firstVisible() } : null)
      else if (act === 'pause') speaker.state() === 'paused' ? speaker.resume() : speaker.pause()
      else if (act === 'stop') speaker.stop()
      else speaker.skip(act === 'next' ? 1 : -1)
      return renderVoice()
    }
    const action = t.closest('.reader__pop [data-act]')
    if (action?.dataset.act === 'remove-underline') {
      pop.hidden = true
      const u = reading?.underlines.find((x) => x.id === action.dataset.u)
      if (!u) return
      reading = removeUnderline(reading, u.id)
      persist()
      return decorate(u.block)
    }
    if (action && picked) {
      const { block, start, end } = picked
      pop.hidden = true
      win.getSelection?.()?.removeAllRanges()
      if (action.dataset.act === 'read-from') speakFrom({ block, offset: start })
      if (action.dataset.act === 'read-selection') speakFrom(null, { block, start, end })
      if (action.dataset.act === 'underline' && reading) {
        reading = addUnderline(reading, { block, lang, start, end, text: picked.text }, today())
        persist()
        decorate(block)
      }
      return
    }
    const mark = t.closest('.reader__text mark[data-u]')
    if (mark && live) {
      pop.innerHTML = `<button type="button" data-act="remove-underline" data-u="${esc(mark.dataset.u)}">${esc(L().removeUnderline)}</button>`
      const r = mark.getBoundingClientRect?.()
      const box = el.getBoundingClientRect()
      if (r) {
        pop.style.left = `${Math.max(8, r.left - box.left)}px`
        pop.style.top = `${Math.max(8, r.top - box.top - 40)}px`
      }
      pop.hidden = false
      return
    }
    if (t.closest('.reader__contents')) return void el.classList.toggle('side-open')
    if (t.closest('.reader__chat-open')) return void el.classList.toggle('chat-open')
    const go = t.closest('[data-goto]')
    if (go) {
      el.classList.remove('side-open')
      return goTo(go.dataset.goto)
    }
    const img = t.closest('figure.blk img')
    if (img) {
      zoom.querySelector('img').setAttribute('src', img.getAttribute('src'))
      zoom.querySelector('img').setAttribute('alt', img.getAttribute('alt'))
      if (zoom.showModal) zoom.showModal()
      else zoom.setAttribute('open', '')
      return
    }
    if (t.closest('.reader__zoom')) return closeZoom()
    const toggle = t.closest('.reader__chat-toggle')
    if (toggle) {
      const open = toggle.getAttribute('aria-expanded') !== 'true'
      toggle.setAttribute('aria-expanded', String(open))
      el.classList.toggle('chat-collapsed', !open)
    }
  })

  el.addEventListener('change', (e) => {
    if (!speaker) return
    if (e.target.matches('.reader__rate')) {
      rate = Number(e.target.value)
      speaker.setRate(rate)
      persist({ rate })
    }
    if (e.target.matches('.reader__voices')) {
      speaker.setVoice(e.target.value)
      persist({ voice: e.target.value })
    }
  })

  // The place: the first paragraph in view, kept a moment after scrolling stops (the client waits too).
  text.addEventListener('scroll', () => {
    const id = speaker?.state() === 'playing' ? null : firstVisible()
    if (id) persist({ position: { block: id, sentence: 0 } })
  })
  win.addEventListener('pagehide', () => live?.flush())

  win.addEventListener('resize', () => now && renderChrome())
  renderChrome()

  return {
    open,
    close,
    /** Resolves once the paper being opened is shown. */
    ready: () => pending,
    isOpen: () => !el.hidden,
    mode: effectiveMode,
    setMode,
    lang: () => lang,
    setLang,
    /** What the reader covers on the right of the map (half mode); full mode covers it all. */
    insets: () => ({ right: el.hidden || effectiveMode() !== 'half' ? 0 : el.offsetWidth + 16 }),
    current: () => now,
    /** Esc: closes an enlarged figure first, then the reader; false when there was nothing to close. */
    escape() {
      if (zoom.open) {
        closeZoom()
        return true
      }
      if (!el.hidden) {
        close()
        return true
      }
      return false
    },
    element: el,
  }
}
