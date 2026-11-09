/*
 * The Papers menu: every prepared paper, found by word or by keywords and marked as read or not. The marks go to the
 * local server, so without it they are hidden; the words of the papers load the first time something is searched.
 * Any [data-mark="<node id>"] under `root` is a mark of that paper, wherever it is drawn (menu, panel, reader).
 */
import { filterPapers, keywordCounts } from './library.js'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const STATUS = [
  ['all', 'All'],
  ['unread', 'Unread'],
  ['read', 'Read'],
]

/** Fills the menu `el`; `load(path)` reads a file of the map folder, `client` talks to the local server (or is null). */
export function mountLibrary(el, { root, papers, keywords = [], load, client = null }) {
  const labels = Object.fromEntries(keywords.map((k) => [k.id, k.label]))
  const total = keywordCounts(papers)
  const offered = keywords.filter((k) => total[k.id]).sort((a, b) => total[b.id] - total[a.id])
  const state = { query: '', keywords: [], status: 'all', read: {}, marks: false, words: null, loading: null }

  el.innerHTML = `
    <div class="papers-menu__tools">
      <input class="papers-menu__search" type="search" placeholder="Search by word" aria-label="Search the papers by word" />
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
      <button type="button" class="papers-menu__clear" hidden>Clear search</button>
    </div>
    <div class="papers-menu__list">
      ${papers
        .map(
          (p) => `<div class="papers-menu__row" data-paper="${esc(p.node)}">
            <button type="button" class="papers-menu__mark" data-mark="${esc(p.node)}" aria-pressed="false" hidden></button>
            <button type="button" data-read="${esc(p.node)}">
              <span>${esc(p.title)}${
                (p.keywords ?? []).length ? `<small>${esc((p.keywords ?? []).map((k) => labels[k]).filter(Boolean).join(' · '))}</small>` : ''
              }</span>
              <i>${p.es ? 'EN · ES' : 'EN'}</i>
            </button>
          </div>`,
        )
        .join('')}
    </div>
    <p class="papers-menu__none" hidden>No paper matches.</p>`

  const $ = (sel) => el.querySelector(sel)
  const search = $('.papers-menu__search')
  const filter = (over = {}) => ({ query: state.query, keywords: state.keywords, status: state.status, read: state.read, words: state.words, labels, ...over })

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
  }

  function paint() {
    const left = filterPapers(papers, filter())
    const shown = new Set(left.map((p) => p.node))
    for (const row of el.querySelectorAll('.papers-menu__row')) row.hidden = !shown.has(row.dataset.paper)

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

    $('.papers-menu__clear').hidden = !state.query && !state.keywords.length
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
    if (e.target.closest('.papers-menu__clear')) {
      state.query = ''
      state.keywords = []
      search.value = ''
      paint()
      search.focus()
    }
  })
  root.addEventListener('click', (e) => {
    const mark = e.target.closest('[data-mark]')
    if (mark && state.marks) setRead(mark.dataset.mark, !state.read[mark.dataset.mark])
  })

  /** What was marked before, if the server is there and can tell. */
  const start = (async () => {
    if (!client?.library) return
    try {
      if (!(await client.available())) return
      state.read = (await client.library()).read ?? {}
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
