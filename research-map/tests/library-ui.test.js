import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyReading } from '../assets/reading.js'
import { start } from '../assets/view.js'

const fromDisk = async (path) => (existsSync(join(import.meta.dirname, '..', path)) ? readFileSync(join(import.meta.dirname, '..', path), 'utf8') : null)

const library = {
  keywords: [
    { id: 'ifc', label: 'IFC' },
    { id: 'graph', label: 'Graphs' },
    { id: 'empty', label: 'Nothing yet' },
  ],
  papers: [
    { node: 'sample-a', title: 'Sample paper A: procedural houses', figures: 1, es: false, graph: true, keywords: ['ifc', 'graph'] },
    { node: 'sample-b', title: 'Sample paper B: real drawings', figures: 0, es: true, graph: false, keywords: ['ifc'] },
  ],
}
const words = { words: { 'sample-a': 'houses procedural validator', 'sample-b': 'drawings real' } }

const client = (read = {}) => ({
  available: async () => true,
  load: async () => emptyReading(),
  save: () => {},
  flush: async () => {},
  library: vi.fn(async () => ({ version: 1, read })),
  setRead: vi.fn(async () => {}),
})

let root
let loaded
async function open(server) {
  document.body.innerHTML = '<main id="app"></main>'
  root = document.getElementById('app')
  loaded = []
  const load = async (path) => {
    loaded.push(path)
    if (path.endsWith('papers/index.json')) return JSON.stringify(library)
    if (path.endsWith('papers/words.json')) return JSON.stringify(words)
    return fromDisk(path)
  }
  const view = await start(root, { load, dir: 'tests/fixture/', index: { tracks: [] }, client: server })
  await view.library.ready()
  $('.toolbar .papers').click()
  return view
}
const $ = (sel) => root.querySelector(sel)
const $$ = (sel) => [...root.querySelectorAll(sel)]
const shown = () => $$('.papers-menu__row:not([hidden]) [data-read]').map((b) => b.dataset.read)
const type = async (view, text) => {
  const box = $('.papers-menu__search')
  box.value = text
  box.dispatchEvent(new Event('input', { bubbles: true }))
  await view.library.settled()
}

describe('the papers menu', () => {
  beforeEach(() => window.localStorage.clear())

  it('lists every paper', async () => {
    await open(client())
    expect(shown()).toEqual(['sample-a', 'sample-b'])
  })

  describe('searching by word', () => {
    it('filters by the title without loading the words of the papers', async () => {
      const view = await open(client())
      expect(loaded.some((p) => p.endsWith('papers/words.json'))).toBe(false)
      await type(view, 'real')
      expect(shown()).toEqual(['sample-b'])
    })

    it('finds a word inside the text', async () => {
      const view = await open(client())
      await type(view, 'validator')
      expect(shown()).toEqual(['sample-a'])
      expect(loaded.filter((p) => p.endsWith('papers/words.json'))).toHaveLength(1)
    })

    it('says so when nothing matches', async () => {
      const view = await open(client())
      expect($('.papers-menu__none').hidden).toBe(true)
      await type(view, 'zzz')
      expect(shown()).toEqual([])
      expect($('.papers-menu__none').hidden).toBe(false)
    })

    it('keeps the search working by title when the words cannot be loaded', async () => {
      document.body.innerHTML = '<main id="app"></main>'
      root = document.getElementById('app')
      const load = async (path) => {
        if (path.endsWith('papers/index.json')) return JSON.stringify(library)
        if (path.endsWith('papers/words.json')) return null
        return fromDisk(path)
      }
      const view = await start(root, { load, dir: 'tests/fixture/', index: { tracks: [] }, client: client() })
      await view.library.ready()
      await type(view, 'drawings')
      expect(shown()).toEqual(['sample-b'])
    })
  })

  describe('choosing keywords', () => {
    const chip = (id) => $(`.papers-menu__keyword[data-keyword="${id}"]`)

    it('offers each keyword with how many papers have it', async () => {
      await open(client())
      expect(chip('ifc').textContent).toContain('IFC')
      expect(chip('ifc').textContent).toContain('2')
      expect(chip('graph').textContent).toContain('1')
    })

    it('leaves out a keyword no paper has', async () => {
      await open(client())
      expect(chip('empty')).toBeNull()
    })

    it('narrows the list with each one, and widens it when taken off', async () => {
      await open(client())
      chip('graph').click()
      expect(shown()).toEqual(['sample-a'])
      expect(chip('graph').getAttribute('aria-pressed')).toBe('true')
      chip('graph').click()
      expect(shown()).toEqual(['sample-a', 'sample-b'])
    })

    it('updates the counts to what is left, and blocks a keyword that would leave nothing', async () => {
      const view = await open(client())
      await type(view, 'drawings')
      expect(chip('ifc').textContent).toContain('1')
      expect(chip('graph').disabled).toBe(true)
    })

    it('shows each paper its keywords', async () => {
      await open(client())
      expect($('.papers-menu__row[data-paper="sample-b"]').textContent).toContain('IFC')
    })

    it('clears word and keywords together', async () => {
      const view = await open(client())
      await type(view, 'drawings')
      chip('ifc').click()
      $('.papers-menu__clear').click()
      expect($('.papers-menu__search').value).toBe('')
      expect(chip('ifc').getAttribute('aria-pressed')).toBe('false')
      expect(shown()).toEqual(['sample-a', 'sample-b'])
    })
  })

  describe('read and unread', () => {
    const mark = (id) => $(`.papers-menu__row[data-paper="${id}"] [data-mark]`)
    const status = (s) => $(`.papers-menu__status [data-status="${s}"]`)

    it('shows what was marked before', async () => {
      await open(client({ 'sample-a': '2026-11-08' }))
      expect(mark('sample-a').getAttribute('aria-pressed')).toBe('true')
      expect(mark('sample-b').getAttribute('aria-pressed')).toBe('false')
    })

    it('marks and unmarks a paper, on the server, without opening it', async () => {
      const server = client()
      const view = await open(server)
      mark('sample-b').click()
      expect(server.setRead).toHaveBeenLastCalledWith('sample-b', true)
      expect(mark('sample-b').getAttribute('aria-pressed')).toBe('true')
      expect(view.reader.isOpen()).toBe(false)
      expect($('.papers-menu').hidden).toBe(false)
      mark('sample-b').click()
      expect(server.setRead).toHaveBeenLastCalledWith('sample-b', false)
      expect(mark('sample-b').getAttribute('aria-pressed')).toBe('false')
    })

    it('goes back when the server does not take it', async () => {
      const server = client()
      server.setRead = vi.fn(async () => {
        throw new Error('no')
      })
      await open(server)
      mark('sample-a').click()
      await new Promise((r) => setTimeout(r))
      expect(mark('sample-a').getAttribute('aria-pressed')).toBe('false')
    })

    it('filters by status, counting each', async () => {
      await open(client({ 'sample-a': '2026-11-08' }))
      expect(status('read').textContent).toContain('1')
      expect(status('unread').textContent).toContain('1')
      expect(status('all').textContent).toContain('2')
      status('read').click()
      expect(shown()).toEqual(['sample-a'])
      status('unread').click()
      expect(shown()).toEqual(['sample-b'])
      status('all').click()
      expect(shown()).toEqual(['sample-a', 'sample-b'])
    })

    it('takes a paper out of the Unread list as soon as it is marked', async () => {
      await open(client())
      status('unread').click()
      mark('sample-a').click()
      expect(shown()).toEqual(['sample-b'])
      expect(status('read').textContent).toContain('1')
    })

    it('marks from the panel of the paper too', async () => {
      const server = client()
      const view = await open(server)
      view.select('sample-a')
      const button = $('.panel [data-mark="sample-a"]')
      expect(button.hidden).toBe(false)
      button.click()
      expect(server.setRead).toHaveBeenLastCalledWith('sample-a', true)
      expect($('.panel [data-mark="sample-a"]').getAttribute('aria-pressed')).toBe('true')
      expect(mark('sample-a').getAttribute('aria-pressed')).toBe('true')
    })

    it('marks from the reader, for the paper it has open', async () => {
      const server = client()
      const view = await open(server)
      await view.reader.open('sample-a')
      const button = $('.reader__mark')
      expect(button.dataset.mark).toBe('sample-a')
      expect(button.hidden).toBe(false)
      button.click()
      expect(server.setRead).toHaveBeenLastCalledWith('sample-a', true)
      expect(button.getAttribute('aria-pressed')).toBe('true')
    })

    it('hides the marks without the local server, and keeps the search', async () => {
      const view = await open(null)
      expect(mark('sample-a').hidden).toBe(true)
      expect($('.papers-menu__status').hidden).toBe(true)
      await type(view, 'real')
      expect(shown()).toEqual(['sample-b'])
    })
  })

  it('still opens a paper and closes itself', async () => {
    const view = await open(client())
    $('.papers-menu [data-read="sample-a"]').click()
    await view.reader.ready()
    expect(view.reader.isOpen()).toBe(true)
    expect($('.papers-menu').hidden).toBe(true)
  })
})
