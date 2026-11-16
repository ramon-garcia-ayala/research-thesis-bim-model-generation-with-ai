/*
 * The Papers menu: every prepared paper, found by word or by keywords and marked as read or not. The marks go to the
 * local server, so without it they are hidden; the words of the papers load the first time something is searched.
 * Any [data-mark="<node id>"] under `root` is a mark of that paper, wherever it is drawn (menu, panel, reader).
 */
import { addedCounts, filterPapers, keywordCounts, sortPapers } from './library.js'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const STATUS = [
  ['all', 'All'],
  ['unread', 'Unread'],
  ['read', 'Read'],
]

const LEVELS = [
  ['first', '★', 'First'],
  ['later', '◷', 'Later'],
]
/** What one click on a marker does: none, then later, then first, then none again. */
const NEXT_LEVEL = { none: 'later', later: 'first', first: null }
const LEVEL_TITLE = { none: 'Mark to read later', later: 'Mark to read first', first: 'Clear the marker' }

const ORDER = [
  ['progress', 'Most read first'],
  ['new', 'Newest first'],
  ['old', 'Oldest first'],
]

/** Fills the menu `el`; `load(path)` reads a file of the map folder, `client` talks to the local server (or is null). */
export function mountLibrary(el, { root, papers, keywords = [], load, client = null }) {
  const labels = Object.fromEntries(keywords.map((k) => [k.id, k.label]))
  const total = keywordCounts(papers)
  const offered = keywords.filter((k) => total[k.id]).sort((a, b) => total[b.id] - total[a.id])
  const dates = Object.keys(addedCounts(papers)).sort().reverse()
  /** How far the author is in a paper: all of it when marked as read, else what the server worked out. */
  const covered = (id) => (state.read[id] ? 100 : state.progress[id] ?? 0)
  const state = { query: '', keywords: [], status: 'all', added: [], levels: [], order: '', arranged: '', progress: {}, queue: {}, read: {}, marks: false, words: null, loading: null }

  el.innerHTML = `
    <div class="papers-menu__tools">
      <input class="papers-menu__search" type="search" placeholder="Search by word" aria-label="Search the papers by word" />
      <div class="papers-menu__status papers-menu__levels" role="group" aria-label="Markers" hidden>
        ${LEVELS.map(([id, glyph, name]) => `<button type="button" data-level="${id}" aria-pressed="false">${glyph} ${name} <b></b></button>`).join('')}
      </div>
      <div class="papers-menu__status" role="group" aria-label="Read or unread" hidden>
        ${STATUS.map(([id, name]) => `<button type="button" data-status="${id}" aria-pressed="${id === 'all'}">${name} <b></b></button>`).join('')}
      </div>
      ${
        offered.length
          ? `<details class="papers-menu__keys">
              <summary>Keywords <b></b></summary>
              <div class="papers-menu__keywords" role="group" aria-label="Keywords">
                ${offered.map((k) => `<button type="button" class="papers-menu__keyword" data-keyword="${esc(k.id)}" aria-pressed="false">${esc(k.label)} <b></b></button>`).join('')}
              </div>
            </details>`
          : ''
      }
      ${
        dates.length
          ? `<details class="papers-menu__keys papers-menu__dates">
              <summary>Order and date added <b></b></summary>
              <div class="papers-menu__keywords" role="group" aria-label="Order">
                ${ORDER.map(([id, name]) => `<button type="button" class="papers-menu__keyword" data-order="${id}" aria-pressed="false">${name}</button>`).join('')}
              </div>
              <div class="papers-menu__keywords" role="group" aria-label="Date added">
                ${dates.map((d) => `<button type="button" class="papers-menu__keyword" data-added="${esc(d)}" aria-pressed="false">${esc(d)} <b></b></button>`).join('')}
              </div>
            </details>`
          : ''
      }
      <button type="button" class="papers-menu__clear" hidden>Clear search</button>
    </div>
    <div class="papers-menu__list">
      ${papers
        .map(
          (p) => `<div class="papers-menu__row" data-paper="${esc(p.node)}">
            <button type="button" class="papers-menu__mark" data-mark="${esc(p.node)}" aria-pressed="false" hidden></button>
            <button type="button" class="papers-menu__queue" data-queue="${esc(p.node)}" aria-pressed="false" hidden></button>
            <button type="button" data-read="${esc(p.node)}">
              <span>${esc(p.title)}${
                p.added || (p.keywords ?? []).length
                  ? `<small>${esc([p.added, ...(p.keywords ?? []).map((k) => labels[k])].filter(Boolean).join(' · '))}</small>`
                  : ''
              }<span class="progress" data-progress="${esc(p.node)}" role="progressbar" aria-label="Reading progress" hidden><span class="progress__track"><span></span></span><em data-pct></em></span></span>
              <i>${p.es ? 'EN · ES' : 'EN'}</i>
            </button>
          </div>`,
        )
        .join('')}
    </div>
    <p class="papers-menu__none" hidden>No paper matches.</p>`

  const $ = (sel) => el.querySelector(sel)
  const search = $('.papers-menu__search')
  const filter = (over = {}) => ({
    query: state.query,
    keywords: state.keywords,
    status: state.status,
    added: state.added,
    levels: state.levels,
    queue: state.queue,
    read: state.read,
    words: state.words,
    labels,
    ...over,
  })

  /** Puts every mark under `root` in line with what is read. */
  function sync() {
    for (const b of root.querySelectorAll('[data-mark]')) {
      const read = Boolean(state.read[b.dataset.mark])
      b.hidden = !state.marks
      b.setAttribute('aria-pressed', String(read))
      const action = read ? 'Mark as unread' : 'Mark as read'
      b.title = action
      b.setAttribute('aria-label', action)
      if ('markLabel' in b.dataset) b.textContent = action
    }
    for (const b of root.querySelectorAll('[data-queue]')) {
      const level = state.queue[b.dataset.queue] ?? 'none'
      const glyph = LEVELS.find(([id]) => id === level)?.[1] ?? '☆'
      b.hidden = !state.marks || !b.dataset.queue
      b.textContent = glyph
      b.dataset.state = level
      b.setAttribute('aria-pressed', String(level !== 'none'))
      b.title = LEVEL_TITLE[level]
      b.setAttribute('aria-label', LEVEL_TITLE[level])
    }
    for (const bar of root.querySelectorAll('[data-progress]')) {
      const pct = covered(bar.dataset.progress)
      bar.hidden = !state.marks || !bar.dataset.progress
      bar.style.setProperty('--pct', `${pct}%`)
      bar.setAttribute('aria-valuenow', String(pct))
      bar.querySelector('[data-pct]').textContent = `${pct}%`
    }
  }

  function paint() {
    const left = filterPapers(papers, filter())
    const shown = new Set(left.map((p) => p.node))
    const sorted = sortPapers(papers, state.order, Object.fromEntries(papers.map((p) => [p.node, covered(p.node)])), state.queue)
    const arrangement = sorted.map((p) => p.node).join(' ')
    if (state.arranged !== arrangement) {
      const list = $('.papers-menu__list')
      const rows = new Map([...list.children].map((r) => [r.dataset.paper, r]))
      for (const p of sorted) list.append(rows.get(p.node))
      state.arranged = arrangement
    }
    for (const row of el.querySelectorAll('.papers-menu__row')) row.hidden = !shown.has(row.dataset.paper)

    const anyLevel = filterPapers(papers, filter({ levels: [] }))
    for (const b of el.querySelectorAll('[data-level]')) {
      b.querySelector('b').textContent = anyLevel.filter((p) => state.queue[p.node] === b.dataset.level).length
      b.setAttribute('aria-pressed', String(state.levels.includes(b.dataset.level)))
    }

    const anyStatus = filterPapers(papers, filter({ status: 'all' }))
    const read = anyStatus.filter((p) => state.read[p.node]).length
    const counts = { all: anyStatus.length, read, unread: anyStatus.length - read }
    for (const b of el.querySelectorAll('[data-status]')) {
      b.querySelector('b').textContent = counts[b.dataset.status]
      b.setAttribute('aria-pressed', String(b.dataset.status === state.status))
    }

    const onKeyword = keywordCounts(left)
    for (const b of el.querySelectorAll('[data-keyword]')) {
      const id = b.dataset.keyword
      const chosen = state.keywords.includes(id)
      b.querySelector('b').textContent = onKeyword[id] ?? 0
      b.setAttribute('aria-pressed', String(chosen))
      b.disabled = !chosen && !onKeyword[id]
    }
    const chosen = $('.papers-menu__keys summary b')
    if (chosen) chosen.textContent = state.keywords.length ? `(${state.keywords.length})` : ''

    const onDate = addedCounts(filterPapers(papers, filter({ added: [] })))
    for (const b of el.querySelectorAll('[data-added]')) {
      const d = b.dataset.added
      const chosen = state.added.includes(d)
      b.querySelector('b').textContent = onDate[d] ?? 0
      b.setAttribute('aria-pressed', String(chosen))
      b.disabled = !chosen && !onDate[d]
    }
    for (const b of el.querySelectorAll('[data-order]')) b.setAttribute('aria-pressed', String(b.dataset.order === state.order))
    const dated = $('.papers-menu__dates summary b')
    if (dated) dated.textContent = state.added.length ? `(${state.added.length})` : state.order ? '(sorted)' : ''

    $('.papers-menu__clear').hidden = !state.query && !state.keywords.length && !state.added.length && !state.levels.length
    $('.papers-menu__none').hidden = left.length > 0 || Boolean(state.loading)
  }

  /** The words of every paper, loaded once; until they arrive a search looks at titles and keywords. */
  function loadWords() {
    state.loading ??= Promise.resolve(load('papers/words.json'))
      .then((raw) => {
        state.words = JSON.parse(raw ?? 'null')?.words ?? {}
      })
      .catch(() => {
        state.words = {}
      })
      .then(() => {
        state.loading = null
        paint()
      })
    return state.loading
  }

  function setRead(id, read) {
    const before = state.read[id]
    if (read) state.read = { ...state.read, [id]: new Date().toISOString().slice(0, 10) }
    else {
      const { [id]: _, ...rest } = state.read
      state.read = rest
    }
    sync()
    paint()
    const saving = (async () => client.setRead(id, read))()
    saving.catch((e) => {
      state.read = before ? { ...state.read, [id]: before } : Object.fromEntries(Object.entries(state.read).filter(([k]) => k !== id))
      sync()
      paint()
      root.dispatchEvent(new CustomEvent('reader-save-error', { detail: e.message }))
    })
  }

  function setQueue(id, level) {
    const before = state.queue[id]
    const { [id]: _, ...rest } = state.queue
    state.queue = level ? { ...rest, [id]: level } : rest
    sync()
    paint()
    const saving = (async () => client.setQueue(id, level))()
    saving.catch((e) => {
      const { [id]: __, ...without } = state.queue
      state.queue = before ? { ...without, [id]: before } : without
      sync()
      paint()
      root.dispatchEvent(new CustomEvent('reader-save-error', { detail: e.message }))
    })
  }

  search.addEventListener('input', () => {
    state.query = search.value
    if (state.query.trim() && !state.words) loadWords()
    paint()
  })
  el.addEventListener('click', (e) => {
    const status = e.target.closest('[data-status]')
    if (status) {
      state.status = status.dataset.status
      return paint()
    }
    const keyword = e.target.closest('[data-keyword]')
    if (keyword) {
      const id = keyword.dataset.keyword
      state.keywords = state.keywords.includes(id) ? state.keywords.filter((k) => k !== id) : [...state.keywords, id]
      return paint()
    }
    const level = e.target.closest('[data-level]')
    if (level) {
      const id = level.dataset.level
      state.levels = state.levels.includes(id) ? state.levels.filter((x) => x !== id) : [...state.levels, id]
      return paint()
    }
    const added = e.target.closest('[data-added]')
    if (added) {
      const d = added.dataset.added
      state.added = state.added.includes(d) ? state.added.filter((x) => x !== d) : [...state.added, d]
      return paint()
    }
    const order = e.target.closest('[data-order]')
    if (order) {
      state.order = state.order === order.dataset.order ? '' : order.dataset.order
      return paint()
    }
    if (e.target.closest('.papers-menu__clear')) {
      state.query = ''
      state.keywords = []
      state.added = []
      state.levels = []
      search.value = ''
      paint()
      search.focus()
    }
  })
  // The reader says how far the author has got as they read; the menu keeps up without asking the server again.
  root.addEventListener('reader-progress', (e) => {
    state.progress = { ...state.progress, [e.detail.node]: e.detail.pct }
    sync()
    paint()
  })
  root.addEventListener('click', (e) => {
    const mark = e.target.closest('[data-mark]')
    if (mark && state.marks) setRead(mark.dataset.mark, !state.read[mark.dataset.mark])
    const queue = e.target.closest('[data-queue]')
    if (queue && state.marks) setQueue(queue.dataset.queue, NEXT_LEVEL[state.queue[queue.dataset.queue] ?? 'none'])
  })

  /** What was marked before, if the server is there and can tell. */
  const start = (async () => {
    if (!client?.library) return
    try {
      if (!(await client.available())) return
      const stored = await client.library()
      state.read = stored.read ?? {}
      state.progress = stored.progress ?? {}
      state.queue = stored.queue ?? {}
      $('.papers-menu__levels').hidden = false
      state.marks = true
      $('.papers-menu__status').hidden = false
    } catch {
      state.marks = false
    }
  })().then(() => {
    sync()
    paint()
  })

  paint()
  return { sync, ready: () => start, settled: () => Promise.resolve(state.loading) }
}
