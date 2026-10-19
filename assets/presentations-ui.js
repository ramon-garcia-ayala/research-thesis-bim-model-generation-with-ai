/*
 * The presentations inside the map: a scrolling menu on the left (track → presentation → slide) and a viewer docked at
 * the bottom right that shows a deck in an <iframe> (`?embed`). The deck reports each slide and the map ids it uses
 * (`data-map`); this module hands them to `onLit`, so the map can light them. It never reads the map itself.
 */
import { LANG_KEY } from '../presentations/assets/i18n.js'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const shortDate = (iso, lang) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric' })

/** The language the decks use: the stored choice, else the browser's. */
function readLang(win) {
  try {
    const stored = win.localStorage.getItem(LANG_KEY)
    if (stored === 'en' || stored === 'es') return stored
  } catch {
    // blocked storage: follow the browser
  }
  return String(win.navigator.language).toLowerCase().startsWith('es') ? 'es' : 'en'
}

/**
 * Mounts the menu and the viewer into `root`. `index` comes from `loadIndex`. `onLit(ids | null)` is called with the
 * map ids the shown slide uses, or null when none (or the viewer closed).
 * @returns {{ toggleMenu(open?: boolean): boolean, open(at: {track: string, presentation: string, n: number}): void,
 *   close(): void, insets(): {left: number, viewer: {w: number, h: number} | null}, lang(): 'en'|'es',
 *   trackName(key: string): string }}
 */
export function mountPresentations(root, index, { onLit = () => {} } = {}) {
  const doc = root.ownerDocument
  const win = doc.defaultView
  let lang = readLang(win)
  let at = null // { track, presentation, n } of the slide the viewer shows

  const menu = doc.createElement('aside')
  menu.className = 'menu'
  menu.hidden = true
  menu.setAttribute('aria-label', 'Presentations')
  const viewer = doc.createElement('section')
  viewer.className = 'viewer'
  viewer.hidden = true
  viewer.setAttribute('aria-label', 'Presentation viewer')
  viewer.innerHTML = `
    <header class="viewer__bar">
      <span class="viewer__title"></span>
      <a class="viewer__present" target="_blank" rel="noopener">Present ↗</a>
      <button type="button" class="viewer__close" aria-label="Close the viewer">×</button>
    </header>
    <iframe class="viewer__frame" title="Presentation"></iframe>`
  root.append(menu, viewer)
  const frame = viewer.querySelector('iframe')

  const itemOf = (track, id) => index.tracks.find((t) => t.key === track)?.items.find((i) => i.id === id)
  const numberOf = (id) => id.replace(/^presentacion-/, '')
  const deckUrl = (track, id) => `presentations/${track}/${id}/`

  function renderMenu() {
    menu.innerHTML = `
      <div class="menu__bar">
        <h2>Presentations</h2>
        <button type="button" class="menu__lang" aria-label="Español / English">${lang === 'es' ? 'EN' : 'ES'}</button>
        <button type="button" class="menu__close" aria-label="Close the menu">×</button>
      </div>
      <div class="menu__scroll">${index.tracks
        .map(
          (t) => `<section class="menu__track"><h3>${esc(t.name[lang])}</h3>${
            t.items.length === 0 ? '<p class="empty">None yet.</p>' : ''
          }${t.items
            .map(
              (p) => `<details class="menu__item" open>
                <summary><b>${esc(numberOf(p.id))}</b>${p.date ? `<span class="menu__date">${esc(shortDate(p.date, lang))}</span>` : ''}<span class="menu__name">${esc(p.title[lang])}</span></summary>
                <ol>${p.slides
                  .map(
                    (s) => `<li><button type="button" class="menu__slide" data-open="${t.key}|${p.id}|${s.n}"${
                      at && at.track === t.key && at.presentation === p.id && at.n === s.n ? ' aria-current="true"' : ''
                    }><span class="menu__n">${s.n}</span><span class="menu__t">${esc(s.title[lang])}</span>${
                      s.map.length ? `<i class="menu__dot" title="Uses ${s.map.length} part(s) of the map"></i>` : ''
                    }</button></li>`,
                  )
                  .join('')}</ol>
              </details>`,
            )
            .join('')}</section>`,
        )
        .join('')}</div>`
  }

  function showAt() {
    const p = at && itemOf(at.track, at.presentation)
    viewer.querySelector('.viewer__title').textContent = at && p ? `${index.tracks.find((t) => t.key === at.track).name[lang]} ${numberOf(at.presentation)} · ${at.n} / ${p.slides.length}` : ''
    viewer.querySelector('.viewer__present').setAttribute('href', at ? `${deckUrl(at.track, at.presentation)}#${at.n}` : '#')
    for (const b of menu.querySelectorAll('.menu__slide')) {
      const [track, id, n] = b.dataset.open.split('|')
      if (at && track === at.track && id === at.presentation && Number(n) === at.n) b.setAttribute('aria-current', 'true')
      else b.removeAttribute('aria-current')
    }
  }

  function open({ track, presentation, n }) {
    const same = at && at.track === track && at.presentation === presentation && frame.getAttribute('src')
    at = { track, presentation, n }
    viewer.hidden = false
    if (same) frame.contentWindow?.postMessage({ type: 'goto', index: n - 1 }, win.location.origin === 'null' ? '*' : win.location.origin)
    else frame.setAttribute('src', `${deckUrl(track, presentation)}?embed#${n}`)
    showAt()
  }

  function close() {
    at = null
    viewer.hidden = true
    frame.removeAttribute('src')
    showAt()
    onLit(null)
  }

  // The deck says which slide it shows and which map ids it uses.
  win.addEventListener('message', (e) => {
    if (e.source !== frame.contentWindow || e.data?.type !== 'slide') return
    if (win.location.origin !== 'null' && e.origin !== win.location.origin) return
    at = { track: e.data.track, presentation: e.data.presentation, n: e.data.index + 1 }
    showAt()
    onLit(e.data.map.length ? e.data.map : null)
  })

  // The menu's language follows the decks': a change in the viewer reaches here through storage.
  win.addEventListener('storage', (e) => {
    if (e.key !== LANG_KEY) return
    lang = readLang(win)
    renderMenu()
    showAt()
  })

  menu.addEventListener('click', (e) => {
    if (e.target.closest('.menu__close')) return void toggleMenu(false)
    if (e.target.closest('.menu__lang')) {
      lang = lang === 'es' ? 'en' : 'es'
      try {
        win.localStorage.setItem(LANG_KEY, lang)
      } catch {
        // not remembered, still switched
      }
      frame.contentWindow?.postMessage({ type: 'lang', lang }, win.location.origin === 'null' ? '*' : win.location.origin)
      renderMenu()
      showAt()
      return
    }
    const slide = e.target.closest('.menu__slide')
    if (slide) {
      const [track, presentation, n] = slide.dataset.open.split('|')
      open({ track, presentation, n: Number(n) })
    }
  })
  viewer.addEventListener('click', (e) => {
    if (e.target.closest('.viewer__close')) close()
  })

  function toggleMenu(show = menu.hidden) {
    menu.hidden = !show
    return show
  }

  renderMenu()
  showAt()

  return {
    toggleMenu,
    open,
    close,
    /** What the menu and the viewer cover: a left margin, and the viewer's size when it is open. */
    insets: () => ({
      left: menu.hidden ? 0 : menu.offsetWidth + 16,
      viewer: viewer.hidden ? null : { w: viewer.offsetWidth + 16, h: viewer.offsetHeight + 16 },
    }),
    lang: () => lang,
    trackName: (key) => index.tracks.find((t) => t.key === key)?.name[lang] ?? key,
  }
}
