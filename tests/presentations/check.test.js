// @vitest-environment node
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkSite } from '../../scripts/check-presentations.mjs'

/** The decks' site root: the `presentations/` folder of the map. */
const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'presentations')

const page = (body, track = 'leaders') => `<!doctype html><html lang="en" data-lang="en"><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter" />
<link rel="stylesheet" href="../../assets/deck.css" /></head>
<body data-track="${track}" data-presentation="presentacion-01"><nav class="rail"></nav><main class="deck">${body}</main></body></html>`

const goodSlide = '<section class="slide"><h1><span lang="en">Hello</span><span lang="es">Hola</span></h1><p data-app-name></p></section>'

/** A copy of this repo's assets with the given presentations per track and files. */
function site({ presentations = { leaders: ['presentacion-01'], thesis: [] }, files = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wp-check-'))
  cpSync(join(repo, 'assets'), join(root, 'assets'), { recursive: true })
  // the decks' theme.js re-exports the map's: in the copy it is the map's file itself
  cpSync(join(repo, '..', 'assets', 'theme.js'), join(root, 'assets', 'theme.js'))
  const list = (ids) => ids.map((id) => `{ id: '${id}', date: '2026-10-21', title: { en: 'T', es: 'T' } }`).join(',')
  writeFileSync(join(root, 'assets', 'site.js'),
    `export const APP_NAME = 'GFit: Generative Information Modeler'
export const TRACKS = { leaders: { en: 'Leaders', es: 'Líderes' }, thesis: { en: 'Thesis', es: 'Tesis' } }
export const PRESENTATIONS = { leaders: [${list(presentations.leaders)}], thesis: [${list(presentations.thesis)}] }\n`)
  const all = { 'leaders/presentacion-01/index.html': page(goodSlide), ...files }
  for (const [path, html] of Object.entries(all)) {
    if (html === null) continue
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), html)
  }
  return root
}

describe('checkSite', () => {
  it('passes a good site', async () => {
    expect(await checkSite(site())).toEqual([])
  })

  it('passes a site with a presentation in each track', async () => {
    const root = site({
      presentations: { leaders: ['presentacion-01'], thesis: ['presentacion-01'] },
      files: { 'thesis/presentacion-01/index.html': page(goodSlide, 'thesis') },
    })
    expect(await checkSite(root)).toEqual([])
  })

  it('fails an English text without its Spanish sibling', async () => {
    const root = site({ files: { 'leaders/presentacion-01/index.html': page('<section class="slide"><h1><span lang="en">Only English</span></h1></section>') } })
    const errors = await checkSite(root)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/leaders\/presentacion-01\/index\.html/)
    expect(errors[0]).toMatch(/Only English/)
  })

  it('fails an empty Spanish text', async () => {
    const root = site({ files: { 'leaders/presentacion-01/index.html': page('<section class="slide"><span lang="en">Hi</span><span lang="es"> </span></section>') } })
    expect((await checkSite(root)).join('\n')).toMatch(/empty/i)
  })

  it('fails a presentation folder that is not listed', async () => {
    const root = site({ files: { 'thesis/presentacion-02/index.html': page(goodSlide, 'thesis') } })
    expect((await checkSite(root)).join('\n')).toMatch(/thesis\/presentacion-02.*not in PRESENTATIONS/)
  })

  it('a folder that is not a presentation is not one', async () => {
    const root = site({ files: { 'leaders/img/index.html': page(goodSlide) } })
    expect(await checkSite(root)).toEqual([])
  })

  it('fails a listed presentation without a folder', async () => {
    const root = site({ presentations: { leaders: ['presentacion-01'], thesis: ['presentacion-01'] } })
    expect((await checkSite(root)).join('\n')).toMatch(/thesis\/presentacion-01.*no folder/)
  })

  it('fails a root-relative link', async () => {
    const root = site({ files: { 'leaders/presentacion-01/index.html': page(goodSlide).replace('../../assets/deck.css', '/assets/deck.css') } })
    expect((await checkSite(root)).join('\n')).toMatch(/\/assets\/deck\.css/)
  })

  it('fails an external script from an unknown host', async () => {
    const root = site({ files: { 'leaders/presentacion-01/index.html': page(`${goodSlide}<script src="https://example.com/x.js"></script>`) } })
    expect((await checkSite(root)).join('\n')).toMatch(/example\.com/)
  })

  it('fails the app name typed into a slide', async () => {
    const root = site({ files: { 'leaders/presentacion-01/index.html': page('<section class="slide"><span lang="en">GFit</span><span lang="es">GFit</span></section>') } })
    expect((await checkSite(root)).join('\n')).toMatch(/app name/i)
  })

  it('fails a presentation with no slides', async () => {
    const root = site({ files: { 'leaders/presentacion-01/index.html': page('') } })
    expect((await checkSite(root)).join('\n')).toMatch(/no slides/i)
  })

  it('passes a slide that cites ids the map has', async () => {
    const root = site({ files: { 'leaders/presentacion-01/index.html': page('<section class="slide" data-map="question ifc"><h1><span lang="en">A</span><span lang="es">A</span></h1></section>') } })
    expect(await checkSite(root, { mapIds: new Set(['question', 'ifc']) })).toEqual([])
  })

  it('fails a slide that cites an id the map does not have', async () => {
    const root = site({ files: { 'leaders/presentacion-01/index.html': page('<section class="slide" data-map="ifc ghost"><h1><span lang="en">A</span><span lang="es">A</span></h1></section>') } })
    const errors = await checkSite(root, { mapIds: new Set(['ifc']) })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/leaders\/presentacion-01\/index\.html/)
    expect(errors[0]).toMatch(/slide 1.*"ghost"/)
  })

  it('does not check data-map when there is no map to check against', async () => {
    const root = site({ files: { 'leaders/presentacion-01/index.html': page('<section class="slide" data-map="ghost"><h1><span lang="en">A</span><span lang="es">A</span></h1></section>') } })
    expect(await checkSite(root, { mapIds: null })).toEqual([])
  })

  it('checks the template gallery for both languages too', async () => {
    const root = site({ files: { 'templates/index.html': '<html><body><p lang="es">Solo español</p></body></html>' } })
    expect((await checkSite(root)).join('\n')).toMatch(/templates\/index\.html/)
  })
})
