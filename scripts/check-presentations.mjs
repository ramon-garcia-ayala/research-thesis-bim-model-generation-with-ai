// The decks' checker: what must hold before they are shown. `npm run check` prints the errors and fails on any.
// Its root is `presentations/`.
//   1. every text in both languages: [lang=en] and [lang=es] as siblings, neither empty
//   2. presentation folders (<track>/presentacion-NN) and PRESENTATIONS agree
//   3. links relative; external URLs only from Google Fonts
//   4. the app's name never typed into a page (it comes from APP_NAME)
//   5. every listed presentation mounts: slides and a rail

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

const TRACKS = ['leaders', 'thesis']
const PRESENTATION_DIR = /^presentacion-\d{2}$/
const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com'])
const MEDIA = 'img, video, svg, picture, canvas, iframe'

const snippet = (el) => (el.textContent || el.outerHTML).trim().replace(/\s+/g, ' ').slice(0, 60)

function checkLanguages(doc, file, errors) {
  const empty = (el) => !el.textContent.trim() && !el.querySelector(MEDIA) && !el.matches(MEDIA)
  for (const el of doc.body.querySelectorAll('[lang]')) {
    const lang = el.getAttribute('lang')
    if (lang === 'en') {
      const pair = el.nextElementSibling
      if (pair?.getAttribute('lang') !== 'es') errors.push(`${file}: "${snippet(el)}" has no Spanish sibling`)
    } else if (lang === 'es') {
      const pair = el.previousElementSibling
      if (pair?.getAttribute('lang') !== 'en') errors.push(`${file}: "${snippet(el)}" has no English sibling`)
    }
    if ((lang === 'en' || lang === 'es') && empty(el)) {
      const other = lang === 'en' ? el.nextElementSibling : el.previousElementSibling
      errors.push(`${file}: empty ${lang} text${other ? ` beside "${snippet(other)}"` : ''}`)
    }
  }
}

function checkLinks(doc, file, errors) {
  for (const el of doc.querySelectorAll('[href], [src]')) {
    const url = el.getAttribute('href') ?? el.getAttribute('src')
    if (url.startsWith('/')) errors.push(`${file}: "${url}" is not relative (the site lives under a sub-path)`)
    else if (/^https?:/i.test(url) && !FONT_HOSTS.has(new URL(url).host)) {
      errors.push(`${file}: "${url}" loads from a host other than Google Fonts`)
    }
  }
}

function checkPage(root, path, appName, errors) {
  const file = relative(root, path).replaceAll('\\', '/')
  const html = readFileSync(path, 'utf8')
  if (html.includes(appName) || /GFit/.test(html)) {
    errors.push(`${file}: the app name is typed in; use <span data-app-name></span>`)
  }
  const doc = new JSDOM(html).window.document
  checkLanguages(doc, file, errors)
  checkLinks(doc, file, errors)
  return file
}

const dirs = (path) => (existsSync(path) ? readdirSync(path).filter((n) => statSync(join(path, n)).isDirectory()) : [])

/** @returns {Promise<string[]>} the errors; empty when the site is fine */
export async function checkSite(rootDir) {
  const root = resolve(rootDir)
  const errors = []
  const site = await import(pathToFileURL(join(root, 'assets', 'site.js')).href)
  const { mountDeck } = await import(pathToFileURL(join(root, 'assets', 'deck.js')).href)

  for (const track of TRACKS) {
    const listed = new Set(site.PRESENTATIONS[track].map((p) => p.id))
    for (const id of dirs(join(root, track)).filter((n) => PRESENTATION_DIR.test(n))) {
      if (!listed.has(id)) errors.push(`${track}/${id}: folder not in PRESENTATIONS (assets/site.js)`)
    }
    for (const id of listed) {
      const path = join(root, track, id, 'index.html')
      if (!existsSync(path)) {
        errors.push(`${track}/${id}: listed in PRESENTATIONS but has no folder with index.html`)
        continue
      }
      const file = checkPage(root, path, site.APP_NAME, errors)
      const dom = new JSDOM(readFileSync(path, 'utf8'), { url: `http://localhost/${track}/${id}/` })
      mountDeck(dom.window)
      const doc = dom.window.document
      if (!doc.querySelectorAll('main.deck section.slide').length) errors.push(`${file}: no slides`)
      if (!doc.querySelector('nav.rail a.rail__item')) errors.push(`${file}: the rail did not render`)
    }
  }

  const gallery = join(root, 'templates', 'index.html')
  if (existsSync(gallery)) checkPage(root, gallery, site.APP_NAME, errors)
  return errors
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const errors = await checkSite(resolve('presentations'))
  for (const e of errors) console.error(`✗ ${e}`)
  console.log(errors.length ? `${errors.length} error(s)` : '✓ site OK')
  process.exit(errors.length ? 1 : 0)
}
