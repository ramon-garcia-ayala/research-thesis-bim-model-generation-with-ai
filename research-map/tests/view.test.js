import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { checkFolder } from '../scripts/check.mjs'
import { createView, start } from '../assets/view.js'

const FIXTURE = join(import.meta.dirname, 'fixture')
const fromDisk = async (path) => (existsSync(join(import.meta.dirname, '..', path)) ? readFileSync(join(import.meta.dirname, '..', path), 'utf8') : null)

let root
let view
beforeEach(async () => {
  document.body.innerHTML = '<main id="app"></main>'
  root = document.getElementById('app')
  view = await start(root, { load: fromDisk, dir: 'tests/fixture/' })
})

const card = (id) => root.querySelector(`.card[data-id="${id}"]`)
const dimmed = (id) => card(id).classList.contains('dim')

describe('the viewer', () => {
  it('the fixture is a valid map folder', () => {
    expect(checkFolder(FIXTURE)).toEqual([])
  })

  it('draws the centre, every group and node, and every link', () => {
    expect(root.querySelector('.card.centre').textContent).toContain('can rule sets produce')
    expect(root.querySelector('.card.centre').textContent).toContain('v2')
    expect(root.querySelectorAll('.card.group')).toHaveLength(4)
    expect(root.querySelectorAll('.card.node')).toHaveLength(9)
    expect(root.querySelectorAll('path.link')).toHaveLength(5)
    expect(root.querySelector('.problems').hidden).toBe(true)
  })

  it('a node click fills the panel: citation, source, note entries, links', () => {
    card('sample-a').click()
    const panel = root.querySelector('.panel')
    expect(panel.hidden).toBe(false)
    expect(panel.querySelector('h2').textContent).toBe('Sample paper A: procedural houses')
    expect(panel.querySelector('.source a').getAttribute('href')).toBe('files/sample-a.pdf')
    expect(panel.querySelectorAll('article')).toHaveLength(2)
    expect(panel.innerHTML).toContain('<strong>bold</strong>')
    expect(panel.querySelector('.related').textContent).toContain('Supports the hypothesis')
    expect(card('sample-a').classList.contains('selected')).toBe(true)
  })

  it('a note with <script> renders as text', () => {
    card('sample-a').click()
    const panel = root.querySelector('.panel')
    expect(panel.querySelector('script')).toBeNull()
    expect(panel.textContent).toContain('<script>alert(1)</script> stays text.')
  })

  it('a link in the panel moves the selection to the other end', () => {
    card('optimizer').click()
    root.querySelector('.panel [data-go="sample-f"]').click()
    expect(root.querySelector('.panel h2').textContent).toBe('Sample paper F: multi-objective layout')
  })

  it('a link click shows its explanation', () => {
    root.querySelector('.link-hit[data-key="idea-1→sample-d"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(root.querySelector('.panel .explanation').textContent).toBe('Grammars are one way to write the rules.')
  })

  it('the question shows its versions, newest first', () => {
    root.querySelector('.part[data-id="question"]').click()
    const dates = [...root.querySelectorAll('.panel article h3')].map((h) => h.textContent)
    expect(dates).toEqual(['2026-10-18 · current', '2026-10-12'])
  })

  it('search dims what does not match, by title or note text', () => {
    view.search('grammars')
    expect(dimmed('sample-d')).toBe(false)
    expect(dimmed('sample-a')).toBe(true)
    expect(dimmed('rules')).toBe(false)
    expect(dimmed('datasets')).toBe(true)
    view.search('note of optimizer')
    expect(dimmed('optimizer')).toBe(false)
    view.search('')
    expect(root.querySelectorAll('.card.dim')).toHaveLength(0)
  })

  it('"new since" dims what was approved before the last presentation', () => {
    view.toggleNew()
    expect(root.querySelector('.new').getAttribute('aria-pressed')).toBe('true')
    expect(dimmed('sample-c')).toBe(false) // approved after
    expect(dimmed('sample-a')).toBe(false) // an entry after
    expect(dimmed('sample-b')).toBe(true)
    expect(root.querySelector('.link[data-key="idea-2→optimizer"]').classList.contains('dim')).toBe(false)
    expect(root.querySelector('.link[data-key="idea-1→sample-d"]').classList.contains('dim')).toBe(true)
  })

  it('a group label click collapses it; its links attach to the group card', () => {
    card('datasets').click()
    expect(card('sample-a')).toBeNull()
    expect(card('datasets').getAttribute('aria-expanded')).toBe('false')
    expect(root.querySelectorAll('path.link')).toHaveLength(5)
    card('datasets').click()
    expect(card('sample-a')).not.toBeNull()
  })

  it('Escape closes the panel', () => {
    card('sample-a').click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(root.querySelector('.panel').hidden).toBe(true)
  })

  it('an invalid map still draws and lists its problems', () => {
    const map = JSON.parse(readFileSync(join(FIXTURE, 'map.json'), 'utf8'))
    map.links.push({ from: 'sample-a', to: 'nowhere', date: '2026-10-18', explanation: '' })
    createView(root, map, {})
    expect(root.querySelector('.problems').hidden).toBe(false)
    expect(root.querySelector('.problems').textContent).toContain('"nowhere"')
    expect(root.querySelectorAll('.card.node')).toHaveLength(9)
  })

  it('an empty map draws the centre with its placeholders', async () => {
    const empty = { version: 1, lastPresentation: null, centre: { question: [], hypothesis: [] }, groups: [], nodes: [], links: [] }
    await start(root, { load: async (path) => (path === 'map.json' ? JSON.stringify(empty) : null) })
    expect(root.querySelector('.card.centre').textContent).toContain('No question yet')
    expect(root.querySelector('.new').textContent).toContain('everything')
  })

  it('a missing map.json says so instead of crashing', async () => {
    expect(await start(root, { load: async () => null })).toBeNull()
    expect(root.textContent).toContain('map.json cannot be read')
  })
})
