// The public site: one deck, runnable on its own, and nothing of the rest of the repo or of other projects.
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { DECK, buildPages } from '../scripts/build-pages.mjs'

const out = mkdtempSync(join(tmpdir(), 'pages-'))
afterAll(() => rmSync(out, { recursive: true, force: true }))
const files = buildPages(out)
const read = (f) => readFileSync(join(out, f), 'utf8')

describe('build-pages', () => {
  it('stages the deck, its data, the shared assets and a root page that opens it', () => {
    expect(files).toEqual(expect.arrayContaining([`${DECK.track}/${DECK.id}/index.html`, 'assets/deck.js', 'assets/deck.css', 'assets/vendor/three/three.module.min.js', 'index.html', '.nojekyll']))
    expect(read('index.html')).toContain(`url=${DECK.track}/${DECK.id}/`)
  })

  it('publishes one deck only, and none of the map, papers, notes or pipeline', () => {
    expect(readdirSync(join(out, DECK.track))).toEqual([DECK.id])
    expect(files.filter((f) => /^(papers|notes|reading|files|pipeline|research-map)\//.test(f))).toEqual([])
    expect(files.some((f) => f.endsWith('.pdf') || f.endsWith('map.json'))).toBe(false)
  })

  it('cuts site.js down to the deck, with no other presentation and no other project\'s name', () => {
    const site = read('assets/site.js')
    expect(site).toContain(DECK.id)
    expect(site).not.toMatch(/GFit|presentacion-0[1-8]/)
  })

  it('has no import that leaves the site: every relative import of the staged code lands on a staged file', () => {
    for (const f of files.filter((x) => x.endsWith('.js') && !x.includes('vendor'))) {
      for (const m of read(f).matchAll(/(?:from|import\()\s*'(\.[^']+)'/g)) {
        const target = resolve(out, f, '..', m[1])
        expect(target.startsWith(out) && existsSync(target), `${f} imports ${m[1]}`).toBe(true)
      }
    }
  })

  it('keeps every path of the deck relative, so it works under a sub-path', () => {
    const html = read(`${DECK.track}/${DECK.id}/index.html`)
    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https:\/\/(fonts\.g|doi\.org|www\.itcon\.org)|#)/.test(m[1])) continue
      expect(m[1].startsWith('/'), m[1]).toBe(false)
    }
    expect(html).toContain('../../assets/deck.css')
  })
})
