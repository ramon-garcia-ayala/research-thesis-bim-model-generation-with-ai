/*
 * The paper reader inside the map: a prepared paper (papers/<node-id>/paper.json) as clean text with its figures in
 * place, in English or Spanish, docked over the right half of the map or covering it (study mode). It lights the
 * paper and what it links to on the map, like a slide does. Underlining, the chat and quizzes need the local server
 * (`client`); without it the reader still shows the text and the figures.
 */
import { blocksOf, paraLabel, textOf } from './paper.js'

export const MODE_KEY = 'research-map-reader-mode'
export const LANG_KEY = 'research-map-reader-lang'

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
 * nodes it links to, or nothing once it closes.
 */
export function mountReader(root, { papers = [], map, load, base = '', client = null, onLit = () => {}, onShow = () => {}, win = window } = {}) {
  const doc = root.ownerDocument
  let lang = stored(win, LANG_KEY, ['en', 'es'], 'es')
  let mode = stored(win, MODE_KEY, ['half', 'full'], 'half')
  let now = null // { nodeId, paper }
  let pending = Promise.resolve()
  const L = () => LABELS[lang]
  const narrow = () => (win.innerWidth || 1024) < 700
  const effectiveMode = () => (narrow() ? 'full' : mode)

  const el = doc.createElement('section')
  el.className = 'reader'
  el.hidden = true
  el.innerHTML = `
    <header class="reader__bar">
      <span class="reader__title"></span>
      <span class="reader__langs" role="group">
        <button type="button" class="reader__lang" data-lang="en">EN</button>
        <button type="button" class="reader__lang" data-lang="es">ES</button>
      </span>
      <span class="reader__voice"></span>
      <button type="button" class="reader__mode"></button>
      <button type="button" class="reader__close">×</button>
    </header>
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
    $('.reader__close').setAttribute('aria-label', L().close)
    $('.reader__close').title = L().close
    $('.reader__zoom-close').setAttribute('aria-label', L().zoomClose)
    side.hidden = m !== 'full'
    $('.reader__chat').hidden = !client
    $('.reader__chat-toggle').hidden = !client || m !== 'half'
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
      now = { nodeId, paper }
      render()
      text.scrollTop = 0
      if (at?.block) goTo(at.block)
      const linked = (map?.links ?? []).flatMap((l) => (l.from === nodeId ? [l.to] : l.to === nodeId ? [l.from] : []))
      onLit([nodeId, ...linked])
    })()
    pending = job
    return job
  }

  function close() {
    if (el.hidden) return
    el.hidden = true
    now = null
    pop.hidden = true
    closeZoom()
    onLit(null)
  }

  function setLang(l) {
    if (l !== 'en' && l !== 'es') return
    const keep = now ? firstVisible() : null
    lang = l
    remember(win, LANG_KEY, l)
    render()
    renderChrome()
    if (keep) goTo(keep)
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
    const blockEl = range.startContainer.parentElement?.closest('[data-block]')
    if (!blockEl || !text.contains(blockEl)) return void (pop.hidden = true)
    const acts = client
      ? [['underline', L().underline], ['ask', L().ask], ['read-from', L().readFrom]]
      : [['read-from', L().readFrom]]
    pop.innerHTML = acts.map(([act, label]) => `<button type="button" data-act="${act}">${esc(label)}</button>`).join('')
    pop.dataset.block = blockEl.dataset.block
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
    const go = t.closest('[data-goto]')
    if (go) return goTo(go.dataset.goto)
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
