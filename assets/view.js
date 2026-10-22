/*
 * The viewer: draws the map on a dotted canvas (pan, zoom, fit), shows a node's or link's detail in the side panel,
 * dims what a search or the "new since" filter leaves out, and lights what the slide shown in the presentations viewer
 * uses. It only reads: Claude writes map.json and notes/.
 */
import { boxOf, layout, linkPath } from './layout.js'
import { isNew, linkKey, validate } from './model.js'
import { parseNote, renderMarkdown } from './notes.js'
import { loadIndex, slidesUsing } from './presentations.js'
import { mountPresentations } from './presentations-ui.js'
import { mountReader } from './reader-ui.js'
import { createClient } from './reading-client.js'
import { effectiveTheme, toggleTheme } from './theme.js'

const SVG = 'http://www.w3.org/2000/svg'
const XHTML = 'http://www.w3.org/1999/xhtml'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const current = (versions) => versions[versions.length - 1] ?? null
const groupVar = (colour) => `var(--group-${colour?.slice(1) ?? 8})`

/** Reads a file of the map folder over HTTP; null when it is missing. */
const fetchText = (path) => fetch(path).then((r) => (r.ok ? r.text() : null)).catch(() => null)

/**
 * Loads map.json and every node's note (from the folder `dir`, default the map's own), then draws it into `root`.
 * The presentations (menu, viewer, highlight) come with the map's own folder only; `index` replaces what is loaded.
 * `client` talks to the local server (underlines, chat); by default only for the map's own folder.
 */
export async function start(root, { load = fetchText, dir = '', index, client } = {}) {
  if (dir !== '' && !/^[\w./-]+\/$/.test(dir)) dir = ''
  const read = (path) => load(dir + path)
  const text = await read('map.json')
  let map
  try {
    map = JSON.parse(text ?? '')
  } catch {
    root.textContent = 'map.json cannot be read.'
    return null
  }
  const notes = {}
  await Promise.all(
    (map.nodes ?? []).map(async (n) => {
      notes[n.id] = parseNote((await read(`notes/${n.id}.md`)) ?? '')
    }),
  )
  const presentations = index ?? (dir === '' ? await loadIndex(load).catch(() => null) : null)
  let papers = []
  try {
    papers = JSON.parse((await read('papers/index.json')) ?? '{}').papers ?? []
  } catch {
    papers = []
  }
  const server = client === undefined ? (dir === '' ? createClient() : null) : client
  return createView(root, map, notes, { index: presentations, papers, read, base: dir, client: server })
}

/**
 * Draws `map` with its parsed notes into `root`; returns the verbs the toolbar and tests use. With a presentations
 * `index` (from `loadIndex`) it also mounts the menu and the viewer; with prepared `papers` (papers/index.json), the
 * reader, which loads them through `read` (`base` prefixes their images).
 */
export function createView(root, map, notes, { index = null, papers = [], read = fetchText, base = '', client = null } = {}) {
  const problems = validate(map)
  const fresh = isNew(map, notes)
  // `lit`: the ids the slide shown uses (null = none). `manual`: the author moved the view since the last fit.
  const state = { collapsed: new Set(), selected: null, query: '', onlyNew: false, lit: null, manual: false, view: { x: 0, y: 0, k: 1 } }

  root.classList.add('map')
  root.innerHTML = `
    <header class="toolbar">
      <h1>Research map</h1>
      <input class="search" type="search" placeholder="Search  /" aria-label="Search the map" />
      <button type="button" class="new" aria-pressed="false">${
        map.lastPresentation ? `New since ${esc(map.lastPresentation)}` : 'New: everything (no thesis presentation yet)'
      }</button>
      ${index ? '<button type="button" class="presentations" aria-pressed="false">Presentations</button>' : ''}
      ${papers.length ? '<button type="button" class="papers" aria-pressed="false" aria-haspopup="true">Papers</button>' : ''}
      <span class="zoom">
        <button type="button" data-zoom="out" aria-label="Zoom out">−</button>
        <button type="button" data-zoom="fit">Fit</button>
        <button type="button" data-zoom="in" aria-label="Zoom in">+</button>
      </span>
      <button type="button" class="theme" aria-label="Dark mode"></button>
    </header>
    <div class="stage">
      <svg class="canvas" xmlns="${SVG}"><g class="world"><g class="links"></g><g class="cards"></g></g></svg>
    </div>
    <aside class="panel" hidden></aside>
    ${
      papers.length
        ? `<nav class="papers-menu" hidden aria-label="Papers">${papers
            .map((p) => `<button type="button" data-read="${esc(p.node)}"><span>${esc(p.title)}</span><i>${p.es ? 'EN · ES' : 'EN'}</i></button>`)
            .join('')}</nav>`
        : ''
    }
    <section class="problems" ${problems.length ? '' : 'hidden'}>
      <h2>map.json has ${problems.length} problem(s)</h2>
      <ul>${problems.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    </section>`

  const $ = (sel) => root.querySelector(sel)
  const stage = $('.stage')
  const world = $('.world')
  const panel = $('.panel')
  const nodeById = Object.fromEntries((map.nodes ?? []).map((n) => [n.id, n]))
  const prepared = new Set(papers.map((p) => p.node))
  const groupById = Object.fromEntries((map.groups ?? []).map((g) => [g.id, g]))
  let picture = null

  const titleOf = (id) =>
    id === 'question' ? 'Research question' : id === 'hypothesis' ? 'Hypothesis' : (nodeById[id] ?? groupById[id])?.title ?? id

  // ---- Drawing ----

  const card = (box, cls, html, attrs = {}) => {
    const fo = document.createElementNS(SVG, 'foreignObject')
    fo.setAttribute('x', box.x - box.w / 2)
    fo.setAttribute('y', box.y - box.h / 2)
    fo.setAttribute('width', box.w)
    fo.setAttribute('height', box.h)
    const el = document.createElementNS(XHTML, attrs.tag ?? 'button')
    if (!attrs.tag) el.setAttribute('type', 'button')
    el.className = `card ${cls}`
    el.innerHTML = html
    for (const [k, v] of Object.entries(attrs)) if (k !== 'tag') el.setAttribute(k, v)
    fo.appendChild(el)
    return fo
  }

  function draw() {
    picture = layout(map, { collapsed: state.collapsed })
    const cards = $('.cards')
    const links = $('.links')
    cards.replaceChildren()
    links.replaceChildren()

    const q = current(map.centre.question)
    const h = current(map.centre.hypothesis)
    cards.appendChild(
      card(
        picture.centre,
        'centre',
        `<button type="button" class="part" data-id="question">
           <span class="kind">Research question${map.centre.question.length > 1 ? ` · v${map.centre.question.length}` : ''}</span>
           <span class="title">${q ? esc(q.text) : '<em class="empty">No question yet</em>'}</span>
         </button>
         <button type="button" class="part" data-id="hypothesis">
           <span class="kind">Hypothesis${map.centre.hypothesis.length > 1 ? ` · v${map.centre.hypothesis.length}` : ''}</span>
           <span class="title">${h ? esc(h.text) : '<em class="empty">No hypothesis yet</em>'}</span>
         </button>`,
        { tag: 'div' },
      ),
    )

    for (const g of picture.groups) {
      const group = groupById[g.id]
      const count = map.nodes.filter((n) => n.group === g.id).length
      cards.appendChild(
        card(g, `group${g.collapsed ? ' collapsed' : ''}`, `<span class="kind">${g.collapsed ? '▸' : '▾'} ${count} node${count === 1 ? '' : 's'}</span><span class="title">${esc(group.title)}</span>`, {
          'data-id': g.id,
          'aria-expanded': String(!g.collapsed),
          style: `--group: ${groupVar(group.colour)}`,
        }),
      )
    }

    for (const b of picture.nodes) {
      const n = nodeById[b.id]
      cards.appendChild(
        card(b, 'node', `<span class="kind">${esc(n.kind)} · ${esc(n.date)}</span><span class="title">${esc(n.title)}</span>`, {
          'data-id': n.id,
          style: `--group: ${groupVar(groupById[n.group]?.colour)}`,
        }),
      )
    }

    for (const l of map.links ?? []) {
      const a = boxOf(picture, map, l.from)
      const b = boxOf(picture, map, l.to)
      if (!a || !b || a === b) continue
      const d = linkPath(a, b)
      const path = document.createElementNS(SVG, 'path')
      path.setAttribute('d', d)
      path.setAttribute('class', 'link')
      path.dataset.key = linkKey(l)
      const hit = document.createElementNS(SVG, 'path')
      hit.setAttribute('d', d)
      hit.setAttribute('class', 'link-hit')
      hit.dataset.key = linkKey(l)
      links.append(path, hit)
    }
    paint()
  }

  // ---- Dimming and selection ----

  const matches = (id) => {
    const q = state.query.trim().toLowerCase()
    if (q === '') return true
    const hay = (n) =>
      [n.title, n.cite, n.kind, ...(notes[n.id] ?? []).map((e) => e.body)].join(' ').toLowerCase().includes(q)
    if (nodeById[id]) return hay(nodeById[id])
    if (groupById[id])
      return groupById[id].title.toLowerCase().includes(q) || map.nodes.some((n) => n.group === id && hay(n))
    return true
  }
  const shown = (id) => matches(id) && (!state.onlyNew || fresh.has(id))

  function paint() {
    const lit = state.lit
    // A group that holds a lit node keeps its context, so the lit node does not float without its label.
    const holdsLit = (gid) => lit !== null && map.nodes.some((n) => n.group === gid && lit.has(n.id))
    const centre = root.querySelector('.card.centre')
    centre?.classList.toggle(
      'dim',
      (state.onlyNew && !fresh.has('question') && !fresh.has('hypothesis')) ||
        (lit !== null && !lit.has('question') && !lit.has('hypothesis')),
    )
    for (const el of root.querySelectorAll('.card.node, .card.group')) {
      const id = el.dataset.id
      const visible = shown(id)
      const keep = lit === null || lit.has(id) || (el.classList.contains('group') && holdsLit(id))
      el.classList.toggle('dim', !visible || !keep)
      el.classList.toggle('lit', lit !== null && visible && lit.has(id))
      el.classList.toggle('selected', id === state.selected)
    }
    for (const part of root.querySelectorAll('.card.centre .part')) {
      part.classList.toggle('selected', part.dataset.id === state.selected)
      part.classList.toggle('lit', lit !== null && lit.has(part.dataset.id))
    }
    for (const el of root.querySelectorAll('.link')) {
      const l = map.links.find((x) => linkKey(x) === el.dataset.key)
      const ends = [l.from, l.to]
      const bothLit = lit !== null && ends.every((e) => lit.has(e))
      const dim =
        (state.query.trim() !== '' && !ends.every((e) => matches(e))) ||
        (state.onlyNew && !fresh.has(el.dataset.key)) ||
        (lit !== null && !bothLit)
      el.classList.toggle('dim', dim)
      el.classList.toggle('lit', bothLit)
      el.classList.toggle('on', el.dataset.key === state.selected || ends.includes(state.selected))
    }
  }

  /** Lights the ids a slide uses (nodes, groups, `question`, `hypothesis`); null, or ids the map lacks, lights nothing. */
  function setLit(ids) {
    const known = (id) => id === 'question' || id === 'hypothesis' || Boolean(nodeById[id] ?? groupById[id])
    const list = (ids ?? []).filter(known)
    state.lit = list.length ? new Set(list) : null
    // A node inside a collapsed group is only visible once the group is open.
    let reopened = false
    for (const id of list) {
      const group = nodeById[id]?.group
      if (group && state.collapsed.delete(group)) reopened = true
    }
    if (reopened) draw()
    else paint()
    if (!state.manual) fit(state.lit ? [...state.lit] : null)
  }

  // ---- The panel ----

  const close = `<button type="button" class="close" aria-label="Close">×</button>`

  /** The slides that use `id`, as a panel section. */
  function usedIn(id) {
    const hits = ui ? slidesUsing(index, id) : []
    if (!hits.length) return ''
    const lang = ui.lang()
    const items = hits
      .map(
        (h) =>
          `<li><button type="button" data-open="${esc(h.track)}|${esc(h.presentation)}|${h.n}">${esc(ui.trackName(h.track))} ${esc(h.presentation.replace(/^presentacion-/, ''))} · ${h.n}. ${esc(h.title[lang])}</button></li>`,
      )
      .join('')
    return `<h3 class="section">In presentations</h3><ul class="related">${items}</ul>`
  }

  function nodePanel(n) {
    const group = groupById[n.group]
    const related = map.links.filter((l) => l.from === n.id || l.to === n.id)
    const source = n.source?.file
      ? `<p class="source"><a href="${esc(n.source.file)}" target="_blank" rel="noopener">Open source</a>${
          n.source.original ? `<span>${esc(n.source.original)}</span>` : ''
        }</p>`
      : ''
    const entries = (notes[n.id] ?? [])
      .map(
        (e) =>
          `<article><h3>${e.date ? `${esc(e.date)} · ` : ''}${esc(e.kind)}</h3><div class="md">${renderMarkdown(e.body)}</div></article>`,
      )
      .join('')
    const links = related
      .map((l) => {
        const other = l.from === n.id ? l.to : l.from
        return `<li><button type="button" data-go="${esc(other)}">${esc(titleOf(other))}</button><p>${esc(l.explanation)}</p></li>`
      })
      .join('')
    return `${close}
      <p class="kind">${esc(n.kind)} · ${esc(group?.title)} · ${esc(n.date)}</p>
      <h2>${esc(n.title)}</h2>
      ${n.cite ? `<p class="cite">${esc(n.cite)}</p>` : ''}
      ${prepared.has(n.id) ? `<p class="read"><button type="button" data-read="${esc(n.id)}">Read</button></p>` : ''}
      ${source}
      ${entries || '<p class="empty">No note yet.</p>'}
      ${links ? `<h3 class="section">Links</h3><ul class="related">${links}</ul>` : ''}
      ${usedIn(n.id)}`
  }

  function linkPanel(l) {
    return `${close}
      <p class="kind">link · ${esc(l.date)}</p>
      <h2><button type="button" data-go="${esc(l.from)}">${esc(titleOf(l.from))}</button>
        <span class="arrow">→</span>
        <button type="button" data-go="${esc(l.to)}">${esc(titleOf(l.to))}</button></h2>
      <p class="explanation">${esc(l.explanation)}</p>`
  }

  function centrePanel(part) {
    const versions = [...map.centre[part]].reverse()
    return `${close}
      <p class="kind">${part === 'question' ? 'Research question' : 'Hypothesis'} · ${versions.length} version${versions.length === 1 ? '' : 's'}</p>
      ${
        versions.length
          ? versions
              .map((v, i) => `<article class="${i === 0 ? 'now' : 'earlier'}"><h3>${esc(v.date)}${i === 0 ? ' · current' : ''}</h3><p>${esc(v.text)}</p></article>`)
              .join('')
          : '<p class="empty">Not written yet.</p>'
      }
      ${usedIn(part)}`
  }

  function select(id) {
    state.selected = id
    const link = map.links.find((l) => linkKey(l) === id)
    if (id === null) panel.hidden = true
    else if (id === 'question' || id === 'hypothesis') panel.innerHTML = centrePanel(id)
    else if (nodeById[id]) panel.innerHTML = nodePanel(nodeById[id])
    else if (link) panel.innerHTML = linkPanel(link)
    else if (groupById[id]) return toggleGroup(id)
    if (id !== null) panel.hidden = false
    paint()
    // The panel (and the viewer beside it) changes the free space: keep the lit cards clear of both.
    if (state.lit && !state.manual) fit([...state.lit])
  }

  function toggleGroup(id) {
    if (state.collapsed.has(id)) state.collapsed.delete(id)
    else state.collapsed.add(id)
    draw()
  }

  // ---- Pan and zoom ----

  function place() {
    const { x, y, k } = state.view
    world.setAttribute('transform', `translate(${x} ${y}) scale(${k})`)
    stage.style.backgroundSize = `${24 * k}px ${24 * k}px`
    stage.style.backgroundPosition = `${x}px ${y}px`
  }

  function zoomAt(factor, px, py) {
    const v = state.view
    const k = Math.min(3, Math.max(0.15, v.k * factor))
    v.x = px - ((px - v.x) * k) / v.k
    v.y = py - ((py - v.y) * k) / v.k
    v.k = k
    state.manual = true
    place()
  }

  /** Frames `ids` (cards, a lit slide's) or, with none, the whole map; clear of the toolbar, the menu, the viewer and the panel. */
  function fit(ids = null) {
    const w = stage.clientWidth
    const h = stage.clientHeight
    if (!w || !h || !picture) return
    const lit = ids ? ids.map((id) => boxOf(picture, map, id)).filter(Boolean) : []
    const all = lit.length ? lit : [picture.centre, ...picture.groups, ...picture.nodes]
    const x0 = Math.min(...all.map((b) => b.x - b.w / 2))
    const x1 = Math.max(...all.map((b) => b.x + b.w / 2))
    const y0 = Math.min(...all.map((b) => b.y - b.h / 2))
    const y1 = Math.max(...all.map((b) => b.y + b.h / 2))
    const pad = 48
    const top = ($('.toolbar').offsetHeight || 0) + 32
    const right = Math.max(panel.hidden ? 0 : panel.offsetWidth + 16, reader?.insets().right ?? 0)
    const { left, viewer } = ui?.insets() ?? { left: 0, viewer: null }
    // The viewer sits bottom right: leave its column or its row clear, whichever keeps the cards larger.
    const frames = (viewer ? [{ r: viewer.w, b: 0 }, { r: 0, b: viewer.h }] : [{ r: 0, b: 0 }]).map(({ r, b }) => {
      const aw = w - left - right - r
      const ah = h - top - b
      return { aw, ah, r, k: Math.min(1.2, (aw - 2 * pad) / (x1 - x0), (ah - 2 * pad) / (y1 - y0)) }
    })
    const best = frames.reduce((a, c) => (c.k > a.k ? c : a))
    const k = best.k
    state.view = {
      k,
      x: left + best.aw / 2 - ((x0 + x1) / 2) * k,
      y: top + best.ah / 2 - ((y0 + y1) / 2) * k,
    }
    state.manual = false
    place()
  }

  let drag = null
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.card, .link-hit')) return
    drag = { x: e.clientX - state.view.x, y: e.clientY - state.view.y }
    state.manual = true
    stage.setPointerCapture?.(e.pointerId)
    stage.classList.add('dragging')
  })
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return
    state.view.x = e.clientX - drag.x
    state.view.y = e.clientY - drag.y
    place()
  })
  const endDrag = () => {
    drag = null
    stage.classList.remove('dragging')
  }
  stage.addEventListener('pointerup', endDrag)
  stage.addEventListener('pointercancel', endDrag)
  stage.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      const r = stage.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
    },
    { passive: false },
  )

  // ---- Wiring ----

  root.addEventListener('click', (e) => {
    const toRead = e.target.closest('[data-read]')
    if (toRead && reader) {
      togglePapers(false)
      return void reader.open(toRead.dataset.read)
    }
    if (e.target.closest('.toolbar .papers')) return void togglePapers()
    const go = e.target.closest('[data-go]')
    if (go) return select(go.dataset.go)
    const open = e.target.closest('.panel [data-open]')
    if (open && ui) {
      const [track, presentation, n] = open.dataset.open.split('|')
      return ui.open({ track, presentation, n: Number(n) })
    }
    if (e.target.closest('.close')) return select(null)
    const zoom = e.target.closest('[data-zoom]')
    if (zoom) {
      if (zoom.dataset.zoom === 'fit') return fit(state.lit ? [...state.lit] : null)
      return zoomAt(zoom.dataset.zoom === 'in' ? 1.25 : 0.8, stage.clientWidth / 2, stage.clientHeight / 2)
    }
    const target = e.target.closest('.card [data-id], .card[data-id], .link-hit')
    if (target) select(target.dataset.id ?? target.dataset.key)
  })
  $('.search').addEventListener('input', (e) => {
    state.query = e.target.value
    paint()
  })
  $('.new').addEventListener('click', (e) => {
    state.onlyNew = !state.onlyNew
    e.currentTarget.setAttribute('aria-pressed', String(state.onlyNew))
    paint()
  })
  // The button names the theme it switches to; pressed = dark is showing.
  const win = root.ownerDocument.defaultView
  const themeButton = $('.theme')
  const showTheme = () => {
    const dark = effectiveTheme(root.ownerDocument, win) === 'dark'
    themeButton.textContent = dark ? 'Light' : 'Dark'
    themeButton.setAttribute('aria-pressed', String(dark))
  }
  themeButton.addEventListener('click', () => {
    toggleTheme(root.ownerDocument, win)
    showTheme()
  })
  showTheme()
  root.ownerDocument.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Esc closes the menus first, then the reader (an enlarged figure before it), then the panel.
      if (ui && !root.querySelector('.menu').hidden) return void toggleMenu(false)
      if (papersMenu && !papersMenu.hidden) return void togglePapers(false)
      if (reader?.escape()) return
      select(null)
    }
    if (e.key === '/' && root.ownerDocument.activeElement?.tagName !== 'INPUT') {
      e.preventDefault()
      $('.search').focus()
    }
  })

  // ---- Presentations ----

  const ui = index ? mountPresentations(root, index, { onLit: setLit }) : null
  const presentationsButton = $('.presentations')
  function toggleMenu(show) {
    const open = ui.toggleMenu(show)
    presentationsButton.setAttribute('aria-pressed', String(open))
    if (!state.manual) fit(state.lit ? [...state.lit] : null)
    return open
  }
  presentationsButton?.addEventListener('click', () => toggleMenu())
  root.querySelector('.menu')?.addEventListener('click', (e) => {
    if (e.target.closest('.menu__close')) presentationsButton.setAttribute('aria-pressed', 'false')
  })

  // ---- The paper reader ----

  const papersMenu = $('.papers-menu')
  const papersButton = $('.toolbar .papers')
  function togglePapers(show = papersMenu?.hidden) {
    if (!papersMenu) return
    papersMenu.hidden = !show
    papersButton.setAttribute('aria-pressed', String(Boolean(show)))
  }
  const reader = papers.length
    ? mountReader(root, {
        papers,
        map,
        load: read,
        base,
        client,
        onShow: () => {
          select(null)
          ui?.close()
        },
        onLit: (ids) => {
          state.manual = false
          setLit(ids)
        },
      })
    : null

  draw()
  place()
  fit()
  root.ownerDocument.defaultView?.addEventListener('resize', () => fit(state.lit ? [...state.lit] : null))

  return {
    select,
    toggleGroup,
    search: (q) => {
      state.query = q
      paint()
    },
    toggleNew: () => $('.new').click(),
    setLit,
    fit,
    reader,
  }
}
