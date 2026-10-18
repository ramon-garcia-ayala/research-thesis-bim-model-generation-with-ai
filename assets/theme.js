/*
 * Light or dark. With no choice saved the page follows the system (CSS `prefers-color-scheme`); the toggle saves an
 * explicit choice as `data-theme` on <html>. Storage may be blocked (private window): then the choice lasts the visit.
 */

export const KEY = 'research-map-theme'

const read = (win) => {
  try {
    const v = win.localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

/** Applies the saved choice, if any. index.html runs the same before first paint, so there is no flash. */
export function initTheme(doc = document, win = window) {
  const saved = read(win)
  if (saved) doc.documentElement.dataset.theme = saved
}

/** What the page shows now: the explicit choice, else the system's. */
export function effectiveTheme(doc = document, win = window) {
  const set = doc.documentElement.dataset.theme
  if (set === 'light' || set === 'dark') return set
  return win.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Switches to the other theme and remembers it; returns the new one. */
export function toggleTheme(doc = document, win = window) {
  const next = effectiveTheme(doc, win) === 'dark' ? 'light' : 'dark'
  doc.documentElement.dataset.theme = next
  try {
    win.localStorage.setItem(KEY, next)
  } catch {
    // Blocked storage: the switch still holds for this visit.
  }
  return next
}
