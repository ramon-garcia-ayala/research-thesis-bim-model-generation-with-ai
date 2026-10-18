import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KEY, effectiveTheme, initTheme, toggleTheme } from '../assets/theme.js'

/** A window whose system prefers `scheme`, with a working or a throwing localStorage. */
const fakeWindow = (scheme, { storage = true } = {}) => {
  const data = {}
  return {
    matchMedia: (q) => ({ matches: q === `(prefers-color-scheme: ${scheme})` }),
    localStorage: storage
      ? { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = v) }
      : {
          getItem: () => {
            throw new Error('blocked')
          },
          setItem: () => {
            throw new Error('blocked')
          },
        },
  }
}

beforeEach(() => {
  delete document.documentElement.dataset.theme
})

describe('theme', () => {
  it('with no choice saved, follows the system', () => {
    initTheme(document, fakeWindow('dark'))
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(effectiveTheme(document, fakeWindow('dark'))).toBe('dark')
    expect(effectiveTheme(document, fakeWindow('light'))).toBe('light')
  })

  it('a toggle flips what is shown and remembers it', () => {
    const win = fakeWindow('light')
    expect(toggleTheme(document, win)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(win.localStorage.getItem(KEY)).toBe('dark')
    delete document.documentElement.dataset.theme
    initTheme(document, win)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(toggleTheme(document, win)).toBe('light')
  })

  it('from a dark system, the first toggle goes light', () => {
    expect(toggleTheme(document, fakeWindow('dark'))).toBe('light')
  })

  it('blocked storage: the toggle still switches, nothing throws', () => {
    const win = fakeWindow('light', { storage: false })
    expect(() => initTheme(document, win)).not.toThrow()
    expect(toggleTheme(document, win)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('a saved value that is not light or dark is ignored', () => {
    const win = fakeWindow('light')
    win.localStorage.setItem(KEY, 'sepia')
    initTheme(document, win)
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('the toolbar button switches the page and says what it will switch to', async () => {
    const { createView } = await import('../assets/view.js')
    const win = fakeWindow('light')
    vi.stubGlobal('matchMedia', win.matchMedia)
    document.body.innerHTML = '<main id="app"></main>'
    const empty = { version: 1, lastPresentation: null, centre: { question: [], hypothesis: [] }, groups: [], nodes: [], links: [] }
    createView(document.getElementById('app'), empty, {})
    const button = document.querySelector('.theme')
    expect(button.textContent).toBe('Dark')
    button.click()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(button.textContent).toBe('Light')
    expect(button.getAttribute('aria-pressed')).toBe('true')
    vi.unstubAllGlobals()
  })
})
